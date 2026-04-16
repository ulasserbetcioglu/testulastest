import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function generateFullReport() {
    const { data: settings } = await supabase.from('parasut_settings').select('*').single();
    if (!settings) {
        console.error('Settings not found');
        return;
    }

    const { data: localProducts } = await supabase.from('paid_products').select('id, name, parasut_id').order('name');

    let allParasutProducts: any[] = [];
    let page = 1;
    while (page <= 5) {
        const url = `https://api.parasut.com/v4/730862/products?page[size]=50&page[number]=${page}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${settings.access_token}`, 'User-Agent': 'Test' } });
        if (!res.ok) break;
        const data = await res.json();
        if (!data.data || data.data.length === 0) break;
        allParasutProducts = allParasutProducts.concat(data.data);
        page++;
    }

    console.log('--- PARAŞÜT ÜRÜN VE HİZMET RAPORU ---');
    console.log(`Yerel Ürün Sayısı: ${localProducts?.length || 0}`);
    console.log(`Paraşüt Ürün Sayısı: ${allParasutProducts.length}`);
    console.log('-----------------------------------');

    localProducts?.forEach(local => {
        const match = allParasutProducts.find(p => p.attributes.name.toLowerCase() === local.name.toLowerCase() || p.attributes.code === local.name);
        if (match) {
            console.log(`[EŞLEŞTİ] ${local.name} -> Paraşüt ID: ${match.id} (${match.attributes.name})`);
        } else {
            console.log(`[EKSİK] ${local.name} -> Paraşüt'te Tam Eşleşme Bulunamadı`);
        }
    });

    console.log('\n--- PARAŞÜT\'TEKİ TÜM ÜRÜN VE HİZMETLER (İLK 150) ---');
    allParasutProducts.forEach(p => {
        console.log(`ID: ${p.id} | SKU: ${p.attributes.code || 'NULL'} | AD: ${p.attributes.name}`);
    });
}

generateFullReport();
