import { Routes, Route, Navigate } from "react-router-dom";


import { LunariSupportHostProvider } from "@/integrations/support-host";
import { SupportAdminRoutes } from "@/modules/support";

import { AdminShell } from "./AdminShell";
import { AdminAuthGate } from "./components/AdminAuthGate";

import DashboardPage from "./modules/dashboard/DashboardPage";
import UsuariosLayout from "./modules/usuarios/UsuariosLayout";
import StoragePage from "./modules/storage/StoragePage";
import SistemaPage from "./modules/sistema/SistemaPage";
import LogsPage from "./modules/audit-logs/LogsPage";
import ConfiguracoesPage from "./modules/configuracoes/ConfiguracoesPage";
import AssistantRolloutPage from "./modules/assistant-rollout/AssistantRolloutPage";



const Auth = React.lazy(() => import("@/pages/Auth"));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const AdminUsuarios = React.lazy(() => import("@/pages/AdminUsuarios"));
const AdminPlanos = React.lazy(() => import("@/pages/AdminPlanos"));
const AdminConteudos = React.lazy(() => import("@/pages/AdminConteudos"));
const AdminConteudoNovo = React.lazy(() => import("@/pages/AdminConteudoNovo"));
const AdminConteudoEditar = React.lazy(() => import("@/pages/AdminConteudoEditar"));
const AssinaturasPage = React.lazy(() => import("./modules/usuarios/pages/AssinaturasPage"));
const EmailsAutorizadosPage = React.lazy(() => import("./modules/usuarios/pages/EmailsAutorizadosPage"));
const IntegracoesPage = React.lazy(() => import("./modules/usuarios/pages/IntegracoesPage"));
const EstrategiaPage = React.lazy(() => import("./modules/usuarios/pages/EstrategiaPage"));


/**
 * AdminApp — entry do subdomínio admin.lunarihub.com
 *
 * Rotas públicas (sem gate): /auth, /reset-password
 * Tudo o mais passa pelo AdminAuthGate (exige sessão + role admin).
 */
export default function AdminApp() {
  return (
    <Routes>
      {/* Rotas públicas do subdomínio admin */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Shell protegido */}
      <Route
        path="/"
        element={
          <AdminAuthGate>
            <AdminShell />
          </AdminAuthGate>
        }
      >
        <Route index element={<DashboardPage />} />

        {/* Usuários — agora com sub-abas como rotas */}
        <Route path="usuarios" element={<UsuariosLayout />}>
          <Route index element={<AdminUsuarios />} />
          <Route path="assinaturas" element={<AssinaturasPage />} />
          <Route path="emails" element={<EmailsAutorizadosPage />} />
          <Route path="integracoes" element={<IntegracoesPage />} />
          <Route path="estrategia" element={<EstrategiaPage />} />
        </Route>

        {/* Redirect de retrocompatibilidade: /assinaturas → /usuarios/assinaturas */}
        <Route path="assinaturas" element={<Navigate to="/usuarios/assinaturas" replace />} />

        <Route path="planos" element={<AdminPlanos />} />
        <Route path="conteudos" element={<AdminConteudos />} />
        <Route path="conteudos/novo" element={<AdminConteudoNovo />} />
        <Route path="conteudos/editar/:id" element={<AdminConteudoEditar />} />
        <Route
          path="suporte/*"
          element={
            <LunariSupportHostProvider>
              <SupportAdminRoutes />
            </LunariSupportHostProvider>
          }
        />
        <Route path="storage" element={<StoragePage />} />
        <Route path="sistema" element={<SistemaPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
        <Route path="assistente" element={<AssistantRolloutPage />} />

        {/* Compat: alguém colando link antigo /app/admin/... no host admin */}
        <Route path="app/admin/usuarios" element={<Navigate to="/usuarios" replace />} />
        <Route path="app/admin/planos" element={<Navigate to="/planos" replace />} />
        <Route path="app/admin/conteudos" element={<Navigate to="/conteudos" replace />} />
        <Route path="app/admin/suporte/*" element={<Navigate to="/suporte" replace />} />
        
        {/* PWA start_url fallback */}
        <Route path="app" element={<Navigate to="/" replace />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
