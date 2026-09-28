import fs from 'fs';

const tsFilePath = 'src/integrations/supabase/types.ts';
let content = fs.readFileSync(tsFilePath, 'utf8');

if (!content.includes('etapa?: string | null\n          palavras_chave?: Json | null')) {
    // 1. Update Row
    content = content.replace(
        /conversas_templates:\s*\{\s*Row:\s*\{([^}]*)\}/,
        (match, p1) => `conversas_templates: {\n        Row: {${p1}          categoria_id: string | null\n          etapa: string | null\n          palavras_chave: Json | null\n          ativo: boolean\n          ordem: number\n        }`
    );

    // 2. Update Insert
    content = content.replace(
        /(conversas_templates:\s*\{\s*Row:\s*\{[^}]*\}\s*Insert:\s*\{)([^}]*)(\})/,
        (match, p1, p2, p3) => `${p1}${p2}          categoria_id?: string | null\n          etapa?: string | null\n          palavras_chave?: Json | null\n          ativo?: boolean\n          ordem?: number\n        ${p3}`
    );

    // 3. Update Update
    content = content.replace(
        /(conversas_templates:\s*\{\s*Row:\s*\{[^}]*\}\s*Insert:\s*\{[^}]*\}\s*Update:\s*\{)([^}]*)(\})/,
        (match, p1, p2, p3) => `${p1}${p2}          categoria_id?: string | null\n          etapa?: string | null\n          palavras_chave?: Json | null\n          ativo?: boolean\n          ordem?: number\n        ${p3}`
    );

    // 4. Update Relationships
    content = content.replace(
        /(conversas_templates:\s*\{[\s\S]*?Relationships:\s*\[)([^\]]*)(\])/,
        (match, p1, p2, p3) => {
            const rel = `\n          {\n            foreignKeyName: "conversas_templates_categoria_id_fkey"\n            columns: ["categoria_id"]\n            isOneToOne: false\n            referencedRelation: "categorias"\n            referencedColumns: ["id"]\n          }`;
            return `${p1}${p2}${p2.trim() ? ',' : ''}${rel}\n        ${p3}`;
        }
    );

    fs.writeFileSync(tsFilePath, content, 'utf8');
    console.log('conversas_templates types updated successfully!');
} else {
    console.log('Types already contain new columns.');
}
