import React, { useState } from 'react';
import { toTitleCase } from '@/hooks/useTitleCase';
import { Cliente } from '@/types/cliente';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import {
  SelectModal as Select,
  SelectModalContent as SelectContent,
  SelectModalItem as SelectItem,
  SelectModalTrigger as SelectTrigger,
  SelectModalValue as SelectValue,
} from '@/components/ui/select-in-modal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';
import { ORIGENS_PADRAO } from '@/utils/defaultOrigens';
import { ClienteSuggestionsCard } from '@/components/clientes/ClienteSuggestionsCard';
import { ClienteFormData } from '../types';
import { PhoneInputSmart } from '@/components/cliente-detalhe/shared/PhoneInputSmart';
import { AddressFieldsBlock } from '@/components/cliente-detalhe/shared/AddressFieldsBlock';
import { CpfCnpjInlineField } from '@/components/cliente-detalhe/shared/CpfCnpjInlineField';
import { User, Phone, MapPin, Heart, MessageSquare, Baby, Calendar, IdCard, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

interface ClienteFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient: Cliente | null;
  formData: ClienteFormData;
  setFormData: React.Dispatch<React.SetStateAction<ClienteFormData>>;
  onSave: () => Promise<void>;
  duplicateCheck: any;
  showSuggestions: boolean;
  onEditSuggestion: (cliente: Cliente) => void;
  onDismissSuggestions: () => void;
  forceCreate: boolean;
  setForceCreate: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectOpenChange: (open: boolean, selectType: string) => void;
}

