import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[CLEANUP-STORIES] Starting expired stories cleanup');

    // Get expired stories
    const { data: expiredStories, error: fetchError } = await supabaseClient
      .from('family_stories')
      .select('id, video_url, thumbnail_url')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('[CLEANUP-STORIES] Error fetching expired stories:', fetchError);
      throw fetchError;
    }

    if (!expiredStories || expiredStories.length === 0) {
      console.log('[CLEANUP-STORIES] No expired stories to clean up');
      return new Response(
        JSON.stringify({ ok: true, cleaned: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[CLEANUP-STORIES] Found ${expiredStories.length} expired stories`);

    let cleaned = 0;
    let errors = 0;

    for (const story of expiredStories) {
      try {
        // Delete video file
        if (story.video_url) {
          const videoPath = story.video_url.split('/').pop();
          if (videoPath) {
            await supabaseClient.storage
              .from('family-stories')
              .remove([videoPath]);
          }
        }

        // Delete thumbnail file
        if (story.thumbnail_url) {
          const thumbPath = story.thumbnail_url.split('/').pop();
          if (thumbPath) {
            await supabaseClient.storage
              .from('family-stories')
              .remove([thumbPath]);
          }
        }

        // Delete story record (cascades to views and reactions)
        const { error: deleteError } = await supabaseClient
          .from('family_stories')
          .delete()
          .eq('id', story.id);

        if (deleteError) throw deleteError;

        cleaned++;
        console.log(`[CLEANUP-STORIES] Cleaned story ${story.id}`);
      } catch (error) {
        console.error(`[CLEANUP-STORIES] Error cleaning story ${story.id}:`, error);
        errors++;
      }
    }

    console.log(`[CLEANUP-STORIES] Cleanup complete: ${cleaned} cleaned, ${errors} errors`);

    return new Response(
      JSON.stringify({ ok: true, cleaned, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CLEANUP-STORIES] Unexpected error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
