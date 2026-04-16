import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function run() {
    try {
        const startDate = `2024-01-01`; 
        const endDate = `2024-12-31`;

        const { data: accountsData } = await supabase.functions.invoke('parasut-fetch-new', {
            body: { path: 'accounts', raw: true }
        });

        const accId = accountsData.data.data[0].id;
        console.log(`Testing account ${accId}...`);
        
        const { data: transData, error: transError } = await supabase.functions.invoke('parasut-fetch-new', {
            body: {
                path: `accounts/${accId}/transactions?filter[date][gteq]=${startDate}&filter[date][lteq]=${endDate}&page[size]=1&include=debit_account,credit_account`,
                raw: true
            }
        });

        if (transData.success && transData.data.data?.[0]) {
            const trans = transData.data.data[0];
            console.log('Transaction Relationships:', JSON.stringify(trans.relationships, null, 2));
            console.log('Transaction Attributes:', JSON.stringify(trans.attributes, null, 2));
            if (transData.data.included) {
                console.log('Included Sample:', JSON.stringify(transData.data.included[0], null, 2));
            }
        } else {
            console.log('No data or error:', transError || transData.error);
        }

    } catch (err) {
        console.error(err);
    }
}

run();
