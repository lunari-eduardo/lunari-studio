import * as fs from 'fs';
import * as path from 'path';

const targetFile = path.resolve('D:/Users/Eduardo/Documents/00- LUNARI/00- Antigravity/lunari-studio/src/hooks/useConversasTemplates.ts');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add migrateTemplatesInBackground before useConversasTemplates()
const migrateFunc = `
async function migrateTemplatesInBackground(templates: ConversasTemplate[], userId: string) {
  try {
    const { data: categorias } = await supabase
      .from('categorias')
      .select('id, nome')
      .eq('user_id', userId);

    const catMap = new Map<string, string>();
    if (categorias) {
      categorias.forEach(c => catMap.set(c.nome.toLowerCase().trim(), c.id));
    }

    const updates = templates.filter(t => (!t.categoria_id && t.categoria) || !t.etapa).map(t => {
      let catId = t.categoria_id;
      if (!catId && t.categoria) {
        const matchingId = catMap.get(t.categoria.toLowerCase().trim());
        if (matchingId) catId = matchingId;
      }
      return {
        id: t.id,
        categoria_id: catId || null,
        etapa: (t.etapa as TemplateStep) || 'geral',
        ordem: t.ordem || 0
      };
    });

    for (const up of updates) {
      await supabase
        .from('conversas_templates')
        .update({
          categoria_id: up.categoria_id,
          etapa: up.etapa,
          ordem: up.ordem
        })
        .eq('id', up.id)
        .eq('user_id', userId);
    }
  } catch (err) {
    console.error('Falha ao migrar templates no background', err);
  }
}

export function useConversasTemplates() {
`;
content = content.replace('export function useConversasTemplates() {', migrateFunc);


// 2. Update queryFn logic inside useConversasTemplates
const queryFnOld = `      const { data, error } = await supabase
        .from('conversas_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar templates:', error);
        throw error;
      }

      return (data || []) as ConversasTemplate[];`;
      
const queryFnNew = `      const { data, error } = await supabase
        .from('conversas_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar templates:', error);
        throw error;
      }

      const items = (data || []) as ConversasTemplate[];
      const needsMigration = items.some(t => (!t.categoria_id && t.categoria) || !t.etapa);
      
      if (needsMigration) {
        migrateTemplatesInBackground(items, user.id);
        items.forEach(t => {
          if (!t.etapa) t.etapa = 'geral';
        });
      }

      return items;`;
content = content.replace(queryFnOld, queryFnNew);


// 3. Update createMutation definition
const createMutOld = `      categoria_id,
      etapa,
      palavras_chave,
      ativo,
      ordem,
    }: {
      nome: string;
      conteudo: string;
      categoria?: string | null;
      variaveis?: string[];
      categoria_id?: string | null;
      etapa?: string | null;
      palavras_chave?: Json | null;
      ativo?: boolean;
      ordem?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nǜo autenticado');

      const { data, error } = await supabase
        .from('conversas_templates')
        .insert({
          user_id: user.id,
          nome: nome.trim(),
          conteudo: conteudo.trim(),
          categoria: categoria || null,
          variaveis: (variaveis || []) as any,
          categoria_id: categoria_id || null,
          etapa: etapa || null,
          palavras_chave: palavras_chave || [],
          ativo: ativo !== undefined ? ativo : true,
          ordem: ordem || 0,
        })`;

const createMutNew = `      categoria_id,
      etapa,
      palavras_chave,
      ativo,
      ordem,
    }: {
      nome: string;
      conteudo: string;
      categoria?: string | null;
      variaveis?: string[];
      categoria_id?: string | null;
      etapa?: TemplateStep | null;
      palavras_chave?: Json | null;
      ativo?: boolean;
      ordem?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('conversas_templates')
        .insert({
          user_id: user.id,
          nome: nome.trim(),
          conteudo: conteudo.trim(),
          categoria: categoria || null,
          variaveis: (variaveis || []) as any,
          categoria_id: categoria_id || null,
          etapa: etapa || 'geral',
          palavras_chave: palavras_chave || [],
          ativo: ativo !== undefined ? ativo : true,
          ordem: ordem || 0,
        })`;
        
content = content.replace(createMutOld, createMutNew);
content = content.replace('if (error) throw error;', 'if (error) throw new Error(error.message);');
content = content.replace('if (error) throw error;', 'if (error) throw new Error(error.message);');


// 4. Update updateMutation definition
const updateMutOld = `      categoria_id,
      etapa,
      palavras_chave,
      ativo,
      ordem,
    }: {
      id: string;
      nome?: string;
      conteudo?: string;
      categoria?: string | null;
      variaveis?: string[];
      categoria_id?: string | null;
      etapa?: string | null;
      palavras_chave?: Json | null;
      ativo?: boolean;
      ordem?: number;
    }) => {`;

const updateMutNew = `      categoria_id,
      etapa,
      palavras_chave,
      ativo,
      ordem,
    }: {
      id: string;
      nome?: string;
      conteudo?: string;
      categoria?: string | null;
      variaveis?: string[];
      categoria_id?: string | null;
      etapa?: TemplateStep | null;
      palavras_chave?: Json | null;
      ativo?: boolean;
      ordem?: number;
    }) => {`;
    
content = content.replace(updateMutOld, updateMutNew);


fs.writeFileSync(targetFile, content, 'utf8');
console.log('Update complete');
