import React from 'react';
import { ChevronDown, Copy, DownloadCloud, FolderInput, FolderPlus, GripVertical, MoreHorizontal, Plus, Settings2, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PACKAGE_GROUP_FIELDS, packageGroupItem, packageItem, type BlockField, type FieldCtx } from '../../blocks/registryDefinitions';
import {
  buildPackagePages,
  displayPrice,
  duplicatePackageAfter,
  movePackageToGroup,
  packageGroupKey,
  removeGroupKeepingPackages,
  reorderWithin,
  type PackageGroup,
} from '../../blocks/pricing';
import { neighbors, patchItem, resolveItem, sameRef, type ItemRef } from '../../blocks/inspectorFocus';
import { useInspectorNav } from './panel/InspectorNav';
import { ItemRow } from './panel/ItemRow';
import { ItemDetailShell, ItemFields } from './panel/ItemDetail';
import { EYEBROW, FOCUS_RING } from './panel/panelStyles';

// Select do Radix não aceita valor vazio: "Sem grupo" usa este valor e some do dado ao gravar
const NO_GROUP = '__none__';
// Acima disto a árvore abre só o grupo em uso (os outros recolhem; o fotógrafo muda quando quiser)
const OPEN_ALL_UP_TO = 10;

const asGroups = (content: Record<string, any>): PackageGroup[] => (Array.isArray(content.groups) ? content.groups : []);
const asPackages = (content: Record<string, any>): any[] => (Array.isArray(content.packages) ? content.packages : []);
const groupName = (g: PackageGroup, i: number) => g.title?.trim() || `Grupo ${i + 1}`;
const packageTitle = (p: any) => p.name?.trim() || 'Novo pacote';
const countLabel = (n: number) => `${n} ${n === 1 ? 'pacote' : 'pacotes'}`;

