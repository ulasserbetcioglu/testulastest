import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS (Cross-Origin Resource Sharing) ayarları
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
    // Supabase admin istemcisini oluştur (service_role key ile)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // İstekten gelen verileri al
    const { email, password, kisaIsim, cariIsim, adres, sehir, telefon, taxNumber, taxOffice, price, priceType } = await req.json()

    // 1. Adım: Yönetici olarak yeni kullanıcıyı Auth tablosunda oluştur
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Kullanıcının e-postasını doğrulamasına gerek kalmaz
      user_metadata: { role: 'customer', full_name: kisaIsim }
    })

    if (authError) {
      console.error('Auth user creation error:', authError.message);
      return new Response(JSON.stringify({ error: `Kullanıcı oluşturulamadı: ${authError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const newUserId = authData.user.id;

    // 2. Adım: 'customers' tablosuna müşteri bilgilerini ekle
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({
        id: newUserId, // Auth ID'si ile aynı ID'yi kullanmak en iyi pratiktir
        auth_id: newUserId, // Ayrı bir auth_id sütunu varsa bunu da ekleyin
        kisa_isim: kisaIsim,
        cari_isim: cariIsim,
        adres: adres,
        sehir: sehir,
        telefon: telefon,
        email: email,
        tax_number: taxNumber,
        tax_office: taxOffice
      })
      .select()
      .single();

    if (customerError) {
      // Eğer customers tablosuna eklerken hata olursa, oluşturulan auth kullanıcısını silerek işlemi geri al
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      console.error('Customer profile creation error:', customerError.message);
      return new Response(JSON.stringify({ error: `Müşteri profili oluşturulamadı: ${customerError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // 3. Adım: Fiyatlandırma bilgisini ekle
    if (priceType !== 'none' && price) {
      const pricingData = {
        customer_id: newUserId,
        monthly_price: priceType === 'monthly' ? parseFloat(price) : null,
        per_visit_price: priceType === 'per_visit' ? parseFloat(price) : null,
      };
      const { error: pricingError } = await supabaseAdmin
        .from('customer_pricing')
        .insert(pricingData);

      if (pricingError) {
        // Hata durumunda logla ama işlemi durdurma, bu kritik bir hata olmayabilir.
        console.error('Pricing creation error:', pricingError.message);
      }
    }

    // Başarılı olursa oluşturulan müşteri verisini döndür
    return new Response(JSON.stringify({ customer: customerData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Unexpected error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})