import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Calendar, Clock, Package, User, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/utils/financialUtils';

interface BookingSuccessProps {
  photographerName?: string;
  linkTitle: string;
  selectedPackage: any;
  selectedDate: string;
  selectedTime: string;
  clientName: string;
  cobrancaId?: string;
  requireDeposit: boolean;
}

export function BookingSuccess({
  photographerName,
  linkTitle,
  selectedPackage,
  selectedDate,
  selectedTime,
  clientName,
  cobrancaId,
  requireDeposit,
}: BookingSuccessProps) {
  const formattedDate = format(parseISO(selectedDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleGoToCheckout = () => {
    if (cobrancaId) {
      window.location.href = `/checkout/${cobrancaId}`;
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card className="border shadow-lg bg-card/80 backdrop-blur">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Horário Reservado!</h2>
            <p className="text-sm text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{clientName}</span>! Seu horário foi pré-agendado com{' '}
              <span className="font-semibold text-foreground">{photographerName || 'o fotógrafo'}</span>.
            </p>
          </div>

          <div className="bg-muted/40 rounded-xl p-4 text-left space-y-3 border text-sm">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <span className="capitalize">{formattedDate}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span>{selectedTime}</span>
            </div>

            {selectedPackage && (
              <div className="flex items-center justify-between border-t pt-2 mt-2">
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium">{selectedPackage.nome}</span>
                </div>
                <span className="font-semibold">{formatCurrency(Number(selectedPackage.valor_base) || 0)}</span>
              </div>
            )}
          </div>

          {requireDeposit && cobrancaId ? (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                Para garantir e confirmar definitivamente seu horário, realize o pagamento do sinal pelo link seguro abaixo.
              </div>
              <Button onClick={handleGoToCheckout} className="w-full h-11 text-base shadow-md">
                Pagar Sinal de Reserva
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground">
              O fotógrafo recebeu seu pedido e entrará em contato para confirmar todos os detalhes do seu ensaio.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}