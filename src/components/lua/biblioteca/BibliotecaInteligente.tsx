import React, { useState } from 'react';
import { useConversasTemplates, ConversasTemplate } from '@/hooks/useConversasTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ETAPAS_LUA, TemplateFormPanel } from './TemplateFormPanel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

export function BibliotecaInteligente() {
  const { templates, isLoading, deleteTemplate } = useConversasTemplates();
  const { dialogState, confirm, handleConfirm, handleCancel, handleClose } = useConfirmDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEtapa, setFilterEtapa] = useState<string>('todas');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ConversasTemplate | null>(null);

  const handleCreate = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const handleEdit = (template: ConversasTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleDelete = async (template: ConversasTemplate) => {
    const confirmed = await confirm({
      title: 'Excluir modelo?',
      description: `Tem certeza que deseja excluir o modelo "${template.nome}"? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'destructive',
    });

    if (confirmed) {
      await deleteTemplate(template.id);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.conteudo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEtapa = filterEtapa === 'todas' || t.etapa === filterEtapa;
    return matchesSearch && matchesEtapa;
  });

  const getEtapaLabel = (value?: string | null) => {
    if (!value) return null;
    return ETAPAS_LUA.find(e => e.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl tracking-tight font-semibold">Biblioteca Inteligente</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os modelos de resposta que a Lua utilizará como base para criar rascunhos.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por título ou conteúdo..." 
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="flex h-10 w-full sm:w-[200px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filterEtapa}
          onChange={e => setFilterEtapa(e.target.value)}
        >
          <option value="todas">Todas as Etapas</option>
          {ETAPAS_LUA.map(e => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando modelos...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-12 text-center border rounded-xl bg-muted/10">
          <p className="text-muted-foreground">Nenhum modelo encontrado.</p>
          {searchTerm || filterEtapa !== 'todas' ? (
            <Button variant="link" onClick={() => { setSearchTerm(''); setFilterEtapa('todas'); }}>
              Limpar filtros
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => (
            <div key={template.id} className="relative flex flex-col rounded-xl border bg-card p-5 shadow-[0_4px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_30px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-base line-clamp-1 pr-6" title={template.nome}>
                  {template.nome}
                </h3>
                <div className="absolute right-3 top-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Edit2 className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(template)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                {template.conteudo}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-border/50">
                {template.ativo === false ? (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">Inativo</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900">Ativo</Badge>
                )}
                
                {template.etapa && (
                  <Badge variant="secondary" className="font-normal text-xs">
                    {getEtapaLabel(template.etapa)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateFormPanel 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        template={editingTemplate} 
      />
      <ConfirmDialog 
        state={dialogState} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel} 
        onClose={handleClose} 
      />
    </div>
  );
}
