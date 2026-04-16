import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const settings = {
    id: 1,
    client_id: 'Pk2zANUd0fFMIo92jeOjizr-66cFicnL2gMlpKiERXc',
    client_secret: 'LnSy-oYpQF8p9YAYsYarKMnfwsni0-jx2HBlD9eSekg',
    company_id: '510255',
    redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
    access_token: 'ra0HYKsqkCVysUU1yEnbN1OV6CNGaaSpKKBnpZT9kfc',
    refresh_token: 'AnYAyEjXgXg5p_gcjxzAEiY0fLVjm_SsM1e0MhtajJc',
    expires_at: '2026-03-09T19:09:26Z',
    updated_at: new Date().toISOString()
};

async function init() {
    console.log('Initializing Parasut Settings...');
    const { data, error } = await supabase
        .from('parasut_settings')
        .upsert(settings)
        .select();

    if (error) {
        console.error('Error initializing settings:', error);
    } else {
        console.log('Settings successfully initialized:', JSON.stringify(data, null, 2));
    }
}

init();
