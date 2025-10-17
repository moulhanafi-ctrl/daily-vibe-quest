import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || Deno.env.get("WELCOME_FROM_EMAIL") || "Mostapha <notifications@resend.dev>";

interface ProviderHealthCheck {
  healthy: boolean;
  provider: string;
  error?: string;
  details?: string;
  domainVerified?: boolean;
  fromEmail?: string;
}

interface DomainInfo {
  id: string;
  name: string;
  status: string;
  records?: any[];
}

async function checkDomainVerification(): Promise<{ verified: boolean; domain?: string; records?: any[] }> {
  if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') {
    return { verified: false };
  }

  try {
    // Extract domain from RESEND_FROM_EMAIL
    const emailMatch = RESEND_FROM_EMAIL.match(/<(.+)>/) || [null, RESEND_FROM_EMAIL];
    const email = emailMatch[1] || RESEND_FROM_EMAIL;
    const domain = email.split('@')[1];

    if (!domain) {
      return { verified: false };
    }

    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return { verified: false, domain };
    }

    const { data: domains } = await response.json();
    const matchingDomain = domains?.find((d: DomainInfo) => d.name === domain);

    if (!matchingDomain) {
      return { verified: false, domain };
    }

    return {
      verified: matchingDomain.status === 'verified',
      domain,
      records: matchingDomain.records || []
    };
  } catch (error) {
    console.error("Domain verification check error:", error);
    return { verified: false };
  }
}

async function checkEmailProvider(): Promise<ProviderHealthCheck> {
  if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') {
    return {
      healthy: false,
      provider: 'resend',
      error: 'RESEND_API_KEY not configured',
      details: 'Email provider API key is missing from environment secrets'
    };
  }

  if (!RESEND_FROM_EMAIL || RESEND_FROM_EMAIL.trim() === '') {
    return {
      healthy: false,
      provider: 'resend',
      error: 'RESEND_FROM_EMAIL not configured',
      details: 'Email sender address is missing from environment secrets'
    };
  }

  // Validate key format (basic check)
  if (RESEND_API_KEY.length < 20 || !RESEND_API_KEY.startsWith('re_')) {
    return {
      healthy: false,
      provider: 'resend',
      error: 'Invalid API key format',
      details: 'RESEND_API_KEY appears to be malformed (should start with re_)',
      fromEmail: RESEND_FROM_EMAIL
    };
  }

  // Test API call to verify key is valid
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      return {
        healthy: false,
        provider: 'resend',
        error: 'API key is invalid or expired',
        details: 'Resend returned 401 Unauthorized. Please rotate the RESEND_API_KEY secret.',
        fromEmail: RESEND_FROM_EMAIL
      };
    }

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      return {
        healthy: false,
        provider: 'resend',
        error: `Provider error: ${response.status}`,
        details: errorText,
        fromEmail: RESEND_FROM_EMAIL
      };
    }

    // Check domain verification
    const domainCheck = await checkDomainVerification();

    return {
      healthy: true,
      provider: 'resend',
      domainVerified: domainCheck.verified,
      fromEmail: RESEND_FROM_EMAIL,
      details: domainCheck.verified 
        ? 'Email provider is healthy and domain is verified' 
        : 'Email provider is healthy but sender domain is unverified - deliverability may be reduced'
    };
  } catch (error) {
    return {
      healthy: false,
      provider: 'resend',
      error: 'Network error',
      details: error instanceof Error ? error.message : 'Unknown error connecting to Resend',
      fromEmail: RESEND_FROM_EMAIL
    };
  }
}

