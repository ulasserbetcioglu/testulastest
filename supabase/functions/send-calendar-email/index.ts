import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend'
import { format } from "https://deno.land/std@0.208.0/datetime/mod.ts";

// CORS (Cross-Origin Resource Sharing) ayarları
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// E-posta için HTML şablonu oluşturan fonksiyon
const createEmailHtml = (customerName: string, branchName: string | undefined, month: string, visitDates: string[]) => {
  const formattedDates = visitDates.map(date => 
    `<li>${format(new Date(date), "dd MMMM yyyy, EEEE HH:mm", { locale: "tr" })}</li>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${month} Ziyaret Takvimi</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .header { background-color: #2563eb; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 32px; color: #334155; }
        .content p { line-height: 1.6; }
        .content strong { color: #1e293b; }
        .visit-list { list-style-type: none; padding: 0; margin-top: 20px; border-top: 1px solid #e2e8f0; }
        .visit-list li { padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Ziyaret Takvimi</h1>
        </div>
        <div class="content">
          <p>Sayın <strong>${customerName}</strong>,</p>
          ${branchName ? `<p><strong>${branchName}</strong> şubeniz için planlanan,</p>` : ''}
          <p><strong>${month}</strong> ayına ait ziyaret takviminiz aşağıda bilgilerinize sunulmuştur.</p>
          <ul class="visit-list">
            ${formattedDates}
          </ul>
          <p>Ziyaret tarihlerinde bir değişiklik talep etmeniz durumunda bizimle iletişime geçebilirsiniz.</p>
          <p>İyi çalışmalar dileriz.</p>
        </div>
        <div class="footer">
          <p>Bu e-posta otomatik olarak gönderilmiştir.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Resend API anahtarını ortam değişkenlerinden al
    // Bu anahtarı Supabase projenizin ayarlarından eklemeniz gerekmektedir.
    const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '');

    // İstekten gelen verileri al
    const { recipientEmails, customerName, branchName, month, visitDates } = await req.json();

    if (!recipientEmails || recipientEmails.length === 0) {
      throw new Error("Alıcı e-posta adresi bulunamadı.");
    }

    // E-posta içeriğini oluştur
    const subject = `${month} Ayı Ziyaret Takvimi Bilgilendirmesi`;
    const emailHtml = createEmailHtml(customerName, branchName, month, visitDates);

    // E-postayı gönder
    const { data, error } = await resend.emails.send({
      from: 'İlaçlamatik <sistem@ilaclamatik.com>', // Gönderen adresi
      to: recipientEmails, // Alıcı e-posta adresleri (dizi)
      subject: subject,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
