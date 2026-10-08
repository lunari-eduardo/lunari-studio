import { ClienteAvatar } from "../shared/ClienteAvatar";
import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useGlobalConversas } from "@/contexts/ConversasContext";
import { useNavigate } from "react-router-dom";
import { getWhatsAppLink } from "@/lib/phone";
import { useConfigurationContext } from "@/contexts/ConfigurationContext";
import { getEtiquetaTokens } from "@/utils/etiquetaColorTokens";


interface SessionClientCellProps {
  clientId?: string;
  nome: string;
  avatarUrl?: string | null;
  categoria?: string;
  whatsapp?: string;
  className?: string;
}

export function SessionClientCell({ 
  clientId, 
  nome, 
  avatarUrl, 
  categoria, 
  whatsapp,
  className 
}: SessionClientCellProps) {
  const whatsappUrl = whatsapp ? getWhatsAppLink(whatsapp) : null;
  const conversas = useGlobalConversas();
  const navigate = useNavigate();
  const { categorias } = useConfigurationContext();
  const categoryMatch = categoria ? categorias?.find(c => c.nome === categoria) : null;
  const tokens = getEtiquetaTokens(categoryMatch?.cor);
  const hasConnectedInstance = !!conversas?.connectedInstance;

  const handleWhatsappClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!whatsapp) return;
    if (hasConnectedInstance) {
      e.preventDefault();
      navigate(`/app/conversas?phone=55${whatsapp.replace(/\D/g, '')}`);
    }
  };

  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      <ClienteAvatar src={avatarUrl} nome={nome} size="lg" />
      
      <div className="flex flex-col min-w-0 justify-center">
        <div className="flex items-center gap-2">
          {clientId ? (
            <Link 
              to={`/app/clientes/${clientId}`}
              className="text-sm font-semibold tracking-tight text-foreground truncate hover:text-accent-gold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-gold rounded"
              onClick={(e) => e.stopPropagation()}
            >
              {nome || "Cliente não informado"}
            </Link>
          ) : (
            <span className="text-sm font-semibold tracking-tight text-foreground truncate">
              {nome || "Cliente não informado"}
            </span>
          )}

          {whatsappUrl && (
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 p-1 rounded-md transition-colors shrink-0"
              onClick={(e) => e.stopPropagation()}
              title="Conversar no WhatsApp"
            >
              <MessageCircle className="w-[14px] h-[14px]" />
            </a>
          )}
        </div>
        
        {categoria && (
          <div className="flex items-center gap-1.5 min-w-0">
            {categoryMatch?.cor && (
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", tokens.dot)} title={categoria} />
            )}
            <span className="text-xs text-muted-foreground truncate">
              {categoria}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}


