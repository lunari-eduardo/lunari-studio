import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePublicTheme } from '@/hooks/usePublicTheme';
import { PublicThemeWrapper } from '@/components/shared/PublicThemeWrapper';
import { AgendaCoverImage } from '@/components/agenda/agenda-online-panel/AgendaCoverImage';
import {
  Loader2, AlertCircle, Calendar as CalendarIcon, Clock, Sparkles,
  User, Phone, Mail, MessageSquare, Check, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/utils/financialUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const SCHEDULE_API_URL = import.meta.env.VITE_SCHEDULE_API_URL || 'http://localhost:8787';
const SCHEDULE_API_TOKEN = import.meta.env.VITE_SCHEDULE_API_TOKEN || '';

interface SlotsResponse {
  success: boolean;
  data?: {
    link: {
      id: string;
      userId: string;
      title: string;
      description?: string;
      requireDeposit: boolean;
      depositType?: 'fixed' | 'percentage';
      depositValue?: number;
      showPackagePrice?: boolean;
      coverImageUrl?: string | null;
      coverImagePosition?: string;
      coverImageLqip?: string | null;
    };
    photographer: {
      empresa?: string;
      avatar_url?: string;
      logo_url?: string;
    };
    packages: Array<{ id: string; nome: string; valor_base: number; duracao_minutos?: number; fotos_incluidas?: number }>;
    slotsByDate: Record<string, Array<{ start_time: string; end_time: string }>>;
  };
  error?: string;
}

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();

  // Carrega dados do link via worker
  const { data, isLoading, error } = useQuery<SlotsResponse>({
    queryKey: ['public-booking-slots', slug],
    queryFn: async () => {
      const res = await fetch(`${SCHEDULE_API_URL}/agenda-online/slots/${slug}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(SCHEDULE_API_TOKEN ? { 'x-api-token': SCHEDULE_API_TOKEN } : {}),
        },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Não foi possível carregar esta página.');
      }
      return json;
    },
    enabled: !!slug,
    staleTime: 30_000,
  });

  const photographerId = data?.data?.link?.userId;
  const { data: theme } = usePublicTheme(photographerId);
  const primaryColor = theme?.primaryColor || undefined;

  // Estados do fluxo
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const packages = data?.data?.packages || [];
  const selectedPackage = packages.find(p => p.id === selectedPackageId) || null;

  const calculateDeposit = (): number => {
    if (!selectedPackage || !data?.data?.link.requireDeposit) return 0;
    const { depositType, depositValue } = data.data.link;
    const value = Number(depositValue) || 0;
    if (depositType === 'percentage') {
      return (Number(selectedPackage.valor_base) * value) / 100;
    }
    return value;
  };

  const handleSubmit = async () => {
    if (!selectedPackage || !selectedDate || !selectedTime) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Preencha seu nome e telefone.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${SCHEDULE_API_URL}/agenda-online/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(SCHEDULE_API_TOKEN ? { 'x-api-token': SCHEDULE_API_TOKEN } : {}),
        },
        body: JSON.stringify({
          slug,
          packageId: selectedPackage.id,
          date: selectedDate,
          startTime: selectedTime,
          customer: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail || undefined,
            notes: customerNotes || undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Não foi possível confirmar.');
      }
      setStep(4);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao confirmar agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <PublicThemeWrapper primaryColor={primaryColor}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PublicThemeWrapper>
    );
  }

  if (error || !data?.data) {
    return (
      <PublicThemeWrapper primaryColor={primaryColor}>
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold">Página não disponível</h1>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'Este link pode estar inativo ou expirado.'}
            </p>
          </div>
        </div>
      </PublicThemeWrapper>
    );
  }

  const { link, photographer, slotsByDate } = data.data;
  const hasCover = !!link.coverImageUrl;
  const studioName = photographer?.empresa || theme?.studioName || 'Estúdio';
  const logoUrl = photographer?.logo_url || photographer?.avatar_url || theme?.studioLogoUrl;
  const showPackagePrice = link.showPackagePrice !== false;

  // Datas disponíveis ordenadas
  const dates = Object.keys(slotsByDate).sort();

  // Formatar data para exibição
  const formatDateLabel = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return { weekday, day };
  };

  return (
    <PublicThemeWrapper primaryColor={primaryColor}>
      {/* Layout editorial: split-screen em desktop, coluna em mobile */}
      <div className="min-h-screen flex flex-col md:flex-row">
        {/* COLUNA ESQUERDA — CAPA EDITORIAL */}
        <aside className="relative md:w-[48%] md:min-h-screen md:sticky md:top-0 md:h-screen shrink-0">
          {hasCover ? (
            <AgendaCoverImage
              src={link.coverImageUrl}
              position={link.coverImagePosition}
              lqip={link.coverImageLqip}
              alt={link.title}
              fill
              priority
              className="h-[55vh] md:h-full"
            />
          ) : (
            <div className="relative h-[55vh] md:h-full bg-gradient-to-br from-neutral-300 via-neutral-200 to-neutral-300">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.6),transparent_50%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/40 pointer-events-none" />

          <div className="absolute inset-x-0 top-0 p-5 md:p-8 flex items-center gap-3 z-10">
            {logoUrl ? (
              <img src={logoUrl} alt={studioName} className="w-9 h-9 rounded-full border border-white/40 object-cover bg-white/10 backdrop-blur-sm" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold">
                {studioName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-white text-xs uppercase tracking-[0.2em] font-semibold drop-shadow">
              {studioName}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8 z-10">
            <h1 className="text-white text-2xl md:text-4xl font-bold leading-tight drop-shadow-lg">
              {link.title}
            </h1>
            {link.description && (
              <p className="text-white/85 text-sm md:text-base mt-3 max-w-prose drop-shadow leading-relaxed">
                {link.description}
              </p>
            )}
          </div>
        </aside>

        {/* COLUNA DIREITA — FLUXO */}
        <main className="flex-1 bg-background min-h-screen">
          <div className="max-w-2xl mx-auto px-5 py-8 md:py-12 md:px-10 space-y-8">
            <div className="md:hidden">
              <h1 className="text-2xl font-bold leading-tight">{link.title}</h1>
              {link.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{link.description}</p>
              )}
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {[
                { n: 1 as const, label: 'Pacote' },
                { n: 2 as const, label: 'Horário' },
                { n: 3 as const, label: 'Você' },
                { n: 4 as const, label: 'Pronto' },
              ].map((s, idx, arr) => (
                <div key={s.n} className="flex items-center gap-2 flex-1">
                  <div className={step >= s.n ? 'text-foreground font-medium' : ''}>{idx + 1}. {s.label}</div>
                  {idx < arr.length - 1 && <div className="flex-1 h-px bg-border" />}
                </div>
              ))}
            </div>

            {/* STEP 1 — PACOTE */}
            {step === 1 && (
              <section className="space-y-4">
                <header className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="text-base font-semibold">Escolha sua experiência</h2>
                </header>
                {packages.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum pacote disponível no momento.</p>
                ) : (
                  <div className="space-y-2">
                    {packages.map(pkg => {
                      const selected = selectedPackageId === pkg.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPackageId(pkg.id)}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${
                            selected
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm">{pkg.nome}</p>
                              {pkg.duracao_minutos ? (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {pkg.duracao_minutos} minutos
                                </p>
                              ) : null}
                              {pkg.fotos_incluidas ? (
                                <p className="text-xs text-muted-foreground mt-0.5">{pkg.fotos_incluidas} fotos inclusas</p>
                              ) : null}
                            </div>
                            {showPackagePrice && (
                              <span className="font-bold text-base shrink-0">
                                {formatCurrency(Number(pkg.valor_base) || 0)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button disabled={!selectedPackage} onClick={() => setStep(2)}>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 2 — HORÁRIO */}
            {step === 2 && (
              <section className="space-y-5">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-semibold">Escolha um horário</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Voltar
                  </Button>
                </header>

                {dates.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum horário disponível no momento.</p>
                ) : (
                  <div className="space-y-5">
                    {dates.map(dateStr => {
                      const slots = slotsByDate[dateStr] || [];
                      const { weekday, day } = formatDateLabel(dateStr);
                      return (
                        <div key={dateStr} className="space-y-2">
                          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                            {weekday} • {day}
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {slots.map(slot => {
                              const isSelected = selectedDate === dateStr && selectedTime === slot.start_time;
                              return (
                                <button
                                  key={slot.start_time}
                                  type="button"
                                  onClick={() => { setSelectedDate(dateStr); setSelectedTime(slot.start_time); }}
                                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                    isSelected
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border bg-card hover:border-primary/40'
                                  }`}
                                >
                                  {slot.start_time.slice(0, 5)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 3 — DADOS DO CLIENTE */}
            {step === 3 && (
              <section className="space-y-5">
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-semibold">Seus dados</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Voltar
                  </Button>
                </header>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pb-name">Nome completo <span className="text-destructive">*</span></Label>
                    <Input id="pb-name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Maria Silva" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="pb-phone">WhatsApp <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input id="pb-phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="pl-9" placeholder="(11) 98765-4321" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pb-email">E-mail (opcional)</Label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input id="pb-email" type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="pl-9" placeholder="maria@email.com" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pb-notes">Observações (opcional)</Label>
                    <div className="relative">
                      <MessageSquare className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Textarea id="pb-notes" rows={3} value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} className="pl-9 resize-none" placeholder="Algo que eu deva saber? Pet na sessão, data preferida para entrega..." />
                    </div>
                  </div>
                </div>

                {link.requireDeposit && selectedPackage && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Sinal para confirmar</p>
                    <p className="text-2xl font-bold">{formatCurrency(calculateDeposit())}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {link.depositType === 'percentage'
                        ? `${link.depositValue}% do valor total`
                        : 'Valor fixo'}
                      {' '}— você recebe o link de pagamento após confirmar.
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    disabled={!customerName.trim() || !customerPhone.trim() || submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirmando…</>
                    ) : (
                      <>Confirmar agendamento</>
                    )}
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 4 — CONFIRMAÇÃO */}
            {step === 4 && (
              <section className="space-y-5 py-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Solicitação enviada!</h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Você receberá um retorno de <strong>{studioName}</strong> em breve pelo WhatsApp informado.
                    {link.requireDeposit && ' Lembre-se de pagar o sinal para garantir o horário.'}
                  </p>
                </div>
                {selectedPackage && selectedDate && selectedTime && (
                  <div className="inline-flex flex-col gap-1 px-5 py-3 rounded-xl bg-muted/40 border text-left text-sm">
                    <p><strong>{selectedPackage.nome}</strong></p>
                    <p className="text-muted-foreground">{formatDateLabel(selectedDate).day} às {selectedTime.slice(0, 5)}</p>
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </PublicThemeWrapper>
  );
}
