/**
 * ShareLinkFallback — rota SPA de defesa em profundidade para `/l/:cobrancaId`.
 *
 * Em produção o rewrite da Vercel encaminha `/l/:cobrancaId` para a edge
 * function `payment-link-preview`, que devolve HTML branded para crawlers e
 * redireciona humanos para `/pay/ip/:id` (InfinitePay) ou `/checkout/:id`
 * (Asaas/MP/PIX). Se o rewrite falhar (cache antigo, deploy quebrado, dev
 * local), esta rota React resolve o provedor e navega para o checkout
 * correto — sem quebrar UX.
 */
import { Navigate, useParams } from 'react-router-dom';

export default function ShareLinkFallback() {
  const { cobrancaId } = useParams<{ cobrancaId: string }>();

  if (!cobrancaId) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/checkout/${cobrancaId}`} replace />;
}
