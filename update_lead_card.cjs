const fs = require('fs');

const path = 'D:\\Users\\Eduardo\\Documents\\00- LUNARI\\00- Antigravity\\lunari-studio\\src\\components\\leads\\LeadCard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add new imports
if (!content.includes('UserCheck')) {
  content = content.replace(
    'import { MoreVertical, MessageCircle, Calendar, Send, Clock, RotateCcw } from "lucide-react";',
    'import { MoreVertical, MessageCircle, Calendar, Send, Clock, RotateCcw, UserCheck } from "lucide-react";\nimport { format } from "date-fns";\nimport { supabase } from "@/integrations/supabase/client";\nimport { normalizeBrPhone } from "@/lib/phone";\nimport { useNavigate } from "react-router-dom";'
  );
}

// 2. Destructure categorias
content = content.replace('const { clientes } = useAppContext();', 'const { clientes, categorias } = useAppContext();\n  const navigate = useNavigate();\n  const [isStartingChat, setIsStartingChat] = useState(false);');

// 3. Add leadCategoria logic
const avatarUrlMatch = 'const avatarUrl = useMemo(() => {';
content = content.replace(avatarUrlMatch, `const leadCategoria = useMemo(() => {
    const categoryId = lead.categoria_manual_id || lead.categoria_ia_id;
    if (!categoryId) return null;
    return categorias?.find(c => c.id === categoryId) || null;
  }, [lead.categoria_manual_id, lead.categoria_ia_id, categorias]);

  ${avatarUrlMatch}`);

// 4. Update dataCriacao
content = content.replace(
  'const timeAgo = useMemo(() => {',
  `const formattedCreationDate = useMemo(() => {
    try {
      return \`Criado em \${format(new Date(lead.dataCriacao), "dd 'de' MMM", { locale: ptBR })}\`;
    } catch {
      return "Data inválida";
    }
  }, [lead.dataCriacao]);\n\n  const timeAgo = useMemo(() => {`
);

// 5. Replace handleStartConversation
const handleStartStart = 'const handleStartConversation = () => {';
const handleStartEnd = 'toast.error("Erro ao abrir WhatsApp");\n    }\n  };';
const fullHandleStartStr = content.substring(content.indexOf(handleStartStart), content.indexOf(handleStartEnd) + handleStartEnd.length);

const newHandleStart = `const handleStartConversation = async () => {
    try {
      const telefone = lead.whatsapp || lead.telefone || "";
      const normalizedPhone = normalizeBrPhone(telefone);
      
      const { instanceViewState, connectedInstance } = conversasContext || {};
      const isConnected = instanceViewState === 'ready' && !!connectedInstance;

      if (!isConnected || !normalizedPhone) {
        // Fallback: abre no WhatsApp Web (comportamento atual)
        const onlyNumbers = telefone.replace(/\\D/g, "");
        const mensagem = \`Olá \${lead.nome}! 😊\\n\\nVi que você demonstrou interesse em nossos serviços. Como posso ajudá-lo(a)?\`;
        const link = \`https://wa.me/55\${onlyNumbers}?text=\${encodeURIComponent(mensagem)}\`;
        window.open(link, "_blank");
        addInteraction(lead.id, "conversa", "Conversa iniciada via WhatsApp Web", false);
        if (lead.status === "novo_interessado") {
          onRequestMove?.("aguardando");
        }
        return;
      }

      // WhatsApp Conectado no Lunari: procura chat existente
      setIsStartingChat(true);
      const chatPhoneToFind = normalizedPhone.replace(/\\D/g, "");
      const existingChat = chats.find(c => {
        const cPhone = (c.contato_phone_normalized || "").replace(/\\D/g, "");
        return cPhone && cPhone.includes(chatPhoneToFind);
      });

      if (existingChat) {
        navigate(\`/app/conversas?chat=\${existingChat.id}\`);
        addInteraction(lead.id, "conversa", "Conversa aberta na página Conversas", false);
        if (lead.status === "novo_interessado") {
          onRequestMove?.("aguardando");
        }
        setIsStartingChat(false);
        return;
      }

      // Criar nova conversa no módulo
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error("Usuário não autenticado");

      let contatoId = '';
      const { data: existingContato } = await supabase
        .from('conversas_contatos')
        .select('id')
        .eq('phone_normalized', normalizedPhone)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingContato) {
        contatoId = existingContato.id;
      } else {
        const { data: newContato, error: contatoError } = await supabase
          .from('conversas_contatos')
          .insert({
            user_id: userId,
            phone_normalized: normalizedPhone,
            phone_raw: telefone,
            nome: lead.nome || null,
            tipo: lead.clienteId ? 'cliente' : 'lead',
          })
          .select('id')
          .single();
        if (contatoError) throw contatoError;
        contatoId = newContato.id;
      }

      const { data: newChat, error: chatError } = await supabase
        .from('conversas_chats')
        .insert({
          user_id: userId,
          contato_id: contatoId,
          instance_id: connectedInstance,
          contato_phone_normalized: normalizedPhone,
          contato_nome: lead.nome || null,
          status: 'active',
          unread_count: 0,
          pin: 'unpinned',
          mute: false,
        })
        .select('id')
        .single();
      
      if (chatError) throw chatError;

      addInteraction(lead.id, "conversa", "Nova conversa criada na página Conversas", false);
      if (lead.status === "novo_interessado") {
        onRequestMove?.("aguardando");
      }
      
      navigate(\`/app/conversas?chat=\${newChat.id}\`);

    } catch (error: any) {
      // Usar a variavel toast já importada do sonner
      toast.error(error.message || "Erro ao iniciar conversa");
    } finally {
      setIsStartingChat(false);
    }
  };`;
