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
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body = await req.json()
        const { contact_id, items, description, note, notes, bank_account_id, date, issue_date, source_id, source_type, has_withholding } = body
        
        const finalDate = (date || issue_date || new Date().toISOString().split('T')[0]);
        console.log(`Fatura oluşturma isteği alındı. Müşteri ID: ${contact_id}, Tarih: ${finalDate}, Tevkifat: ${has_withholding}`);
        console.log('İstek gövdesi:', JSON.stringify(body));

        // 1. Ayarları Getir
        const { data: settings, error: settingsError } = await supabaseClient
            .from('parasut_settings')
            .select('*')
            .single()

        if (settingsError || !settings || !settings.access_token) {
            throw new Error('Paraşüt ayarları bulunamadı.')
        }

        let { access_token, refresh_token, expires_at, company_id, client_id, client_secret } = settings

        // Fetch Helper with Retry
        const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
            const headers = {
                ...options.headers,
                'User-Agent': 'Supabase/Edge-Functions (PestGo-Pest)',
            };

            try {
                const res = await fetch(url, { ...options, headers });
                return res;
            } catch (err: any) {
                if (retries > 0 && err.message?.includes('Connection reset')) {
                    console.log(`Bağlantı kesildi, tekrar deneniyor... (${retries} deneme kaldı)`);
                    await new Promise(r => setTimeout(r, 1000));
                    return fetchWithRetry(url, options, retries - 1);
                }
                throw err;
            }
        };

        // 2. Token Kontrolü ve Refresh (Eğer gerekliyse)
        const now = new Date()
        const expiry = expires_at ? new Date(expires_at) : null

        if (!expiry || expiry.getTime() < (now.getTime() + 60000)) { // 1 dk kala veya geçmişse
            if (refresh_token === 'manual_token') {
                console.log('[parasut-automation] Manuel token kullanılıyor, yenileme atlanıyor.');
            } else {
                console.log('[parasut-automation] Token süresi dolmuş veya bilinmiyor, yenileniyor...')
                
                if (!refresh_token) {
                    throw new Error('Refresh token bulunamadı. Lütfen Paraşüt ayarlarından tekrar yetkilendirin.')
                }

            const refreshResponse = await fetchWithRetry('https://api.parasut.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id,
                    client_secret,
                    refresh_token,
                    grant_type: 'refresh_token',
                }),
            })

            const tokenData = await refreshResponse.json()
            if (!refreshResponse.ok) {
                const errMsg = `Paraşüt Token Yenileme Hatası: ${tokenData.error_description || tokenData.error || 'Bilinmeyen hata'}`
                console.error('[parasut-automation]', errMsg, tokenData)
                throw new Error(errMsg)
            }

            console.log('[parasut-automation] Token başarıyla yenilendi.')
            access_token = tokenData.access_token
            const newExpiresAt = new Date()
            newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in)

            const { error: updateError } = await supabaseClient.from('parasut_settings').update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: newExpiresAt.toISOString(),
            }).eq('id', settings.id || 1)

            if (updateError) {
                console.error('[parasut-automation] Settings update error:', updateError)
            }
        }
    }

        if (!company_id) {
            throw new Error('Paraşüt Şirket ID (company_id) eksik. Lütfen ayarları kontrol edin.')
        }

        // 3. Paraşüt'te Fatura Oluştur
        const invoiceData = {
            data: {
                type: 'sales_invoices',
                attributes: {
                    item_type: 'invoice',
                    description: description || 'İlaçlamatik Otomatik Fatura',
                    invoice_note: note || notes || '',
                    bank_account_id: bank_account_id ? parseInt(String(bank_account_id)) : undefined,
                    issue_date: finalDate,
                    due_date: finalDate,
                    currency: 'TRL',
                    billing_address: '', // Optional but sometimes helps
                },
                relationships: {
                    contact: {
                        data: {
                            id: String(contact_id),
                            type: 'contacts'
                        }
                    },
                    details: {
                        data: Array.isArray(items) ? items.map((item: any) => ({
                            type: 'sales_invoice_details',
                            attributes: {
                                quantity: Number(item.quantity) || 1,
                                unit_price: Number(item.unit_price),
                                vat_rate: Number(item.vat_rate) || 20,
                                vat_withholding_code: has_withholding ? '613' : undefined,
                                vat_withholding_rate: has_withholding ? 90 : undefined,
                                name: String(item.name || 'Hizmet/Ürün'), // Name sometimes required in v4
                                description: String(item.description || item.name || 'Hizmet/Ürün')
                            },
                            relationships: item.parasut_product_id ? {
                                product: {
                                    data: {
                                        id: String(item.parasut_product_id),
                                        type: 'products'
                                    }
                                }
                            } : undefined
                        })) : []
                    }
                }
            }
        }

        const response = await fetchWithRetry(`https://api.parasut.com/v4/${company_id}/sales_invoices`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/vnd.api+json', // Standard for Paraşüt v4
                'Accept': 'application/vnd.api+json'
            },
            body: JSON.stringify(invoiceData)
        })

        // Robust Response Parsing
        const rawBody = await response.text();
        let result: any;
        try {
            result = rawBody ? JSON.parse(rawBody) : {};
        } catch (parseErr) {
            console.error('JSON Parse Hatası (Paraşüt):', parseErr, 'Gelen Gövde:', rawBody);
            throw new Error(`Paraşüt API Yanıtı Okunamadı: ${rawBody.slice(0, 200)}`);
        }

        if (!response.ok) {
            console.error('Paraşüt API Hatası:', result);
            throw new Error(`Paraşüt API Hatası (${response.status}): ${JSON.stringify(result.errors || result)}`)
        }

        // 4. Sistemimize Kaydet
        const parasutId = result.data.id
        const parasutNumber = result.data.attributes.number

        // UUID ve Integer kontrolü
        const invoiceEntry = {
            source_type,
            source_id,
            parasut_id: parseInt(parasutId),
            parasut_number: parasutNumber,
            status: 'draft',
            total_amount: result.data.attributes.net_total,
            items: items // jsonb kolonu olduğu için direkt objeyi gönderiyoruz
        }

        const { error: insertError } = await supabaseClient.from('parasut_invoices').insert(invoiceEntry)

        if (insertError) {
            console.error('DB Insert Hatası:', insertError)
            // Fatura Paraşüt'te oluştuğu için kritik hata olarak fırlatmıyoruz ama logluyoruz
        }

        return new Response(JSON.stringify({ success: true, parasut_id: parasutId, number: parasutNumber }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Fonksiyon hatası:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: error.message?.includes('Token Yenileme') || error.message?.includes('401') ? 401 : 500,
        })
    }
})
