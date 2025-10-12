/**
 * HMAC Signature Validation for Cron-Triggered Edge Functions
 * 
 * Protects public endpoints from abuse by verifying HMAC-SHA256 signatures.
 * Cron jobs must include 'x-webhook-signature' header with valid signature.
 */

const WEBHOOK_SECRET = Deno.env.get('CRON_WEBHOOK_SECRET');

if (!WEBHOOK_SECRET) {
  console.warn('⚠️  CRON_WEBHOOK_SECRET not set - HMAC validation disabled');
}

/**
 * Verifies HMAC-SHA256 signature from cron webhook
 * @param req - Incoming HTTP request with signature header
 * @returns true if signature is valid, false otherwise
 */
export async function verifyHmacSignature(req: Request): Promise<boolean> {
  // If no secret configured, allow request (dev mode)
  if (!WEBHOOK_SECRET) {
    console.warn('⚠️  HMAC validation skipped - no secret configured');
    return true;
  }

  const signature = req.headers.get('x-webhook-signature');
  if (!signature) {
    console.error('❌ HMAC validation failed: Missing signature header');
    return false;
  }

  try {
    // Clone request to read body without consuming it
    const clonedReq = req.clone();
    const body = await clonedReq.text();

    // Generate expected HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expectedSigBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    // Convert to hex string
    const expectedSig = Array.from(new Uint8Array(expectedSigBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Timing-safe comparison
    const isValid = timingSafeEqual(signature, expectedSig);
    
    if (!isValid) {
      console.error('❌ HMAC validation failed: Invalid signature');
    } else {
      console.log('✅ HMAC validation passed');
    }

    return isValid;
  } catch (error) {
    console.error('❌ HMAC validation error:', error);
    return false;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
