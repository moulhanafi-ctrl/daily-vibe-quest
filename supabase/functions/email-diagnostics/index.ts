import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || Deno.env.get("WELCOME_FROM_EMAIL");
const FALLBACK_FROM_EMAIL = "onboarding@resend.dev";

// Email validation regex
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validateAndComposeFrom(fromEmail: string | undefined): { valid: boolean; composedFrom: string; error?: string } {
  if (!fromEmail) {
    return { valid: false, composedFrom: "", error: "RESEND_FROM_EMAIL not configured" };
  }
  
  if (!EMAIL_REGEX.test(fromEmail)) {
    return { valid: false, composedFrom: "", error: `Invalid email format: ${fromEmail}` };
  }
  
  return { valid: true, composedFrom: `Mostapha <${fromEmail}>` };
}

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

    // Validate and compose from field
    const fromValidation = validateAndComposeFrom(RESEND_FROM_EMAIL);
    
    // Secrets status (safe to expose presence/length, not values)
    const secrets = {
      resendApiKeyPresent: !!RESEND_API_KEY,
      resendApiKeyLength: RESEND_API_KEY?.length || 0,
      resendApiKeyLast4: RESEND_API_KEY ? RESEND_API_KEY.slice(-4) : "N/A",
      resendFromEmailPresent: !!RESEND_FROM_EMAIL,
      resendFromEmail: RESEND_FROM_EMAIL || "Not configured",
      resendFromEmailValid: fromValidation.valid,
      resendFromEmailComposed: fromValidation.composedFrom || "Invalid",
      resendFromEmailError: fromValidation.error
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
        let usedFallback = false;
        let attemptCount = 0;
        let lastError = "";
        
        // Try with primary sender first
        try {
          attemptCount++;
          console.log(`[Test Send] Attempt ${attemptCount}: Using primary sender: ${fromValidation.composedFrom}`);
          
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromValidation.composedFrom,
              to: [testEmail],
              subject: "✅ Resend test OK",
              text: `This is a Resend connectivity test.\n\nTimestamp: ${new Date().toISOString()}\nFrom: ${fromValidation.composedFrom}\nRuntime: ${runtime.runtime}\nEnvironment: ${runtime.buildTarget}\n\nIf you received this email, your Resend configuration is working correctly.`
            }),
          });

          const responseData = await response.json();

          // If 422 domain error, retry with fallback
          if (response.status === 422 && responseData.message?.includes("domain")) {
            console.log(`[Test Send] 422 domain error, retrying with fallback sender`);
            attemptCount++;
            usedFallback = true;
            
            const fallbackFrom = `Mostapha <${FALLBACK_FROM_EMAIL}>`;
            const fallbackResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: fallbackFrom,
                to: [testEmail],
                subject: "✅ Resend test OK (Fallback Sender)",
                text: `This is a Resend connectivity test using fallback sender.\n\nTimestamp: ${new Date().toISOString()}\nFrom: ${fallbackFrom}\nOriginal From: ${fromValidation.composedFrom}\nRuntime: ${runtime.runtime}\nEnvironment: ${runtime.buildTarget}\n\nNote: Your primary domain is not verified, so we used the fallback sender. Please verify your domain in Resend.`
              }),
            });

            const fallbackData = await fallbackResponse.json();
            
            let verdict = "sent";
            if (fallbackResponse.status === 200 || fallbackResponse.status === 202) {
              verdict = "sender_unverified_fallback";
            } else if (fallbackResponse.status === 401) {
              verdict = "invalid_key";
            } else if (fallbackResponse.status === 422 || fallbackResponse.status === 400) {
              verdict = "invalid_from";
            }

            testSend = {
              success: fallbackResponse.status === 200 || fallbackResponse.status === 202,
              statusCode: fallbackResponse.status,
              messageId: fallbackData.id,
              error: !fallbackResponse.ok ? fallbackData.message || fallbackData.error : undefined,
              response: fallbackData,
              verdict,
              usedFallback: true,
              originalError: responseData.message,
              attempts: attemptCount,
              timestamp: new Date().toISOString()
            };
          } else {
            // Primary sender worked or different error
            let verdict = "sent";
            if (response.status === 200 || response.status === 202) {
              if (responseData.warning || (responseData.status && typeof responseData.status === 'string' && responseData.status.includes('unverified'))) {
                verdict = "sender_unverified";
              }
            } else if (response.status === 401) {
              verdict = "invalid_key";
            } else if (response.status === 403) {
              verdict = (typeof responseData.message === 'string' && responseData.message.toLowerCase().includes('only send testing emails'))
                ? "test_mode_only"
                : "403_forbidden";
            } else if (response.status === 422 || response.status === 400) {
              verdict = "invalid_from";
            }

            testSend = {
              success: response.status === 200 || response.status === 202,
              statusCode: response.status,
              messageId: responseData.id,
              error: !response.ok ? (responseData.message || responseData.error || "Unknown error") : undefined,
              response: responseData,
              verdict,
              usedFallback: false,
              attempts: attemptCount,
              timestamp: new Date().toISOString()
            };
          }
        } catch (error) {
          testSend = {
            success: false,
            error: error instanceof Error ? error.message : "Network error",
            verdict: "network_error",
            usedFallback,
            attempts: attemptCount,
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
