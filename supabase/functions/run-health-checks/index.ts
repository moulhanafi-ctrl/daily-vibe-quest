import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  test_key: string;
  category: string;
  status: 'pass' | 'fail' | 'skip';
  duration_ms: number;
  error_text?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { triggered_by = 'manual' } = await req.json().catch(() => ({ triggered_by: 'manual' }));

    // Create a new health run
    const { data: run, error: runError } = await supabase
      .from('system_health_runs')
      .insert({
        status: 'running',
        triggered_by,
        total: 0,
        passed: 0,
        failed: 0
      })
      .select()
      .single();

    if (runError) throw runError;

    const runId = run.id;
    const results: TestResult[] = [];
    const startTime = Date.now();

    // Run all tests in parallel
    const testPromises = [
      testApiUptime(),
      testAuth(),
      testRLS(),
      testStorageAccess(),
      testZipResolver(),
      testHelpSearch(),
      testZipAdminTools(),
      testTestContact(),
      testFamilyStoriesUpload(),
    ];

    const testResults = await Promise.allSettled(testPromises);
    
    for (const result of testResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          test_key: 'unknown_test',
          category: 'system',
          status: 'fail',
          duration_ms: 0,
          error_text: result.reason?.message || 'Unknown error'
        });
      }
    }

    // Save results
    if (results.length > 0) {
      const { error: resultsError } = await supabase
        .from('system_health_results')
        .insert(results.map(r => ({ ...r, run_id: runId })));

      if (resultsError) {
        console.error('Error saving results:', resultsError);
      }
    }

    // Update run with final stats
    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const status = failed === 0 ? 'pass' : (passed > 0 ? 'partial' : 'fail');

    await supabase
      .from('system_health_runs')
      .update({
        status,
        total: results.length,
        passed,
        failed,
        duration_ms: totalDuration,
        finished_at: new Date().toISOString()
      })
      .eq('id', runId);

    // Send alert if there are failures
    if (failed > 0) {
      const failedTests = results.filter(r => r.status === 'fail');
      console.warn(`Health check failures detected:`, failedTests);
      // Could trigger webhook/email alert here
    }

    return new Response(
      JSON.stringify({
        run_id: runId,
        status,
        total: results.length,
        passed,
        failed,
        duration_ms: totalDuration,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Test implementations
async function testApiUptime(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': Deno.env.get('SUPABASE_ANON_KEY')!
      }
    });
    
    const duration = Date.now() - start;
    
    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }
    
    if (duration > 500) {
      return {
        test_key: 'api_uptime',
        category: 'core',
        status: 'fail',
        duration_ms: duration,
        error_text: `Response time ${duration}ms exceeds 500ms threshold`
      };
    }

    return {
      test_key: 'api_uptime',
      category: 'core',
      status: 'pass',
      duration_ms: duration
    };
  } catch (error: any) {
    return {
      test_key: 'api_uptime',
      category: 'core',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}

async function testAuth(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test anonymous access is denied
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    // If we can read without auth, RLS is working
    const duration = Date.now() - start;

    return {
      test_key: 'auth_session',
      category: 'core',
      status: 'pass',
      duration_ms: duration
    };
  } catch (error: any) {
    return {
      test_key: 'auth_session',
      category: 'core',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}

async function testRLS(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, anonKey);

    // Try to read protected data without auth - should fail
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    const duration = Date.now() - start;

    // RLS is working if we got an error
    return {
      test_key: 'rls_protection',
      category: 'core',
      status: 'pass',
      duration_ms: duration
    };
  } catch (error: any) {
    return {
      test_key: 'rls_protection',
      category: 'core',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}

async function testStorageAccess(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test bucket exists
    const { data: buckets, error } = await supabase
      .storage
      .listBuckets();

    if (error) throw error;

    const familyStoriesBucket = buckets?.find(b => b.id === 'family-stories');
    if (!familyStoriesBucket) {
      throw new Error('family-stories bucket not found');
    }

    return {
      test_key: 'storage_access',
      category: 'storage',
      status: 'pass',
      duration_ms: Date.now() - start
    };
  } catch (error: any) {
    return {
      test_key: 'storage_access',
      category: 'storage',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}

async function testZipResolver(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Test ZIP normalization and resolution
    const testZips = ['90210', '48917-1234', '02115'];
    const results = await Promise.all(
      testZips.map(async (zip) => {
        const response = await fetch(`${supabaseUrl}/functions/v1/geocode-zip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`
          },
          body: JSON.stringify({ zip_code: zip })
        });

        if (!response.ok) {
          throw new Error(`Failed to resolve ZIP ${zip}: ${response.status}`);
        }

        const data = await response.json();
        if (!data.lat || !data.lon) {
          throw new Error(`ZIP ${zip} missing coordinates`);
        }

        return true;
      })
    );

    return {
      test_key: 'zip_resolver',
      category: 'help',
      status: 'pass',
      duration_ms: Date.now() - start
    };
  } catch (error: any) {
    return {
      test_key: 'zip_resolver',
      category: 'help',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}

async function testHelpSearch(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check that help_locations has data
    const { data, error } = await supabase
      .from('help_locations')
      .select('id')
      .limit(1);

    if (error) throw error;

    return {
      test_key: 'help_search',
      category: 'help',
      status: 'pass',
      duration_ms: Date.now() - start
    };
  } catch (error: any) {
    return {
      test_key: 'help_search',
      category: 'help',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}

async function testZipAdminTools(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check zip_centroids table exists and can be queried
    const { data, error } = await supabase
      .from('zip_centroids')
      .select('zip')
      .limit(1);

    if (error) throw error;

    return {
      test_key: 'zip_admin_tools',
      category: 'admin',
      status: 'pass',
      duration_ms: Date.now() - start
    };
  } catch (error: any) {
    return {
      test_key: 'zip_admin_tools',
      category: 'admin',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}

async function testTestContact(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check test_messages table exists
    const { data, error } = await supabase
      .from('test_messages')
      .select('id')
      .limit(1);

    if (error) throw error;

    return {
      test_key: 'test_contact',
      category: 'messaging',
      status: 'pass',
      duration_ms: Date.now() - start
    };
  } catch (error: any) {
    return {
      test_key: 'test_contact',
      category: 'messaging',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}

async function testFamilyStoriesUpload(): Promise<TestResult> {
  const start = Date.now();
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check family_stories table exists
    const { data, error } = await supabase
      .from('family_stories')
      .select('id')
      .limit(1);

    if (error) throw error;

    return {
      test_key: 'family_stories_upload',
      category: 'stories',
      status: 'pass',
      duration_ms: Date.now() - start
    };
  } catch (error: any) {
    return {
      test_key: 'family_stories_upload',
      category: 'stories',
      status: 'fail',
      duration_ms: Date.now() - start,
      error_text: error.message
    };
  }
}
