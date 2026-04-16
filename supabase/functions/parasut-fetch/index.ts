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

    let bodyData: any = {};
    const VERSION = 'v4.5-revenue-management';

    try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        bodyData = await req.json();
        const {
            type, query, path, is_global, is_v1, filter_key,
            page_number, raw_url, code,
            client_id: bodyClientId, client_secret: bodyClientSecret,
            company_id: bodyCompanyId
        } = bodyData;

        // --- 1. TOKEN EXCHANGE LOGIC ---
        if (type === 'token_exchange') {
            const cleanCode = (code || '').trim();
            const cleanClientId = (bodyClientId || '').trim();
            const cleanClientSecret = (bodyClientSecret || '').trim();

            if (!cleanCode || !cleanClientId || !cleanClientSecret) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'İşlem için gerekli bilgiler eksik (kod, client_id, client_secret).'
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
                });
            }

            // Detect if it's a code or a full token
            const isFullToken = cleanCode.length > 50;

            if (isFullToken) {
                console.log('[parasut-fetch] Manuel (Süresiz) Token girişi algılandı.');
                const newExpiresAt = new Date();
                newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 10); // 10 years for static

                const updatePayload: any = {
                    id: 1,
                    client_id: cleanClientId,
                    client_secret: cleanClientSecret,
                    access_token: cleanCode,
                    refresh_token: 'manual_token',
                    expires_at: newExpiresAt.toISOString()
                };
                if (bodyCompanyId) updatePayload.company_id = bodyCompanyId;

                const { error: dbError } = await supabaseClient.from('parasut_settings').upsert(updatePayload);
                if (dbError) throw dbError;

                return new Response(JSON.stringify({
                    success: true,
                    message: 'Statik token başarıyla kaydedildi.',
                    expires_at: newExpiresAt.toISOString(),
                    version: VERSION
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
                });
            }

            // Standard OOB OAuth Flow
            console.log('[parasut-fetch] Standart OAuth Exchange denemesi...');
            const exchangeResponse = await fetch('https://api.parasut.com/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'User-Agent': 'PestGo-Integration/1.2'
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: cleanClientId,
                    client_secret: cleanClientSecret,
                    code: cleanCode,
                    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
                })
            });

            const responseText = await exchangeResponse.text();
            let tokenData: any;
            try { tokenData = responseText ? JSON.parse(responseText) : {}; }
            catch (e) { tokenData = { error: 'JSON Parse Error', body: responseText }; }

            if (!exchangeResponse.ok) {
                const errorMsg = tokenData.error_description || tokenData.error || `HTTP ${exchangeResponse.status}`;
                await supabaseClient.from('parasut_logs').insert({
                    level: 'critical', message: `[exchange] ${errorMsg}`, details: tokenData
                });
                return new Response(JSON.stringify({ success: false, error: errorMsg, details: tokenData, version: VERSION }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
                });
            }

            const newExpiresAt = new Date();
            newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokenData.expires_in || 7200));

            const updatePayload: any = {
                id: 1,
                client_id: cleanClientId,
                client_secret: cleanClientSecret,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: newExpiresAt.toISOString()
            };
            if (bodyCompanyId) updatePayload.company_id = bodyCompanyId;

            const { error: dbError } = await supabaseClient.from('parasut_settings').upsert(updatePayload);
            if (dbError) throw dbError;

            return new Response(JSON.stringify({ success: true, message: 'Bağlantı başarıyla sağlandı.', version: VERSION }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
        }

        // --- 2. PRE-FLIGHT (Fetch Settings) ---
        const { data: settings } = await supabaseClient.from('parasut_settings').select('*');
        if (!settings?.[0]) throw new Error('Paraşüt ayarları bulunamadı.');

        const activeSettings = settings[0];
        let { access_token, refresh_token, expires_at, company_id, client_id, client_secret } = activeSettings;

        // Shared Utility Functions
        const parseAmount = (val: any): number => {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'number') return val;
            let str = String(val).trim();
            if (str === '') return 0;
            if (str.includes('.') && str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
            if (str.includes(',')) return parseFloat(str.replace(',', '.')) || 0;
            return parseFloat(str) || 0;
        };

        const refreshAuthToken = async () => {
            if (refresh_token === 'manual_token') {
                console.log('[parasut-fetch] Manuel token aktif, yenileme atlanıyor.');
                return access_token;
            }

            console.log('[parasut-fetch] Token yenileniyor...');
            const refreshRes = await fetch('https://api.parasut.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'PestGo-Integration/1.2' },
                body: new URLSearchParams({
                    client_id,
                    client_secret,
                    refresh_token,
                    grant_type: 'refresh_token',
                }),
            });

            const tokenData = await refreshRes.json();
            if (!refreshRes.ok) {
                const errMsg = `Token Yenileme Başarısız: ${tokenData.error_description || tokenData.error}`;
                await supabaseClient.from('parasut_logs').insert({ level: 'error', message: `[refresh] ${errMsg}` });
                throw new Error(errMsg);
            }

            const newExpiresAt = new Date();
            newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokenData.expires_in || 7200));

            await supabaseClient.from('parasut_settings').update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: newExpiresAt.toISOString(),
            }).eq('id', activeSettings.id || 1);

            return tokenData.access_token;
        };

        const fetchWithRetry = async (url: string, options: RequestInit, retries = 1): Promise<Response> => {
            const headers = {
                ...options.headers,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PestGo/4.0',
                'Accept': 'application/json',
                'Authorization': `Bearer ${access_token}`
            };
            const r = await fetch(url, { ...options, headers });
            if (r.status === 401 && retries > 0) {
                access_token = await refreshAuthToken();
                return fetchWithRetry(url, options, retries - 1);
            }
            return r;
        };

        // --- 3. BUSINESS LOGIC ---

        // Check expiry pre-emptively
        const now = new Date();
        const expiry = expires_at ? new Date(expires_at) : null;
        if (!expiry || expiry.getTime() < (now.getTime() + 60000)) {
            access_token = await refreshAuthToken();
        }

        if (!company_id) throw new Error('Paraşüt Şirket ID (company_id) bulunamadı.');

        // 3a. DISCOVERY LOGIC
        if (type === 'me') {
            const meRes = await fetchWithRetry('https://api.parasut.com/v4/me', { method: 'GET' });
            if (!meRes.ok) throw new Error(`Me API Error: ${await meRes.text()}`);
            const meData = await meRes.json();
            return new Response(JSON.stringify({ success: true, data: meData, version: VERSION }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
        }

        // 3b. COMPOSITE STATEMENT LOGIC (ADVANCED)
        if (type === 'contact_statement') {
            const contactId = bodyData.contact_id;
            const debugObj: any = { version: VERSION, company_id: company_id, contact_id: contactId };
            let items: any[] = [];

            // Fetch official balance anchor
            const contactRes = await fetchWithRetry(`https://api.parasut.com/v4/${company_id}/contacts/${contactId}`, { method: 'GET' });
            let officialBalance = 0;
            if (contactRes.ok) {
                const cJson = await contactRes.json();
                const attr = cJson.data.attributes;
                officialBalance = parseAmount(attr.trl_balance || attr.balance);
                debugObj.official_balance = officialBalance;

                const op = attr.opening_balance;
                if (op && op.net_total && parseAmount(op.net_total) > 0) {
                    items.push({
                        id: `opening-${contactId}`, date: op.date || '2000-01-01',
                        description: `Açılış Bakiyesi - ${op.notes || ''}`,
                        debit: op.type === 'debit' ? parseAmount(op.net_total) : 0,
                        credit: op.type === 'credit' ? parseAmount(op.net_total) : 0,
                        type: 'opening_balance'
                    });
                }
            }

            const fetchDeepStream = async (resName: string, filterQuery: string, include?: string) => {
                let allData: any[] = [];
                let allRaw: any[] = [];
                for (let p = 1; p <= 15; p++) {
                    const params = new URLSearchParams(filterQuery);
                    params.append('page[number]', String(p));
                    params.append('page[size]', '25');
                    if (include) params.append('include', include);

                    const u = `https://api.parasut.com/v4/${company_id}/${resName}?${params.toString()}`;
                    const r = await fetchWithRetry(u, { method: 'GET' });
                    if (!r.ok) break;
                    const json = await r.json();
                    if (!json.data || json.data.length === 0) break;
                    allData = [...allData, ...json.data];
                    allRaw.push(json);
                    if (json.data.length < 25) break;
                }
                return { data: allData, raw: allRaw };
            };

            const [sales, purchase, custReturns, suppReturns, debits, credits, indepPayments, indepBank, moneyTrans] = await Promise.all([
                fetchDeepStream('sales_invoices', `filter[contact_id]=${contactId}`, 'payments'),
                fetchDeepStream('purchase_bills', `filter[supplier_id]=${contactId}`, 'payments'),
                fetchDeepStream('customer_return_invoices', `filter[contact_id]=${contactId}`, 'payments'),
                fetchDeepStream('supplier_return_invoices', `filter[supplier_id]=${contactId}`, 'payments'),
                fetchDeepStream('contact_debit_transactions', `filter[contact_id]=${contactId}`, 'payments'),
                fetchDeepStream('contact_credit_transactions', `filter[contact_id]=${contactId}`, 'payments'),
                fetchDeepStream('payments', `filter[contact_id]=${contactId}`),
                fetchDeepStream('bank_transactions', `filter[contact_id]=${contactId}`),
                fetchDeepStream('money_transfers', `filter[contact_id]=${contactId}`)
            ]);

            const seenIds = new Set();
            const processItems = (data: any[], mapper: (i: any) => any) => {
                data.forEach(i => { if (!seenIds.has(i.id)) { seenIds.add(i.id); items.push(mapper(i)); } });
            };

            processItems(sales.data, i => ({
                id: i.id, date: i.attributes.issue_date, createdAt: i.attributes.created_at,
                description: `Satış Faturası - ${i.attributes.invoice_no || i.id}`,
                debit: parseAmount(i.attributes.net_total), credit: 0, type: 'sales_invoice'
            }));
            processItems(purchase.data, i => ({
                id: i.id, date: i.attributes.issue_date, createdAt: i.attributes.created_at,
                description: `Alış Faturası - ${i.attributes.invoice_no || i.id}`,
                debit: 0, credit: parseAmount(i.attributes.net_total), type: 'purchase_bill'
            }));
            processItems(custReturns.data, i => ({
                id: i.id, date: i.attributes.issue_date, createdAt: i.attributes.created_at,
                description: `Müşteri İade - ${i.attributes.invoice_no || i.id}`,
                debit: 0, credit: parseAmount(i.attributes.net_total), type: 'customer_return'
            }));
            processItems(suppReturns.data, i => ({
                id: i.id, date: i.attributes.issue_date,
                description: `Tedarikçi İade - ${i.attributes.invoice_no || i.id}`,
                debit: parseAmount(i.attributes.net_total), credit: 0, type: 'supplier_return'
            }));
            processItems(debits.data, i => ({
                id: i.id, date: i.attributes.date, createdAt: i.attributes.created_at,
                description: i.attributes.description || 'Borç Dekontu',
                debit: parseAmount(i.attributes.amount), credit: 0, type: 'debit_transaction'
            }));
            processItems(credits.data, i => ({
                id: i.id, date: i.attributes.date, createdAt: i.attributes.created_at,
                description: i.attributes.description || 'Alacak Dekontu',
                debit: 0, credit: parseAmount(i.attributes.amount), type: 'payment'
            }));
            processItems(indepPayments.data, i => {
                const isIn = i.attributes.direction === 'inbound';
                return {
                    id: i.id, date: i.attributes.date, createdAt: i.attributes.created_at,
                    description: i.attributes.description || (isIn ? 'Tahsilat' : 'Ödeme'),
                    debit: isIn ? 0 : parseAmount(i.attributes.amount),
                    credit: isIn ? parseAmount(i.attributes.amount) : 0,
                    type: 'payment'
                };
            });
            processItems(indepBank.data, b => {
                const amount = parseAmount(b.attributes.amount);
                const isIn = amount > 0;
                return {
                    id: b.id, date: b.attributes.date, createdAt: b.attributes.created_at,
                    description: b.attributes.description || `Banka Hareketi (${isIn ? 'Giriş' : 'Çıkış'})`,
                    debit: isIn ? 0 : Math.abs(amount),
                    credit: isIn ? amount : 0,
                    type: 'payment'
                };
            });

            processItems(moneyTrans.data, m => {
                const amount = parseAmount(m.attributes.amount);
                // money_transfers don't have a direct contact link in attributes, 
                // but if they were returned by the filter, one side must be the contact.
                const fromType = m.relationships?.from_account?.data?.type;
                const toType = m.relationships?.to_account?.data?.type;

                // In context of contact statement:
                // If it goes TO contact (to_account_type === 'Contact') -> Debit (we paid them)
                // If it comes FROM contact (from_account_type === 'Contact') -> Credit (they paid us)
                const isToContact = toType === 'Contact' || m.attributes.to_account_name?.toLowerCase().includes('müşteri');
                const isFromContact = fromType === 'Contact' || m.attributes.from_account_name?.toLowerCase().includes('müşteri');

                return {
                    id: m.id, date: m.attributes.date, createdAt: m.attributes.created_at,
                    description: m.attributes.description || `Para Transferi (${m.attributes.description || ''})`,
                    debit: isToContact ? amount : 0,
                    credit: isFromContact ? amount : 0,
                    type: 'payment'
                };
            });

            // Sort and Anchor
            items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let calcSum = items.reduce((acc, it) => acc + (it.debit - it.credit), 0);
            const residual = officialBalance - calcSum;
            if (Math.abs(residual) > 0.01) {
                items.unshift({
                    id: 'residual', date: items[0]?.date || now.toISOString().split('T')[0],
                    description: 'Devreden Bakiye / Düzeltme',
                    debit: residual > 0 ? residual : 0, credit: residual < 0 ? Math.abs(residual) : 0,
                    type: 'opening_balance', is_adjustment: true
                });
            }

            let running = 0;
            const final = items.map(it => { running += (it.debit - it.credit); return { ...it, balance: running }; }).reverse();

            return new Response(JSON.stringify({ success: true, data: final.slice(0, 100), debug: debugObj, version: VERSION }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
        }

        // 3c. REVENUE SUMMARY LOGIC
        if (type === 'revenue_summary' || (bodyData && bodyData.type === 'revenue_summary')) {
            const { year, month } = bodyData;
            console.log(`[parasut-fetch] Handling revenue_summary for ${year}-${month}`);
            
            if (!year || !month) {
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'Yıl ve Ay bilgisi zorunludur. (year, month)' 
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
            }

            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDayDate = new Date(year, month, 0);
            const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

            if (!company_id) throw new Error('Paraşüt Şirket ID (company_id) bulunamadı.');

            const fetchDeepStream = async (resName: string, filterQuery: string, include?: string) => {
                let allData: any[] = [];
                console.log(`[parasut-fetch] Fetching stream: ${resName} with filter: ${filterQuery}`);
                
                for (let p = 1; p <= 3; p++) {
                    const queryParts = [filterQuery];
                    queryParts.push(`page[number]=${p}`);
                    queryParts.push(`page[size]=25`);
                    if (include) queryParts.push(`include=${include}`);

                    const queryString = queryParts.join('&');
                    const u = `https://api.parasut.com/v4/${company_id}/${resName}?${queryString}`;
                    const r = await fetchWithRetry(u, { method: 'GET' });
                    
                    if (!r.ok) {
                        const errorCode = r.status;
                        const errorText = await r.text();
                        console.error(`[revenue_summary] ${resName} failed with ${errorCode}:`, errorText);
                        throw new Error(`Paraşüt API Hatası (${resName}, ${errorCode}): ${errorText}`);
                    }
                    const json = await r.json();
                    if (!json.data || json.data.length === 0) break;
                    allData = [...allData, ...json.data];
                    if (json.data.length < 25) break;
                }
                return { data: allData };
            };

            try {
                const [sales, purchases, payments] = await Promise.all([
                    fetchDeepStream('sales_invoices', `filter[issue_date_gte]=${startDate}&filter[issue_date_lte]=${endDate}`),
                    fetchDeepStream('purchase_bills', `filter[issue_date_gte]=${startDate}&filter[issue_date_lte]=${endDate}`),
                    fetchDeepStream('payments', `filter[date_gte]=${startDate}&filter[date_lte]=${endDate}`)
                ]);

                const summary = {
                    sales: sales.data.map((i: any) => ({
                        id: i.id, date: i.attributes.issue_date, description: i.attributes.description || i.attributes.invoice_no,
                        total: parseAmount(i.attributes.net_total),
                        contact_name: i.attributes.contact_name || 'Bilinmeyen Müşteri'
                    })),
                    purchases: purchases.data.map((i: any) => ({
                        id: i.id, date: i.attributes.issue_date, description: i.attributes.description || i.attributes.invoice_no,
                        total: parseAmount(i.attributes.net_total),
                        contact_name: i.attributes.contact_name || 'Bilinmeyen Tedarikçi'
                    })),
                    payments: payments.data.map((i: any) => ({
                        id: i.id, date: i.attributes.date, description: i.attributes.description,
                        total: parseAmount(i.attributes.amount),
                        direction: i.attributes.direction,
                        contact_name: i.attributes.contact_name
                    }))
                };

                return new Response(JSON.stringify({ success: true, data: summary, version: VERSION }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
                });
            } catch (innerErr: any) {
                console.error('[parasut-fetch] revenue_summary inner error:', innerErr);
                return new Response(JSON.stringify({ success: false, error: innerErr.message, version: VERSION }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
                });
            }
        }

        // 3d. STANDARD LOGIC (Lists with Pagination)
        const pageSize = 25;
        const pageLimit = (query || path) ? 4 : 50;
        // 3d. SMART ID DETECTION (New v4.6 logic)
        const isNumericId = query && /^\d+$/.test(query.trim()) && query.length >= 5;
        if (isNumericId && !raw_url && !path) {
            console.log(`[parasut-fetch] Numeric ID query detected: ${query}`);
            const idUrl = `https://api.parasut.com/v4/${company_id}/${type}/${query.trim()}`;
            const idRes = await fetchWithRetry(idUrl, { method: 'GET' });
            if (idRes.ok) {
                const idData = await idRes.json();
                if (idData && idData.data) {
                    const item = idData.data;
                    const output = [{
                        id: item.id,
                        name: item.attributes.name || item.attributes.full_name || item.attributes.short_name,
                        balance: parseAmount(item.attributes.trl_balance || item.attributes.balance),
                        type: item.type,
                        code: item.attributes.code
                    }];
                    return new Response(JSON.stringify({ success: true, data: output, version: VERSION + '-id-match' }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
                    });
                }
            }
            console.log(`[parasut-fetch] ID match for ${query} returned ${idRes.status}, falling back to name filter...`);
        }

        const fetchPage = async (p: number) => {
            let url: URL;
            if (raw_url) url = new URL(raw_url);
            else if (path) url = new URL(`https://api.parasut.com/${is_v1 ? 'v1' : 'v4'}/${is_global ? '' : company_id + '/'}${path}`);
            else url = new URL(`https://api.parasut.com/v4/${company_id}/${type === 'contact_show' ? 'contacts/' + bodyData.contact_id : type}`);

            // If it's a product search and not an ID, maybe try both name and code? 
            // Paraşüt API doesn't support OR in filter keys easily via searchParams,
            // so we stick to filter_key provided but prioritize it.
            if (query && !raw_url) {
                url.searchParams.append(filter_key || 'filter[query]', query);
            }
            
            if (!raw_url) {
                url.searchParams.append('page[number]', String(p));
                url.searchParams.append('page[size]', String(pageSize));
            }

            const r = await fetchWithRetry(url.toString(), { method: 'GET' });
            if (!r.ok) return { error: true, status: r.status, message: await r.text() };
            return await r.json();
        };

        const firstPage = await fetchPage(page_number || 1);
        if (firstPage.error) throw new Error(`Fetch error: ${firstPage.message}`);

        let allResults = [];
        if (firstPage.data) {
            if (Array.isArray(firstPage.data)) {
                allResults = [...firstPage.data];
                const meta = firstPage.meta || {};
                const totalPages = meta.total_pages || meta.page?.total_pages || 1;
                const max = Math.min(totalPages, (page_number || 1) + pageLimit - 1);

                for (let p = (page_number || 1) + 1; p <= max; p++) {
                    const next = await fetchPage(p);
                    if (next.data && Array.isArray(next.data)) allResults.push(...next.data);
                }
            } else {
                allResults.push(firstPage.data);
            }
        }

        const output = allResults.map((i: any) => ({
            id: i.id, name: i.attributes.name || i.attributes.full_name || i.attributes.short_name,
            balance: parseAmount(i.attributes.trl_balance || i.attributes.balance),
            type: i.type, code: i.attributes.code
        }));

        return new Response(JSON.stringify({ success: true, data: output, meta: firstPage.meta, version: VERSION }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });

    } catch (err: any) {
        console.error('[parasut-fetch] Error:', err);
        return new Response(JSON.stringify({
            success: false,
            error: err.message,
            type: typeof bodyData !== 'undefined' ? bodyData.type : 'unknown',
            version: VERSION
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
    }
});
