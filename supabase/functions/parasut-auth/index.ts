// --- LEGACY FUNCTION - DO NOT USE FOR NEW CODE ---
// This function is deprecated. Please use 'parasut-fetch' for all exchange/auth needs.
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

        const { action, code } = await req.json()

        // 1. Ayarları Getir
        const { data: settings, error: settingsError } = await supabaseClient
            .from('parasut_settings')
            .select('*')
            .single()

        if (settingsError || !settings) {
            throw new Error('Paraşüt ayarları bulunamadı. Lütfen önce ayarları kaydedin.')
        }

        const { client_id, client_secret, redirect_uri, refresh_token, expires_at } = settings

        // ACTION: EXCHANGE CODE (İlk kurulumda kod ile token alma)
        if (action === 'exchange_code') {
            if (!code) throw new Error('Yatkilendirme kodu (code) gerekli.')

            const response = await fetch('https://api.parasut.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id,
                    client_secret,
                    redirect_uri,
                    code,
                    grant_type: 'authorization_code',
                }),
            })

            const tokenData = await response.json()
            if (!response.ok) throw new Error(`Paraşüt Hatası: ${tokenData.error_description || tokenData.error}`)

            // Tokenları güncelle
            const expiresAt = new Date()
            expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

            await supabaseClient.from('parasut_settings').update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: expiresAt.toISOString(),
            }).eq('id', 1)

            return new Response(JSON.stringify({ message: 'Yetkilendirme başarılı.', data: tokenData }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // ACTION: REFRESH TOKEN (Veya otomatik kontrol)
        if (action === 'refresh' || action === 'get_token') {
            const now = new Date()
            const expiry = expires_at ? new Date(expires_at) : null

            // Eğer token hala geçerliyse (veya 5 dk tolerans) ve sadece get_token istenmişse
            if (action === 'get_token' && settings.access_token && expiry && expiry.getTime() > (now.getTime() + 300000)) {
                return new Response(JSON.stringify({ access_token: settings.access_token }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                })
            }

            // Refresh Gerekli
            if (!refresh_token) throw new Error('Refresh token bulunamadı. Lütfen tekrar yetkilendirin.')

            const response = await fetch('https://api.parasut.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id,
                    client_secret,
                    refresh_token,
                    grant_type: 'refresh_token',
                }),
            })

            const tokenData = await response.json()
            if (!response.ok) throw new Error(`Token Yenileme Hatası: ${tokenData.error_description || tokenData.error}`)

            const expiresAt = new Date()
            expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in)

            await supabaseClient.from('parasut_settings').update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: expiresAt.toISOString(),
            }).eq('id', 1)

            return new Response(JSON.stringify({ access_token: tokenData.access_token }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        throw new Error('Geçersiz aksiyon.')

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
