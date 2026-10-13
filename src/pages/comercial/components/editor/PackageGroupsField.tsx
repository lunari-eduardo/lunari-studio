import React, { useState } from 'react';
import { ChevronDown, Copy, DownloadCloud, FolderPlus } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FieldEditor, ListField, SortableListItem } from '../../blocks/FieldEditor';
import { PACKAGE_GROUP_FIELDS, packageGroupItem, packageItem, type BlockField, type FieldCtx } from '../../blocks/registryDefinitions';
import { packageGroupKey, type PackageGroup } from '../../blocks/pricing';

// Select do Radix não aceita valor vazio: "Sem grupo" usa este valor e some do dado ao gravar
const NO_GROUP = '__none__';

/**
 * Pacotes da Tabela de Preços com grupos opcionais. Sem grupos = a lista de sempre + "Novo grupo".
 * Com grupos: pacotes sem grupo (se houver) e um cartão por grupo (arrastar reordena os grupos),
 * cada um com seus campos e a lista dos seus pacotes. O pacote muda de grupo pelo select "Grupo".
 * A ordem de exibição vem de `content.groups`; dentro do grupo, da ordem relativa em `packages`.
 */
export function PackageGroupsField({
  content,
  field,
  ctx,
  onChange,
  onImport,
}: {
  content: Record<string, any>;
  /** Campo `packages` do schema (itemFields e itemFactory dos pacotes). */
  field: BlockField;
  ctx: FieldCtx;
  onChange: (updates: Record<string, any>) => void;
  /** Abre a importação dos pacotes cadastrados direto num grupo (chave do grupo). */
  onImport?: (groupKey: string) => void;
}) {
  const groups: PackageGroup[] = Array.isArray(content.groups) ? content.groups : [];
  const packages: any[] = Array.isArray(content.packages) ? content.packages : [];
  const [openKey, setOpenKey] = useState('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const inScope = (scope: string) => packages.filter((p) => packageGroupKey(p, groups) === scope);
  const groupName = (g: PackageGroup, i: number) => g.title?.trim() || `Grupo ${i + 1}`;

  /** Lista de um escopo ('' = sem grupo): `onChange` devolve o escopo e o resto do array é mantido. */
  const scopedList = (scope: string, label: string) => {
    const scopedField: BlockField = {
      ...field,
      label,
      itemFields: [
        ...(field.itemFields ?? []),
        {
          key: 'group_id',
          label: 'Grupo',
          kind: 'select',
          options: [{ value: NO_GROUP, label: 'Sem grupo' }, ...groups.map((g, i) => ({ value: g.key, label: groupName(g, i) }))],
        },
      ],
      itemFactory: () => ({ ...packageItem(), ...(scope && { group_id: scope }) }),
    };
    const onList = (next: any[]) => {
      const cleaned = next.map(({ group_id, ...rest }) => {
        const key = packageGroupKey({ group_id }, groups); // NO_GROUP e grupos removidos viram "sem grupo"
        return key ? { ...rest, group_id: key } : rest;
      });
      onChange({ packages: [...packages.filter((p) => packageGroupKey(p, groups) !== scope), ...cleaned] });
    };
    // `group_id` do escopo: o select sempre mostra um valor válido (referência velha vira "sem grupo")
    const items = inScope(scope).map(({ group_id, ...rest }) => (scope ? { ...rest, group_id: scope } : rest));
    return <ListField field={scopedField} value={items} onChange={onList} ctx={ctx} />;
  };

  const addGroup = (importAfter = false) => {
    const group = packageGroupItem();
    // O 1º grupo adota os pacotes que já existem: o fotógrafo só renomeia e segue
    onChange(
      groups.length === 0
        ? { groups: [group], packages: packages.map((p) => ({ ...p, group_id: group.key })) }
        : { groups: [...groups, group] }
    );
    setOpenKey(group.key);
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
    const copies = inScope(source.key).map((p) => ({ ...JSON.parse(JSON.stringify(p)), id: crypto.randomUUID(), group_id: group.key }));
    onChange({ groups: [...groups, group], packages: [...packages, ...copies] });
    setOpenKey(group.key);
  };

  // Remover o grupo mantém os pacotes (ficam sem grupo)
  const removeGroup = (key: string) =>
    onChange({
      groups: groups.filter((g) => g.key !== key),
      packages: packages.map((p) => {
        if (p.group_id !== key) return p;
        const { group_id, ...rest } = p;
        return rest;
      }),
    });

  const updateGroup = (index: number, key: string, value: any) =>
    onChange({ groups: groups.map((g, i) => (i === index ? { ...g, [key]: value } : g)) });

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const keys = groups.map((g) => g.key);
    onChange({ groups: arrayMove(groups, keys.indexOf(String(active.id)), keys.indexOf(String(over.id))) });
  };

  const ungrouped = inScope('');

  return (
    <div className="space-y-3">
      {groups.length === 0 ? (
        <ListField field={field} value={packages} onChange={(next) => onChange({ packages: next })} ctx={ctx} />
      ) : (
        <>
          {ungrouped.length > 0 && <div className="rounded-xl border border-border/60 p-3">{scopedList('', 'Pacotes sem grupo')}</div>}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={groups.map((g) => g.key)} strategy={verticalListSortingStrategy}>
              <Accordion type="single" collapsible value={openKey} onValueChange={setOpenKey} className="space-y-1.5">
                {groups.map((g, i) => {
                  const n = inScope(g.key).length;
                  return (
                    <SortableListItem
                      key={g.key}
                      id={g.key}
                      title={`${groupName(g, i)} · ${n} ${n === 1 ? 'pacote' : 'pacotes'}`}
                      onRemove={() => removeGroup(g.key)}
                    >
                      {PACKAGE_GROUP_FIELDS.filter((f) => !f.showIf || f.showIf({ content: g as Record<string, any>, props: {} })).map((f) => (
                        <FieldEditor key={f.key} field={f} value={(g as Record<string, any>)[f.key]} onChange={(v) => updateGroup(i, f.key, v)} />
                      ))}
                      {scopedList(g.key, 'Pacotes do grupo')}
                      {onImport && (
                        <Button variant="outline" className="h-8 w-full gap-2 rounded-xl border-dashed text-xs" onClick={() => onImport(g.key)}>
                          <DownloadCloud className="h-3.5 w-3.5" />
                          Importar pacotes cadastrados
                        </Button>
                      )}
                    </SortableListItem>
                  );
                })}
              </Accordion>
            </SortableContext>
          </DndContext>
        </>
      )}

      {groups.length === 0 ? (
        <Button variant="outline" className="h-9 w-full gap-2 rounded-xl border-dashed text-xs" onClick={() => addGroup()}>
          <FolderPlus className="h-3.5 w-3.5" />
          Novo grupo
        </Button>
      ) : (
        // Com grupos, o novo pode nascer vazio, copiado de um existente (lotes) ou com pacotes cadastrados
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 w-full gap-2 rounded-xl border-dashed text-xs">
              <FolderPlus className="h-3.5 w-3.5" />
              Novo grupo
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
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Copiar pacotes de
            </DropdownMenuLabel>
            {[...groups.keys()].reverse().map((i) => (
              <DropdownMenuItem key={groups[i].key} className="cursor-pointer gap-2" onClick={() => copyGroup(groups[i], i)}>
                <Copy className="h-4 w-4" />
                <span className="truncate">{groupName(groups[i], i)}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{inScope(groups[i].key).length}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
