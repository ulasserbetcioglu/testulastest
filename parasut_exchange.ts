import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!; // We need service role if RLS is on, but let's try anon first if policies allow
const supabase = createClient(supabaseUrl, supabaseKey);

const CLIENT_ID = 'Pk2zANUd0fFMIo92jeOjizr-66cFicnL2gMlpKiERXc';
const CLIENT_SECRET = 'LnSy-oYpQF8p9YAYsYarKMnfwsni0-jx2HBlD9eSekg';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
const CODE = '-EzRmpLxS5mzOBJcOXP-tMnAIoSMHYcGFU8OC33DsRc';

async function exchange() {
    try {
        console.log('Exchanging code for tokens...');
        const response = await axios.post('https://api.parasut.com/oauth/token', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code: CODE,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code'
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const data = response.data;
        console.log('Tokens received:', data);

        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in);

        console.log('Updating supabase...');
        const { error } = await supabase
            .from('parasut_settings')
            .update({
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: expiresAt.toISOString()
            })
            .eq('id', 1);

        if (error) {
            console.error('Supabase update error:', error);
        } else {
            console.log('Supabase updated successfully!');
        }

    } catch (err: any) {
        console.error('Exchange error:', err.response?.data || err.message);
    }
}

exchange();
