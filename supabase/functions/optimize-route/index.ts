import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Tarayıcıdan gelen isteklere izin vermek için CORS başlıkları
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight isteğini yönet
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // React uygulamasından gelen başlangıç ve ara noktaları al
    const { origin, waypoints } = await req.json()
    
    // Supabase projenizin ayarlarından güvenli bir şekilde API anahtarını al
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')

    if (!apiKey) {
      throw new Error('Google Maps API anahtarı ortam değişkenlerinde ayarlanmamış.')
    }
    if (!origin || !waypoints) {
      throw new Error('Başlangıç ve ara noktalar zorunludur.')
    }

    // Google Directions API'sine isteği oluştur
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${origin}&waypoints=optimize:true|${waypoints}&key=${apiKey}`;
    
    // Google'a isteği gönder
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(data.error_message || `Google Maps API Hatası: ${data.status}`);
    }

    // Başarılı sonucu React uygulamasına geri döndür
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Hata durumunda hatayı React uygulamasına geri döndür
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})