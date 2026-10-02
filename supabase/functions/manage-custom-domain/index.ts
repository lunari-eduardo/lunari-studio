import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { action, domain } = await req.json();
    if (!domain) throw new Error('Domain is required');

    const CF_ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID');
    const CF_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');

    if (!CF_ZONE_ID || !CF_TOKEN) {
      throw new Error('Cloudflare credentials not configured in edge function.');
    }

    const cleanDomain = domain.trim().toLowerCase();

    if (action === 'add') {
      const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/custom_hostnames`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hostname: cleanDomain,
          ssl: {
            method: "txt",
            type: "dv"
          }
        })
      });

      const cfData = await cfResponse.json();

      if (!cfData.success) {
        return new Response(JSON.stringify({ error: cfData.errors[0]?.message || 'Failed to add custom hostname' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await supabaseClient.from('profiles').update({ custom_domain: cleanDomain }).eq('id', user.id);

      return new Response(JSON.stringify({ success: true, hostname: cfData.result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'status') {
      const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/custom_hostnames?hostname=${cleanDomain}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CF_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      const cfData = await cfResponse.json();
      const hostnameData = cfData.result && cfData.result.length > 0 ? cfData.result[0] : null;

      if (!hostnameData) {
         return new Response(JSON.stringify({ error: 'Domain not found in Cloudflare' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }

      return new Response(JSON.stringify({ success: true, hostname: hostnameData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'delete') {
       const getRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/custom_hostnames?hostname=${cleanDomain}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' }
      });
      const getData = await getRes.json();
      const hostnameData = getData.result && getData.result.length > 0 ? getData.result[0] : null;

      if (hostnameData) {
         await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/custom_hostnames/${hostnameData.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' }
        });
      }

      await supabaseClient.from('profiles').update({ custom_domain: null }).eq('id', user.id);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
