import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DomainStatus {
  id: string;
  name: string;
  status: string;
  records: {
    record: string;
    name: string;
    type: string;
    value: string;
    status: string;
  }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    console.log("Fetching domain verification status from Resend...");

    // Fetch all domains from Resend
    const response = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Domains fetched:", data);

    // Check verification status
    const domains = data.data || [];
    const verificationStatus = domains.map((domain: DomainStatus) => {
      const dkimRecord = domain.records?.find((r) => r.record === "DKIM");
      const spfRecord = domain.records?.find((r) => r.record === "SPF");
      
      return {
        domain: domain.name,
        status: domain.status,
        dkim: {
          verified: dkimRecord?.status === "verified",
          status: dkimRecord?.status || "not_started",
        },
        spf: {
          verified: spfRecord?.status === "verified",
          status: spfRecord?.status || "not_started",
        },
        allVerified: domain.status === "verified",
      };
    });

    console.log("Verification status:", verificationStatus);

    return new Response(
      JSON.stringify({
        domains: verificationStatus,
        hasVerifiedDomain: verificationStatus.some((d: any) => d.allVerified),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error checking email domain status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        domains: [],
        hasVerifiedDomain: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
