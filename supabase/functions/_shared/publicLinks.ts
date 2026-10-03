export interface LinkGenerationOptions {
  type: 'gallery' | 'checkout' | 'payment_shortlink' | 'proposal' | 'form' | 'contract' | 'booking';
  token?: string;
  slug?: string;
  profile?: {
    namespace?: string | null;
    public_namespace?: string | null;
    custom_domain?: string | null;
  } | null;
}

export function generatePublicLink({ type, token, slug, profile }: LinkGenerationOptions): string {
  // 1. Resolve Base URL
  let baseUrl = 'https://lunarihub.com';
  
  if (profile?.custom_domain) {
    baseUrl = `https://${profile.custom_domain}`;
  } else if (profile?.namespace || profile?.public_namespace) {
    const ns = profile.namespace || profile.public_namespace;
    baseUrl = `https://lunarihub.com/${ns}`;
  }

  const pathParam = token || slug || '';

  // 2. Resolve Path
  switch (type) {
    case 'gallery': 
      return `${baseUrl}/g/${pathParam}`;
    case 'payment_shortlink':
      return `${baseUrl}/l/${pathParam}`;
    case 'checkout': 
      return `${baseUrl}/checkout/${pathParam}`;
    case 'proposal': 
      return `${baseUrl}/p/${pathParam}`;
    case 'form': 
      return `${baseUrl}/formulario/${pathParam}`;
    case 'contract': 
      return `${baseUrl}/assinar/${pathParam}`;
    case 'booking': 
      return `${baseUrl}/book/${pathParam}`;
    default: 
      return `${baseUrl}/l/${pathParam}`;
  }
}