content = content.replace(fullHandleStartStr, newHandleStart);

// 6. Header JSX Replace
const headerJsxStart = '<div className="flex-1 min-w-0 pt-0.5">';
const headerJsxEnd = '<p className="text-[10px] text-muted-foreground mt-1 font-light tracking-wide">{timeAgo}</p>\n        </div>';
const headerJsxFull = content.substring(content.indexOf(headerJsxStart), content.indexOf(headerJsxEnd) + headerJsxEnd.length);

const newHeaderJsx = `<div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-foreground leading-tight truncate tracking-tight">{lead.nome}</h3>
            {lead.clienteId && (
              <div title="Vinculado ao CRM como Cliente">
                <UserCheck className="w-[12px] h-[12px] text-[#D4AF37] shrink-0" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 font-light tracking-wide">{formattedCreationDate}</p>
        </div>`;
content = content.replace(headerJsxFull, newHeaderJsx);

// 7. Badges Replace
const originBadgeStart = '{/* Badge de canal de origem (Borda ultra sutil, text muted) */}';
const originBadgeEnd = '</div>\n        )}';
const originBadgeFull = content.substring(content.indexOf(originBadgeStart), content.indexOf(originBadgeEnd) + originBadgeEnd.length);

const newOriginBadge = `{/* Tag de Categoria */}
        {leadCategoria && (
          <div 
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
            style={{
              backgroundColor: leadCategoria.cor ? \`\${leadCategoria.cor}15\` : 'rgba(156, 163, 175, 0.15)',
              color: leadCategoria.cor || '#9ca3af',
            }}
          >
            <span>{leadCategoria.nome}</span>
          </div>
        )}

        {/* Badge de canal de origem (Borda ultra sutil, text muted) */}
        {lead.origem && lead.origem.toLowerCase() !== "manual" && (
          <div className="inline-flex items-center px-1.5 py-0.5 rounded border border-border/30 bg-transparent text-[10px] text-muted-foreground">
            <span>{lead.origem}</span>
          </div>
        )}`;
content = content.replace(originBadgeFull, newOriginBadge);

// 8. Add isStartingChat logic to loading primary action (optional but cool)
content = content.replace(
  '{primaryAction.label}',
  '{isStartingChat && primaryAction.icon === MessageCircle ? "Iniciando..." : primaryAction.label}'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