/** Ações de um pacote: o ⋯ da linha e o do cabeçalho do detalhe. Mover = trocar o `group_id` (o pacote não sai do lugar no array). */
function PackageActions({
  groups,
  currentGroup,
  onDuplicate,
  onMove,
  onRemove,
}: {
  groups: PackageGroup[];
  currentGroup: string;
  onDuplicate: () => void;
  onMove: (groupKey: string) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <DropdownMenuItem className="cursor-pointer gap-2" onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
        Duplicar
      </DropdownMenuItem>
      {groups.length > 0 && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer gap-2">
            <FolderInput className="h-4 w-4" />
            Mover para
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {groups.map((g, i) => (
              <DropdownMenuItem key={g.key} className="cursor-pointer" disabled={currentGroup === g.key} onClick={() => onMove(g.key)}>
                {groupName(g, i)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" disabled={currentGroup === ''} onClick={() => onMove('')}>
              Sem grupo
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem className="cursor-pointer gap-2 text-destructive focus:text-destructive" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
        Remover
      </DropdownMenuItem>
    </>
  );
}

/** Cabeçalho de um grupo na árvore: arrastar (ordem dos grupos), recolher, ajustes e ⋯. */
function GroupSection({
  group,
  name,
  count,
  collapsed,
  selected,
  onToggle,
  onSettings,
  menu,
  children,
}: {
  group: PackageGroup;
  name: string;
  count: number;
  collapsed: boolean;
  selected: boolean;
  onToggle: () => void;
  onSettings: () => void;
  menu: React.ReactNode;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.key });
  return (
    <div
      ref={setNodeRef}
      data-item-row={`groups:${group.key}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-xl border bg-background',
        selected ? 'border-primary/40 ring-1 ring-primary/30' : 'border-border/60',
        isDragging && 'relative z-10 shadow-[0_4px_30px_rgba(0,0,0,0.08)]'
      )}
    >
      <div className="flex items-center gap-1 pl-1 pr-1">
        <button
          type="button"
          className={cn('flex h-8 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/50 hover:text-foreground active:cursor-grabbing', FOCUS_RING)}
          title="Arrastar para reordenar os grupos"
          aria-label="Arrastar para reordenar os grupos"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-md py-2.5 text-left', FOCUS_RING)}
        >
          <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200', collapsed && '-rotate-90')} />
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">{name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{countLabel(count)}</span>
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground/70 hover:bg-muted hover:text-foreground"
          onClick={onSettings}
          aria-label={`Ajustes do grupo ${name}`}
          title="Ajustes do grupo"
        >
          <Settings2 />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground/70 hover:bg-muted hover:text-foreground" aria-label={`Mais ações de ${name}`} title="Mais ações">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!collapsed && <div className="space-y-1.5 border-t border-border/60 p-2">{children}</div>}
    </div>
  );
}

const AddPackageButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="outline" className="h-9 w-full gap-2 rounded-xl border-dashed text-xs" onClick={onClick}>
    <Plus className="h-3.5 w-3.5" />
    Adicionar pacote
  </Button>
);

/**
 * Pacotes da Tabela de Preços com grupos opcionais, como árvore compacta: cada grupo recolhe/expande e
 * cada pacote é uma linha que abre o detalhe (`PackageDetail`). Sem grupos = a lista de pacotes + "Novo grupo".
 * A ordem vem de `buildPackagePages` (a mesma da arte); arrastar reordena dentro do grupo e a ordem dos grupos.
 * Tudo é editado pelo `id` do pacote / `key` do grupo: o array `packages` não é reordenado a cada edição.
 */
export function PackageGroupsField({
  content,
  field,
  onChange,
  onImport,
}: {
  content: Record<string, any>;
  /** Campo `packages` do schema (itemFactory dos pacotes). */
  field: BlockField;
  ctx: FieldCtx;
  onChange: (updates: Record<string, any>) => void;
  /** Abre a importação dos pacotes cadastrados direto num grupo (chave do grupo). */
  onImport?: (groupKey: string) => void;
}) {
  const nav = useInspectorNav();
  const groups = asGroups(content);
  const packages = asPackages(content);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const pages = buildPackagePages(content, { includeEmpty: true });
  const ungrouped = pages.find((p) => p.groupIndex === -1);
  const groupPages = pages.filter((p) => p.group);

  // ---- recolher/expandir (preferência da seção, lembrada pelo painel) ----
  const lastPackage = nav?.last?.list === 'packages' ? packages.find((p) => p.id === nav.last!.key) : undefined;
  const focusGroup = nav?.last?.list === 'groups' ? nav.last.key : lastPackage ? packageGroupKey(lastPackage, groups) : '';
  const isCollapsed = (key: string) => {
    if (!nav) return false;
    if (nav.collapsed) return nav.collapsed.includes(key);
    return packages.length > OPEN_ALL_UP_TO && key !== (focusGroup || groups[0]?.key);
  };
  const toggle = (key: string) => {
    const now = groups.map((g) => g.key).filter(isCollapsed);
    nav?.setCollapsed(now.includes(key) ? now.filter((k) => k !== key) : [...now, key]);
  };

  // ---- operações (sempre por id/key) ----
  const open = (ref: ItemRef) => nav?.openItem(ref);

  const openPackage = (pkg: any, idx: number) => {
    let id: string = pkg.id;
    if (!id) {
      // Pacote antigo sem `id`: ganha um ao abrir (o detalhe identifica por `id`, nunca por posição)
      id = crypto.randomUUID();
      onChange({ packages: packages.map((p, i) => (i === idx ? { ...p, id } : p)) });
    }
    open({ list: 'packages', key: id });
  };

  const addPackage = (scope: string) => {
    const item: Record<string, any> = { ...(field.itemFactory ? field.itemFactory() : packageItem()), ...(scope && { group_id: scope }) };
    onChange({ packages: [...packages, item] });
    open({ list: 'packages', key: item.id });
  };

  const duplicatePackage = (id: string) => {
    const newId = crypto.randomUUID();
    onChange({ packages: duplicatePackageAfter(packages, id, newId) });
    open({ list: 'packages', key: newId });
  };

  const addGroup = (importAfter = false) => {
    const group = packageGroupItem();
    // O 1º grupo adota os pacotes que já existem: o fotógrafo só renomeia e segue
    onChange(
      groups.length === 0
        ? { groups: [group], packages: packages.map((p) => ({ ...p, group_id: group.key })) }
        : { groups: [...groups, group] }
    );
    open({ list: 'groups', key: group.key });
    if (importAfter) onImport?.(group.key);
  };

  /**
   * Cópia por valor: ids novos e nenhum vínculo com o grupo de origem (preço e itens do lote
   * seguinte mudam sem tocar no anterior). Mantém a composição e a quebra de página do original;
   * período e textos são do lote e ficam vazios.
   */
  const copyGroup = (source: PackageGroup, index: number) => {
    const group = {
      ...packageGroupItem(),
      title: `Cópia de ${groupName(source, index)}`,
      composition: source.composition ?? 'editorial',
      ...(source.new_page && { new_page: true }),
    };
    const copies = packages
      .filter((p) => packageGroupKey(p, groups) === source.key)
      .map((p) => ({ ...JSON.parse(JSON.stringify(p)), id: crypto.randomUUID(), group_id: group.key }));
    onChange({ groups: [...groups, group], packages: [...packages, ...copies] });
    open({ list: 'groups', key: group.key });
  };

  const handleGroupDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const keys = groups.map((g) => g.key);
    onChange({ groups: arrayMove(groups, keys.indexOf(String(active.id)), keys.indexOf(String(over.id))) });
  };

  const renderRows = (entries: { pkg: any; idx: number }[]) => {
    const rowId = (e: { pkg: any; idx: number }) => String(e.pkg.id ?? `pkg-${e.idx}`);
    const ids = entries.map(rowId);
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over && active.id !== over.id) onChange({ packages: reorderWithin(packages, ids, String(active.id), String(over.id)) });
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {entries.map((e) => (
              <ItemRow
                key={rowId(e)}
                id={rowId(e)}
                rowKey={`packages:${e.pkg.id ?? ''}`}
                title={packageTitle(e.pkg)}
                subtitle={displayPrice(e.pkg) || undefined}
                thumb={typeof e.pkg.image_ref === 'string' && e.pkg.image_ref ? e.pkg.image_ref : undefined}
                selected={sameRef(nav?.last, { list: 'packages', key: e.pkg.id })}
                onOpen={() => openPackage(e.pkg, e.idx)}
                menu={
                  e.pkg.id ? (
                    <PackageActions
                      groups={groups}
                      currentGroup={packageGroupKey(e.pkg, groups)}
                      onDuplicate={() => duplicatePackage(e.pkg.id)}
                      onMove={(key) => onChange({ packages: movePackageToGroup(packages, e.pkg.id, key) })}
                      onRemove={() => onChange({ packages: packages.filter((p) => p.id !== e.pkg.id) })}
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  return (
    <div className="space-y-3">
      {groups.length === 0 ? (
        <div className="space-y-1.5">
          {packages.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Nenhum pacote ainda.</p>
          ) : (
            renderRows(pages[0]?.entries ?? [])
          )}
          <AddPackageButton onClick={() => addPackage('')} />
        </div>
      ) : (
        <>
          {ungrouped && ungrouped.entries.length > 0 && (
            <section className="space-y-1.5">
              <p className={EYEBROW}>Sem grupo · {countLabel(ungrouped.entries.length)}</p>
              {renderRows(ungrouped.entries)}
            </section>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
            <SortableContext items={groups.map((g) => g.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {groupPages.map((page) => {
                  const g = page.group!;
                  const name = groupName(g, page.groupIndex);
                  return (
                    <GroupSection
                      key={g.key}
                      group={g}
                      name={name}
                      count={page.entries.length}
                      collapsed={isCollapsed(g.key)}
                      selected={sameRef(nav?.last, { list: 'groups', key: g.key })}
                      onToggle={() => toggle(g.key)}
                      onSettings={() => open({ list: 'groups', key: g.key })}
                      menu={
                        <>
                          {onImport && (
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onImport(g.key)}>
                              <DownloadCloud className="h-4 w-4" />
                              Importar pacotes cadastrados
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                            onClick={() => onChange(removeGroupKeepingPackages(content, g.key))}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remover grupo
                          </DropdownMenuItem>
                        </>
                      }
                    >
                      {page.entries.length > 0 && renderRows(page.entries)}
                      <AddPackageButton onClick={() => addPackage(g.key)} />
                    </GroupSection>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {groups.length === 0 ? (
        <Button variant="outline" className="h-9 w-full gap-2 rounded-xl border-dashed text-xs" onClick={() => addGroup()}>
          <FolderPlus className="h-3.5 w-3.5" />
          Novo grupo de pacote
        </Button>
      ) : (
        // Com grupos, o novo pode nascer vazio, copiado de um existente (lotes) ou com pacotes cadastrados
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 w-full gap-2 rounded-xl border-dashed text-xs">
              <FolderPlus className="h-3.5 w-3.5" />
              Novo grupo de pacote
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-64">
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => addGroup()}>
              <FolderPlus className="h-4 w-4" />
              Grupo vazio
            </DropdownMenuItem>
            {onImport && (
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => addGroup(true)}>
                <DownloadCloud className="h-4 w-4" />
                Importar pacotes cadastrados
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Copiar pacotes de</DropdownMenuLabel>
            {[...groups.keys()].reverse().map((i) => (
              <DropdownMenuItem key={groups[i].key} className="cursor-pointer gap-2" onClick={() => copyGroup(groups[i], i)}>
                <Copy className="h-4 w-4" />
                <span className="truncate">{groupName(groups[i], i)}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {packages.filter((p) => packageGroupKey(p, groups) === groups[i].key).length}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface PackageDetailProps {
  content: Record<string, any>;
  /** Campo `packages` do schema (itemFields). */
  field: BlockField;
  /** Estado da seção (variante resolvida) para o `showIf` dos campos do pacote. */
  ctx: FieldCtx;
  refItem: ItemRef;
  onChange: (updates: Record<string, any>) => void;
  onImport?: (groupKey: string) => void;
  onOpen: (ref: ItemRef) => void;
  onBack: () => void;
}

/** Detalhe de um pacote ou de um grupo (página que cobre o corpo do inspetor). */
export function PackageDetail({ content, field, ctx, refItem, onChange, onImport, onOpen, onBack }: PackageDetailProps) {
  const groups = asGroups(content);
  const packages = asPackages(content);
  const resolved = resolveItem(content, refItem);
  if (!resolved) return null;
  const pos = neighbors(content, refItem);
  const nav = {
    position: { index: pos.index, total: pos.total },
    onPrev: pos.prev ? () => onOpen(pos.prev!) : undefined,
    onNext: pos.next ? () => onOpen(pos.next!) : undefined,
    onBack,
  };

  if (refItem.list === 'groups') {
    const group = resolved.item as PackageGroup;
    return (
      <ItemDetailShell
        itemId={group.key}
        trail="Pacotes › Grupo"
        title={groupName(group, resolved.index)}
        {...nav}
        menu={
          <>
            {onImport && (
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onImport(group.key)}>
                <DownloadCloud className="h-4 w-4" />
                Importar pacotes cadastrados
              </DropdownMenuItem>
            )}
            {onImport && <DropdownMenuSeparator />}
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              onClick={() => onChange(removeGroupKeepingPackages(content, group.key))}
            >
              <Trash2 className="h-4 w-4" />
              Remover grupo
            </DropdownMenuItem>
          </>
        }
      >
        <ItemFields
          fields={PACKAGE_GROUP_FIELDS}
          item={group as Record<string, any>}
          // `showIf` do grupo lê o próprio grupo (ex.: ícone some na composição "divisor")
          ctx={{ content: group as Record<string, any>, props: {} }}
          collapseTexts
          onChange={(k, v) => onChange(patchItem(content, refItem, { [k]: v }))}
        />
        {onImport && (
          <Button variant="outline" className="h-9 w-full gap-2 rounded-xl border-dashed text-xs" onClick={() => onImport(group.key)}>
            <DownloadCloud className="h-3.5 w-3.5" />
            Importar pacotes cadastrados
          </Button>
        )}
      </ItemDetailShell>
    );
  }

  const pkg = resolved.item;
  const groupKey = packageGroupKey(pkg, groups);
  const groupIndex = groups.findIndex((g) => g.key === groupKey);
  const fields: BlockField[] = [
    ...(field.itemFields ?? []),
    ...(groups.length > 0
      ? [
          {
            key: 'group_id',
            label: 'Grupo',
            kind: 'select' as const,
            section: 'organization' as const,
            options: [{ value: NO_GROUP, label: 'Sem grupo' }, ...groups.map((g, i) => ({ value: g.key, label: groupName(g, i) }))],
          },
        ]
      : []),
  ];

  return (
    <ItemDetailShell
      itemId={pkg.id}
      trail={groupIndex >= 0 ? `Pacotes › ${groupName(groups[groupIndex], groupIndex)}` : 'Pacotes'}
      title={packageTitle(pkg)}
      {...nav}
      menu={
        <PackageActions
          groups={groups}
          currentGroup={groupKey}
          onDuplicate={() => {
            const newId = crypto.randomUUID();
            onChange({ packages: duplicatePackageAfter(packages, pkg.id, newId) });
            onOpen({ list: 'packages', key: newId });
          }}
          onMove={(key) => onChange({ packages: movePackageToGroup(packages, pkg.id, key) })}
          onRemove={() => onChange({ packages: packages.filter((p) => p.id !== pkg.id) })}
        />
      }
    >
      <ItemFields
        fields={fields}
        item={{ ...pkg, group_id: groupKey || NO_GROUP }}
        ctx={ctx}
        onChange={(k, v) =>
          k === 'group_id'
            ? onChange({ packages: movePackageToGroup(packages, pkg.id, v === NO_GROUP ? '' : String(v)) })
            : onChange(patchItem(content, refItem, { [k]: v }))
        }
      />
    </ItemDetailShell>
  );
}
