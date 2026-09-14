import { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useInputMode } from '@/hooks/useInputMode';
import {
  House,
  CalendarDays,
  MessageCircle,
  Funnel,
  UsersRound,
  GitBranch,
  SquareCheck,
  BriefcaseBusiness,
  WalletCards,
  Tag,
  ChartNoAxesCombined,
  Settings2,
  Sparkles,
  Menu,
  X,
  BookOpen,
  Target,
  Send,
  BarChart3,
  ChevronDown,
  Crown,
  ClipboardList,
  FileSignature,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useEntitlements } from '@/hooks/useEntitlements';
import { cn } from '@/lib/utils';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import logoIconWhite from '@/assets/branding/lunari-icon-white.png';
import logoIconBlack from '@/assets/branding/lunari-icon-black.png';
import logoFullWhite from '@/assets/branding/lunari-full-white.png';
import logoFullBlack from '@/assets/branding/lunari-full-black.png';
import { useActiveModule } from '@/contexts/ModuleContext';
import { ProductSwitcher } from './ProductSwitcher';

// Premium da marca: ícone levemente dourado nos itens PRO (acento, não destaque).
const ProCrown = ({ className }: { className?: string }) => (
  <Crown size={8} className={cn('text-[hsl(var(--accent-gold))] fill-[hsl(var(--accent-gold))]', className)} />
);

interface NavItemProps {
  to?: string;
  icon?: React.ReactNode;
  label: string;
  isPro?: boolean;
  showProBadge?: boolean;
  end?: boolean;
  onNavigate?: () => void;
  subItems?: { to: string; label: string; icon: React.ReactNode }[];
  isSeparator?: boolean;
  groupLabel?: string;
}

