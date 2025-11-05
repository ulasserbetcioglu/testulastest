// supabase/functions/create-operator/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

// CORS başlıkları, uygulamanızın bu fonksiyona erişebilmesi için gereklidir.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // OPTIONS isteği, tarayıcının CORS ön kontrolü için gönderdiği bir istektir.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Supabase admin istemcisini oluşturun. Bu, RLS kurallarını atlamanızı sağlar.
    // Proje URL'nizi ve service_role anahtarınızı Supabase ayarlarından almalısınız.
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // İstek gövdesinden operatör bilgilerini alın.
    const { name, email, phone, status, password } = await req.json();

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: "E-posta, şifre ve isim alanları zorunludur." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Adım: Auth kullanıcısını oluşturun.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // E-posta doğrulaması gerektirmemesi için true yapın.
      user_metadata: {
        name: name,
        role: 'operator',
      },
    });

    if (authError) {
      throw authError;
    }

    const newUserId = authData.user.id;

    // 2. Adım: 'operators' tablosuna kaydı ekleyin.
    const { error: insertError } = await supabaseAdmin
      .from("operators")
      .insert({
        id: newUserId, // Auth kullanıcısının ID'sini birincil anahtar olarak kullanın.
        auth_id: newUserId,
        name: name,
        email: email,
        phone: phone,
        status: status,
      });

    if (insertError) {
      // Eğer 'operators' tablosuna ekleme başarısız olursa, oluşturulan auth kullanıcısını silin.
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      throw insertError;
    }

    // Her şey başarılıysa, başarılı yanıtı döndürün.
    return new Response(JSON.stringify({ message: "Operatör başarıyla oluşturuldu." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // Herhangi bir hata olursa, hatayı yakalayın ve döndürün.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