async function generateAIMessage(
  userName: string,
  moodContext?: string
): Promise<string> {
  const contextPrompt = moodContext
    ? `The user ${userName} recently shared: ${moodContext}. Acknowledge their journey with empathy.`
    : `Generate a warm message for ${userName}.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are Mostapha, a warm and supportive wellness companion. Generate exactly 2 short, uplifting sentences (≤35 words total) that are positive, encouraging, and hopeful. Keep it simple, warm, and non-clinical. Vary your messages to avoid repetition. Personalize based on the user's context when provided."
        },
        {
          role: "user",
          content: contextPrompt
        }
      ],
      max_tokens: 100,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI generation failed: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function sendEmailNotification(
  email: string,
  userName: string,
  personalizedGreeting: string,
  message: string,
  appUrl: string
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') {
    return { success: false, error: "RESEND_API_KEY not configured", statusCode: 500 };
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #333; margin-bottom: 5px;">${personalizedGreeting}</h2>
          <p style="color: #666; font-size: 16px; margin-top: 5px;">Your message is ready to be viewed.</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #333; font-size: 15px; line-height: 1.8; margin: 0;">${message}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${appUrl}/dashboard" 
             style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
            Open App
          </a>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px;">
          <p>You're receiving this because you opted in to daily wellness messages.</p>
          <p><a href="${appUrl}/settings?section=notifications" style="color: #2563eb;">Update notification preferences</a></p>
        </div>
      </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject: "💌 Message from Mostapha",
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return { 
        success: false, 
        error: `Resend API error: ${error}`,
        statusCode: response.status 
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      statusCode: 500
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const windowType = body.windowType || "scheduled"; // 'morning', 'evening', 'kickoff', 'manual', 'health_check', 'test_email', 'get_domains'
    const testUserId = body.testUserId;
    const testEmail = body.testEmail;
    const isManualBypass = windowType === "manual" || testUserId;
    const isHealthCheck = windowType === "health_check";
    const isTestEmail = windowType === "test_email";
    const isGetDomains = windowType === "get_domains";

    // Get domains endpoint
    if (isGetDomains) {
      if (!RESEND_API_KEY || RESEND_API_KEY.trim() === '') {
        return new Response(
          JSON.stringify({ error: "RESEND_API_KEY not configured" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400
          }
        );
      }

      try {
        const response = await fetch("https://api.resend.com/domains", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY.trim()}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const error = await response.text();
          return new Response(
            JSON.stringify({ error: `Failed to fetch domains: ${error}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: response.status
            }
          );
        }

        const data = await response.json();
        const domainCheck = await checkDomainVerification();
        
        return new Response(
          JSON.stringify({ 
            domains: data.data || [],
            currentDomain: domainCheck.domain,
            currentFromEmail: RESEND_FROM_EMAIL
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
          }
        );
      }
    }

    // Test email endpoint
    if (isTestEmail) {
      const emailHealth = await checkEmailProvider();
      
      if (!emailHealth.healthy) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: emailHealth.error,
            details: emailHealth.details
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400
          }
        );
      }

      if (!testEmail || !testEmail.includes('@')) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Invalid test email address"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400
          }
        );
      }

      try {
        const testHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #22c55e; margin-bottom: 5px;">✅ Resend Test OK</h2>
                <p style="color: #666; font-size: 16px; margin-top: 5px;">This is a Resend connectivity test</p>
              </div>
              
              <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #333; font-size: 15px; line-height: 1.8; margin: 0;">
                  <strong>Timestamp:</strong> ${new Date().toISOString()}<br/>
                  <strong>From:</strong> ${RESEND_FROM_EMAIL}<br/>
                  <strong>Domain Verified:</strong> ${emailHealth.domainVerified ? '✅ Yes' : '⚠️ No (see note below)'}
                </p>
              </div>

              ${!emailHealth.domainVerified ? `
                <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="color: #92400e; font-size: 14px; margin: 0;">
                    ⚠️ <strong>Note:</strong> Your sender domain is not verified in Resend. 
                    Emails will still send but may have reduced deliverability. 
                    Add DNS records in Resend to verify your domain.
                  </p>
                </div>
              ` : ''}
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #999; font-size: 12px;">
                <p>Resend API test successful. If you received this email, your email provider is configured correctly.</p>
              </div>
            </body>
          </html>
        `;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY!.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: RESEND_FROM_EMAIL,
            to: [testEmail],
            subject: "✅ Resend Test OK",
            html: testHtml,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return new Response(
            JSON.stringify({ 
              success: false,
              error: "Resend API error",
              details: error,
              statusCode: response.status
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200 // Return 200 so frontend can parse the error
            }
          );
        }

        const result = await response.json();
        return new Response(
          JSON.stringify({ 
            success: true,
            messageId: result.id,
            from: RESEND_FROM_EMAIL,
            to: testEmail,
            domainVerified: emailHealth.domainVerified,
            timestamp: new Date().toISOString()
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
          }
        );
      }
    }

    // Health check endpoint
    if (isHealthCheck) {
      const emailHealth = await checkEmailProvider();
      return new Response(
        JSON.stringify(emailHealth),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: emailHealth.healthy ? 200 : 503
        }
      );
    }

    console.log(`Starting daily AI message job - window: ${windowType}, bypass: ${isManualBypass}`);

    // Run preflight health check
    const emailHealth = await checkEmailProvider();
    const emailProviderHealthy = emailHealth.healthy;

    // Create job log
    const { data: jobLog, error: jobLogError } = await supabase
      .from("daily_ai_message_logs")
      .insert({
        window_type: isManualBypass ? `${windowType}_bypass` : windowType,
        status: "running",
      })
      .select()
      .single();

    if (jobLogError) {
      console.error("Failed to create job log:", jobLogError);
      throw new Error("Failed to create job log");
    }

    // Get eligible users - ALL opted-in users (no subscription or generation checks)
    let usersQuery = supabase
      .from("profiles")
      .select("id, username, notification_opt_in, notification_channel, notification_timezone")
      .eq("notification_opt_in", true);

    if (testUserId) {
      usersQuery = usersQuery.eq("id", testUserId);
    }

    const { data: users, error: usersError } = await usersQuery;

    if (usersError) {
      console.error("Failed to fetch users:", usersError);
      throw usersError;
    }

    console.log(`Found ${users?.length || 0} eligible users`);

    let usersTargeted = 0;
    let channelsSent = 0;
    let channelsFailed = 0;
    let channelsSkipped = 0;
    let usersFullyFailed = 0;
    const deliveryDetails: any[] = [];
    
    // Log provider health status
    if (!emailProviderHealthy) {
      console.warn(`Email provider health check failed: ${emailHealth.error} - ${emailHealth.details}`);
    }

    for (const user of users || []) {
      const userDelivery: any = {
        user_id: user.id,
        username: user.username,
        channels: {},
        attempted_at: new Date().toISOString()
      };

      try {
        const { data: userData } = await supabase.auth.admin.getUserById(user.id);
        
        usersTargeted++;

        // Extract first name from username or email with safe fallback
        let firstName = 'there';
        if (user.username && !user.username.includes('@')) {
          firstName = user.username;
        } else if (userData?.user?.email) {
          firstName = userData.user.email.split('@')[0];
        }
        firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
        
        userDelivery.first_name = firstName;
        userDelivery.email = userData?.user?.email;

        // Get recent mood context (last 7 days)
        let moodContext = '';
        try {
          const { data: recentMoods } = await supabase
            .from("mood_check_ins")
            .select("mood, note")
            .eq("user_id", user.id)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order("created_at", { ascending: false })
            .limit(3);

          if (recentMoods && recentMoods.length > 0) {
            const moods = recentMoods.map(m => m.mood).filter(Boolean);
            const notes = recentMoods.map(m => m.note).filter(Boolean);
            if (moods.length > 0) {
              moodContext = `Recent mood: ${moods[0]}`;
              if (notes.length > 0 && notes[0]) {
                moodContext += `. They shared: "${notes[0].substring(0, 100)}"`;
              }
            }
          }
        } catch (moodError) {
          console.log(`Could not fetch mood data for ${user.id}:`, moodError);
        }

        // Generate personalized AI message for this user
        const aiMessage = await generateAIMessage(firstName, moodContext);
        const personalizedGreeting = `💌 Hi ${firstName}, Mostapha here ❤️`;
        const fullMessage = `${personalizedGreeting}\nYour message is ready to be viewed.\n\n${aiMessage}`;

        const appUrl = supabaseUrl.replace('/functions/v1', '');
        const channel = user.notification_channel || 'both';

        let channelSuccesses = 0;
        let channelFailures = 0;

        // Send in-app notification
        if (channel === 'in_app' || channel === 'both') {
          try {
            const { error: inAppError } = await supabase
              .from("notifications")
              .insert({
                user_id: user.id,
                type: "daily_ai_message",
                channel: "in_app",
                payload_json: {
                  title: personalizedGreeting,
                  message: `Your message is ready to be viewed.\n\n${aiMessage}`,
                  link: "/dashboard",
                },
                status: "sent",
              });

            if (inAppError) {
              console.error(`Failed to create in-app notification for ${user.id}:`, inAppError);
              channelsFailed++;
              channelFailures++;
              userDelivery.channels.in_app = {
                status: 'failed',
                error: inAppError.message,
                timestamp: new Date().toISOString()
              };
            } else {
              channelsSent++;
              channelSuccesses++;
              userDelivery.channels.in_app = {
                status: 'sent',
                timestamp: new Date().toISOString()
              };
              console.log(`In-app notification sent to user ${user.id}`);
            }
          } catch (e) {
            channelsFailed++;
            channelFailures++;
            userDelivery.channels.in_app = {
              status: 'failed',
              error: e instanceof Error ? e.message : 'Unknown error',
              timestamp: new Date().toISOString()
            };
          }
        }

        // Validate and send email notification
        if (channel === 'email' || channel === 'both') {
          const email = userData?.user?.email;
          
          // Check provider health first
          if (!emailProviderHealthy) {
            channelsSkipped++;
            userDelivery.channels.email = {
              status: 'skipped_misconfigured',
              reason: emailHealth.error,
              details: emailHealth.details,
              timestamp: new Date().toISOString()
            };
            console.log(`Skipping email for ${user.id}: provider misconfigured - ${emailHealth.error}`);
          }
          // Pre-send validation
          else if (!email || !email.includes('@') || email.length < 5) {
            channelsSkipped++;
            userDelivery.channels.email = {
              status: 'skipped_invalid',
              reason: 'Invalid or missing email address',
              timestamp: new Date().toISOString()
            };
            console.log(`Skipping email for ${user.id}: invalid email`);
          } else {
            let retries = 0;
            const maxRetries = 2;
            let emailSuccess = false;
            let lastError = '';

            while (retries <= maxRetries && !emailSuccess) {
              try {
                const emailResult = await sendEmailNotification(
                  email,
                  firstName,
                  personalizedGreeting,
                  aiMessage,
                  appUrl
                );

                if (emailResult.success) {
                  await supabase.from("notifications").insert({
                    user_id: user.id,
                    type: "daily_ai_message",
                    channel: "email",
                    payload_json: {
                      to: email,
                      message: fullMessage,
                    },
                    status: "sent",
                  });
                  channelsSent++;
                  channelSuccesses++;
                  emailSuccess = true;
                  userDelivery.channels.email = {
                    status: 'sent',
                    to: email,
                    attempts: retries + 1,
                    timestamp: new Date().toISOString()
                  };
                  console.log(`Email sent to user ${user.id}`);
                } else {
                  lastError = emailResult.error || 'Unknown error';
                  const statusCode = emailResult.statusCode || 500;
                  
                  // Check if error is retryable (429, 5xx but not 401)
                  const isRetryable = (statusCode === 429 || statusCode >= 500) && statusCode !== 401;
                  
                  if (isRetryable && retries < maxRetries) {
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Backoff
                    continue;
                  }
                  
                  // Log failed email attempt
                  await supabase.from("notifications").insert({
                    user_id: user.id,
                    type: "daily_ai_message",
                    channel: "email",
                    payload_json: {
                      to: email,
                      message: fullMessage,
                    },
                    status: "failed",
                    error_msg: lastError,
                  });
                  
                  channelsFailed++;
                  channelFailures++;
                  userDelivery.channels.email = {
                    status: 'provider_error',
                    error: lastError,
                    to: email,
                    attempts: retries + 1,
                    timestamp: new Date().toISOString()
                  };
                  break;
                }
              } catch (e) {
                lastError = e instanceof Error ? e.message : 'Unknown error';
                retries++;
                if (retries > maxRetries) {
                  channelsFailed++;
                  channelFailures++;
                  userDelivery.channels.email = {
                    status: 'provider_error',
                    error: lastError,
                    to: email,
                    attempts: retries,
                    timestamp: new Date().toISOString()
                  };
                }
              }
            }
          }
        }

        // Only count as user error if ALL channels failed
        if (channelFailures > 0 && channelSuccesses === 0) {
          usersFullyFailed++;
        }

        deliveryDetails.push(userDelivery);
      } catch (userError) {
        console.error(`Error processing user ${user.id}:`, userError);
        usersFullyFailed++;
        userDelivery.fatal_error = userError instanceof Error ? userError.message : "Unknown error";
        userDelivery.stack_trace = userError instanceof Error ? userError.stack : undefined;
        deliveryDetails.push(userDelivery);
      }
    }

    // Update job log with detailed metrics
    await supabase
      .from("daily_ai_message_logs")
      .update({
        users_targeted: usersTargeted,
        sent_count: channelsSent,
        error_count: usersFullyFailed,
        error_details: {
          channels_sent: channelsSent,
          channels_failed: channelsFailed,
          channels_skipped: channelsSkipped,
          users_fully_failed: usersFullyFailed,
          email_provider_healthy: emailProviderHealthy,
          email_provider_error: emailProviderHealthy ? null : emailHealth,
          delivery_details: deliveryDetails
        },
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobLog.id);

    console.log(`Job completed: ${usersTargeted} users targeted, ${channelsSent} sent, ${channelsFailed} failed, ${channelsSkipped} skipped, ${usersFullyFailed} fully failed`);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobLog.id,
        users_targeted: usersTargeted,
        channels_sent: channelsSent,
        channels_failed: channelsFailed,
        channels_skipped: channelsSkipped,
        users_fully_failed: usersFullyFailed,
        email_provider_healthy: emailProviderHealthy,
        delivery_details: deliveryDetails
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Daily AI message job error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
