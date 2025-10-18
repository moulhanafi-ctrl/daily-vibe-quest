import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || Deno.env.get("WELCOME_FROM_EMAIL");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, testEmail } = await req.json();

    // Runtime environment info
    const runtime = {
      nodeEnv: Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "development",
      buildTarget: Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "preview",
      runtime: "deno-edge-function"
    };

    // Secrets status (safe to expose presence/length, not values)
    const secrets = {
      resendApiKeyPresent: !!RESEND_API_KEY,
      resendApiKeyLength: RESEND_API_KEY?.length || 0,
      resendApiKeyLast4: RESEND_API_KEY ? RESEND_API_KEY.slice(-4) : "N/A",
      resendFromEmailPresent: !!RESEND_FROM_EMAIL,
      resendFromEmail: RESEND_FROM_EMAIL || "Not configured"
    };

    // Health check
    let healthCheck = null;
    if (action === "health_check" || action === "full_diagnostics") {
      if (!RESEND_API_KEY) {
        healthCheck = {
          statusCode: 0,
          response: { error: "RESEND_API_KEY not configured" },
          category: "invalid_key",
          timestamp: new Date().toISOString()
        };
      } else {
        try {
          const response = await fetch("https://api.resend.com/domains", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
          });

          const responseData = await response.json();
          
          let category = "ok";
          if (response.status === 401) {
            category = "401_invalid_key";
          } else if (response.status === 403) {
            category = "403_forbidden";
          } else if (response.status === 429) {
            category = "429_rate_limit";
          } else if (response.status >= 500) {
            category = "5xx_provider";
          }

          healthCheck = {
            statusCode: response.status,
            response: responseData,
            category,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          healthCheck = {
            statusCode: 0,
            response: { error: error instanceof Error ? error.message : "Network error" },
            category: "network_error",
            timestamp: new Date().toISOString()
          };
        }
      }
    }

    // Test send
    let testSend = null;
    if (action === "test_send") {
      if (!RESEND_API_KEY) {
        testSend = {
          success: false,
          error: "RESEND_API_KEY not configured",
          verdict: "invalid_key",
          timestamp: new Date().toISOString()
        };
      } else if (!RESEND_FROM_EMAIL) {
        testSend = {
          success: false,
          error: "RESEND_FROM_EMAIL not configured",
          verdict: "invalid_from",
          timestamp: new Date().toISOString()
        };
      } else if (!testEmail || !testEmail.includes('@')) {
        testSend = {
          success: false,
          error: "Invalid test email address",
          verdict: "invalid_from",
          timestamp: new Date().toISOString()
        };
      } else {
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `Mostapha <${RESEND_FROM_EMAIL}>`,
              to: [testEmail],
              subject: "✅ Resend test OK",
              text: `This is a Resend connectivity test.\n\nTimestamp: ${new Date().toISOString()}\nFrom: ${RESEND_FROM_EMAIL}\nRuntime: ${runtime.runtime}\nEnvironment: ${runtime.buildTarget}\n\nIf you received this email, your Resend configuration is working correctly.`
            }),
          });

          const responseData = await response.json();

          let verdict = "sent";
          if (response.status === 200 || response.status === 202) {
            // Check if domain is verified by examining response
            if (responseData.warning || (responseData.status && responseData.status.includes('unverified'))) {
              verdict = "sender_unverified";
            }
          } else if (response.status === 401) {
            verdict = "invalid_key";
          } else if (response.status === 422 || response.status === 400) {
            verdict = "invalid_from";
          }

          testSend = {
            success: response.status === 200 || response.status === 202,
            statusCode: response.status,
            messageId: responseData.id,
            error: !response.ok ? responseData.message || responseData.error : undefined,
            response: responseData,
            verdict,
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          testSend = {
            success: false,
            error: error instanceof Error ? error.message : "Network error",
            verdict: "network_error",
            timestamp: new Date().toISOString()
          };
        }
      }
    }

    return new Response(
      JSON.stringify({
        runtime,
        secrets,
        healthCheck,
        testSend
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Email diagnostics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
