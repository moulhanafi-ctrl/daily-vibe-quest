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
    const { format } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // Get all journal entries for the user
    const { data: entries, error: entriesError } = await supabaseClient
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (entriesError) {
      throw entriesError;
    }

    if (!entries || entries.length === 0) {
      throw new Error('No journal entries found');
    }

    let content = '';
    let contentType = '';
    let filename = '';

    if (format === 'txt') {
      // Generate plain text format
      content = entries.map(entry => {
        let text = `Date: ${new Date(entry.date).toLocaleDateString()}\n`;
        if (entry.title) text += `Title: ${entry.title}\n`;
        if (entry.mood) text += `Mood: ${['😢', '😕', '😐', '🙂', '😊'][entry.mood - 1]}\n`;
        if (entry.body) text += `\n${entry.body}\n`;
        if (entry.transcript) text += `\nTranscript: ${entry.transcript}\n`;
        if (entry.tags?.length) text += `\nTags: ${entry.tags.join(', ')}\n`;
        text += '\n' + '='.repeat(80) + '\n\n';
        return text;
      }).join('');

      contentType = 'text/plain';
      filename = `journal-export-${new Date().toISOString().split('T')[0]}.txt`;
    } else if (format === 'pdf') {
      // Generate HTML that can be converted to PDF client-side
      content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Journal</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #4A90E2; padding-bottom: 10px; }
    .entry { margin-bottom: 40px; page-break-inside: avoid; }
    .entry-header { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
    .entry-date { font-weight: bold; color: #4A90E2; }
    .entry-title { font-size: 1.2em; margin: 10px 0; }
    .entry-mood { font-size: 1.5em; }
    .entry-body { line-height: 1.6; white-space: pre-wrap; }
    .entry-tags { margin-top: 15px; }
    .tag { display: inline-block; background: #e8f4f8; padding: 5px 10px; border-radius: 4px; margin-right: 8px; font-size: 0.9em; }
    @media print {
      .entry { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>My Journal</h1>
  <p>Exported on ${new Date().toLocaleDateString()}</p>
  ${entries.map(entry => `
    <div class="entry">
      <div class="entry-header">
        <div class="entry-date">${new Date(entry.date).toLocaleDateString()}</div>
        ${entry.title ? `<div class="entry-title">${entry.title}</div>` : ''}
        ${entry.mood ? `<div class="entry-mood">${['😢', '😕', '😐', '🙂', '😊'][entry.mood - 1]}</div>` : ''}
      </div>
      ${entry.body ? `<div class="entry-body">${entry.body}</div>` : ''}
      ${entry.transcript ? `<div class="entry-body"><strong>Transcript:</strong><br>${entry.transcript}</div>` : ''}
      ${entry.tags?.length ? `<div class="entry-tags">${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
    </div>
  `).join('')}
</body>
</html>`;

      contentType = 'text/html';
      filename = `journal-export-${new Date().toISOString().split('T')[0]}.html`;
    }

    console.log(`[EXPORT] Generated ${format} export for user ${user.id}, ${entries.length} entries`);

    return new Response(
      JSON.stringify({ 
        content,
        filename,
        contentType,
        entriesCount: entries.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[EXPORT] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