/* ────────────────────────── MOBILE / DRAWER ────────────────────────── */
const DrawerNavItem = ({ to, icon, label, isPro, showProBadge, end, onNavigate, subItems, isSeparator, groupLabel }: NavItemProps) => {
  const isComercial = to === '/app/comercial';
  const [isOpen, setIsOpen] = useState(false);

  if (isSeparator) return <div className="h-3" aria-hidden />;

  return (
    <div className="flex flex-col">
      {groupLabel && (
        <p className="px-3 pt-3 pb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--sidebar-fg))]/35">
          {groupLabel}
        </p>
      )}
      <div className="flex w-full mb-0.5 group">
        <NavLink
          to={to}
          end={end || isComercial}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'nav-item-lunar flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-200 hover:bg-white/5 flex-1',
              isActive
                ? 'active text-[hsl(var(--sidebar-active-fg))]'
                : 'text-[hsl(var(--sidebar-fg))]'
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex items-center justify-center flex-shrink-0 relative transition-colors duration-200',
                  isActive ? 'text-[hsl(var(--accent-gold))]' : 'text-[hsl(var(--sidebar-icon))]/80'
                )}
              >
                {icon}
                {isPro && showProBadge && (
                  <span className="absolute -top-1 -right-1">
                    <ProCrown />
                  </span>
                )}
              </span>
              <span className="text-[13px] font-medium whitespace-nowrap tracking-[-0.005em]">{label}</span>
            </>
          )}
        </NavLink>
        {subItems && (
          <button
            onClick={(e) => { e.preventDefault(); setIsOpen(!isOpen); }}
            className="flex items-center justify-center px-3 text-[hsl(var(--sidebar-fg))]/50 hover:text-[hsl(var(--sidebar-fg))] transition-colors"
          >
            <ChevronDown size={14} className={cn('transition-transform duration-200', isOpen && 'rotate-180')} />
          </button>
        )}
      </div>

      {subItems && isOpen && (
        <div className="flex flex-col ml-7 mt-1 mb-2 border-l border-white/5 pl-2 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {subItems.map(sub => (
            <NavLink
              key={sub.to}
              to={sub.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'text-[12px] py-1.5 px-2.5 rounded-md transition-colors duration-200 flex items-center gap-2',
                  isActive
                    ? 'bg-white/[0.04] text-[hsl(var(--sidebar-active-fg))] font-medium'
                    : 'text-[hsl(var(--sidebar-fg))]/75 hover:bg-white/5 hover:text-[hsl(var(--sidebar-fg))]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('transition-colors', isActive ? 'text-[hsl(var(--accent-gold))]' : 'text-[hsl(var(--sidebar-icon))]/60')}>
                    {sub.icon}
                  </span>
                  {sub.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────── DESKTOP ────────────────────────── */
const DesktopNavItem = ({
  to,
  icon,
  label,
  isPro,
  showProBadge,
  end,
  expanded,
  subItems,
  isSeparator,
  groupLabel,
}: NavItemProps & { expanded: boolean }) => {
  const isComercial = to === '/app/comercial';
  const [isOpen, setIsOpen] = useState(false);

  // Recolhe a sanfona automaticamente quando a sidebar retrai
  useEffect(() => {
    if (!expanded) setIsOpen(false);
  }, [expanded]);

  if (isSeparator) return <div className="h-3" aria-hidden />;

  const link = (
    <div className="flex flex-col">
      {groupLabel && (
        <p
          className={cn(
            'px-3 pt-3.5 pb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[hsl(var(--sidebar-fg))]/30 truncate transition-opacity duration-150 ease-out',
            expanded ? 'opacity-100 delay-[60ms]' : 'opacity-0 pointer-events-none'
          )}
        >
          {groupLabel}
        </p>
      )}
      <div className="flex w-full mb-0.5 group relative">
        <NavLink
          to={to}
          end={end || isComercial}
          className={({ isActive }) =>
            cn(
              'nav-item-lunar flex items-center h-9 rounded-md transition-colors duration-200 overflow-hidden hover:bg-white/5 flex-1',
              isActive
                ? 'active text-[hsl(var(--sidebar-active-fg))]'
                : 'text-[hsl(var(--sidebar-fg))]'
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex items-center justify-center w-10 h-9 flex-shrink-0 relative transition-colors duration-200',
                  isActive
                    ? 'text-[hsl(var(--accent-gold))]'
                    : expanded
                      ? 'text-[hsl(var(--sidebar-icon))]/70'
                      : 'text-[hsl(var(--sidebar-icon-collapsed))] group-hover:text-[hsl(var(--sidebar-icon-collapsed-hover))]'
                )}
              >
                {icon}
                {isPro && showProBadge && (
                  <span className="absolute top-1 right-1.5">
                    <ProCrown />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  'text-[13px] font-medium whitespace-nowrap tracking-[-0.005em] transition-opacity duration-150 ease-out',
                  expanded ? 'opacity-100 delay-[60ms]' : 'opacity-0 pointer-events-none'
                )}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
        {subItems && (
          <button
            onClick={(e) => { e.preventDefault(); expanded && setIsOpen(!isOpen); }}
            className={cn(
              'absolute right-2 top-0 bottom-0 flex items-center justify-center px-1 text-[hsl(var(--sidebar-fg))]/40 hover:text-[hsl(var(--sidebar-fg))] transition-opacity duration-150 ease-out',
              expanded ? 'opacity-100 delay-[60ms]' : 'opacity-0 pointer-events-none'
            )}
          >
            <ChevronDown size={13} className={cn('transition-transform duration-200', isOpen && 'rotate-180')} />
          </button>
        )}
      </div>

      {subItems && expanded && isOpen && (
        <div className="flex flex-col ml-[2.5rem] mt-1 mb-2 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {subItems.map(sub => (
            <NavLink
              key={sub.to}
              to={sub.to}
              className={({ isActive }) =>
                cn(
                  'text-[12px] py-1.5 px-2.5 rounded-md transition-colors hover:bg-white/5 flex items-center gap-2',
                  isActive
                    ? 'text-[hsl(var(--sidebar-active-fg))] bg-white/[0.04] font-medium'
                    : 'text-[hsl(var(--sidebar-fg))]/70 hover:text-[hsl(var(--sidebar-fg))]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('transition-colors', isActive ? 'text-[hsl(var(--accent-gold))]' : 'text-[hsl(var(--sidebar-icon))]/50')}>
                    {sub.icon}
                  </span>
                  {sub.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );

  if (expanded) return link;

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

/* ────────────────────────── TABLET RAIL ────────────────────────── */
const RailNavItem = ({ to, icon, label, isPro, showProBadge, end }: NavItemProps) => {
  if (!to) return null;

  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        cn(
          'nav-item-lunar mb-0.5 flex items-center justify-center h-10 w-full rounded-md transition-colors duration-200 overflow-hidden hover:bg-white/5',
          isActive
            ? 'active text-[hsl(var(--sidebar-active-fg))]'
            : 'text-[hsl(var(--sidebar-icon-collapsed))] hover:text-[hsl(var(--sidebar-icon-collapsed-hover))]'
        )
      }
    >
      {({ isActive }) => (
        <span className={cn('flex items-center justify-center h-10 w-full flex-shrink-0 relative transition-colors duration-200', isActive && 'text-[hsl(var(--accent-gold))]')}>
          {icon}
          {isPro && showProBadge && (
            <span className="absolute top-1 right-2">
              <ProCrown />
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
};

export default function Sidebar() {
  const isMobile = useIsMobile();
  const inputMode = useInputMode();
  const { accessState } = useAccessControl();
  const { activeModule } = useActiveModule();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);

  const mode: 'mobile' | 'tablet' | 'desktop' =
    isMobile ? 'mobile' : inputMode === 'touch' ? 'tablet' : 'desktop';

  const clearTimers = useCallback(() => {
    if (enterTimer.current) { window.clearTimeout(enterTimer.current); enterTimer.current = null; }
    if (leaveTimer.current) { window.clearTimeout(leaveTimer.current); leaveTimer.current = null; }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    setIsOpen(false);
    setIsHovered(false);
    clearTimers();
  }, [mode, clearTimers]);

  const handleEnter = useCallback(() => {
    if (leaveTimer.current) { window.clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    if (isHovered) return;
    enterTimer.current = window.setTimeout(() => setIsHovered(true), 80);
  }, [isHovered]);

  const handleLeave = useCallback(() => {
    if (enterTimer.current) { window.clearTimeout(enterTimer.current); enterTimer.current = null; }
    leaveTimer.current = window.setTimeout(() => setIsHovered(false), 140);
  }, []);

  /* ────────── Ícones padronizados (Lucide, stroke leve) ────────── */
  const ICON_SIZE = 17;
  const stroke = { strokeWidth: 1.6 };

  /* ────────── Navegação Studio (Lunari Studio) ──────────
     Hierarquia reorganizada para refletir o fluxo natural do fotógrafo:
       • Principal  → o que tenho para fazer / quem está chegando
       • Produção   → execução
       • Negócio    → comercial e finanças
       • Sistema    → configurações e IA
  */
  const navItems: NavItemProps[] = [
    // Bloco principal
    { to: '/app', icon: <House size={ICON_SIZE} {...stroke} />, label: 'Início', end: true, groupLabel: 'Principal' },

    { to: '/app/agenda', icon: <CalendarDays size={ICON_SIZE} {...stroke} />, label: 'Agenda' },
    { to: '/app/conversas', icon: <MessageCircle size={ICON_SIZE} {...stroke} />, label: 'Conversas', isPro: true },
    { to: '/app/leads', icon: <Funnel size={ICON_SIZE} {...stroke} />, label: 'Leads', isPro: true, adminOnly: true } as NavItemProps,
    { to: '/app/clientes', icon: <UsersRound size={ICON_SIZE} {...stroke} />, label: 'Clientes' },

    // Produção
    { isSeparator: true, label: '', to: 'spacer-1' },
    { to: '/app/workflow', icon: <GitBranch size={ICON_SIZE} {...stroke} />, label: 'Workflow', groupLabel: 'Produção' },
    { to: '/app/tarefas', icon: <SquareCheck size={ICON_SIZE} {...stroke} />, label: 'Tarefas', isPro: true },

    // Comercial
    { isSeparator: true, label: '', to: 'spacer-2' },
    {
      to: '/app/comercial',
      icon: <FileText size={ICON_SIZE} {...stroke} />,
      label: 'Propostas',
      adminOnly: true,
      groupLabel: 'Comercial',
      subItems: [
        { to: '/app/comercial/biblioteca', label: 'Biblioteca', icon: <BookOpen size={12} strokeWidth={1.6} /> },
        { to: '/app/comercial/compartilhamentos', label: 'Compartilhamentos', icon: <Send size={12} strokeWidth={1.6} /> },
        { to: '/app/comercial/relatorios', label: 'Relatórios', icon: <BarChart3 size={12} strokeWidth={1.6} /> },
      ],
    },
    { to: '/app/comercial/estrategia', icon: <Target size={ICON_SIZE} {...stroke} />, label: 'Estratégias', adminOnly: true } as NavItemProps,
    { to: '/app/comercial/briefing', icon: <ClipboardList size={ICON_SIZE} {...stroke} />, label: 'Briefing', isPro: true, adminOnly: true } as NavItemProps,
    { to: '/app/comercial/contratos', icon: <FileSignature size={ICON_SIZE} {...stroke} />, label: 'Contratos', isPro: true, adminOnly: true } as NavItemProps,

    // Financeiro
    { isSeparator: true, label: '', to: 'spacer-2b' },
    { to: '/app/financas', icon: <WalletCards size={ICON_SIZE} {...stroke} />, label: 'Finanças', isPro: true, groupLabel: 'Financeiro' },
    { to: '/app/precificacao', icon: <Tag size={ICON_SIZE} {...stroke} />, label: 'Precificação', isPro: true },
    { to: '/app/analise-vendas', icon: <ChartNoAxesCombined size={ICON_SIZE} {...stroke} />, label: 'Análise de Vendas', isPro: true },

    // Sistema
    { isSeparator: true, label: '', to: 'spacer-3' },
    { to: '/app/configuracoes', icon: <Settings2 size={ICON_SIZE} {...stroke} />, label: 'Configurações', groupLabel: 'Sistema' },
    { to: '/app/hub', icon: <Sparkles size={ICON_SIZE} {...stroke} />, label: 'Hub de IA', adminOnly: true } as NavItemProps,
  ].filter((item: any) => !item.adminOnly || accessState.isAdmin);

  const galleryNavItems: NavItemProps[] = [
    { to: '/app/gallery/dashboard', icon: <House size={ICON_SIZE} {...stroke} />, label: 'Início', end: true, groupLabel: 'Principal' },
    {
      to: '/app/gallery/list',
      icon: <BookOpen size={ICON_SIZE} {...stroke} />,
      label: 'Galerias',
      subItems: [
        { to: '/app/gallery/new/select', label: 'Select (Nova)', icon: <SquareCheck size={12} strokeWidth={1.6} /> },
        { to: '/app/gallery/new/transfer', label: 'Transfer (Nova)', icon: <Send size={12} strokeWidth={1.6} /> },
      ],
    },
    { to: '/app/clientes', icon: <UsersRound size={ICON_SIZE} {...stroke} />, label: 'Clientes' },
    { isSeparator: true, label: '', to: 'spacer-gallery' },
    { to: '/app/gallery/settings/defaults', icon: <Settings2 size={ICON_SIZE} {...stroke} />, label: 'Padrões', groupLabel: 'Configurações' },
    { to: '/app/gallery/settings/customization', icon: <Tag size={ICON_SIZE} {...stroke} />, label: 'Personalização' },
  ];

  const currentNavItems = activeModule === 'gallery' ? galleryNavItems : navItems;

  const { isFree } = useEntitlements();
  const showProBadge = isFree;
  const isDark = useIsDarkMode();

  const toggleSidebar = () => setIsOpen(v => !v);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  /* ────────────────────────── MOBILE ────────────────────────── */
  if (mode === 'mobile') {
    return <>
        <div
          className="fixed bottom-0 left-0 right-0 backdrop-blur-sm shadow-lunar-md z-40 px-2 pt-2 border-t border-border bg-background/80"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-5 h-12 gap-1">
            {currentNavItems.slice(0, 4).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex flex-col items-center justify-center py-1 rounded-md text-lunar-text transition-all duration-150 text-center',
                  isActive
                    ? 'text-lunar-accent bg-lunar-surface shadow-sm'
                    : 'hover:bg-lunar-surface/30 hover:shadow-lunar-sm hover:translate-y-[-1px]'
                )}
              >
                <div className="mb-0.5 relative">
                  {item.icon}
                  {item.isPro && showProBadge && (
                    <span className="absolute -top-1 -right-1">
                      <ProCrown />
                    </span>
                  )}
                </div>
                <span className="text-2xs font-medium leading-tight">{item.label}</span>
              </NavLink>
            ))}

            <button onClick={toggleSidebar} className="flex flex-col items-center justify-center text-lunar-text py-1 rounded-md hover:shadow-lunar-sm hover:translate-y-[-1px] transition-all duration-150 bg-muted hover:bg-muted/80">
              <Menu size={14} className="mb-0.5" />
              <span className="text-2xs font-medium">Mais</span>
            </button>
          </div>
        </div>

        {/* Drawer lateral — versão mobile do menu completo */}
        <div
          className={cn(
            'fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-200',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={toggleSidebar}
        >
          <div
            className={cn(
              'absolute right-0 top-0 bottom-0 w-72 shadow-2xl transition-transform transform duration-200',
              isOpen ? 'translate-x-0' : 'translate-x-full'
            )}
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#151515',
              color: 'hsl(var(--sidebar-fg))',
            }}
          >
            <div className="flex justify-between items-center px-4 h-14">
              <div className="flex items-center">
                <span className="font-semibold text-sm tracking-tight">Lunari</span>
              </div>
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 text-[hsl(var(--sidebar-fg))] hover:bg-white/10 hover:text-[hsl(var(--sidebar-fg))]">
                <X size={16} />
              </Button>
            </div>

            <div className="px-3 pb-2">
              <ProductSwitcher expanded={true} />
            </div>

            <div className="px-3 pt-1 pb-4 space-y-0 overflow-y-auto max-h-[calc(100vh-7rem)]">
              {currentNavItems.map(item => (
                <DrawerNavItem
                  key={item.to || (item as any).label}
                  {...item}
                  showProBadge={showProBadge}
                  onNavigate={closeSidebar}
                />
              ))}
            </div>
          </div>
        </div>
      </>;
  }

  /* ────────────────────────── TABLET (rail estático) ────────────────────────── */
  if (mode === 'tablet') {
    return (
      <div className="w-16 shrink-0 h-screen relative z-40">
        <aside
          aria-label="Navegação principal"
          className="absolute inset-y-0 left-0 w-16 flex flex-col px-2 py-3 border-r overflow-hidden"
          style={{
            backgroundColor: '#151515',
            color: 'hsl(var(--sidebar-fg))',
            borderColor: 'rgba(255,255,255,0.04)',
          }}
        >
          <div className="h-10 flex items-center justify-center mb-3">
            <img src={logoIconWhite} alt="Lunari" className="h-7 w-7 object-contain" />
          </div>

          <div className="mb-2 px-1">
            <ProductSwitcher expanded={false} />
          </div>

          <div className="flex-1 pt-3 overflow-y-auto scrollbar-elegant">
            <div className="space-y-0">
              {currentNavItems.map(item => (
                <RailNavItem
                  key={item.to || (item as any).label}
                  {...item}
                  showProBadge={showProBadge}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    );
  }

  /* ────────────────────────── DESKTOP (hover-expand) ────────────────────────── */
  const expandDuration = isHovered ? 200 : 220;

  return (
    <TooltipProvider delayDuration={400}>
      <div className="shrink-0 h-screen relative z-40" style={{ width: '4rem' }}>
        <aside
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          aria-expanded={isHovered}
          style={{
            width: isHovered ? '15rem' /* 240px */ : '4rem',
            transitionDuration: `${expandDuration}ms`,
            transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
            transitionProperty: 'width, box-shadow',
            willChange: 'width',
            backgroundColor: '#151515',
            color: 'hsl(var(--sidebar-fg))',
          }}
          className={cn(
            'absolute inset-y-0 left-0 flex flex-col py-3 border-r overflow-hidden',
            isHovered && 'shadow-lunar-md'
          )}
        >
          {/* Logo: ícone quando colapsado, full quando expandido */}
          <div className="h-10 flex items-center px-3 mb-3 overflow-hidden relative">
            <img
              src={logoIconWhite}
              alt="Lunari"
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 object-contain transition-opacity duration-150 ease-out',
                isHovered ? 'opacity-0' : 'opacity-100 delay-[60ms]'
              )}
            />
            <img
              src={logoFullWhite}
              alt="Lunari"
              className={cn(
                'absolute left-3.5 top-1/2 -translate-y-1/2 h-5 object-contain object-left transition-opacity duration-150 ease-out',
                isHovered ? 'opacity-100 delay-[60ms]' : 'opacity-0'
              )}
            />
          </div>

          {/* Seletor de produto (workspace) */}
          <div className="px-2 mb-3">
            <ProductSwitcher expanded={isHovered} />
          </div>

          {/* Menu principal */}
          <div className="flex-1 overflow-y-auto scrollbar-elegant px-2">
            <div className="flex flex-col">
              {currentNavItems.map(item => (
                <DesktopNavItem
                  key={item.to || (item as any).label}
                  {...item}
                  showProBadge={showProBadge}
                  expanded={isHovered}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </TooltipProvider>
  );
}
