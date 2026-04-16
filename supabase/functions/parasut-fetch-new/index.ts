// --- LEGACY FUNCTION - DO NOT USE FOR NEW CODE ---
// This function is deprecated. Please use 'parasut-fetch' for all API calls.
// Redirected to 'parasut-fetch' logic.
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
        const VERSION = 'v3.7-composite-final';
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const bodyData = await req.json();
        const { type, query, path, is_global, is_v1 } = bodyData;

        const { data: settings } = await supabaseClient.from('parasut_settings').select('*');
        if (!settings?.[0]) throw new Error('Paraşüt ayarları bulunamadı.');

        const activeSettings = settings[0];
        let { access_token, refresh_token, expires_at, company_id, client_id, client_secret } = activeSettings;

        const parseAmount = (val: any): number => {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'number') return val;
            let str = String(val).trim();
            if (str === '') return 0;

            // Handle TR format with both . (thousands) and , (decimal)
            if (str.includes('.') && str.includes(',')) {
                return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
            }
            // Handle cases with only ,
            if (str.includes(',')) {
                return parseFloat(str.replace(',', '.')) || 0;
            }
            // Standard JSON/EN format (1234.56 or 1234)
            return parseFloat(str) || 0;
        };

        const refreshAuthToken = async () => {
            console.log('Refreshing Paraşüt token...');
            const refreshRes = await fetch('https://api.parasut.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id,
                    client_secret,
                    refresh_token,
                    grant_type: 'refresh_token',
                }),
            });

            const tokenData = await refreshRes.json();
            if (!refreshRes.ok) {
                throw new Error(`Token Yenileme Başarısız: ${tokenData.error_description || tokenData.error}`);
            }

            const newExpiresAt = new Date();
            newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in);

            await supabaseClient.from('parasut_settings').update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: newExpiresAt.toISOString(),
            }).eq('id', activeSettings.id);

            return tokenData.access_token;
        };

        // Check if refresh is needed or forced
        if (bodyData.force_refresh || !expires_at || new Date(expires_at).getTime() < (new Date().getTime() + 120000)) {
            access_token = await refreshAuthToken();
        }

        const fetchWithRetry = async (url: string, options: RequestInit, retries = 1): Promise<Response> => {
            const headers = {
                ...options.headers,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${access_token}`
            };
            const r = await fetch(url, { ...options, headers });

            // If 401, try refreshing once
            if (r.status === 401 && retries > 0) {
                console.warn('401 detected, refreshing token and retrying...');
                access_token = await refreshAuthToken();
                return fetchWithRetry(url, options, retries - 1);
            }
            return r;
        };

        // COMPOSITE STATEMENT STRATEGY (V6 - Deep History Core)
        if (type === 'contact_statement') {
            const contactId = bodyData.contact_id;
            const debugObj: any = { version: VERSION, company_id: company_id, contact_id: contactId };

            let items: any[] = [];

            // 1. Fetch Contact for Opening Balance
            const contactRes = await fetchWithRetry(`https://api.parasut.com/v4/${company_id}/contacts/${contactId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${access_token}` }
            });
            let officialBakiye = 0;
            if (contactRes.ok) {
                const cJson = await contactRes.json();
                const attr = cJson.data.attributes;
                officialBakiye = parseAmount(attr.trl_balance || attr.balance);
                debugObj.official_balance = officialBakiye;
                
                const op = attr.opening_balance;
                if (op && op.net_total && parseAmount(op.net_total) > 0) {
                    items.push({
                        id: `opening-${contactId}`,
                        date: op.date || '2000-01-01',
                        description: `Açılış Bakiyesi - ${op.notes || ''}`,
                        debit: op.type === 'debit' ? parseAmount(op.net_total) : 0,
                        credit: op.type === 'credit' ? parseAmount(op.net_total) : 0,
                        type: 'opening_balance'
                    });
                }
            }

               // 2. Deep Multi-Stream Fetch (Up to 20 pages per stream = ~500 items total)
            debugObj.streams = {};
            const fetchDeepStream = async (resName: string, filterKey: string, include?: string) => {
                let allData: any[] = [];
                let allRaw: any[] = [];
                let pageCount = 0;
                for (let p = 1; p <= 20; p++) {
                    const u = new URL(`https://api.parasut.com/v4/${company_id}/${resName}`);
                    u.searchParams.append(`filter[${filterKey}]`, contactId);
                    u.searchParams.append('page[number]', String(p));
                    u.searchParams.append('page[size]', '25'); 
                    if (include) u.searchParams.append('include', include);
                    
                    const r = await fetchWithRetry(u.toString(), {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${access_token}` }
                    });
                    if (!r.ok) break;
                    const json = await r.json();
                    if (!json.data || json.data.length === 0) break;
                    allData = [...allData, ...json.data];
                    allRaw.push(json);
                    pageCount = p;
                    if (json.data.length < 25) break; 
                }
                debugObj.streams[resName] = { count: allData.length, pages: pageCount };
                return { data: allData, raw: allRaw };
            };

            const [sales, purchase, custReturns, suppReturns, debits, credits, indepPayments, indepBank, moneyTrans] = await Promise.all([
                fetchDeepStream('sales_invoices', 'contact_id', 'payments'),
                fetchDeepStream('purchase_bills', 'supplier_id', 'payments'),
                fetchDeepStream('customer_return_invoices', 'contact_id', 'payments'),
                fetchDeepStream('supplier_return_invoices', 'supplier_id', 'payments'),
                fetchDeepStream('contact_debit_transactions', 'contact_id', 'payments'),
                fetchDeepStream('contact_credit_transactions', 'contact_id', 'payments'),
                fetchDeepStream('payments', 'contact_id'),
                fetchDeepStream('bank_transactions', 'contact_id'),
                fetchDeepStream('money_transfers', 'contact_id')
            ]);

            // Final item list
            const finalPaymentsMap = new Map(); // ID -> aggregated payment object
            const seenTransactionIds = new Set(); // For deduplication

            const processInclusions = (json: any, hintDir: 'inbound' | 'outbound') => {
                if (!json.included) return;
                json.included.filter((i: any) => i.type === 'payments').forEach((p: any) => {
                    const attr = p.attributes;
                    const amount = parseAmount(attr.amount);
                    const direction = attr.direction || hintDir;
                    const isIn = direction === 'inbound';
                    
                    if (finalPaymentsMap.has(p.id)) {
                        const existing = finalPaymentsMap.get(p.id);
                        if (isIn) existing.credit += amount;
                        else existing.debit += amount;
                    } else {
                        finalPaymentsMap.set(p.id, {
                            id: p.id, date: attr.date,
                            createdAt: attr.created_at,
                            description: attr.description || attr.notes || (isIn ? 'Tahsilat' : 'Ödeme'),
                            debit: isIn ? 0 : amount,
                            credit: isIn ? amount : 0,
                            type: 'payment'
                        });
                    }
                    seenTransactionIds.add(p.id);
                });
            };

            // Process Sales
            sales.data.forEach((inv: any) => {
                seenTransactionIds.add(inv.id);
                items.push({
                    id: inv.id, date: inv.attributes.issue_date,
                    createdAt: inv.attributes.created_at,
                    description: `Satış Faturası - ${inv.attributes.invoice_no || inv.id}`,
                    debit: parseAmount(inv.attributes.net_total), credit: 0, type: 'sales_invoice'
                });
            });
            sales.raw?.forEach(r => processInclusions(r, 'inbound'));
            
            // Process Purchases
            purchase.data.forEach((bill: any) => {
                seenTransactionIds.add(bill.id);
                items.push({
                    id: bill.id, date: bill.attributes.issue_date,
                    createdAt: bill.attributes.created_at,
                    description: `Alış Faturası - ${bill.attributes.invoice_no || bill.id}`,
                    debit: 0, credit: parseAmount(bill.attributes.net_total), type: 'purchase_bill'
                });
            });
            purchase.raw?.forEach(r => processInclusions(r, 'outbound'));

            // Process Returns
            custReturns.data.forEach((ret: any) => {
                seenTransactionIds.add(ret.id);
                items.push({
                    id: ret.id, date: ret.attributes.issue_date,
                    createdAt: ret.attributes.created_at,
                    description: `Müşteri İade Faturası - ${ret.attributes.invoice_no || ret.id}`,
                    debit: 0, credit: parseAmount(ret.attributes.net_total), type: 'customer_return'
                });
            });
            custReturns.raw?.forEach(r => processInclusions(r, 'inbound'));

            suppReturns.data.forEach((ret: any) => {
                seenTransactionIds.add(ret.id);
                items.push({
                    id: ret.id, date: ret.attributes.issue_date,
                    description: `Tedarikçi İade Faturası - ${ret.attributes.invoice_no || ret.id}`,
                    debit: parseAmount(ret.attributes.net_total), credit: 0, type: 'supplier_return'
                });
            });
            suppReturns.raw?.forEach(r => processInclusions(r, 'outbound'));

            // Process Debits/Credits (Açılış bakiye usually in credits if positive customer balance)
            debits.data.forEach((d: any) => {
                seenTransactionIds.add(d.id);
                const desc = d.attributes.description || '';
                items.push({
                    id: d.id, date: d.attributes.date,
                    createdAt: d.attributes.created_at,
                    description: desc || 'Borç Dekontu',
                    debit: parseAmount(d.attributes.amount), credit: 0, 
                    type: (desc.toLowerCase().includes('açılış') || desc.toLowerCase().includes('acilis')) ? 'opening_balance' : 'debit_transaction'
                });
            });
            debits.raw?.forEach(r => processInclusions(r, 'outbound'));

            credits.data.forEach((c: any) => {
                seenTransactionIds.add(c.id);
                const desc = c.attributes.description || '';
                items.push({
                    id: c.id, date: c.attributes.date,
                    createdAt: c.attributes.created_at,
                    description: desc || 'Alacak Dekontu',
                    debit: 0, credit: parseAmount(c.attributes.amount), 
                    type: (desc.toLowerCase().includes('açılış') || desc.toLowerCase().includes('acilis')) ? 'opening_balance' : 'payment'
                });
            });
            credits.raw?.forEach(r => processInclusions(r, 'inbound'));

            // Process Independent Payments
            indepPayments.data.forEach((p: any) => {
                if (seenTransactionIds.has(p.id)) return;
                seenTransactionIds.add(p.id);
                const isIn = p.attributes.direction === 'inbound';
                items.push({
                    id: p.id, date: p.attributes.date,
                    createdAt: p.attributes.created_at,
                    description: p.attributes.description || (isIn ? 'Tahsilat' : 'Ödeme'),
                    debit: isIn ? 0 : parseAmount(p.attributes.amount),
                    credit: isIn ? parseAmount(p.attributes.amount) : 0,
                    type: 'payment'
                });
            });

            // Process Bank Transactions (Banka Gelen/Giden)
            indepBank.data.forEach((b: any) => {
                // Filter out bank transactions that are already linked to a payment or money transfer
                if (seenTransactionIds.has(b.id) || (b.attributes.payment_id && seenTransactionIds.has(b.attributes.payment_id)) || (b.attributes.money_transfer_id && seenTransactionIds.has(b.attributes.money_transfer_id))) return;
                seenTransactionIds.add(b.id);
                const amount = parseAmount(b.attributes.amount);
                const isIn = amount > 0;
                items.push({
                    id: b.id, date: b.attributes.date,
                    createdAt: b.attributes.created_at,
                    description: b.attributes.description || (isIn ? 'Banka Gelen Havale/EFT' : 'Banka Giden Havale/EFT'),
                    debit: isIn ? 0 : Math.abs(amount),
                    credit: isIn ? amount : 0,
                    type: 'payment'
                });
            });

            // Process Money Transfers
            moneyTrans.data.forEach((m: any) => {
                if (seenTransactionIds.has(m.id)) return;
                seenTransactionIds.add(m.id);
                const amount = parseAmount(m.attributes.amount);
                // Money transfers can be complex, but let's assume if it matches filter it affects contact
                // A money transfer has a 'from_payable_id' and 'to_payable_id'.
                // If contactId is 'to_payable_id', it's an inbound transfer (credit).
                // If contactId is 'from_payable_id', it's an outbound transfer (debit).
                // The filter `filter[contact_id]` should already ensure it's related to this contact.
                const isIn = m.relationships.to_payable.data?.id === contactId;
                items.push({
                    id: m.id, date: m.attributes.date,
                    description: m.attributes.description || (isIn ? 'Gelen Para Transferi' : 'Giden Para Transferi'),
                    debit: isIn ? 0 : amount,
                    credit: isIn ? amount : 0,
                    type: 'payment'
                });
            });

            // Merge Aggregated Payments
            finalPaymentsMap.forEach(p => items.push(p));

            // 3. Calculation Engine (FORWARD)
            items.sort((a, b) => {
                const d1 = new Date(a.date).getTime();
                const d2 = new Date(b.date).getTime();
                if (d1 !== d2) return d1 - d2;
                
                // If same date, sort by created_at for true order
                if (a.createdAt && b.createdAt) {
                    const c1 = new Date(a.createdAt).getTime();
                    const c2 = new Date(b.createdAt).getTime();
                    if (c1 !== c2) return c1 - c2;
                }

                // Stability: Opening balance first on same date/time
                if (a.type === 'opening_balance') return -1;
                if (b.type === 'opening_balance') return 1;
                // Last resort: ID
                return (parseInt(a.id) || 0) - (parseInt(b.id) || 0);
            });

            // ULTIMATE ANCHOR LOGIC (Last Resort)
            // Calculate residual to match exact official balance
            // officialBakiye was already set during contact fetch at the start
            let tempSum = 0;
            items.forEach(it => {
                tempSum += (it.debit || 0);
                tempSum -= (it.credit || 0);
            });
            const residual = officialBakiye - tempSum;
            
            // Add residual anchor at the very beginning
            if (Math.abs(residual) > 0.01) {
                const firstDate = items.length > 0 ? items[0].date : new Date().toISOString().split('T')[0];
                items.unshift({
                    id: 'residual-anchor',
                    date: firstDate,
                    description: 'Eski Dönemden Devreden / Bakiye Düzeltme',
                    debit: residual > 0 ? residual : 0,
                    credit: residual < 0 ? Math.abs(residual) : 0,
                    type: 'opening_balance',
                    is_adjustment: true
                });
            }

            let runningBalance = 0;
            const finalData = items.map(item => {
                runningBalance += (item.debit || 0);
                runningBalance -= (item.credit || 0);
                return { ...item, balance: runningBalance };
            });

            return new Response(JSON.stringify({
                success: true,
                data: [...finalData].reverse(), // Return newest first consistently for UI
                debug: debugObj,
                version: '3.9',
                official_balance: officialBakiye
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
        }

        // PROXY DEBUG MODE (For development discovery)
        if (type === 'PROXY_DEBUG') {
            const relPath = bodyData.path; // e.g. "contacts/123/contact_transactions"
            if (!relPath) return new Response("Missing Path", { status: 400 });
            
            const fullUrl = `https://api.parasut.com/v4/${company_id}/${relPath}`;
            const r = await fetchWithRetry(fullUrl, { method: 'GET' });
            const json = await r.json();
            return new Response(JSON.stringify({ success: r.ok, data: json, url: fullUrl }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
        }

        // Standard Logic
        let url: URL;
        if (path) {
            url = new URL(`https://api.parasut.com/${is_v1 ? 'v1' : 'v4'}/${is_global ? '' : company_id + '/'}${path}`);
        } else {
            url = new URL(`https://api.parasut.com/v4/${company_id}/${type === 'contact_show' ? 'contacts/' + bodyData.contact_id : type}`);
            if (query) url.searchParams.append('filter[query]', query);
        }

        const response = await fetchWithRetry(url.toString(), {
            headers: { 'Authorization': `Bearer ${access_token}` }
        });
        const resJson = await response.json();

        if (!response.ok) throw new Error(`API Error: ${JSON.stringify(resJson.errors?.[0]?.detail || resJson)}`);

        // If raw mode, return data as is
        if (bodyData.raw) {
            return new Response(JSON.stringify({ success: true, data: resJson, version: VERSION }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
        }

        // Handle both single object and array data
        const rawData = Array.isArray(resJson.data) ? resJson.data : [resJson.data];

        const output = rawData.filter(i => i && i.attributes).map((item: any) => ({
            id: item.id, name: item.attributes.name || item.attributes.full_name,
            balance: parseAmount(item.attributes.trl_balance || item.attributes.balance),
            type: item.type
        }));

        return new Response(JSON.stringify({ success: true, data: Array.isArray(resJson.data) ? output : output[0], meta: resJson.meta, version: VERSION }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message, version: 'err-3.7' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
    }
});
