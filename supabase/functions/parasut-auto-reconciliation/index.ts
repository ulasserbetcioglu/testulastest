import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const bodyData = await req.json().catch(() => ({}));
        const now = new Date();
        const currentDay = now.getDate();

        const testCustomerId = bodyData.test_customer_id;
        console.log(`Automated reconciliation triggered. Current Day: ${currentDay}, Test ID: ${testCustomerId || 'None'}`);

        // 1. Fetch Paraşüt Settings
        const { data: settingsArr } = await supabaseClient.from('parasut_settings').select('*');
        if (!settingsArr?.[0]) throw new Error('Paraşüt ayarları bulunamadı.');
        const settings = settingsArr[0];
        let { access_token, company_id, client_id, client_secret } = settings;

        // 2. Fetch Target Customers
        let query = supabaseClient
            .from('customers')
            .select('id, parasut_id, cari_isim, reconciliation_email, email, auto_reconciliation_day, auto_reconciliation_period');
        
        if (testCustomerId) {
            // Manual Test Mode
            query = query.eq('id', testCustomerId);
        } else {
            // Automated Mode
            query = query.eq('auto_reconciliation', true);
            if (!bodyData.force && !bodyData.month) {
                query = query.eq('auto_reconciliation_day', currentDay);
            }
        }

        const { data: customers, error: custError } = await query;

        if (custError) throw custError;
        if (!customers || customers.length === 0) {
            return new Response(JSON.stringify({ 
                success: true, 
                message: testCustomerId ? 'Müşteri bulunamadı.' : 'Bugün için planlanmış otomatik mutabakat bulunamadı.' 
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        const results = [];
        
        // Helper to fetch balance
        const getBalanceForPeriod = async (contactId: number, period: string, manualMonth?: string) => {
            let targetMonthStr = manualMonth;
            
            if (!targetMonthStr) {
                if (period === 'current_month') {
                    targetMonthStr = now.toISOString().substring(0, 7);
                } else {
                    // Previous month
                    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    targetMonthStr = prev.toISOString().substring(0, 7);
                }
            }

            const end = new Date(targetMonthStr + '-01');
            if (period === 'current_month' && !manualMonth) {
                // For current month, we use today's date if no manual month is provided
            } else {
                end.setMonth(end.getMonth() + 1);
                end.setDate(0); // Last day of month
            }
            
            const monthEndStr = end.toISOString().split('T')[0];

            const res = await fetch(`${SUPABASE_URL}/functions/v1/parasut-fetch`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                },
                body: JSON.stringify({
                    type: 'contact_statement',
                    contact_id: String(contactId),
                    end_date: monthEndStr
                })
            });
            
            const data = await res.json();
            if (!data.success) return { balance: 0, month: targetMonthStr };
            
            const transactions = data.data || [];
            const lastTx = transactions.find((t: any) => t.date <= monthEndStr);
            return { 
                balance: lastTx?.balance || data.official_balance || 0,
                month: targetMonthStr
            };
        };

        for (const customer of customers) {
            try {
                const email = customer.reconciliation_email || customer.email;
                if (!email) {
                    results.push({ customer: customer.cari_isim, status: 'skipped', reason: 'Email missing' });
                    continue;
                }

                const period = customer.auto_reconciliation_period || 'previous_month';
                const { balance, month } = await getBalanceForPeriod(customer.parasut_id, period, bodyData.month);
                
                const monthName = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date(month + '-01'));
                const token = crypto.randomUUID();
                
                // Register in DB
                const { error: regError } = await supabaseClient
                    .from('reconciliation_responses')
                    .insert({
                        token: token,
                        customer_id: customer.id,
                        parasut_id: customer.parasut_id,
                        month: month,
                        balance: balance,
                        status: 'pending',
                        full_name: testCustomerId ? '(Manuel Test)' : '(Otomatik Gönderim)'
                    });

                if (regError) throw regError;

                // Send Email
                const baseUrl = Deno.env.get('APP_URL') || 'https://ilaclamatik.com';
                const approveUrl = `${baseUrl}/mutabakat-onay?token=${token}&type=approve`;
                const rejectUrl = `${baseUrl}/mutabakat-onay?token=${token}&type=reject`;

                const html = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937; padding: 20px; background-color: #f9fafb;">
                        <div style="text-align: center; margin-bottom: 32px; padding-top: 20px;">
                            <div style="display: inline-block; width: 64px; height: 64px; background: #059669; border-radius: 20px; padding: 12px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/><path d="M12 16L16 12L12 8"/><path d="M8 12H16"/></svg>
                            </div>
                            <h1 style="color: #064e3b; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: -0.025em; text-transform: uppercase;">İLAÇLAMATİK</h1>
                            <p style="color: #059669; font-size: 13px; margin-top: 4px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Güvenli Mutabakat Servisi</p>
                        </div>

                        <div style="background: white; border-radius: 32px; border: 1px solid #d1fae5; padding: 40px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);">
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px; color: #111827;">Sayın <strong>${customer.cari_isim}</strong>,</p>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 32px;">
                                <strong>${monthName}</strong> dönemi itibarıyla kayıtlarımızdaki güncel bakiye durumunuz aşağıda belirtilmiştir.
                            </p>
                            
                            <div style="background-color: #f0fdf4; border-radius: 24px; padding: 32px; margin-bottom: 32px; text-align: center; border: 1px solid #d1fae5;">
                                <div style="font-size: 11px; color: #065f46; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px;">Mutabakat Bakiyesi</div>
                                <div style="font-size: 36px; font-weight: 900; color: #064e3b; margin-bottom: 12px;">${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(balance)}</div>
                                <div style="display: inline-block; padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 800; background: ${balance >= 0 ? '#fee2e2' : '#dcfce7'}; color: ${balance >= 0 ? '#991b1b' : '#166534'};">
                                    ${balance >= 0 ? 'BORÇLU' : 'ALACAKLI'} DURUMDASINIZ
                                </div>
                            </div>

                            <div style="margin-top: 8px;">
                                <p style="font-size: 13px; font-weight: 800; color: #064e3b; margin-bottom: 16px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em;">Lütfen Yanıtınızı Bildiriniz:</p>
                                
                                <table width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding-bottom: 12px;">
                                            <a href="${approveUrl}" style="display: block; background-color: #059669; color: #ffffff; padding: 18px 24px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 16px; text-align: center;">
                                                BAKİYE DOĞRUDUR
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center">
                                            <a href="${rejectUrl}" style="display: block; background-color: #ffffff; color: #374151; border: 2px solid #e5e7eb; padding: 18px 24px; border-radius: 16px; text-decoration: none; font-weight: 800; font-size: 15px; text-align: center;">
                                                BAKİYEDE UYUŞMAZLIK VAR
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f3f4f6;">
                                <div style="font-size: 13px; color: #6b7280; line-height: 1.6; margin-bottom: 16px;">
                                    <strong>Notlar:</strong><br>
                                    1. Hata ve unutma müstesnadır.<br>
                                    2. Mutabakat veya itirazınızı bir ay içinde bildirmediğiniz takdirde T.T.K. 94. maddesi gereğince mutabık sayılacağınızı bildiririz.
                                </div>
                                <p style="font-size: 13px; color: #b91c1c; font-weight: 800; line-height: 1.6; text-align: center; margin: 0; padding: 12px; background-color: #fef2f2; border-radius: 12px; border: 1px solid #fee2e2;">
                                    LÜTFEN BU E-POSTAYI YANITLAMAYINIZ, YUKARIDAKİ LİNKE TIKLAYARAK CEVAPLAYINIZ.
                                </p>
                            </div>
                        </div>

                        <div style="margin-top: 32px; text-align: center; padding: 0 20px;">
                            <p style="font-size: 11px; color: #6b7280; font-weight: 800; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
                                SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ
                            </p>
                            <p style="font-size: 10px; color: #9ca3af; margin: 0; font-weight: 600;">
                                İLAÇLAMATİK™ BİR MARKADIR • PestMentor® Hizmet Markası
                            </p>
                        </div>
                    </div>
                `;

                const emailRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
                    body: JSON.stringify({
                        from: 'İlaçlamatik Mutabakat <bilgi@ilaclamatik.com>',
                        to: email,
                        subject: `${monthName} Mutabakat Talebi - ${customer.cari_isim}`,
                        html: html
                    }),
                });

                if (!emailRes.ok) throw new Error('Resend error: ' + await emailRes.text());

                results.push({ customer: customer.cari_isim, status: 'sent', month, day: currentDay });
            } catch (innerErr: any) {
                console.error(`Error for customer ${customer.cari_isim}:`, innerErr);
                results.push({ customer: customer.cari_isim, status: 'error', error: innerErr.message });
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Major Function Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
})
