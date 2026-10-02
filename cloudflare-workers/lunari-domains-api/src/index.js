export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const authHeader = request.headers.get("Authorization");
      
      if (!authHeader) {
        return new Response("Unauthorized", { status: 401, headers: corsHeaders });
      }

      const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          "Authorization": authHeader,
          "apikey": env.SUPABASE_ANON_KEY
        }
      });
      
      if (!userRes.ok) throw new Error("Não autorizado ou sessão expirada.");
      const user = await userRes.json();

      if (request.method === "POST" && url.pathname === "/add") {
        const { domain } = await request.json();
        const cleanDomain = domain.trim().toLowerCase();

        const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            hostname: cleanDomain,
            ssl: { method: "txt", type: "dv" }
          })
        });
        
        const cfData = await cfRes.json();
        if (!cfData.success) throw new Error(cfData.errors[0]?.message || "Erro no Cloudflare");

        await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: "PATCH",
          headers: {
            "Authorization": authHeader,
            "apikey": env.SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ custom_domain: cleanDomain })
        });

        return new Response(JSON.stringify({ success: true, hostname: cfData.result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (request.method === "POST" && url.pathname === "/status") {
        const { domain } = await request.json();
        const cleanDomain = domain.trim().toLowerCase();

        const cfRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames?hostname=${cleanDomain}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json"
          }
        });

        const cfData = await cfRes.json();
        const hostnameData = cfData.result && cfData.result.length > 0 ? cfData.result[0] : null;

        if (!hostnameData) throw new Error("Domínio não encontrado no Cloudflare");

        return new Response(JSON.stringify({ success: true, hostname: hostnameData }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (request.method === "POST" && url.pathname === "/delete") {
        const { domain } = await request.json();
        const cleanDomain = domain.trim().toLowerCase();

        const getRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames?hostname=${cleanDomain}`, {
          headers: { 'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }
        });
        const getData = await getRes.json();
        const hostnameData = getData.result && getData.result.length > 0 ? getData.result[0] : null;

        if (hostnameData) {
          await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostnameData.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' }
          });
        }

        await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: "PATCH",
          headers: {
            "Authorization": authHeader,
            "apikey": env.SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({ custom_domain: null })
        });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response("Not found", { status: 404, headers: corsHeaders });
      
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
