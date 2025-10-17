import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      console.error("[SUBSCRIBER-ANALYTICS] Non-admin access attempt:", user.id);
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { type } = await req.json();

    // Log admin view
    await supabase.from("admin_audit_logs").insert({
      admin_id: user.id,
      event: "view_subscribers_analytics",
      metadata: { type, timestamp: new Date().toISOString() }
    });

    if (type === "kpis") {
      // Fetch KPIs
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: pushSubscribers } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true });

      const { count: dailyOptIn } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("marketing_opt_in", true);

      const { count: birthdayOptIn } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("marketing_opt_in", true)
        .not("birth_date", "is", null);

      return new Response(
        JSON.stringify({
          totalUsers: totalUsers || 0,
          pushSubscribers: pushSubscribers || 0,
          dailyOptIn: dailyOptIn || 0,
          birthdayOptIn: birthdayOptIn || 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "max-age=300", // 5 minutes
          },
        }
      );
    }

    if (type === "trends") {
      // Fetch daily rollups for last 60 days
      const { data: rollups, error } = await supabase
        .from("subscriber_daily_rollups")
        .select("*")
        .order("day", { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify(rollups || []),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "max-age=300",
          },
        }
      );
    }

    if (type === "deliverability") {
      // Fetch deliverability stats for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: notificationLogs } = await supabase
        .from("notification_logs")
        .select("status, sent_at, opened_at")
        .gte("sent_at", sevenDaysAgo.toISOString());

      const { data: emailLogs } = await supabase
        .from("email_logs")
        .select("status, sent_at")
        .gte("sent_at", sevenDaysAgo.toISOString());

      const pushSent = notificationLogs?.filter(l => l.status === "sent").length || 0;
      const pushOpened = notificationLogs?.filter(l => l.opened_at !== null).length || 0;
      const pushFailed = notificationLogs?.filter(l => l.status === "failed").length || 0;

      const emailSent = emailLogs?.filter(l => l.status === "sent").length || 0;
      const emailFailed = emailLogs?.filter(l => l.status === "failed").length || 0;

      return new Response(
        JSON.stringify({
          push: {
            sent: pushSent,
            opened: pushOpened,
            failed: pushFailed,
            openRate: pushSent > 0 ? ((pushOpened / pushSent) * 100).toFixed(1) : "0.0"
          },
          email: {
            sent: emailSent,
            failed: emailFailed,
            deliveryRate: emailSent > 0 ? (((emailSent - emailFailed) / emailSent) * 100).toFixed(1) : "0.0"
          }
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "max-age=300",
          },
        }
      );
    }

    if (type === "reveal_emails") {
      const { startDate, endDate, page = 1, limit = 50 } = await req.json();

      // Log email reveal action
      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        event: "reveal_subscriber_emails",
        metadata: { startDate, endDate, page, timestamp: new Date().toISOString() }
      });

      // Fetch emails with pagination
      const offset = (page - 1) * limit;
      const { data: users, error, count } = await supabase
        .rpc('get_user_emails_paginated', {
          start_date: startDate,
          end_date: endDate,
          page_offset: offset,
          page_limit: limit
        });

      if (error) {
        console.error("[SUBSCRIBER-ANALYTICS] Email reveal error:", error);
        // Fallback to direct query if function doesn't exist
        const { data: profiles, error: profileError, count: profileCount } = await supabase
          .from("profiles")
          .select("id, full_name, created_at", { count: "exact" })
          .gte("created_at", startDate)
          .lte("created_at", endDate)
          .range(offset, offset + limit - 1);

        if (profileError) throw profileError;

        // Get emails from auth.users
        const userIds = profiles?.map(p => p.id) || [];
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]));

        const enrichedData = profiles?.map(p => ({
          ...p,
          email: emailMap.get(p.id) || "N/A"
        }));

        return new Response(
          JSON.stringify({
            data: enrichedData || [],
            total: profileCount || 0,
            page,
            limit
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          data: users || [],
          total: count || 0,
          page,
          limit
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request type" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    if (type === "deliverability") {
      // Fetch deliverability stats for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: notificationLogs } = await supabase
        .from("notification_logs")
        .select("status, sent_at, opened_at")
        .gte("sent_at", sevenDaysAgo.toISOString());

      const { data: emailLogs } = await supabase
        .from("email_logs")
        .select("status, sent_at")
        .gte("sent_at", sevenDaysAgo.toISOString());

      const pushSent = notificationLogs?.filter(l => l.status === "sent").length || 0;
      const pushOpened = notificationLogs?.filter(l => l.opened_at !== null).length || 0;
      const pushFailed = notificationLogs?.filter(l => l.status === "failed").length || 0;

      const emailSent = emailLogs?.filter(l => l.status === "sent").length || 0;
      const emailFailed = emailLogs?.filter(l => l.status === "failed").length || 0;

      return new Response(
        JSON.stringify({
          push: {
            sent: pushSent,
            opened: pushOpened,
            failed: pushFailed,
            openRate: pushSent > 0 ? ((pushOpened / pushSent) * 100).toFixed(1) : "0.0"
          },
          email: {
            sent: emailSent,
            failed: emailFailed,
            deliveryRate: emailSent > 0 ? (((emailSent - emailFailed) / emailSent) * 100).toFixed(1) : "0.0"
          }
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Cache-Control": "max-age=300",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid request type" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[SUBSCRIBER-ANALYTICS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
