const fs = require('fs');
const content = fs.readFileSync('src/hooks/useConversasContactContext.ts', 'utf8');

const sessoesStart = content.indexOf('  // 3. Carregar Sess');
const mutationsStart = content.indexOf('  // Mutations de');

const beforeSessoes = content.slice(0, sessoesStart);
const afterMutations = content.slice(mutationsStart);

const leadQueryRegex = /\/\/ 4\. Carregar Lead \/ Oportunidade[\s\S]+?(?=\/\/ 5\. Carregar Tarefas)/;
const leadQueryMatch = content.match(leadQueryRegex);
const leadQuery = leadQueryMatch ? leadQueryMatch[0] : '';

const rpcQuery = `  // 3. Carregar Contexto Completo via RPC
  const { data: rpcContext, isLoading: isLoadingRpc } = useQuery({
    queryKey: ['conversas-context-rpc', cliente?.id, userId],
    queryFn: async () => {
      if (!cliente?.id || !userId) return null;
      const { data, error } = await supabase.rpc('get_conversas_cliente_context', {
        p_cliente_id: cliente.id,
        p_user_id: userId
      });

      if (error) {
        console.warn('[useConversasContactContext] Erro no RPC:', error);
        return null;
      }
      return data as any;
    },
    enabled: !!cliente?.id && !!userId,
    staleTime: 1000 * 60 * 2,
  });

  const sessoes = (rpcContext?.sessoes || []) as ContextSessao[];
  const tarefas = (rpcContext?.tarefas || []) as ContextTask[];
  const orcamentos = (rpcContext?.orcamentos || []) as ContextOrcamento[];
  const cobrancas = (rpcContext?.cobrancas || []) as ContextCobranca[];
  const leadsPerdidos = (rpcContext?.leads_perdidos || []) as ContextLeadPerdido[];

  `;

const newContent = beforeSessoes + rpcQuery + leadQuery + '\n' + afterMutations;

fs.writeFileSync('src/hooks/useConversasContactContext.ts', newContent);
console.log('Done!');
