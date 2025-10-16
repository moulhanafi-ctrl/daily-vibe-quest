import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { verifyHmacSignature } from "../_shared/hmac-validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

// Curated list of wellness-focused YouTube channels
const WELLNESS_CHANNELS = [
  'UC3JhfsgFPLSLNEROQCdj-GQ', // Headspace
  'UCv1nSfKM1P1ZiYLo1gMZQlw', // The Mindful Movement
  'UC-DS6UJI7C19bXmgJfb0YEg', // Yoga With Adriene
];

const FALLBACK_VIDEO = {
  videoId: 'inpok4MKVLM', // Generic calm nature video
  title: 'Mindful Moment',
  channelTitle: 'Wellness Break',
  duration: 45,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!await verifyHmacSignature(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: Invalid signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[YOUTUBE-WELLNESS] Starting YouTube wellness shorts fetch');

    // Calculate next Saturday
    const detroitTime = new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' });
    const now = new Date(detroitTime);
    const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    nextSaturday.setHours(19, 0, 0, 0);
    
    const weekKey = nextSaturday.toISOString().split('T')[0];
    console.log(`[YOUTUBE-WELLNESS] Fetching for ${weekKey}`);

    let videos = [];

    // Try to fetch from YouTube API if key is available
    if (youtubeApiKey) {
      try {
        const channelId = WELLNESS_CHANNELS[Math.floor(Math.random() * WELLNESS_CHANNELS.length)];
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=date&type=video&videoDuration=short&key=${youtubeApiKey}`;
        
        const searchResponse = await fetch(searchUrl);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          
          // Get video details including duration
          const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${youtubeApiKey}`;
          
          const detailsResponse = await fetch(detailsUrl);
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            
            videos = detailsData.items
              .filter((video: any) => {
                const duration = parseDuration(video.contentDetails.duration);
                return duration >= 30 && duration <= 60; // 30-60 seconds
              })
              .map((video: any) => ({
                videoId: video.id,
                title: video.snippet.title,
                channelTitle: video.snippet.channelTitle,
                duration: parseDuration(video.contentDetails.duration),
              }));
            
            console.log(`[YOUTUBE-WELLNESS] Found ${videos.length} suitable videos`);
          }
        }
      } catch (error) {
        console.error('[YOUTUBE-WELLNESS] YouTube API error:', error);
      }
    }

    // Use fallback if no videos found
    if (videos.length < 2) {
      console.log('[YOUTUBE-WELLNESS] Using fallback videos');
      videos = [FALLBACK_VIDEO, { ...FALLBACK_VIDEO, videoId: 'c1-Wssmr9zs' }];
    }

    // Select 2 random videos
    const selectedVideos = videos.sort(() => Math.random() - 0.5).slice(0, 2);

    // Save to trivia_break_videos
    const insertPromises = selectedVideos.map((video: any, index: number) =>
      supabase.from('trivia_break_videos').upsert({
        week_key: weekKey,
        break_position: index + 1,
        title: video.title,
        tip_content: 'Take a moment to relax and center yourself. This wellness break will help you refocus.',
        duration_seconds: video.duration,
        video_url: `https://www.youtube.com/embed/${video.videoId}`,
        thumbnail_url: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
        captions_url: null,
        youtube_video_id: video.videoId,
        channel_name: video.channelTitle,
      }, {
        onConflict: 'week_key,break_position'
      })
    );

    await Promise.all(insertPromises);

    console.log('[YOUTUBE-WELLNESS] Successfully saved wellness videos');

    return new Response(
      JSON.stringify({ 
        success: true, 
        week_key: weekKey,
        videos: selectedVideos.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[YOUTUBE-WELLNESS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const minutes = parseInt(match[1] || '0', 10);
  const seconds = parseInt(match[2] || '0', 10);
  return minutes * 60 + seconds;
}
