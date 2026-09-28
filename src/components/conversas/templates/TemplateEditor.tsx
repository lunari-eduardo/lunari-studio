import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCategorias } from '@/hooks/useCategorias';
import type { ConversasTemplate, TemplateStep } from '@/hooks/useConversasTemplates';
import { 
  ArrowLeft, Loader2, X, Sparkles, Smile, Link2, 
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, AlignLeft, MoreVertical
} from 'lucide-react';
import { Json } from '@/integrations/supabase/types';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface TemplateEditorProps {
  template?: ConversasTemplate | null;
  onSave: (data: Partial<ConversasTemplate>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const TEMPLATE_STEPS: { value: TemplateStep; label: string }[] = [
  { value: 'primeiro_contato', label: 'Primeiro contato' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'pre_ensaio', label: 'Pré-ensaio' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'pos_venda', label: 'Pós-venda' },
  { value: 'entrega', label: 'Entrega de galeria' },
  { value: 'geral', label: 'Geral' },
];

const AVAILABLE_VARIABLES = [
  { tag: '{{nome}}', label: 'Nome' },
  { tag: '{{nome_completo}}', label: 'Nome completo' },
  { tag: '{{saudacao}}', label: 'Saudação' },
  { tag: '{{estudio}}', label: 'Estúdio' },
  { tag: '{{pix}}', label: 'Pix' },
  { tag: '{{telefone}}', label: 'Telefone' },
  { tag: '{{instagram}}', label: 'Instagram' },
  { tag: '{{cidade}}', label: 'Cidade' },
  { tag: '{{valor}}', label: 'Valor' },
  { tag: '{{data_sessao}}', label: 'Data da sessão' }
];

export function TemplateEditor({ template, onSave, onCancel, isLoading }: TemplateEditorProps) {
  const { categorias = [] } = useCategorias();
  
  const [nome, setNome] = useState(template?.nome || '');
  const [conteudo, setConteudo] = useState(template?.conteudo || '');
  const [categoriaId, setCategoriaId] = useState<string>(template?.categoria_id || 'none');
  const [etapa, setEtapa] = useState<TemplateStep>(template?.etapa || 'geral');
  
  const initialOrdem = template?.ordem || 2;
  const initialPriority = initialOrdem === 3 ? 'alta' : initialOrdem === 1 ? 'baixa' : 'normal';
  const [prioridade, setPrioridade] = useState<'baixa' | 'normal' | 'alta'>(initialPriority);
  
  const [ativo, setAtivo] = useState<boolean>(template?.ativo ?? true);
  const [emojisSugeridos, setEmojisSugeridos] = useState<boolean>(template?.emojis_sugeridos ?? true);
  const [usoInterno, setUsoInterno] = useState<boolean>(template?.uso_interno ?? false);
  
  const initialTags = Array.isArray(template?.palavras_chave) ? template.palavras_chave as string[] : [];
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleAddTag = (e?: React.KeyboardEvent | React.FocusEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    
    const val = tagInput.trim().toLowerCase();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSuggestTags = () => {
    const newTags = new Set(tags);
    
    if (etapa === 'orcamento') {
      ['orçamento', 'valores', 'pacotes'].forEach(t => newTags.add(t));
    } else if (etapa === 'financeiro') {
      ['pagamento', 'pix', 'comprovante'].forEach(t => newTags.add(t));
    }

    if (categoriaId !== 'none') {
      const cat = categorias.find(c => c.id === categoriaId);
      if (cat) {
        newTags.add(cat.nome.toLowerCase());
        newTags.add('ensaio');
      }
    }

    setTags(Array.from(newTags));
  };

  const handleInsertVariable = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      setConteudo(prev => prev + tag);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const newText = text.substring(0, start) + tag + text.substring(end);
    setConteudo(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const applyFormat = (prefix: string, suffix: string = prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
    setConteudo(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!nome.trim() || !conteudo.trim()) return;

    const ordemVal = prioridade === 'alta' ? 3 : prioridade === 'baixa' ? 1 : 2;

    await onSave({
      nome: nome.trim(),
      conteudo: conteudo.trim(),
      categoria_id: categoriaId === 'none' ? null : categoriaId,
      etapa,
      ordem: ordemVal,
      ativo,
      emojis_sugeridos: emojisSugeridos,
      uso_interno: usoInterno,
      palavras_chave: tags as Json,
    });
  };

  const charCount = conteudo.length;
  const wordCount = conteudo.trim() ? conteudo.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F7F6F3] dark:bg-[#0A0A0A]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0 bg-white dark:bg-[#121212] z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 tracking-tight">
            <Sparkles className="h-4 w-4 text-[#D4AF37]" />
            {template ? 'Editar modelo de mensagem' : 'Novo modelo de mensagem'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 rounded-lg text-xs font-medium px-4">
            Cancelar
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave} 
            disabled={!nome.trim() || !conteudo.trim() || isLoading}
            className="h-8 rounded-lg bg-[#C9A87C] hover:bg-[#b89567] text-white text-xs px-5 shadow-sm font-medium"
          >
            {isLoading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(8rem + env(safe-area-inset-bottom))' }}>
        <div className="flex flex-col max-w-[620px] mx-auto p-6 gap-8">
          
          {/* Seção 1: Info do Modelo */}
          <section className="space-y-5">
            <div className="flex items-center gap-2 pb-1">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500">1</div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">Informações do modelo</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Título do modelo <span className="text-red-500">*</span></Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-medium">Modelo ativo</span>
                    <Switch checked={ativo} onCheckedChange={setAtivo} className="scale-75 origin-right data-[state=checked]:bg-[#C9A87C]" />
                  </div>
                </div>
                <Input 
                  value={nome} 
                  onChange={e => setNome(e.target.value)} 
                  placeholder="Ex: Orçamento Newborn Completo"
                  className="bg-white dark:bg-[#171717] border-black/[0.06] dark:border-white/[0.06] shadow-sm rounded-xl h-10 text-sm focus-visible:ring-[#C9A87C]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Categoria <span className="text-red-500">*</span></Label>
                <Select value={categoriaId} onValueChange={setCategoriaId}>
                  <SelectTrigger className="bg-white dark:bg-[#171717] border-black/[0.06] dark:border-white/[0.06] shadow-sm rounded-xl h-10 text-sm focus:ring-[#C9A87C]">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geral (Todas)</SelectItem>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          {c.cor && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />}
                          {c.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Etapa comercial <span className="text-red-500">*</span></Label>
                <Select value={etapa} onValueChange={(v) => setEtapa(v as TemplateStep)}>
                  <SelectTrigger className="bg-white dark:bg-[#171717] border-black/[0.06] dark:border-white/[0.06] shadow-sm rounded-xl h-10 text-sm focus:ring-[#C9A87C]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_STEPS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  Prioridade
                  <span className="text-[10px] text-zinc-400 font-normal ml-1">(Define ordem nas sugestões)</span>
                </Label>
                <ToggleGroup type="single" value={prioridade} onValueChange={(v: any) => v && setPrioridade(v)} className="justify-start gap-2">
                  <ToggleGroupItem value="baixa" className="h-9 px-4 rounded-lg text-xs data-[state=on]:bg-zinc-100 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white border border-transparent data-[state=off]:bg-white dark:data-[state=off]:bg-[#171717] shadow-sm">Baixa</ToggleGroupItem>
                  <ToggleGroupItem value="normal" className="h-9 px-4 rounded-lg text-xs data-[state=on]:bg-[#FDF9F3] dark:data-[state=on]:bg-[#C9A87C]/20 data-[state=on]:text-[#C9A87C] data-[state=on]:border-[#C9A87C]/30 border border-transparent data-[state=off]:bg-white dark:data-[state=off]:bg-[#171717] shadow-sm">Normal</ToggleGroupItem>
                  <ToggleGroupItem value="alta" className="h-9 px-4 rounded-lg text-xs data-[state=on]:bg-zinc-100 dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-zinc-900 dark:data-[state=on]:text-white border border-transparent data-[state=off]:bg-white dark:data-[state=off]:bg-[#171717] shadow-sm">Alta</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </section>

          {/* Seção 2: Tags */}
          <section className="space-y-5 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500">2</div>
                <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">Tags e palavras-chave</h3>
              </div>
              <Button onClick={handleSuggestTags} variant="outline" size="sm" className="h-7 text-[11px] rounded-full text-[#C9A87C] border-[#C9A87C]/20 hover:bg-[#FDF9F3] dark:hover:bg-[#C9A87C]/10">
                <Sparkles className="w-3 h-3 mr-1.5" />
                Sugerir tags
              </Button>
            </div>
            
            <p className="text-[11px] text-zinc-500 -mt-2">Estas palavras ajudam o sistema a encontrar o modelo nas buscas e nas sugestões da Lua.</p>

            <div className="flex flex-wrap gap-2 items-center bg-white dark:bg-[#171717] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] shadow-sm min-h-[52px]">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1.5 bg-[#F0F2F5] dark:bg-zinc-800 text-[#1C2B33] dark:text-zinc-300 px-2.5 py-1 rounded-md text-[11px] font-medium">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="text-zinc-400 hover:text-red-500 focus:outline-none"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <Input 
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                onBlur={handleAddTag}
                placeholder={tags.length === 0 ? "Ex: valores, orçamento..." : "+ Adicionar tag"}
                className="flex-1 min-w-[120px] h-7 border-0 p-0 text-[11px] bg-transparent focus-visible:ring-0 shadow-none"
              />
            </div>
          </section>

          {/* Seção 3: Conteúdo */}
          <section className="space-y-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500">3</div>
                <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">Conteúdo da mensagem</h3>
              </div>
            </div>

            <div className="flex flex-col bg-white dark:bg-[#171717] border border-black/[0.06] dark:border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.03)] rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-[#C9A87C]/50 transition-all">
              {/* Toolbar Rica Simples */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-zinc-50/50 dark:bg-[#121212]">
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-xs font-medium text-zinc-600 dark:text-zinc-400 gap-1 px-2 hover:bg-zinc-200/50 dark:hover:bg-zinc-800">
                        Parágrafo <div className="w-0 h-0 border-l-[3px] border-l-transparent border-t-[4px] border-t-current border-r-[3px] border-r-transparent ml-1 opacity-60"/>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-40 rounded-xl">
                      <DropdownMenuItem className="text-xs">Parágrafo</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs font-semibold">Título 1</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs font-medium">Título 2</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="w-px h-4 bg-border/60 mx-1" />

                  <Button variant="ghost" size="icon" onClick={() => applyFormat('*')} className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><Bold className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => applyFormat('_')} className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><Italic className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => applyFormat('~')} className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><Strikethrough className="h-3.5 w-3.5" /></Button>
                  
                  <div className="w-px h-4 bg-border/60 mx-1 hidden sm:block" />

                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hidden sm:flex"><List className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hidden sm:flex"><ListOrdered className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hidden sm:flex"><AlignLeft className="h-3.5 w-3.5" /></Button>
                </div>
                
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] font-medium rounded-lg gap-1.5 shadow-sm border-black/[0.06] dark:border-white/[0.1]">
                        Inserir variável <div className="w-0 h-0 border-l-[3px] border-l-transparent border-t-[4px] border-t-current border-r-[3px] border-r-transparent opacity-60"/>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl max-h-[280px] overflow-y-auto">
                      {AVAILABLE_VARIABLES.map(v => (
                        <DropdownMenuItem key={v.tag} onClick={() => handleInsertVariable(v.tag)} className="text-[11px] flex justify-between py-2">
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{v.label}</span>
                          <span className="text-zinc-400 font-mono text-[10px]">{v.tag}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500"><Smile className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              <Textarea 
                ref={textareaRef}
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                placeholder="Escreva a mensagem do modelo aqui..."
                className="min-h-[220px] resize-none border-0 focus-visible:ring-0 p-5 text-sm bg-transparent leading-relaxed"
              />
            </div>
            <div className="flex justify-end gap-3 text-[10px] text-zinc-400 font-medium px-1">
              <span>{charCount} caracteres</span>
              <span>{wordCount} palavras</span>
            </div>
          </section>

          {/* Seção 4: Configurações Adicionais */}
          <section className="space-y-4 pt-4 border-t border-border/40">
            <div className="flex items-center gap-2 pb-1">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-500">4</div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">Opções adicionais</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start justify-between p-4 rounded-xl bg-white dark:bg-[#171717] border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
                <div className="space-y-1 pr-4">
                  <Label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-[#C9A87C]" />
                    Emojis sugeridos
                  </Label>
                  <p className="text-[10px] text-zinc-500 leading-tight">Permite que a Lua utilize emojis quando gerar respostas baseadas neste modelo.</p>
                </div>
                <Switch checked={emojisSugeridos} onCheckedChange={setEmojisSugeridos} className="data-[state=checked]:bg-[#C9A87C]" />
              </div>

              <div className="flex items-start justify-between p-4 rounded-xl bg-white dark:bg-[#171717] border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
                <div className="space-y-1 pr-4">
                  <Label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <MoreVertical className="w-3.5 h-3.5 text-zinc-400" />
                    Uso interno
                  </Label>
                  <p className="text-[10px] text-zinc-500 leading-tight">Modelo visível apenas para você (preparando para equipes).</p>
                </div>
                <Switch checked={usoInterno} onCheckedChange={setUsoInterno} className="data-[state=checked]:bg-zinc-800" />
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
