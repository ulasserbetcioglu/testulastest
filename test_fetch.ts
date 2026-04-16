import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!;
const key = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

async function run() {
    console.log('Testing parasut-fetch...');
    const { data: contacts, error: contactsError } = await supabase.functions.invoke('parasut-fetch', {
        body: { type: 'contacts', page_size: 2 }
    });

    if (contactsError) {
        console.error('Contacts Error:', contactsError);
        return;
    }

    console.log('Contacts:', JSON.stringify(contacts, null, 2));

    if (contacts?.data?.length > 0) {
        const contactId = contacts.data[0].id;
        console.log(`Testing statement for contact: ${contactId}`);
        const { data: statement, error: statementError } = await supabase.functions.invoke('parasut-fetch', {
            body: {
                type: 'contact_statement',
                contact_id: contactId,
                page_size: 2
            }
        });

        if (statementError) {
            console.error('Statement Error:', statementError);
        } else {
            console.log('Statement:', JSON.stringify(statement, null, 2));
        }
    }
}

run();
