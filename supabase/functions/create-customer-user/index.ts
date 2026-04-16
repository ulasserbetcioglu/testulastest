import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers, tarayıcının fonksiyona erişmesine izin vermek için gereklidir.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Admin kullanıcının e-posta adresi. Sadece bu kullanıcı bu fonksiyonu çalıştırabilir.
const ADMIN_EMAIL = 'admin@ilaclamatik.com';

Deno.serve(async (req) => {
  // CORS preflight isteğini işle
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Gelen isteğin gövdesinden (body) email ve password'u al
    const { email, password } = await req.json();
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    // Supabase admin istemcisini oluştur
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // İstek yapan kullanıcının kimliğini doğrula
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization Header');
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(jwt);

    if (authError) throw authError;

    // İstek yapan kullanıcının admin olup olmadığını kontrol et
    if (callingUser?.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Yeni kullanıcıyı admin yetkisiyle oluştur
    const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Kullanıcının e-postasını doğrulamasına gerek kalmaz
    });

    if (createError) {
      throw createError;
    }

    // Başarılı olursa, yeni oluşturulan kullanıcının ID ve e-postasını geri döndür
    return new Response(JSON.stringify({ id: newUser.id, email: newUser.email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
