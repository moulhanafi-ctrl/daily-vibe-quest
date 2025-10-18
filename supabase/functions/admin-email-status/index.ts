import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

serve(async (req) => {
  console.log("[EMAIL-STATUS] Function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const fromDisplay = Deno.env.get("RESEND_FROM_DISPLAY") || "Daily Vibe Check";

    console.log("[EMAIL-STATUS] Secrets check:", {
      hasApiKey: !!resendApiKey,
      fromEmail: fromEmail || "NOT SET",
      fromDisplay,
    });

    // Check if sender email is configured and valid
    const senderEmailConfigured = !!(fromEmail && emailRegex.test(fromEmail));
    
    // Extract domain from email
    const resendDomain = fromEmail ? fromEmail.split("@")[1] : "dailyvibecheck.com";

    let domainStatus: "not_found" | "unverified" | "verified" | "blocked" = "not_found";
    let domainVerified = false;

    // Check domain status via Resend API
    if (resendApiKey) {
      try {
        console.log("[EMAIL-STATUS] Checking Resend domains...");
        const domainsResponse = await fetch("https://api.resend.com/domains", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
        });

        console.log("[EMAIL-STATUS] Resend API response status:", domainsResponse.status);

        if (domainsResponse.status === 401 || domainsResponse.status === 403) {
          domainStatus = "blocked";
          console.log("[EMAIL-STATUS] API key blocked/unauthorized");
        } else if (domainsResponse.ok) {
          const domainsData = await domainsResponse.json();
          console.log("[EMAIL-STATUS] Domains data:", domainsData);
          const domain = domainsData.data?.find((d: any) => d.name === resendDomain);

          if (domain) {
            if (domain.status === "verified") {
              domainStatus = "verified";
              domainVerified = true;
            } else {
              domainStatus = "unverified";
            }
            console.log("[EMAIL-STATUS] Domain found:", domain.name, domain.status);
          } else {
            domainStatus = "not_found";
            console.log("[EMAIL-STATUS] Domain not found in Resend:", resendDomain);
          }
        }
      } catch (error) {
        console.error("[EMAIL-STATUS] Error checking domain:", error);
        domainStatus = "not_found";
      }
    } else {
      console.log("[EMAIL-STATUS] No API key, skipping domain check");
    }

    const response = {
      senderEmailConfigured,
      senderEmail: fromEmail || null,
      senderDisplay: fromDisplay,
      resendDomain,
      domainStatus,
      domainVerified,
      lastCheckAt: new Date().toISOString(),
    };

    console.log("[EMAIL-STATUS] Returning response:", response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[EMAIL-STATUS] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
