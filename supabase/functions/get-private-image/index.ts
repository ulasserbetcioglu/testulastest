// supabase/functions/get-private-image/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('filePath');

    if (!filePath) {
      throw new Error('File path is required.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing.');
    }
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user's JWT
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid or missing token.');
    }

    // Fetch the private file from Storage
    const { data: fileBlob, error: storageError } = await supabaseAdmin.storage
      .from('documents') // Your bucket name (e.g., 'documents')
      .download(filePath);

    if (storageError) {
      throw new Error(`Failed to download file: ${storageError.message}`);
    }

    if (!fileBlob) {
      throw new Error('File not found.');
    }

    // Determine content type (basic example, could be more robust)
    const contentType = fileBlob.type || 'application/octet-stream';

    return new Response(fileBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for a short period
      },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
