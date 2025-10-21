import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createStripeClient, getStripeConfig } from "../_shared/stripe-config.ts";
import { 
  trackSubscriptionStarted, 
  trackSubscriptionCanceled, 
  trackSubscriptionUpdated 
} from "../_shared/posthog.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("FROM_EMAIL") || "support@dailyvibecheck.com";
const appDashboardUrl = Deno.env.get("APP_DASHBOARD_URL") || "https://dailyvibecheck.com/";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Track processed events for idempotency
const processedEvents = new Set<string>();

async function sendOrderConfirmationEmail(
  customerEmail: string,
  productName: string,
  amountTotal: number,
  currency: string
) {
  if (!resend) {
    console.warn("[WEBHOOK] Resend not configured, skipping email");
    return { success: false, reason: "resend_not_configured" };
  }

  try {
    const formattedAmount = (amountTotal / 100).toFixed(2);
    const firstName = customerEmail.split('@')[0];
    const greeting = firstName || 'friend';
    
    await resend.emails.send({
      from: `Daily Vibe Check <${fromEmail}>`,
      to: [customerEmail],
      subject: "Thank you for your purchase!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Payment successful — thank you for supporting Daily Vibe Check!</h2>
          <p>Hi ${greeting}, your payment was successful.</p>
          
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 10px 0;"><strong>Product:</strong> ${productName}</li>
            <li style="margin: 10px 0;"><strong>Amount:</strong> $${formattedAmount} ${currency.toUpperCase()}</li>
          </ul>
          
          <p style="margin: 20px 0;">
            <a href="${appDashboardUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Open your dashboard</a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you have questions, just reply to this email.
          </p>
        </div>
      `,
    });

    console.log(`[WEBHOOK] Order confirmation email sent to: ${customerEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error("[WEBHOOK] Error sending email:", error.message);
    // Don't fail the webhook if email fails
    return { success: false, error: error.message };
  }
}

async function processCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  supabase: any,
  eventId: string
) {
  console.log(`[WEBHOOK] Processing checkout.session.completed: ${session.id}`);

  const customerEmail = session.customer_email || session.customer_details?.email;
  if (!customerEmail) {
    console.warn("[WEBHOOK] No customer email found - skipping order creation");
    return { success: true, warning: "no_email" };
  }

  // Get line items to extract product details
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const productName = lineItems.data[0]?.description || "Product";
  const amountTotal = session.amount_total || 0;
  const currency = session.currency || "usd";

  // Save order to database (idempotent upsert)
  try {
    // Upsert order - update if exists, insert if new
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .upsert(
        {
          session_id: session.id,
          customer_email: customerEmail,
          product_name: productName,
          amount_total: amountTotal,
          currency: currency,
          payment_status: "paid",
        },
        { onConflict: "session_id" }
      )
      .select()
      .single();

    if (orderError) {
      console.error("[WEBHOOK] Error upserting order:", orderError);
      throw orderError;
    }

    console.log(`[WEBHOOK] Order upserted: ${order.id}, emailed: ${order.emailed}`);

    // Send confirmation email only if not already sent
    let emailSent = false;
    if (!order.emailed && customerEmail) {
      const emailResult = await sendOrderConfirmationEmail(
        customerEmail,
        productName,
        amountTotal,
        currency
      );

      if (emailResult.success) {
        // Mark as emailed
        await supabase
          .from("orders")
          .update({ emailed: true })
          .eq("id", order.id);
        emailSent = true;
        console.log(`[WEBHOOK] Email sent and marked for session: ${session.id}`);
      } else {
        console.warn("[WEBHOOK] Email send failed:", emailResult);
      }
    } else {
      console.log(`[WEBHOOK] Email already sent for session: ${session.id}, skipping`);
    }

    // Track analytics
    await supabase.from("analytics_events").insert({
      event_type: "purchase_succeeded",
      event_metadata: {
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        amountTotal: amountTotal,
        currency: currency,
        productName: productName,
        webhookEventId: eventId,
      },
      page_url: "/checkout/success",
    });

    // Summary log
    console.log(JSON.stringify({
      eventType: "checkout.session.completed",
      session_id: session.id,
      email: customerEmail,
      amount_total: amountTotal,
      emailed: order.emailed || emailSent
    }));

    return { success: true, order_id: order.id, email_sent: emailSent };
  } catch (error: any) {
    console.error("[WEBHOOK] Error in processCheckoutCompleted:", error);
    return { error: error.message };
  }
}

async function processPaymentIntentSucceeded(
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent,
  supabase: any,
  eventId: string
) {
  console.log(`[WEBHOOK] Processing payment_intent.succeeded: ${paymentIntent.id}`);

  const customerEmail = paymentIntent.receipt_email;
  if (!customerEmail) {
    console.warn("[WEBHOOK] No receipt email found on payment_intent - skipping");
    return { success: true, warning: "no_email" };
  }

  const amountTotal = paymentIntent.amount;
  const currency = paymentIntent.currency || "usd";
  const productName = paymentIntent.description || "Product";

  // Upsert order using payment_intent id as session_id fallback
  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .upsert(
        {
          session_id: paymentIntent.id,
          customer_email: customerEmail,
          product_name: productName,
          amount_total: amountTotal,
          currency: currency,
          payment_status: "paid",
        },
        { onConflict: "session_id" }
      )
      .select()
      .single();

    if (orderError) {
      console.error("[WEBHOOK] Error upserting order from payment_intent:", orderError);
      throw orderError;
    }

    console.log(`[WEBHOOK] Order upserted from payment_intent: ${order.id}`);

    // Send email if not already sent
    let emailSent = false;
    if (!order.emailed && customerEmail) {
      const emailResult = await sendOrderConfirmationEmail(
        customerEmail,
        productName,
        amountTotal,
        currency
      );

      if (emailResult.success) {
        await supabase
          .from("orders")
          .update({ emailed: true })
          .eq("id", order.id);
        emailSent = true;
        console.log(`[WEBHOOK] Email sent for payment_intent: ${paymentIntent.id}`);
      }
    }

    console.log(JSON.stringify({
      eventType: "payment_intent.succeeded",
      session_id: paymentIntent.id,
      email: customerEmail,
      amount_total: amountTotal,
      emailed: order.emailed || emailSent
    }));

    return { success: true, order_id: order.id, email_sent: emailSent };
  } catch (error: any) {
    console.error("[WEBHOOK] Error in processPaymentIntentSucceeded:", error);
    return { error: error.message };
  }
}

async function processRefund(
  stripe: Stripe,
  charge: Stripe.Charge,
  supabase: any,
  eventId: string
) {
  console.log(`[WEBHOOK] Processing refund for charge: ${charge.id}`);

  // Find the order by payment intent
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_payment_id", charge.payment_intent)
    .single();

  if (!order) {
    console.error("[WEBHOOK] Order not found for refund");
    return { error: "Order not found" };
  }

  // Update order status
  await supabase
    .from("orders")
    .update({ payment_status: "refunded" })
    .eq("id", order.id);

  console.log(`[WEBHOOK] Order refunded: ${order.id}`);
  return { success: true };
}

async function processSubscriptionCreated(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  supabase: any,
  eventId: string
) {
  console.log(`[WEBHOOK] Processing subscription.created: ${subscription.id}`);

  try {
    // Get customer email
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const customerEmail = (customer as Stripe.Customer).email;

    if (!customerEmail) {
      console.warn("[WEBHOOK] No email found for subscription customer");
      return { success: true, warning: "no_email" };
    }

    // Find user by email
    const { data: user } = await supabase.auth.admin.getUserByEmail(customerEmail);
    
    if (!user) {
      console.warn("[WEBHOOK] No user found for email:", customerEmail);
      return { success: true, warning: "no_user" };
    }

    // Update profile with subscription status
    await supabase
      .from("profiles")
      .update({
        subscription_status: subscription.status,
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
      })
      .eq("id", user.id);

    // Track subscription started
    await trackSubscriptionStarted(user.id, {
      plan: subscription.items.data[0]?.price.nickname || 'premium',
      billing_interval: subscription.items.data[0]?.price.recurring?.interval,
      amount: subscription.items.data[0]?.price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : undefined,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscription.id,
    });

    console.log(`[WEBHOOK] Subscription created for user: ${user.id}`);
    return { success: true };
  } catch (error: any) {
    console.error("[WEBHOOK] Error in processSubscriptionCreated:", error);
    return { error: error.message };
  }
}

async function processSubscriptionUpdated(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  supabase: any,
  eventId: string
) {
  console.log(`[WEBHOOK] Processing subscription.updated: ${subscription.id}`);

  try {
    // Find user by subscription ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, subscription_status")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (!profile) {
      console.warn("[WEBHOOK] No profile found for subscription:", subscription.id);
      return { success: true, warning: "no_profile" };
    }

    const oldStatus = profile.subscription_status;

    // Update profile with new subscription status
    await supabase
      .from("profiles")
      .update({
        subscription_status: subscription.status,
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("id", profile.id);

    // Track if status changed
    if (oldStatus !== subscription.status) {
      await trackSubscriptionUpdated(profile.id, {
        old_plan: oldStatus,
        new_plan: subscription.status,
        stripe_subscription_id: subscription.id,
      });
    }

    console.log(`[WEBHOOK] Subscription updated for user: ${profile.id}`);
    return { success: true };
  } catch (error: any) {
    console.error("[WEBHOOK] Error in processSubscriptionUpdated:", error);
    return { error: error.message };
  }
}

async function processSubscriptionDeleted(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  supabase: any,
  eventId: string
) {
  console.log(`[WEBHOOK] Processing subscription.deleted: ${subscription.id}`);

  try {
    // Find user by subscription ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, subscription_status, created_at")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (!profile) {
      console.warn("[WEBHOOK] No profile found for subscription:", subscription.id);
      return { success: true, warning: "no_profile" };
    }

    // Calculate subscription duration
    const createdAt = new Date(profile.created_at);
    const now = new Date();
    const durationDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Update profile
    await supabase
      .from("profiles")
      .update({
        subscription_status: 'canceled',
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("id", profile.id);

    // Track subscription cancellation
    await trackSubscriptionCanceled(profile.id, {
      plan: profile.subscription_status,
      duration_days: durationDays,
      stripe_subscription_id: subscription.id,
    });

    console.log(`[WEBHOOK] Subscription canceled for user: ${profile.id}`);
    return { success: true };
  } catch (error: any) {
    console.error("[WEBHOOK] Error in processSubscriptionDeleted:", error);
    return { error: error.message };
  }
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  
  if (!signature) {
    console.error("[WEBHOOK] No signature header");
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const config = getStripeConfig();
    const stripe = createStripeClient();
    
    // Verify webhook signature if secret is configured
    const event = config.webhookSecret
      ? stripe.webhooks.constructEvent(body, signature, config.webhookSecret)
      : JSON.parse(body);

    console.log(`[WEBHOOK] Event received: ${event.type} (${event.id})`);

    // Idempotency check
    if (processedEvents.has(event.id)) {
      console.log(`[WEBHOOK] Event ${event.id} already processed, skipping`);
      return new Response(JSON.stringify({ received: true, cached: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let result;

    switch (event.type) {
      case "checkout.session.completed":
        result = await processCheckoutCompleted(
          stripe,
          event.data.object as Stripe.Checkout.Session,
          supabase,
          event.id
        );
        break;

      case "payment_intent.succeeded":
        result = await processPaymentIntentSucceeded(
          stripe,
          event.data.object as Stripe.PaymentIntent,
          supabase,
          event.id
        );
        break;

      case "charge.refunded":
        result = await processRefund(
          stripe,
          event.data.object as Stripe.Charge,
          supabase,
          event.id
        );
        break;

      case "customer.subscription.created":
        result = await processSubscriptionCreated(
          stripe,
          event.data.object as Stripe.Subscription,
          supabase,
          event.id
        );
        break;

      case "customer.subscription.updated":
        result = await processSubscriptionUpdated(
          stripe,
          event.data.object as Stripe.Subscription,
          supabase,
          event.id
        );
        break;

      case "customer.subscription.deleted":
        result = await processSubscriptionDeleted(
          stripe,
          event.data.object as Stripe.Subscription,
          supabase,
          event.id
        );
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
        result = { success: true, unhandled: true };
    }

    // Always return 200 OK to Stripe, even if there were errors
    // This prevents Stripe from retrying on non-retriable errors
    if (result.error) {
      console.error(`[WEBHOOK] Error processing ${event.type}:`, result.error);
      // Still mark as processed and return 200 to prevent retries
      processedEvents.add(event.id);
    } else {
      // Mark as successfully processed
      processedEvents.add(event.id);
    }
    
    // Clean up old processed events (keep last 1000)
    if (processedEvents.size > 1000) {
      const oldestEvents = Array.from(processedEvents).slice(0, processedEvents.size - 1000);
      oldestEvents.forEach(id => processedEvents.delete(id));
    }

    return new Response(JSON.stringify({ received: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[WEBHOOK] Error:", error.message);
    // Still return 200 to prevent Stripe retries on signature/parsing errors
    return new Response(JSON.stringify({ error: error.message, received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
