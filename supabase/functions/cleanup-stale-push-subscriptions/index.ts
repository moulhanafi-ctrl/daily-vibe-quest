import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth header to verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is admin
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    // Get all push subscriptions
    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from('push_subscriptions')
      .select('*');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[CLEANUP] Found ${subscriptions?.length || 0} total subscriptions`);

    // Filter for stale subscriptions (old domain or invalid endpoints)
    const staleSubscriptions = subscriptions?.filter(sub => {
      try {
        const endpoint = sub.endpoint;
        // Check if endpoint contains old domain or is invalid
        return endpoint.includes('dailyvibecheck.com') || 
               endpoint.includes('localhost') ||
               endpoint.includes('127.0.0.1') ||
               !endpoint.includes('vibecheckapps.com');
      } catch {
        return true; // Remove if we can't parse
      }
    }) || [];

    console.log(`[CLEANUP] Found ${staleSubscriptions.length} stale subscriptions`);

    if (staleSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No stale subscriptions found',
          removed: 0,
          total: subscriptions?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Delete stale subscriptions
    const idsToDelete = staleSubscriptions.map(sub => sub.id);
    
    const { error: deleteError } = await supabaseClient
      .from('push_subscriptions')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`[CLEANUP] Successfully removed ${staleSubscriptions.length} stale subscriptions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Removed ${staleSubscriptions.length} stale subscriptions`,
        removed: staleSubscriptions.length,
        total: subscriptions?.length || 0,
        remaining: (subscriptions?.length || 0) - staleSubscriptions.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[CLEANUP] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});