import { useState, useEffect } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, X, RotateCcw, Shield, Banknote, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DeleteAction = 'preserve' | 'refund' | 'remove' | 'cancel_credit' | 'cancel_refund' | 'cancel_preserve';

interface WorkflowDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: DeleteAction) => void;
  sessionData: {
    id: string;
    clientName: string;
    date: string;
    hasPayments: boolean;
  } | null;
}

export function WorkflowDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  sessionData
}: WorkflowDeleteConfirmModalProps) {
  const [action, setAction] = useState<DeleteAction>('cancel_preserve');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sessionData) {
      setAction(sessionData.hasPayments ? 'cancel_credit' : 'cancel_preserve');
    }
  }, [isOpen, sessionData]);

  const handleConfirm = async () => {
    if (!sessionData) return;
    setLoading(true);
    try {
      onConfirm(action);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!sessionData) return null;

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay 
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
        />
        <DialogPrimitive.Content 
          className={cn(
            "fixed left-1/2 top-1/2 z-[201] grid w-full max-w-[500px] -translate-x-1/2 -translate-y-1/2 gap-4 border p-6 shadow-2xl sm:rounded-lg outline-none focus:outline-none",
            "bg-lunar-surface border-lunar-border",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <DialogPrimitive.Title className="text-xl font-semibold text-lunar-text flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Cancelar Sessão
            </DialogPrimitive.Title>
          </div>

          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          <div className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-lunar-text">
                  {sessionData.clientName}
                </p>
                <p className="text-sm text-lunar-textSecondary">
                  Data: <span className="font-medium">{sessionData.date}</span>
                </p>
                {sessionData.hasPayments && (
                  <div className="mt-2 p-2 bg-lunar-warning/10 border border-lunar-warning/20 rounded">
                    <p className="text-xs text-lunar-warning">
                      ⚠️ Esta sessão possui histórico de pagamentos
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {sessionData.hasPayments ? (
                <>
                  <p className="text-sm font-medium text-lunar-text">
                    O que deseja fazer com os dados financeiros?
                  </p>
                  <RadioGroup value={action} onValueChange={(v) => setAction(v as DeleteAction)}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-lunar-border bg-lunar-surface/50">
                      <RadioGroupItem value="cancel_credit" id="wf-cancel-credit" />
                      <Label htmlFor="wf-cancel-credit" className="flex-1 cursor-pointer">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-lunar-text flex items-center gap-1.5">
                            <Banknote className="h-3.5 w-3.5 text-green-500" />
                            Converter em crédito
                          </p>
                          <p className="text-xs text-lunar-textSecondary">
                            O valor pago será creditado ao cliente para uso futuro. A sessão ficará cancelada e o horário será liberado.
                          </p>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/30">
                      <RadioGroupItem value="cancel_refund" id="wf-cancel-refund" />
                      <Label htmlFor="wf-cancel-refund" className="flex-1 cursor-pointer">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-lunar-text flex items-center gap-1.5">
                            <RotateCcw className="h-3.5 w-3.5 text-orange-500" />
                            Estornar pagamento
                          </p>
                          <p className="text-xs text-lunar-textSecondary">
                            Registra o estorno do pagamento no histórico. A sessão ficará cancelada e o horário será liberado.
                          </p>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-lunar-border bg-lunar-surface/50">
                      <RadioGroupItem value="cancel_preserve" id="wf-cancel-preserve" />
                      <Label htmlFor="wf-cancel-preserve" className="flex-1 cursor-pointer">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-lunar-text flex items-center gap-1.5">
                            <Shield className="h-3.5 w-3.5 text-blue-500" />
                            Manter pagamento registrado
                          </p>
                          <p className="text-xs text-lunar-textSecondary">
                            Nenhum crédito ou estorno será gerado automaticamente. A sessão ficará cancelada e o horário será liberado.
                          </p>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 p-3 mt-4 rounded-lg border border-destructive/20 bg-destructive/5">
                      <RadioGroupItem value="remove" id="wf-remove" />
                      <Label htmlFor="wf-remove" className="flex-1 cursor-pointer">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir permanentemente (Ação Administrativa)
                          </p>
                          <p className="text-xs text-destructive/80">
                            Remove a sessão e todo o histórico financeiro de forma permanente, sem deixar rastros.
                          </p>
                          {action === 'remove' && (
                            <p className="text-[11px] text-destructive/70 italic mt-2 leading-snug">
                              ℹ️ Pagamentos já recebidos via gateway (Asaas, Mercado Pago, InfinitePay) serão mantidos no extrato fiscal para auditoria contábil, mesmo nesta opção.
                            </p>
                          )}
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </>
              ) : (
                <RadioGroup value={action} onValueChange={(v) => setAction(v as DeleteAction)}>
                  <div className="flex items-center space-x-2 p-3 rounded-lg border border-lunar-border bg-lunar-surface/50">
                    <RadioGroupItem value="cancel_preserve" id="wf-cancel-preserve" />
                    <Label htmlFor="wf-cancel-preserve" className="flex-1 cursor-pointer">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-lunar-text flex items-center gap-1.5">
                          <Ban className="h-3.5 w-3.5 text-blue-500" />
                          Cancelar Sessão
                        </p>
                        <p className="text-xs text-lunar-textSecondary">
                          A sessão ficará no histórico como cancelada, e o horário na agenda será liberado.
                        </p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 mt-4 rounded-lg border border-destructive/20 bg-destructive/5">
                    <RadioGroupItem value="remove" id="wf-remove" />
                    <Label htmlFor="wf-remove" className="flex-1 cursor-pointer">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir permanentemente
                        </p>
                        <p className="text-xs text-destructive/80">
                          Remove a sessão permanentemente sem deixar histórico.
                        </p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-3 mt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? 'Processando...' : (
                <>
                  {action === 'remove' ? <Trash2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                  {action === 'remove' ? 'Excluir Permanentemente' : 'Confirmar Cancelamento'}
                </>
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
