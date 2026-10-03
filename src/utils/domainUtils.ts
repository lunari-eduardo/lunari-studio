/**
 * Utilitários para detecção de domínio e URLs de redirect
 */

const CANONICAL_PRODUCTION_URL = import.meta.env.VITE_SITE_URL || 'https://lunarihub.com';

import { generatePublicLink } from './publicLinks';

export function isProductionDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'app.lunarihub.com' || 
         hostname === 'lunarihub.com' ||
         hostname.includes('lunariplataforma') ||
         hostname.includes('lovable.app');
}

export function isAppHost(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'app.lunarihub.com' || 
         hostname.includes('lovable.app') || 
         hostname.includes('localhost') ||
         hostname.includes('127.0.0.1');
}

export function getAppBaseUrl(): string {
  const hostname = window.location.hostname;
  
  if (hostname.includes('lunarihub')) {
    return 'https://app.lunarihub.com';
  }
  
  if (hostname.includes('lunariplataforma')) {
    return 'https://www.lunariplataforma.com.br';
  }
  
  if (hostname.includes('lovable.app')) {
    return window.location.origin;
  }
  
  return window.location.origin;
}

export function getOAuthRedirectUri(): string {
  return `${getAppBaseUrl()}/app/integracoes`;
}

export function getCanonicalBaseUrl(): string {
  return CANONICAL_PRODUCTION_URL;
}

export function getPublicShareBaseUrl(profileInfo?: { namespace?: string | null, public_namespace?: string | null, customDomain?: string | null, custom_domain?: string | null }): string {
  return generatePublicLink({ 
    type: 'gallery', 
    profile: { namespace: profileInfo?.namespace || profileInfo?.public_namespace, custom_domain: profileInfo?.customDomain || profileInfo?.custom_domain } 
  }).replace(/\/g\/?$/, '');
}

export function buildPaymentShareUrl(cobrancaId: string, profileInfo?: { namespace?: string | null, public_namespace?: string | null, customDomain?: string | null, custom_domain?: string | null }): string {
  return generatePublicLink({ 
    type: 'payment_shortlink', 
    token: cobrancaId, 
    profile: { namespace: profileInfo?.namespace || profileInfo?.public_namespace, custom_domain: profileInfo?.customDomain || profileInfo?.custom_domain } 
  });
}
