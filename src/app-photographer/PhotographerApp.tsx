import * as React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";

function FormularioLegacyRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/app/formularios/${id}`} replace />;
}

function FormularioLegacyEditorRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/app/formularios/${id}/editor`} replace />;
}

function GaleriaLegacyRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/app/gallery/select/${id}`} replace />;
}

// Side-effect imports: registram capabilities e eventos nos módulos
import "@/modules/billing";
import "@/modules/gallery";

import Layout from "@/components/layout/Layout";
import { RequireAssistantAccess } from "@/modules/assistant/runtime/RequireAssistantAccess";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

import { SiteLayout } from "@/components/site/SiteLayout";



import { ModuleProvider, useActiveModule } from "@/contexts/ModuleContext";
import { useLocation } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";

import { ConfigurationProvider } from "@/contexts/ConfigurationContext";
import { ProdutoEtiquetasProvider } from "@/contexts/ProdutoEtiquetasContext";
import { WorkflowCacheProvider } from "@/contexts/WorkflowCacheContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PlanRestrictionGuard } from "@/components/auth/PlanRestrictionGuard";
import { BuildMonitor } from "@/components/shared/BuildMonitor";
import { useTrialWelcomeToast } from "@/components/subscription/TrialWelcomeToast";
import { useProvisionGalleryStatuses } from "@/hooks/useProvisionGalleryStatuses";
import { LunariSupportHostProvider } from "@/integrations/support-host";
import { SupportUserRoutes } from "@/modules/support";
import { ADMIN_URL } from "@/lib/appContext";

const Leads = React.lazy(() => import("@/pages/Leads"));
const NovaFinancas = React.lazy(() => import("@/pages/NovaFinancas"));
const Precificacao = React.lazy(() => import("@/pages/Precificacao"));
const AssistenteMcpTokens = React.lazy(() => import("@/pages/AssistenteMcpTokens"));
const AssistenteAprovacoes = React.lazy(() => import("@/pages/AssistenteAprovacoes"));
const Hub = React.lazy(() => import("@/pages/Hub"));
const AnaliseVendas = React.lazy(() => import("@/pages/AnaliseVendas"));
const Tarefas = React.lazy(() => import("@/pages/Tarefas"));
const Conversas = React.lazy(() => import("@/pages/Conversas"));
const ComercialOverviewPage = React.lazy(() => import("@/pages/comercial/ComercialOverviewPage"));
const BibliotecaComercialPage = React.lazy(() => import("@/pages/comercial/BibliotecaComercialPage"));
const EditorPropostaPage = React.lazy(() => import("@/pages/comercial/EditorPropostaPage"));
const EstrategiaComercialPage = React.lazy(() => import("@/pages/comercial/EstrategiaComercialPage"));
const CompartilhamentosComercialPage = React.lazy(() => import("@/pages/comercial/CompartilhamentosComercialPage"));
const ShareAnalysisPage = React.lazy(() => import("@/pages/comercial/ShareAnalysisPage"));
const RelatoriosComercialPage = React.lazy(() => import("@/pages/comercial/RelatoriosComercialPage"));
const BriefingPage = React.lazy(() => import("@/pages/comercial/BriefingPage"));
const FormsListPage = React.lazy(() => import("@/features/formularios/pages/FormsListPage"));
const FormDetailPage = React.lazy(() => import("@/features/formularios/pages/FormDetailPage"));
const FormEditorPage = React.lazy(() => import("@/features/formularios/pages/FormEditorPage"));
const ContratosPage = React.lazy(() => import("@/pages/comercial/ContratosPage"));
const InfinitePayCheckout = React.lazy(() => import("@/pages/pay/InfinitePayCheckout"));
const ClientDeliverGallery = React.lazy(() => import("@/pages/gallery/ClientDeliverGallery"));
const Auth = React.lazy(() => import("@/pages/Auth"));
const Onboarding = React.lazy(() => import("@/pages/Onboarding"));
const EscolherPlano = React.lazy(() => import("@/pages/EscolherPlano"));
const MinhaAssinatura = React.lazy(() => import("@/pages/MinhaAssinatura"));
const EscolherPlanoPagamento = React.lazy(() => import("@/pages/EscolherPlanoPagamento"));
const GalleryPlaceholder = React.lazy(() => import("@/pages/gallery/GalleryPlaceholder"));


const Index = React.lazy(() => import("@/pages/Index"));
const Agenda = React.lazy(() => import("@/pages/Agenda"));
const Clientes = React.lazy(() => import("@/pages/Clientes"));
const Configuracoes = React.lazy(() => import("@/pages/Configuracoes"));
const ClienteDetalhe = React.lazy(() => import("@/pages/ClienteDetalhe"));
const Workflow = React.lazy(() => import("@/pages/Workflow"));
const MinhaConta = React.lazy(() => import("@/pages/MinhaConta"));
const Integracoes = React.lazy(() => import("@/pages/Integracoes"));
const PublicProposalViewer = React.lazy(() => import("@/pages/comercial/PublicProposalViewer"));
const GalleryDashboard = React.lazy(() => import("@/pages/gallery/GalleryDashboard"));
const GalleryHome = React.lazy(() => import("@/pages/gallery/GalleryHome"));
const SignaturePage = React.lazy(() => import("@/pages/AssinaturaPublica/SignaturePage"));
const PublicBookingPage = React.lazy(() => import("@/pages/book/PublicBookingPage"));
const HomePage = React.lazy(() => import("@/pages/site/HomePage"));
const StudioPage = React.lazy(() => import("@/pages/site/StudioPage"));
const GalleryOverviewPage = React.lazy(() => import("@/pages/site/GalleryOverviewPage"));
const GallerySelectPage = React.lazy(() => import("@/pages/site/GallerySelectPage"));
const GalleryTransferPage = React.lazy(() => import("@/pages/site/GalleryTransferPage"));
const PrecosPage = React.lazy(() => import("@/pages/site/PrecosPage"));
const SobrePage = React.lazy(() => import("@/pages/site/SobrePage"));
const ContatoPage = React.lazy(() => import("@/pages/site/ContatoPage"));
const PublicCheckout = React.lazy(() => import("@/pages/PublicCheckout"));
const ShareLinkFallback = React.lazy(() => import("@/pages/pay/ShareLinkFallback"));
const GalleryCreate = React.lazy(() => import("@/pages/gallery/GalleryCreate"));
const DeliverCreate = React.lazy(() => import("@/pages/gallery/DeliverCreate"));
const GalleryEdit = React.lazy(() => import("@/pages/gallery/GalleryEdit"));
const GalleryDetail = React.lazy(() => import("@/pages/gallery/GalleryDetail"));
const DeliverDetail = React.lazy(() => import("@/pages/gallery/DeliverDetail"));
const GalleryDefaultsPage = React.lazy(() => import("@/pages/gallery/GalleryDefaultsPage"));
const GalleryCustomizationPage = React.lazy(() => import("@/pages/gallery/GalleryCustomizationPage"));
const ClientGallery = React.lazy(() => import("@/pages/gallery/ClientGallery"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const Conteudos = React.lazy(() => import("@/pages/Conteudos"));
const ConteudoDetalhe = React.lazy(() => import("@/pages/ConteudoDetalhe"));
const SitemapProxy = React.lazy(() => import("@/pages/SitemapProxy"));
const CentroAjuda = React.lazy(() => import("@/pages/CentroAjuda"));
const ArtigoAjuda = React.lazy(() => import("@/pages/ArtigoAjuda"));
const OAuthConsent = React.lazy(() => import("@/pages/OAuthConsent"));
const FormularioPublico = React.lazy(() => import("@/pages/FormularioPublico"));
const CreditsCheckout = React.lazy(() => import("@/pages/planos/CreditsCheckout"));
const CreditsPayment = React.lazy(() => import("@/pages/planos/CreditsPayment"));
const PrivacidadePage = React.lazy(() => import("@/pages/legal/PrivacidadePage"));
const TermosPage = React.lazy(() => import("@/pages/legal/TermosPage"));
const ExclusaoDadosPage = React.lazy(() => import("@/pages/legal/ExclusaoDadosPage"));
const CookiesPage = React.lazy(() => import("@/pages/legal/CookiesPage"));
const SegurancaPage = React.lazy(() => import("@/pages/legal/SegurancaPage"));


/**
 * Redireciona rotas legadas /app/admin/* para admin.lunarihub.com.
 * Mantido durante transição; remover em etapa futura.
 */
function RedirectToAdminHost({ to }: { to: string }) {
  React.useEffect(() => {
    window.location.replace(`${ADMIN_URL}${to}`);
  }, [to]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Redirecionando para o painel administrativo…
    </div>
  );
}

function AuthRouteWrapper() {
  const isApp = React.useMemo(() => {
    const hostname = window.location.hostname;
    return hostname === 'app.lunarihub.com' || 
           hostname.includes('lovable.app') || 
           hostname.includes('localhost');
  }, []);

  React.useEffect(() => {
    // Se NÃO estiver no domínio do app nem em dev, redireciona para a URL canônica do Auth
    if (!isApp) {
      console.log("🔄 Redirecionando para host de autenticação oficial...");
      window.location.replace("https://app.lunarihub.com/auth" + window.location.search + window.location.hash);
    }
  }, [isApp]);

  // Se já estiver no host correto, renderiza o componente de Auth real
  if (isApp) {
    return <Auth />;
  }

  // Enquanto redireciona
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Redirecionando para o ambiente seguro…
    </div>
  );
}

function GoogleCallbackProxy() {
  React.useEffect(() => {
    // Força o roteamento para a Edge Function oficial ignorando falhas do Vercel Rewrite
    // Crítico para que testes em localhost, preview do Lovable ou rotas mal configuradas funcionem.
    window.location.replace(`https://tlnjspsywycbudhewsfv.supabase.co/functions/v1/google-calendar-callback${window.location.search}`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Processando integração com Google Calendar...
    </div>
  );
}

