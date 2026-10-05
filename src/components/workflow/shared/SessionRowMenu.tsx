import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, User, PackageOpen, CreditCard, Ban } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SessionRowMenuProps {
  clientId?: string;
  onOpenProdutos?: () => void;
  onOpenPaymentModal?: () => void;
  onCancelSession?: () => void;
  className?: string;
}

export function SessionRowMenu({ 
  clientId, 
  onOpenProdutos, 
  onOpenPaymentModal, 
  onCancelSession,
  className 
}: SessionRowMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-lg opacity-60 hover:opacity-100 hover:bg-muted/50 transition-all outline-none",
            className
          )}
          aria-label="Menu da sessão"
          // Stop propagation so clicking the menu doesn't expand the row
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        {clientId && (
          <DropdownMenuItem asChild>
            <Link to={`/app/clientes/${clientId}`} className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Ver cliente</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        {onOpenProdutos && (
          <DropdownMenuItem onClick={onOpenProdutos} className="cursor-pointer">
            <PackageOpen className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Gerenciar produtos</span>
          </DropdownMenuItem>
        )}
        
        {onOpenPaymentModal && (
          <DropdownMenuItem onClick={onOpenPaymentModal} className="cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Histórico financeiro</span>
          </DropdownMenuItem>
        )}
        
        {onCancelSession && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCancelSession} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
              <Ban className="mr-2 h-4 w-4" />
              <span>Cancelar sessão</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
