import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Belirli bir e-posta adresini admin olarak tanımlıyoruz.
// Daha gelişmiş bir sistem için Supabase JWT'deki özel talepleri (custom claims) kullanabilirsiniz.
const ADMIN_EMAIL = 'admin@ilaclamatik.com';

Deno.serve(async (req) => {
  // CORS preflight isteği için bu blok zorunludur.
  // Tarayıcı, asıl istek (POST) gönderilmeden önce bu OPTIONS isteğini göndererek
  // sunucunun CORS'a izin verip vermediğini kontrol eder.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase admin istemcisini oluşturuyoruz. Bu istemci, kullanıcı verilerine
    // erişim gibi ayrıcalıklı işlemler için gereklidir ve service_role anahtarını kullanır.
    // Bu anahtarı Supabase Proje Ayarları > API bölümünden alıp environment variable olarak ayarlamalısınız.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // İstek başlığından (Authorization header) JWT'yi alıyoruz.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization Header');
    }
    const jwt = authHeader.replace('Bearer ', '');

    // JWT'yi kullanarak isteği yapan kullanıcının kimliğini doğruluyoruz.
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError) {
      throw userError;
    }

    // Kullanıcının admin olup olmadığını e-posta adresine göre kontrol ediyoruz.
    if (user?.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Admin yetkisine sahipse, tüm kullanıcıları listeliyoruz.
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }
    
    // Sadece gerekli bilgileri (id ve email) ayıklayıp geri döndürüyoruz.
    const userList = users.map(u => ({ id: u.id, email: u.email }));

    return new Response(JSON.stringify(userList), {
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

/* ÖNEMLİ:
  Bu fonksiyonun çalışması için projenizde `supabase/functions/_shared/cors.ts`
  adında bir dosya oluşturup aşağıdaki içeriği eklemeniz gerekmektedir:

  export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  Bu dosya, CORS başlıklarını merkezi bir yerden yönetmenizi sağlar.
*/