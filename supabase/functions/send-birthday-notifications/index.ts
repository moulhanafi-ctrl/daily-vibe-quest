import { Resend } from "npm:resend@4.0.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BirthdayUser {
  id: string;
  email: string;
  full_name: string | null;
  birth_date: string;
  timezone: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { dryRun = false } = await req.json().catch(() => ({ dryRun: false }));

    console.log(`[BIRTHDAY] Starting birthday check (dryRun: ${dryRun})`);

    // Get today's date in America/Detroit timezone
    const now = new Date();
    const detroitDate = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Detroit',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    
    const [month, day] = detroitDate.split('/').slice(0, 2);
    
    console.log(`[BIRTHDAY] Checking for birthdays on ${month}/${day}`);

    // Query users with birthdays today who opted in
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, birth_date, timezone")
      .eq("marketing_opt_in", true)
      .not("birth_date", "is", null)
      .not("email", "is", null);

    if (error) throw error;

    const birthdayUsers: BirthdayUser[] = [];
    const isLeapYear = now.getFullYear() % 4 === 0 && (now.getFullYear() % 100 !== 0 || now.getFullYear() % 400 === 0);

    for (const user of users || []) {
      const birthDate = new Date(user.birth_date);
      const birthMonth = String(birthDate.getMonth() + 1).padStart(2, '0');
      const birthDay = String(birthDate.getDate()).padStart(2, '0');

      // Handle leap year birthdays (Feb 29 → Feb 28 in non-leap years)
      const shouldSend = 
        (birthMonth === month && birthDay === day) ||
        (!isLeapYear && birthMonth === '02' && birthDay === '29' && month === '02' && day === '28');

      if (shouldSend) {
        birthdayUsers.push(user as BirthdayUser);
      }
    }

    console.log(`[BIRTHDAY] Found ${birthdayUsers.length} birthday users`);

    if (dryRun) {
      return new Response(
        JSON.stringify({ 
          dryRun: true, 
          count: birthdayUsers.length,
          users: birthdayUsers.map(u => ({ email: u.email, name: u.full_name }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = Deno.env.get("BIRTHDAY_FROM_EMAIL") || "birthday@daily-vibe-quest.lovable.app";
    const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
    
    let successCount = 0;
    let failCount = 0;

    // Send birthday emails
    for (const user of birthdayUsers) {
      try {
        await supabase.from("email_logs").insert({
          user_id: user.id,
          type: "birthday",
          status: "queued",
          metadata: { email: user.email, full_name: user.full_name }
        });

        const emailResponse = await resend.emails.send({
          from: `Daily Vibe Quest <${fromEmail}>`,
          to: [user.email],
          subject: "🎂 Happy Birthday from Daily Vibe Quest!",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6366f1;">Happy Birthday${user.full_name ? `, ${user.full_name}` : ""}! 🎂</h1>
              <p style="font-size: 18px; line-height: 1.6;">
                Wishing you a wonderful day filled with joy, love, and all your favorite things!
              </p>
              <p style="font-size: 16px; line-height: 1.6;">
                We hope this year brings you closer to your wellness goals and fills your life with positivity.
              </p>
              <div style="margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; text-align: center;">
                <p style="color: white; font-size: 20px; margin: 0;">
                  🎉 Enjoy a special gift on us! 🎉
                </p>
                <a href="${appUrl}/store" 
                   style="background-color: white; color: #667eea; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; font-weight: bold;">
                  Browse Store
                </a>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Warmest wishes,<br>
                The Daily Vibe Quest Team
              </p>
            </div>
          `,
        });

        await supabase.from("email_logs").insert({
          user_id: user.id,
          type: "birthday",
          status: "sent",
          metadata: { 
            email: user.email, 
            full_name: user.full_name,
            resend_id: emailResponse.data?.id 
          }
        });

        successCount++;
        console.log(`[BIRTHDAY] Sent to ${user.email}`);
      } catch (error: any) {
        failCount++;
        console.error(`[BIRTHDAY] Failed for ${user.email}:`, error);
        
        await supabase.from("email_logs").insert({
          user_id: user.id,
          type: "birthday",
          status: "failed",
          error: error.message,
          metadata: { email: user.email, full_name: user.full_name }
        });
      }
    }

    // Send admin digest if there were birthdays
    if (birthdayUsers.length > 0) {
      try {
        const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@daily-vibe-quest.lovable.app";
        const userList = birthdayUsers.map(u => `• ${u.full_name || 'Unknown'} (${u.email})`).join('\n');
        
        await resend.emails.send({
          from: `Daily Vibe Quest <${fromEmail}>`,
          to: [adminEmail],
          subject: `🎂 ${birthdayUsers.length} Birthday${birthdayUsers.length !== 1 ? 's' : ''} Today`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Birthday Notifications Summary</h2>
              <p>Sent ${successCount} birthday emails today (${failCount} failed):</p>
              <pre style="background: #f5f5f5; padding: 15px; border-radius: 6px;">${userList}</pre>
            </div>
          `,
        });

        await supabase.from("email_logs").insert({
          type: "admin_digest",
          status: "sent",
          metadata: { 
            date: detroitDate,
            birthday_count: birthdayUsers.length,
            success_count: successCount,
            fail_count: failCount
          }
        });
      } catch (error: any) {
        console.error(`[BIRTHDAY] Admin digest failed:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: birthdayUsers.length,
        sent: successCount,
        failed: failCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[BIRTHDAY] Error:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});