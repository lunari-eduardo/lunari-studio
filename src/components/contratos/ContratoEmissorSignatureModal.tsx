import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, ShieldCheck, RefreshCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ContratoEmissorSignatureModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (signatureImage: string | null) => Promise<void>;
  profileId?: string;
  savedSignature?: string | null;
}

export function ContratoEmissorSignatureModal({
  open,
  onClose,
  onConfirm,
  profileId,
  savedSignature
}: ContratoEmissorSignatureModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [useSaved, setUseSaved] = useState(!!savedSignature);
  const [saveForFuture, setSaveForFuture] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);

  // Reseta estado quando o modal abre
  useEffect(() => {
    if (open) {
      setUseSaved(!!savedSignature);
      setSaveForFuture(false);
      setSubmitting(false);
      setTimeout(() => sigCanvas.current?.clear(), 100);
    }
  }, [open, savedSignature]);

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      let signatureImage: string | null = null;
      
      if (useSaved && savedSignature) {
        signatureImage = savedSignature;
      } else if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        signatureImage = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        
        // Se pediu para salvar para o futuro, atualiza o profile
        if (saveForFuture && profileId && signatureImage) {
          const { error } = await supabase
            .from('profiles')
            .update({ assinatura_grafica: signatureImage } as any)
            .eq('id', profileId);
            
          if (error) {
            console.error('Erro ao salvar assinatura no perfil', error);
          } else {
            toast({ title: 'Assinatura salva para os próximos documentos.' });
          }
        }
      }

      await onConfirm(signatureImage);
      onClose();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao assinar', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Assinatura do Emissor (Opcional)
          </DialogTitle>
          <DialogDescription>
            Como você está autenticado no sistema, sua emissão já possui <b>validade jurídica total</b> através do registro de IP e logs. A assinatura gráfica (desenho) é apenas visual e não é obrigatória.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {savedSignature && (
            <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50 dark:bg-slate-900/50">
              <Checkbox 
                id="use-saved" 
                checked={useSaved} 
                onCheckedChange={(c) => setUseSaved(!!c)} 
              />
              <label htmlFor="use-saved" className="text-sm cursor-pointer select-none">
                Usar minha assinatura salva
              </label>
            </div>
          )}

          {(!useSaved || !savedSignature) && (
            <div className="space-y-3">
              <div className="border rounded-md bg-white overflow-hidden relative">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{ className: 'w-full h-[140px]' }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-7 px-2 text-xs text-muted-foreground"
                  onClick={handleClearSignature}
                >
                  <RefreshCcw className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="save-future" 
                  checked={saveForFuture} 
                  onCheckedChange={(c) => setSaveForFuture(!!c)} 
                />
                <label htmlFor="save-future" className="text-sm cursor-pointer select-none">
                  Salvar esta assinatura para usar automaticamente nos próximos documentos
                </label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenTool className="h-4 w-4 mr-2" />}
            {submitting ? 'Emitindo...' : 'Assinar e Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
