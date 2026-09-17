import re
import sys

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # match imports like: import Component from "@/..."
    # ignore things like Layout, SiteLayout, Route, Navigate, AppProvider...
    import_regex = re.compile(r'^import\s+([A-Za-z0-9_]+)\s+from\s+[\'"]([@/A-Za-z0-9_-]+)[\'"];?', re.MULTILINE)
    
    exclude_list = {'React', 'Routes', 'Route', 'Navigate', 'useParams', 'useLocation', 'Layout', 'SiteLayout', 'AppProvider', 'ModuleProvider', 'ConfigurationProvider', 'ProdutoEtiquetasProvider', 'WorkflowCacheProvider', 'ProtectedRoute', 'PlanRestrictionGuard', 'BuildMonitor', 'LunariSupportHostProvider', 'SupportUserRoutes', 'RequireAdmin', 'RequireAssistantAccess', 'SupportAdminRoutes', 'AdminAuthGate', 'AdminShell', 'UsuariosLayout', 'useTrialWelcomeToast', 'useProvisionGalleryStatuses'}

    matches = import_regex.findall(content)
    
    lazy_declarations = []
    
    for comp_name, import_path in matches:
        if comp_name not in exclude_list and not import_path.startswith('react'):
            if 'pages' in import_path or 'features' in import_path or 'comercial' in import_path or 'Admin' in comp_name or 'Page' in comp_name or 'Auth' == comp_name or 'Onboarding' == comp_name or 'MinhaAssinatura' == comp_name:
                # Remove the static import
                content = re.sub(rf'^import\s+{comp_name}\s+from\s+[\'"]{import_path}[\'"];?\n', '', content, flags=re.MULTILINE)
                lazy_declarations.append(f'const {comp_name} = React.lazy(() => import("{import_path}"));')

    # Find the last import and insert lazy_declarations after it
    lines = content.split('\n')
    last_import_idx = 0
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import_idx = i
            
    final_lines = lines[:last_import_idx+1] + [''] + lazy_declarations + [''] + lines[last_import_idx+1:]

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(final_lines))

process_file('src/app-photographer/PhotographerApp.tsx')
process_file('src/app-admin/AdminApp.tsx')
