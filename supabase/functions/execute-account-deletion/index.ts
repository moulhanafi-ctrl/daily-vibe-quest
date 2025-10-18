import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    const userId = user.id;
    const userEmail = user.email;

    // Get client IP and user agent for audit
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    console.log(`Starting account deletion for user ${userId}`);

    // Log deletion start to compliance audit
    await supabase.from('compliance_audit').insert({
      user_id: userId,
      action: 'account_deletion_started',
      details: {
        email: userEmail,
        timestamp: new Date().toISOString()
      },
      ip_address: clientIp,
      user_agent: userAgent
    });

    // 1. Delete from storage buckets
    const buckets = ['voice-notes', 'data-exports', 'family-stories', 'store-digital'];
    
    for (const bucket of buckets) {
      try {
        const { data: files } = await supabase.storage
          .from(bucket)
          .list(userId);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${userId}/${f.name}`);
          await supabase.storage.from(bucket).remove(filePaths);
          console.log(`Deleted ${filePaths.length} files from ${bucket}`);
        }
      } catch (error) {
        console.error(`Error deleting from bucket ${bucket}:`, error);
      }
    }

    // 2. Delete user data from all tables (cascading will handle most)
    // The foreign key constraints with ON DELETE CASCADE will handle:
    // - profiles (and all tables referencing profiles)
    // - journal_entries
    // - moods
    // - cart_items
    // - orders
    // - etc.

    // 3. Delete from auth.users (this triggers all CASCADE deletions)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      throw new Error(`Failed to delete user from auth: ${deleteAuthError.message}`);
    }

    console.log(`Successfully deleted user ${userId} from auth`);

    // 4. Log successful deletion to compliance audit
    await supabase.from('compliance_audit').insert({
      user_id: userId,
      action: 'account_deletion_completed',
      details: {
        email: userEmail,
        timestamp: new Date().toISOString(),
        buckets_cleaned: buckets,
        auth_deleted: true
      },
      ip_address: clientIp,
      user_agent: userAgent
    });

    // 5. Mark deletion request as completed
    await supabase
      .from('data_deletion_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('status', 'pending');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account successfully deleted'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Account deletion error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to delete account'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
