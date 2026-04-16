// supabase/functions/send-schedule-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  // Tarayıcının CORS ön kontrolü için gönderdiği OPTIONS isteğini bu blok karşılar.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ✅ YENİ: Supabase istemcisi, veritabanına kayıt eklemek için burada oluşturuluyor.
  // Bu, fonksiyonun RLS kurallarını atlayarak işlem yapmasını sağlar.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const { to, subject, html } = await req.json();

  try {
    if (!RESEND_API_KEY) throw new Error("Resend API anahtarı bulunamadı.");
    if (!to || !subject || !html) throw new Error("Eksik parametreler: 'to', 'subject' ve 'html' zorunludur.");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "İlaçlamatik <bilgi@ilaclamatik.com>", // Kendi doğruladığınız e-posta adresinizle değiştirin
        to: to,
        subject: subject,
        html: html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
        const errorMessage = data?.message || 'E-posta gönderilemedi.';
        console.error("Resend API Error:", data);
        throw new Error(errorMessage);
    }

    // ✅ YENİ: Başarılı gönderimi veritabanına kaydet
    await supabase.from('email_logs').insert({
        recipient: to,
        subject: subject,
        body: html,
        status: 'success'
    });

    return new Response(JSON.stringify({ message: "E-posta başarıyla gönderildi." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    // ✅ YENİ: Başarısız gönderimi veritabanına kaydet
    await supabase.from('email_logs').insert({
        recipient: to,
        subject: subject,
        body: html,
        status: 'failed',
        error_message: error.message
    });

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
