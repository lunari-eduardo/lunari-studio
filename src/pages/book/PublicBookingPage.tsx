import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Check, AlertCircle, ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { toast } from 'sonner';
import { BookingCalendar } from './components/BookingCalendar';
import { BookingSuccess } from './components/BookingSuccess';
import { maskPhoneBR } from '@/lib/phoneBR';
import { formatCurrency } from '@/utils/financialUtils';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const API_BASE = import.meta.env.VITE_EDGE_API_URL || 'https://lunari-edge-api.eduardo22diehl.workers.dev';

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form State
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'selection' | 'contact' | 'success'>('selection');

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Result
  const [reservationResult, setReservationResult] = useState<{ cobrancaId?: string } | null>(null);

  useEffect(() => {
    async function fetchSlots() {
      if (!slug) return;
      try {
        setLoading(true);
        setFetchError(null);
        const res = await fetch(`${API_BASE}/api/agenda/online/${slug}/slots`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Página de agendamento indisponível');
        }

        setData(json.data);

        // Auto-select package if only 1 available
        if (json.data.packages?.length === 1) {
          setSelectedPackageId(json.data.packages[0].id);
        }
      } catch (err: any) {
        console.error('Erro carregando agenda online:', err);
        setFetchError(err.message || 'Não foi possível carregar os horários disponíveis.');
      } finally {
        setLoading(false);
      }
    }

    fetchSlots();
  }, [slug]);

  const availableDates = useMemo(() => {
    if (!data?.slotsByDate) return [];
    return Object.keys(data.slotsByDate).sort();
  }, [data?.slotsByDate]);

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !data?.slotsByDate) return [];
    return data.slotsByDate[selectedDate] || [];
  }, [selectedDate, data?.slotsByDate]);

  const selectedPackage = useMemo(() => {
    if (!data?.packages) return null;
    return data.packages.find((p: any) => p.id === selectedPackageId) || null;
  }, [data?.packages, selectedPackageId]);

  const depositCalculation = useMemo(() => {
    if (!data?.link?.requireDeposit || !selectedPackage) return null;
    const total = Number(selectedPackage.valor_base) || 0;
    const val = Number(data.link.depositValue) || 0;
    if (data.link.depositType === 'percentage') {
      return (total * val) / 100;
    }
    return val;
  }, [data?.link, selectedPackage]);

  const handleNextToContact = () => {
    if (!selectedPackageId) {
      toast.error('Selecione um pacote.');
      return;
    }
    if (!selectedDate || !selectedTime) {
      toast.error('Selecione a data e o horário desejado.');
      return;
    }
    setCurrentStep('contact');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || clientName.trim().length < 3) {
      toast.error('Informe seu nome completo.');
      return;
    }
    const cleanPhone = clientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Informe um telefone/WhatsApp válido.');
      return;
    }
    if (!clientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      toast.error('Informe um e-mail válido.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        date: selectedDate,
        startTime: selectedTime,
        pacoteId: selectedPackageId,
        clienteData: {
          nome: clientName.trim(),
          telefone: cleanPhone,
          email: clientEmail.trim().toLowerCase(),
        },
      };

      const res = await fetch(`${API_BASE}/api/agenda/online/${slug}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Não foi possível reservar este horário.');
      }

      setReservationResult(json);
      setCurrentStep('success');

      // Se exigir sinal, podemos redirecionar diretamente após breve pausa
      if (data.link.requireDeposit && json.cobrancaId) {
        toast.success('Horário reservado! Redirecionando para o pagamento do sinal...');
        setTimeout(() => {
          window.location.href = `/checkout/${json.cobrancaId}`;
        }, 1800);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao confirmar agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando horários disponíveis...</p>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border text-center p-6 shadow-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-1">Página Indisponível</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {fetchError || 'Este link de agendamento não está mais ativo ou não possui horários livres no momento.'}
          </p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-muted/20 py-8 px-4">
        <BookingSuccess
          photographerName={data.photographer?.nome || data.photographer?.empresa}
          linkTitle={data.link.title}
          selectedPackage={selectedPackage}
          selectedDate={selectedDate!}
          selectedTime={selectedTime!}
          clientName={clientName}
          cobrancaId={reservationResult?.cobrancaId}
          requireDeposit={Boolean(data.link.requireDeposit)}
        />
      </div>
    );
  }

  const photographerName = data.photographer?.nome || data.photographer?.empresa || 'Estúdio Fotográfico';
  const avatarUrl = data.photographer?.avatar_url || data.photographer?.logo_url;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho do Fotógrafo e Link */}
        <div className="bg-card rounded-2xl border p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <Avatar className="w-16 h-16 border shadow-sm shrink-0">
              <AvatarImage src={avatarUrl} alt={photographerName} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                {photographerName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1 flex-1">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                {photographerName}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.link.title}</h1>
              {data.link.description && (
                <p className="text-sm text-muted-foreground max-w-2xl whitespace-pre-line">
                  {data.link.description}
                </p>
              )}
            </div>

            {data.link.requireDeposit && depositCalculation && (
              <Badge variant="outline" className="px-3 py-1.5 text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 shrink-0">
                Sinal de Reserva: {formatCurrency(depositCalculation)}
              </Badge>
            )}
          </div>
        </div>

        {currentStep === 'selection' ? (
          <div className="space-y-6">
            {/* Escolha de Pacote (se houver mais de 1) */}
            {data.packages.length > 1 && (
              <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Package className="w-4 h-4 text-primary" />
                  <span>1. Escolha o Pacote</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.packages.map((pkg: any) => {
                    const isSelected = selectedPackageId === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={cn(
                          'border rounded-xl p-4 cursor-pointer transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                            : 'hover:border-border/80 hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm leading-tight">{pkg.nome}</h4>
                          <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5', isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30')}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="mt-2 flex items-baseline justify-between text-xs text-muted-foreground">
                          {pkg.fotos_incluidas ? <span>{pkg.fotos_incluidas} fotos</span> : <span />}
                          <span className="font-bold text-foreground text-sm">
                            {formatCurrency(Number(pkg.valor_base) || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calendário e Seleção de Horário */}
            <div className="space-y-3">
              {data.packages.length > 1 && (
                <div className="flex items-center gap-2 text-sm font-semibold px-1">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>2. Escolha o Dia e Horário</span>
                </div>
              )}

              <BookingCalendar
                availableDates={availableDates}
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setSelectedTime(null);
                }}
                slotsForSelectedDate={slotsForSelectedDate}
                selectedTime={selectedTime}
                onSelectTime={setSelectedTime}
              />
            </div>

            {/* Barra de Ação Inferior */}
            <div className="bg-card rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-center sm:text-left">
                {selectedDate && selectedTime ? (
                  <div>
                    <span className="text-muted-foreground">Horário selecionado: </span>
                    <span className="font-semibold text-foreground">
                      {format(parseISO(selectedDate), "dd/MM/yyyy", { locale: ptBR })} às {selectedTime}
                    </span>
                    {selectedPackage && (
                      <span className="text-muted-foreground ml-1">
                        ({selectedPackage.nome} • {formatCurrency(Number(selectedPackage.valor_base) || 0)})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs sm:text-sm">
                    Selecione uma data e um horário para avançar.
                  </span>
                )}
              </div>

              <Button
                size="lg"
                onClick={handleNextToContact}
                disabled={!selectedDate || !selectedTime || !selectedPackageId}
                className="w-full sm:w-auto h-11 px-8 shadow-sm"
              >
                Continuar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          /* Passo 2: Dados do Cliente */
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep('selection')} className="-ml-2 text-xs">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Alterar data/horário
                </Button>
                <div className="text-xs text-muted-foreground">Passo 2 de 2</div>
              </div>
              <CardTitle className="text-xl">Seus Dados de Contato</CardTitle>
              <CardDescription>
                Informe seus dados para vincularmos ao seu agendamento de{' '}
                <strong className="text-foreground">
                  {format(parseISO(selectedDate!), "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
                </strong>.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmitReservation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo <span className="text-destructive">*</span></Label>
                  <Input
                    id="nome"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp / Telefone <span className="text-destructive">*</span></Label>
                    <Input
                      id="phone"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(maskPhoneBR(e.target.value))}
                      placeholder="(00) 00000-0000"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="bg-muted/40 rounded-xl p-4 border space-y-2 text-sm mt-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pacote escolhido:</span>
                    <span className="font-medium text-foreground">{selectedPackage?.nome}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Valor total:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(Number(selectedPackage?.valor_base) || 0)}
                    </span>
                  </div>

                  {data.link.requireDeposit && depositCalculation && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium border-t pt-2 mt-2">
                      <span>Sinal para reserva:</span>
                      <span>{formatCurrency(depositCalculation)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('selection')}
                    disabled={submitting}
                  >
                    Voltar
                  </Button>

                  <Button type="submit" size="lg" disabled={submitting} className="min-w-[180px]">
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirmando...
                      </>
                    ) : data.link.requireDeposit ? (
                      'Ir para Pagamento do Sinal'
                    ) : (
                      'Confirmar Agendamento'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}