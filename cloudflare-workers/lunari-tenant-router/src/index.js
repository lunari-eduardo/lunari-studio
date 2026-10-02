export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Permitir apenas rotas públicas para domínios de clientes
    // Isso impede que alguém acesse /admin ou /auth no domínio do fotógrafo.
    const publicPrefixes = ['/g/', '/c/', '/p/', '/l/', '/formulario/', '/book/', '/agendar/', '/assinar/'];
    
    // Fallback nativo
    if (url.hostname === 'fallback.lunarihub.com') {
      return new Response("Lunari Fallback Origin is active.", { status: 200 });
    }

    const isPublicRoute = publicPrefixes.some(prefix => url.pathname.startsWith(prefix));
    
    if (!isPublicRoute && url.pathname !== '/') {
      return new Response("Página não encontrada no estúdio.", { status: 404 });
    }

    // Reescreve a URL para apontar para a Vercel
    const vercelUrl = new URL(request.url);
    vercelUrl.hostname = "app.lunarihub.com"; // ou www.lunarihub.com, mas app garante que a Vercel atenda direto
    
    // Monta uma nova requisição baseada na original
    const proxyRequest = new Request(vercelUrl.toString(), request);
    
    // Força o header Host para que a Vercel não dê erro 404 (Domain Not Found)
    proxyRequest.headers.set("Host", "app.lunarihub.com");
    
    // Opcional: Avisa a Vercel qual era o domínio original
    proxyRequest.headers.set("X-Forwarded-Host", url.hostname);

    return fetch(proxyRequest);
  }
};
