# Sentry Edge Functions Integration Examples

## Basic Error Capture

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { captureException, captureMessage } from '../_shared/sentry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    // Your business logic
    const result = await processUser(userId);
    
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Capture error with context
    await captureException(error, {
      tags: { 
        function: 'process-user',
        severity: 'high' 
      },
      extra: { 
        requestMethod: req.method,
        userAgent: req.headers.get('user-agent')
      }
    });
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

## Payment Processing with Detailed Context

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { captureException, captureMessage } from '../_shared/sentry.ts';

serve(async (req) => {
  try {
    const { amount, currency, customerId } = await req.json();
    
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
    });
    
    // Log successful payment
    await captureMessage('Payment intent created', {
      level: 'info',
      tags: { 
        function: 'create-payment',
        payment_status: 'initiated' 
      },
      extra: {
        amount,
        currency,
        paymentIntentId: paymentIntent.id
      }
    });
    
    return new Response(
      JSON.stringify({ paymentIntent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Capture payment error with detailed context
    await captureException(error, {
      tags: { 
        function: 'create-payment',
        error_type: 'payment_failure',
        severity: 'critical'
      },
      extra: {
        amount: req.json().amount,
        currency: req.json().currency,
        stripeErrorType: error.type,
        stripeErrorCode: error.code
      },
      level: 'fatal'
    });
    
    return new Response(
      JSON.stringify({ error: 'Payment processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Authenticated Request with User Context

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { captureException } from '../_shared/sentry.ts';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { 
      global: { 
        headers: { Authorization: req.headers.get('Authorization')! } 
      } 
    }
  );

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Your protected logic
    const result = await performProtectedAction(user.id);
    
    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // Capture with user context if available
    const { data: { user } } = await supabase.auth.getUser();
    
    await captureException(error, {
      tags: { 
        function: 'protected-action',
        authenticated: !!user 
      },
      extra: {
        userId: user?.id,
        userEmail: user?.email,
        errorMessage: error.message
      }
    });
    
    return new Response(
      JSON.stringify({ error: 'Request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Database Operation with Retry Logic

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { captureException, captureMessage } from '../_shared/sentry.ts';

async function retryOperation(operation: () => Promise<any>, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Log retry attempt
      await captureMessage(`Retry attempt ${attempt} failed`, {
        level: 'warning',
        tags: { 
          retry_attempt: attempt.toString(),
          max_retries: maxRetries.toString()
        },
        extra: { error: error.message }
      });
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  try {
    const result = await retryOperation(async () => {
      const { data, error } = await supabase
        .from('orders')
        .insert({ /* order data */ })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    });
    
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    await captureException(error, {
      tags: { 
        function: 'create-order',
        operation: 'database_insert',
        severity: 'high'
      },
      extra: {
        retriesExhausted: true,
        errorCode: error.code
      },
      level: 'error'
    });
    
    return new Response(
      JSON.stringify({ error: 'Failed to create order' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Cron Job with Success/Failure Tracking

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { captureMessage, captureException } from '../_shared/sentry.ts';

serve(async (req) => {
  const startTime = Date.now();
  
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Perform cron job
    const results = await performScheduledTask();
    
    const duration = Date.now() - startTime;
    
    // Log successful execution
    await captureMessage('Cron job completed successfully', {
      level: 'info',
      tags: { 
        job_type: 'scheduled_cleanup',
        execution_status: 'success'
      },
      extra: {
        duration_ms: duration,
        items_processed: results.count,
        timestamp: new Date().toISOString()
      }
    });
    
    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Capture cron failure
    await captureException(error, {
      tags: { 
        job_type: 'scheduled_cleanup',
        execution_status: 'failed',
        severity: 'critical'
      },
      extra: {
        duration_ms: duration,
        timestamp: new Date().toISOString()
      },
      level: 'fatal'
    });
    
    return new Response(
      JSON.stringify({ error: 'Cron job failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

## Tips for Edge Functions

1. **Always use try-catch**: Wrap your entire handler in try-catch to ensure errors are captured
2. **Add context**: Use tags and extra data to make debugging easier
3. **Set severity levels**: Use appropriate levels (info, warning, error, fatal)
4. **Don't block responses**: Sentry calls are async but don't await them if performance is critical
5. **Rate limit**: Consider not sending errors for expected failures (like 400 bad requests)