export const ClienteFormDrawer: React.FC<ClienteFormDrawerProps> = ({
  open,
  onOpenChange,
  editingClient,
  formData,
  setFormData,
  onSave,
  duplicateCheck,
  showSuggestions,
  onEditSuggestion,
  onDismissSuggestions,
  forceCreate,
  setForceCreate,
  setShowSuggestions,
  onSelectOpenChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // When closing, maybe reset showAdvanced
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowAdvanced(false);
    }
    onOpenChange(newOpen);
  };

  const handleAddFilho = () => {
    const newFilho = { id: `filho_${Date.now()}`, nome: '', dataNascimento: '' };
    setFormData(prev => ({
      ...prev,
      familia: {
        ...prev.familia,
        filhos: [...(prev.familia?.filhos || []), newFilho]
      }
    }));
  };

  const handleRemoveFilho = (id: string) => {
    setFormData(prev => ({
      ...prev,
      familia: {
        ...prev.familia,
        filhos: (prev.familia?.filhos || []).filter(f => f.id !== id)
      }
    }));
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col border-l">
        <SheetHeader className="p-6 border-b">
          <SheetTitle>
            {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      nome: toTitleCase(e.target.value),
                    }));
                    setForceCreate(false);
                    setShowSuggestions(true);
                  }}
                  placeholder="Nome completo"
                  className={duplicateCheck.isDuplicata ? 'border-destructive' : ''}
                />

                {!editingClient && showSuggestions && duplicateCheck.clientesSimilares.length > 0 && (
                  <div className="pt-2">
                    <ClienteSuggestionsCard
                      clientes={duplicateCheck.clientesSimilares}
                      onEditClient={onEditSuggestion}
                      onDismiss={onDismissSuggestions}
                    />
                  </div>
                )}
              </div>

              {editingClient && (editingClient as any).nome_checkout && (
                <div className="space-y-2">
                  <Label>Nome para Cobrança (preenchido pelo cliente)</Label>
                  <Input
                    value={(editingClient as any).nome_checkout}
                    readOnly
                    className="bg-neutral-50 border-neutral-200 text-neutral-500"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Nome fornecido pelo próprio cliente durante um checkout. Utilizado para emissão das cobranças.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <PhoneInputSmart
                  value={formData.telefone || ''}
                  onSave={(v) => {
                    setFormData(prev => ({ ...prev, telefone: v, whatsapp: v }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="origem">Origem</Label>
                <Select
                  value={formData.origem}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      origem: value,
                    }))
                  }
                  onOpenChange={(isOpen) => onSelectOpenChange(isOpen, 'origem')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGENS_PADRAO.map((origem) => (
                      <SelectItem key={origem.id} value={origem.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: origem.cor }}
                          />
                          {origem.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!editingClient && !forceCreate && duplicateCheck.isDuplicata && (
                <p className="text-center text-xs text-destructive">
                  Cliente com este nome já existe. Clique em "Adicionar" para ver opções.
                </p>
              )}
            </div>

            {!showAdvanced ? (
              <div className="pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full text-xs border-dashed"
                  onClick={() => setShowAdvanced(true)}
                >
                  Preencher mais detalhes
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  Detalhes Adicionais
                </h3>
                
                <Accordion type="multiple" className="space-y-2">
                  <AccordionItem value="identificacao" className="rounded-lg border bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[hsl(var(--accent-gold-soft))] flex items-center justify-center">
                          <User className="h-4 w-4 text-accent-gold" />
                        </div>
                        <span className="font-medium text-sm">Identificação</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Data de nascimento</Label>
                        <Input
                          type="date"
                          value={formData.data_nascimento || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, data_nascimento: e.target.value }))}
                          className="h-9 text-xs"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="endereco" className="rounded-lg border bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[hsl(var(--accent-gold-soft))] flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-accent-gold" />
                        </div>
                        <span className="font-medium text-sm">Endereço</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <AddressFieldsBlock
                        value={{
                          cep: formData.cep,
                          endereco: formData.endereco,
                          endereco_numero: formData.endereco_numero,
                          endereco_complemento: formData.endereco_complemento,
                          bairro: formData.bairro,
                          cidade: formData.cidade,
                          uf: formData.uf,
                        }}
                        onSave={(patch) => {
                          setFormData(prev => ({ ...prev, ...patch }));
                        }}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="fiscal" className="rounded-lg border bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[hsl(var(--accent-gold-soft))] flex items-center justify-center">
                          <IdCard className="h-4 w-4 text-accent-gold" />
                        </div>
                        <span className="font-medium text-sm">Documentação fiscal</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-2">
                        <Label className="text-xs">CPF ou CNPJ</Label>
                        <Input
                          value={formData.cpf_cnpj || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, cpf_cnpj: e.target.value }))}
                          placeholder="000.000.000-00"
                          className="h-9"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="familia" className="rounded-lg border bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[hsl(var(--accent-gold-soft))] flex items-center justify-center">
                          <Heart className="h-4 w-4 text-accent-gold" />
                        </div>
                        <span className="font-medium text-sm">Família</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Heart className="h-3 w-3" /> Cônjuge
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="Nome do cônjuge"
                            value={formData.familia?.conjuge?.nome || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              familia: {
                                ...prev.familia,
                                conjuge: { ...prev.familia?.conjuge, nome: e.target.value, dataNascimento: prev.familia?.conjuge?.dataNascimento || '' }
                              }
                            }))}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="date"
                            value={formData.familia?.conjuge?.dataNascimento || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              familia: {
                                ...prev.familia,
                                conjuge: { ...prev.familia?.conjuge, dataNascimento: e.target.value, nome: prev.familia?.conjuge?.nome || '' }
                              }
                            }))}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1">
                            <Baby className="h-3 w-3" /> Filhos
                          </Label>
                          <Button variant="ghost" size="sm" onClick={handleAddFilho} className="h-6 text-[10px] px-2">
                            Adicionar filho
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(!formData.familia?.filhos || formData.familia.filhos.length === 0) && (
                            <p className="text-[11px] text-muted-foreground italic text-center py-1">Nenhum filho adicionado</p>
                          )}
                          {formData.familia?.filhos?.map((filho, index) => (
                            <div key={filho.id} className="flex gap-2 items-center">
                              <Input
                                placeholder={`Nome do ${index + 1}º filho`}
                                value={filho.nome}
                                onChange={(e) => {
                                  const newFilhos = [...(formData.familia?.filhos || [])];
                                  newFilhos[index].nome = e.target.value;
                                  setFormData(prev => ({ ...prev, familia: { ...prev.familia, filhos: newFilhos } }));
                                }}
                                className="h-9 text-xs flex-1"
                              />
                              <Input
                                type="date"
                                value={filho.dataNascimento}
                                onChange={(e) => {
                                  const newFilhos = [...(formData.familia?.filhos || [])];
                                  newFilhos[index].dataNascimento = e.target.value;
                                  setFormData(prev => ({ ...prev, familia: { ...prev.familia, filhos: newFilhos } }));
                                }}
                                className="h-9 text-xs flex-1"
                              />
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleRemoveFilho(filho.id)}>
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="observacoes" className="rounded-lg border bg-card px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[hsl(var(--accent-gold-soft))] flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-accent-gold" />
                        </div>
                        <span className="font-medium text-sm">Observações</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <Textarea
                        placeholder="Anotações importantes sobre o cliente, preferências, histórico..."
                        value={formData.observacoes || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                        className="min-h-[100px] text-sm resize-none"
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="p-4 border-t bg-muted/20">
          <div className="flex justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={!editingClient && !forceCreate && duplicateCheck.isDuplicata}
            >
              {editingClient ? 'Salvar Alterações' : 'Adicionar Cliente'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
