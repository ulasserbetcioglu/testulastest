// supabase/functions/send-push-notification/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push'; // web-push kütüphanesini import edin

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID anahtarlarınızı ortam değişkenlerinden alın
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

// web-push kütüphanesini yapılandırın
webpush.setVapidDetails(
  'mailto:bilgi@ilaclamatik.com', // BURAYI KENDİ E-POSTA ADRESİNİZLE DEĞİŞTİRİN
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { operator_id, title, body, url } = await req.json();

    if (!operator_id || !title || !body) {
      throw new Error('operator_id, title ve body zorunludur.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Operatörün push aboneliğini veritabanından çekin
    const { data: subscriptionData, error: dbError } = await supabaseAdmin
      .from('operator_push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('operator_id', operator_id)
      .single();

    if (dbError) {
      if (dbError.code === 'PGRST116') { // No rows found
        return new Response(JSON.stringify({ message: 'Operatör için aktif abonelik bulunamadı.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      throw dbError;
    }

    const pushSubscription = {
      endpoint: subscriptionData.endpoint,
      keys: {
        p256dh: subscriptionData.p256dh,
        auth: subscriptionData.auth,
      },
    };

    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: '/ilaclamatik-logo.png', // Bildirimde gösterilecek ikon
      data: { url: url || '/' }, // Tıklanınca açılacak URL
    });

    // Push bildirimini gönderin
    await webpush.sendNotification(pushSubscription, payload);

    return new Response(JSON.stringify({ message: 'Bildirim başarıyla gönderildi.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Push bildirim gönderme hatası:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
