import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAllParasutProducts() {
    const { data: settings } = await supabase.from('parasut_settings').select('*').single();
    if (!settings) {
        console.error('Parasut settings not found');
        return;
    }

    let allProducts: any[] = [];
    let page = 1;
    let hasMore = true;

    console.log('Fetching products from Paraşüt...');

    while (hasMore && page <= 10) { // Limit to 10 pages for safety
        const url = `https://api.parasut.com/v4/730862/products?page[size]=50&page[number]=${page}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${settings.access_token}`,
                'User-Agent': 'Supabase/1.0'
            }
        });

        if (!res.ok) {
            console.error(`Page ${page} failed:`, await res.text());
            break;
        }

        const data = await res.json();
        if (data.data && data.data.length > 0) {
            allProducts = allProducts.concat(data.data);
            console.log(`Page ${page}: Fetched ${data.data.length} items. Total: ${allProducts.length}`);
            page++;
        } else {
            hasMore = false;
        }
    }

    console.log('--- ALL PARASUT PRODUCTS ---');
    allProducts.forEach(item => {
        const attr = item.attributes;
        console.log(`${attr.name} (Code: ${attr.code || 'N/A'}) -> ID: ${item.id} [${item.type}]`);
    });
}

fetchAllParasutProducts();
