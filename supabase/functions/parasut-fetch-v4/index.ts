// --- LEGACY FUNCTION - DO NOT USE FOR NEW CODE ---
// This function is deprecated. Please use 'parasut-fetch' for all API calls.
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
        const VERSION = 'v3.1-composite-final';
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const bodyData = await req.json();
        const { type, query, path, is_global, is_v1 } = bodyData;

        // Fetch settings from DB
        const { data: settings } = await supabaseClient.from('parasut_settings').select('*');
        if (!settings?.[0]) throw new Error('Paraşüt ayarları veritabanında bulunamadı.');

        const activeSettings = settings[0];
        let { access_token, refresh_token, expires_at, company_id, client_id, client_secret } = activeSettings;

        const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
            const headers = { ...options.headers, 'User-Agent': `Supabase/Edge-Functions/${VERSION}` };
            try { return await fetch(url, { ...options, headers }); }
            catch (err: any) { if (retries > 0) return fetchWithRetry(url, options, retries - 1); throw err; }
        };

        const parseAmount = (val: any): number => {
            if (!val) return 0; if (typeof val === 'number') return val;
            return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
        };

        if (type === 'contact_statement') {
            const contactId = bodyData.contact_id;
            const debugObj: any = { version: VERSION, company_id: company_id };

            const fetchResource = async (resName: string, filterKey: string) => {
                const url = `https://api.parasut.com/v4/${company_id}/${resName}?filter[${filterKey}]=${contactId}&page[size]=50`;
                debugObj[`${resName}_url`] = url;
                const r = await fetchWithRetry(url, { headers: { 'Authorization': `Bearer ${access_token}` } });
                debugObj[`${resName}_status`] = r.status;
                const json = r.ok ? await r.json() : { data: [] };
                debugObj[`${resName}_count`] = json.data?.length || 0;
                return json.data || [];
            };

            const [sales, purchase, payments] = await Promise.all([
                fetchResource('sales_invoices', 'contact_id'),
                fetchResource('purchase_bills', 'supplier_id'),
                fetchResource('payments', 'contact_id')
            ]);

            let items: any[] = [];
            sales.forEach((i: any) => items.push({
                date: i.attributes.issue_date, description: `Satış Faturası - ${i.attributes.invoice_no || ''}`,
                debit: parseAmount(i.attributes.net_total), credit: 0
            }));
            purchase.forEach((i: any) => items.push({
                date: i.attributes.issue_date, description: `Alış Faturası - ${i.attributes.invoice_no || ''}`,
                debit: 0, credit: parseAmount(i.attributes.net_total)
            }));
            payments.forEach((i: any) => {
                const isIn = i.attributes.direction === 'inbound';
                items.push({
                    date: i.attributes.date, description: `Tahsilat - ${i.attributes.description || ''}`,
                    debit: isIn ? 0 : parseAmount(i.attributes.amount), credit: isIn ? parseAmount(i.attributes.amount) : 0
                });
            });

            items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            let bal = 0;
            const formatted = items.map(it => ({ ...it, balance: (bal += (it.debit - it.credit)) })).reverse();

            return new Response(JSON.stringify({ success: true, data: formatted, debug: debugObj }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
        }

        // Standard Logic
        let url: URL;
        if (path) {
            url = new URL(`https://api.parasut.com/${is_v1 ? 'v1' : 'v4'}/${is_global ? '' : company_id + '/'}${path}`);
        } else {
            url = new URL(`https://api.parasut.com/v4/${company_id}/${type === 'contact_show' ? 'contacts/' + bodyData.contact_id : type}`);
            if (query) url.searchParams.append('filter[name]', query);
        }

        const response = await fetchWithRetry(url.toString(), {
            headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
        });
        const resJson = await response.json();

        const output = (resJson.data || []).map((item: any) => ({
            id: item.id, name: item.attributes.name || item.attributes.full_name,
            balance: parseAmount(item.attributes.trl_balance || item.attributes.balance),
            type: item.type
        }));

        return new Response(JSON.stringify({ success: true, data: output, meta: resJson.meta, version: VERSION }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message, version: 'err-3.1' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
        });
    }
});