function PhotographerInit() {
  // Workflow cache/realtime agora é gerido por <WorkflowRealtimeBridge> + workflowStore.
  // Sync de appointments→sessões é feito pelo trigger DB; capability `workflow.syncFromAgenda` cobre re-sync manual.
  useTrialWelcomeToast();
  useProvisionGalleryStatuses();
  return null;
}

function ModuleSync() {
  const location = useLocation(); 
  const { activeModule, setActiveModule } = useActiveModule();
  
  React.useEffect(() => {
    const path = location.pathname;
    const isSharedPath = path.startsWith('/app/clientes') || path.startsWith('/app/minha-conta') || path.startsWith('/app/financas');
    
    if (path.startsWith('/app/gallery') && activeModule !== 'gallery') {
      setActiveModule('gallery');
    } else if (path.startsWith('/app') && !path.startsWith('/app/gallery') && !isSharedPath && activeModule !== 'studio') {
      setActiveModule('studio');
    }
  }, [location.pathname, activeModule, setActiveModule]);

  return null;
}

export default function PhotographerApp() {
  return (
    <ConfigurationProvider>
      <ProdutoEtiquetasProvider>
        <WorkflowCacheProvider>
          <PhotographerInit />
          <ModuleProvider>
            <AppProvider>
              <BuildMonitor />
              <ModuleSync />
              <Routes>
              {/* ============ PUBLIC INSTITUTIONAL SITE (SiteLayout) ============ */}
              <Route element={<SiteLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/studio" element={<StudioPage />} />
                <Route path="/gallery" element={<GalleryOverviewPage />} />
                <Route path="/gallery/select" element={<GallerySelectPage />} />
                <Route path="/gallery/transfer" element={<GalleryTransferPage />} />
                <Route path="/precos" element={<PrecosPage />} />
                <Route path="/sobre" element={<SobrePage />} />
                <Route path="/contato" element={<ContatoPage />} />
                <Route path="/legal/privacidade" element={<PrivacidadePage />} />
                <Route path="/legal/termos" element={<TermosPage />} />
                <Route path="/legal/exclusao-dados" element={<ExclusaoDadosPage />} />
                <Route path="/legal/cookies" element={<CookiesPage />} />
                <Route path="/legal/seguranca" element={<SegurancaPage />} />
                <Route path="/legal/lgpd" element={<PrivacidadePage />} />

              </Route>

              <Route path="/auth" element={<AuthRouteWrapper />} />
              <Route path="/auth/google/callback" element={<GoogleCallbackProxy />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/oauth/consent" element={<OAuthConsent />} />
              <Route path="/conteudos" element={<Conteudos />} />
              <Route path="/conteudos/:slug" element={<ConteudoDetalhe />} />
              <Route path="/sitemap.xml" element={<SitemapProxy />} />

              <Route path="/formulario/:token" element={<FormularioPublico />} />
              <Route path="/formularios" element={<Navigate to="/app/formularios" replace />} />
              <Route path="/formularios/:id" element={<FormularioLegacyRedirect />} />
              <Route path="/formularios/:id/editor" element={<FormularioLegacyEditorRedirect />} />
              <Route path="/checkout/:cobrancaId" element={<PublicCheckout />} />
              <Route path="/pay/ip/:cobrancaId" element={<PublicCheckout />} />
              <Route path="/l/:cobrancaId" element={<ShareLinkFallback />} />


              <Route path="/landing" element={<Navigate to="/" replace />} />

              <Route path="/escolher-plano" element={
                <ProtectedRoute><EscolherPlano /></ProtectedRoute>
              } />
              <Route path="/minha-assinatura" element={
                <ProtectedRoute><MinhaAssinatura /></ProtectedRoute>
              } />
              <Route path="/escolher-plano/pagamento" element={
                <ProtectedRoute><EscolherPlanoPagamento /></ProtectedRoute>
              } />

              <Route path="/onboarding" element={
                <ProtectedRoute><Onboarding /></ProtectedRoute>
              } />

              {/* ============ PROTECTED ROUTES (/app) ============ */}
              <Route path="/app" element={
                <ProtectedRoute><Layout /></ProtectedRoute>
              }>
                <Route index element={<Index />} />
                <Route path="agenda" element={<Agenda />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="clientes/:id" element={<ClienteDetalhe />} />
                <Route path="leads" element={
                  <RequireAdmin>
                    <PlanRestrictionGuard entitlement="leads"><Leads /></PlanRestrictionGuard>
                  </RequireAdmin>
                } />
                <Route path="comercial">
                  <Route index element={<RequireAdmin><ComercialOverviewPage /></RequireAdmin>} />
                  <Route path="biblioteca" element={<RequireAdmin><BibliotecaComercialPage /></RequireAdmin>} />
                  <Route path="construtor/:id" element={<RequireAdmin><EditorPropostaPage /></RequireAdmin>} />
                  <Route path="estrategia" element={<RequireAdmin><EstrategiaComercialPage /></RequireAdmin>} />
                  <Route path="compartilhamentos" element={<RequireAdmin><CompartilhamentosComercialPage /></RequireAdmin>} />
                  <Route path="compartilhamentos/:shareId" element={<RequireAdmin><ShareAnalysisPage /></RequireAdmin>} />
                  <Route path="relatorios" element={<RequireAdmin><RelatoriosComercialPage /></RequireAdmin>} />
                  <Route path="briefing" element={
                    <RequireAdmin>
                      <PlanRestrictionGuard entitlement="forms">
                        <FormsListPage />
                      </PlanRestrictionGuard>
                    </RequireAdmin>
                  } />
                  <Route path="contratos" element={
                    <RequireAdmin>
                      <PlanRestrictionGuard entitlement="contracts">
                        <ContratosPage />
                      </PlanRestrictionGuard>
                    </RequireAdmin>
                  } />
                </Route>

                {/* Módulo Gallery */}
                <Route path="gallery">
                  <Route index element={<Navigate to="/app/gallery/dashboard" replace />} />
                  <Route path="dashboard" element={<GalleryHome />} />
                    <Route path="list" element={<GalleryDashboard />} />
                  <Route path="new/select" element={<GalleryCreate />} />
                  <Route path="new/transfer" element={<DeliverCreate />} />
                  <Route path="select/:id/edit" element={<GalleryEdit />} />
                  <Route path="transfer/:id/edit" element={<GalleryEdit />} />
                    <Route path="select/:id" element={<GalleryDetail />} />
                    <Route path="transfer/:id" element={<DeliverDetail />} />
                    
                    {/* Settings Routes */}
                    <Route path="settings" element={<Navigate to="/app/gallery/settings/defaults" replace />} />
                    <Route path="settings/defaults" element={<GalleryDefaultsPage />} />
                    <Route path="settings/customization" element={<GalleryCustomizationPage />} />
                    
                    {/* Alias antigos do legado para evitar quebra caso existam links hardcoded no cache */}
                  <Route path="select" element={<Navigate to="/app/gallery/dashboard" replace />} />
                  <Route path="transfer" element={<Navigate to="/app/gallery/dashboard" replace />} />
                  <Route path="galerias" element={<Navigate to="/app/gallery/dashboard" replace />} />
                </Route>

                <Route path="planos-e-creditos">
                  <Route index element={<CreditsCheckout />} />
                  <Route path="pay" element={<CreditsPayment />} />
                </Route>

                <Route path="financas" element={
                  <PlanRestrictionGuard entitlement="finance"><NovaFinancas /></PlanRestrictionGuard>
                } />
                <Route path="precificacao" element={
                  <PlanRestrictionGuard entitlement="pricing"><Precificacao /></PlanRestrictionGuard>
                } />
                <Route path="workflow" element={<Workflow />} />
                <Route path="analise-vendas" element={
                  <PlanRestrictionGuard entitlement="sales_analysis"><AnaliseVendas /></PlanRestrictionGuard>
                } />
                <Route path="configuracoes" element={<Configuracoes />} />
                <Route path="configuracoes/assistente-mcp" element={<RequireAdmin><RequireAssistantAccess><AssistenteMcpTokens /></RequireAssistantAccess></RequireAdmin>} />
                <Route path="assistente/mcp" element={<RequireAdmin><RequireAssistantAccess><AssistenteMcpTokens /></RequireAssistantAccess></RequireAdmin>} />
                <Route path="assistente/aprovacoes" element={<RequireAdmin><RequireAssistantAccess><AssistenteAprovacoes /></RequireAssistantAccess></RequireAdmin>} />
                <Route path="hub" element={<RequireAdmin><Hub /></RequireAdmin>} />

                <Route path="inteligencia" element={<Navigate to="/app/hub" replace />} />
                <Route path="minha-conta" element={<MinhaConta />} />
                <Route path="integracoes" element={<Integracoes />} />
                <Route path="tarefas" element={
                  <PlanRestrictionGuard entitlement="tasks"><Tarefas /></PlanRestrictionGuard>
                } />
                <Route path="formularios" element={
                  <RequireAdmin>
                    <PlanRestrictionGuard entitlement="forms">
                      <FormsListPage />
                    </PlanRestrictionGuard>
                  </RequireAdmin>
                } />
                <Route path="formularios/novo" element={
                  <RequireAdmin>
                    <PlanRestrictionGuard entitlement="forms">
                      <FormEditorPage />
                    </PlanRestrictionGuard>
                  </RequireAdmin>
                } />
                <Route path="formularios/:id" element={
                  <RequireAdmin>
                    <PlanRestrictionGuard entitlement="forms">
                      <FormDetailPage />
                    </PlanRestrictionGuard>
                  </RequireAdmin>
                } />
                <Route path="formularios/:id/editor" element={
                  <RequireAdmin>
                    <PlanRestrictionGuard entitlement="forms">
                      <FormEditorPage />
                    </PlanRestrictionGuard>
                  </RequireAdmin>
                } />
                <Route path="conversas" element={
                  <PlanRestrictionGuard entitlement="conversas"><Conversas /></PlanRestrictionGuard>
                } />
                <Route path="feed-test" element={<Navigate to="/app/workflow" replace />} />
                <Route path="preferencias" element={<Navigate to="/app/minha-conta" replace />} />
                <Route path="galeria/:id" element={<GaleriaLegacyRedirect />} />

                {/* Compat: rotas admin antigas redirecionam para admin.lunarihub.com */}
                <Route path="admin/usuarios" element={<RedirectToAdminHost to="/usuarios" />} />
                <Route path="admin/planos" element={<RedirectToAdminHost to="/planos" />} />
                <Route path="admin/conteudos" element={<RedirectToAdminHost to="/conteudos" />} />
                <Route path="admin/conteudos/novo" element={<RedirectToAdminHost to="/conteudos/novo" />} />
                <Route path="admin/conteudos/editar/:id" element={<RedirectToAdminHost to="/conteudos" />} />
                <Route path="admin/suporte/*" element={<RedirectToAdminHost to="/suporte" />} />

                <Route path="ajuda" element={<CentroAjuda />} />
                <Route path="ajuda/:slug" element={<ArtigoAjuda />} />
                <Route
                  path="suporte/*"
                  element={
                    <LunariSupportHostProvider>
                      <SupportUserRoutes />
                    </LunariSupportHostProvider>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Rotas Públicas do Comercial */}
              <Route path="/p/:token" element={<PublicProposalViewer mode="tracked" />} />
              
              {/* Rotas Públicas de Galeria */}
              <Route path="/g/:token" element={<ClientGallery />} />
              <Route path="/c/:token" element={<ClientGallery />} />

              {/* Assinatura Nativa de Contrato */}
              <Route path="/assinar/:token" element={<SignaturePage />} />
              
              {/* Agendamento Online Público */}
              <Route path="/book/:slug" element={<PublicBookingPage />} />
              <Route path="/agendar/:slug" element={<PublicBookingPage />} />
              
              {/* Rota Pública de Proposta por Slug (deve vir após as rotas prefixadas) */}
              <Route path="/:slug" element={<PublicProposalViewer mode="public" />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </ModuleProvider>
      </WorkflowCacheProvider>
      </ProdutoEtiquetasProvider>
    </ConfigurationProvider>
  );
}


