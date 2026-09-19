/**
 * FormPublicRenderer — markup e lógica do formulário público Lunari.
 *
 * Layout editorial:
 * - Desktop (≥lg): Cover à ESQUERDA + conteúdo/pregunta à DIREITA (split 40/60)
 * - Mobile (<lg): Vertical full-screen mobile-first
 *
 * Funcionalidades:
 * - Navegação passo a passo com Anterior/Próximo
 * - Estado das respostas em memória durante a sessão
 * - Branding do estúdio (logo + nome)
 * - Renderização de todos os tipos de campo
 * - Validação de campos obrigatórios
 * - Seleção de cores com swatches interativos
 * - Upload de imagens com dropzone
 */
import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDropzone } from 'react-dropzone';
import {
  Check,
  Clock,
  Upload,
  X,
  Loader2,
  ArrowLeft,
  ChevronRight,
  FileCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

import {
  useFormularioPublico,
  useSubmitFormularioResposta,
  useFormularioRespostaPublica,
} from '@/hooks/useFormularios';
import { usePublicTheme } from '@/hooks/usePublicTheme';
import { PublicThemeWrapper } from '@/components/shared/PublicThemeWrapper';
import { invokeEdgeWorker } from '@/integrations/edge-client';

import type { Formulario, FormularioCampo } from '@/types/formulario';
import type { FormularioCampoOpcaoCor } from '@/types/formulario';

export interface FormPublicRendererProps {
  token: string;
  readOnly?: boolean;
  wrapInPublicTheme?: boolean;
  /**
   * Se fornecido, sobrescreve o resultado de `useFormularioPublico` com
   * este formulário. Usado pelo preview do editor para refletir o draft
   * em tempo real, sem precisar de save.
   *
   * Em modo override, todas as queries externas (resposta existente) ficam
   * inibidas — é apenas para preview visual.
   */
  overrideForm?: Formulario;
  /**
   * Altura fixa para o container raiz (substitui `min-h-screen`).
   * Usado pelo FormEditorPreview para forçar altura da moldura mobile/desktop.
   */
  forceHeight?: number;
  /**
   * Se true, não remove a classe 'dark' do <html>.
   * Usado pelo editor para preservar a preferência de dark mode do usuário.
   */
  preserveDarkMode?: boolean;
}

// ─── Helpers de tipo ─────────────────────────────────────────

function isOpcaoCor(op: unknown): op is FormularioCampoOpcaoCor {
  return (
    typeof op === 'object' &&
    op !== null &&
    'label' in op &&
    typeof (op as any).label === 'string' &&
    'hex' in op &&
    typeof (op as any).hex === 'string'
  );
}

function getOpcoesCores(opcoes: unknown[]): FormularioCampoOpcaoCor[] {
  return opcoes
    .map((o): FormularioCampoOpcaoCor => {
      if (typeof o === 'string') return { label: o, hex: '#888888' };
      if (isOpcaoCor(o)) return o;
      return { label: String(o), hex: '#888888' };
    })
    .filter(Boolean);
}

// ─── Componente principal ─────────────────────────────────────

export function FormPublicRenderer({
  token,
  readOnly = false,
  wrapInPublicTheme = true,
  overrideForm,
  forceHeight,
  preserveDarkMode = false,
}: FormPublicRendererProps) {
  const fetched = useFormularioPublico(token);
  const formulario = overrideForm ?? fetched.data;
  const isLoading = overrideForm ? false : fetched.isLoading;
  const error = overrideForm ? null : fetched.error;
  const submitMutation = useSubmitFormularioResposta();

  const { data: themeData } = usePublicTheme(formulario?.user_id);

  const primaryColor = themeData?.primaryColor ?? undefined;
  const studioName = themeData?.studioName ?? 'Meu Estúdio';
  const studioLogoUrl = themeData?.studioLogoUrl ?? undefined;

  const isRespondido = !overrideForm && formulario?.status_envio === 'respondido';
  const isExpirado =
    !overrideForm &&
    formulario?.expires_at &&
    new Date(formulario.expires_at) < new Date();
  const isDisponivel =
    (overrideForm ? true : formulario?.status === 'publicado') &&
    !isRespondido &&
    !isExpirado;

  const { data: respostaExistente } = useFormularioRespostaPublica(
    token,
    !overrideForm && isRespondido === true,
  );

  const camposOrdenados = useMemo(
    () => [...(formulario?.campos ?? [])].sort((a, b) => a.ordem - b.ordem),
    [formulario?.campos],
  );

  const formattedDate = useMemo(() => {
    if (!formulario?.tempo_estimado) return null;
    return `${formulario.tempo_estimado} min`;
  }, [formulario?.tempo_estimado]);

  const [currentStep, setCurrentStep] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [respondenteName, setRespondenteName] = useState('');
  const [respondenteEmail, setRespondenteEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (campoId: string, value: any) => {
    if (readOnly) return;
    setRespostas((prev) => ({ ...prev, [campoId]: value }));
    if (errors[campoId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[campoId];
        return next;
      });
    }
  };

  const handleFileUpload = async (campoId: string, files: File[]) => {
    if (readOnly) return;
    if (files.length === 0) return;
    setUploading((prev) => ({ ...prev, [campoId]: true }));
    const uploadedUrls: string[] = respostas[campoId] || [];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('token', token || '');
        formData.append('campoId', campoId);

        const { data, error: uploadError } = await invokeEdgeWorker(
          'api',
          'gestao-r2-public-upload',
          { body: formData },
        );
        if (uploadError) throw uploadError;
        if (!data?.success || !data?.url)
          throw new Error(data?.error || 'Falha no upload');
        uploadedUrls.push(data.url as string);
      }
      handleChange(campoId, uploadedUrls);
    } catch (err) {
      console.error('Erro no upload:', err);
    } finally {
      setUploading((prev) => ({ ...prev, [campoId]: false }));
    }
  };

  const removeFile = (campoId: string, index: number) => {
    if (readOnly) return;
    const urls = [...(respostas[campoId] || [])];
    urls.splice(index, 1);
    handleChange(campoId, urls);
  };

  const totalSteps = camposOrdenados.length;
  const currentCampo = camposOrdenados[currentStep];
  const progresso =
    totalSteps > 0 ? Math.round(((currentStep + 1) / totalSteps) * 100) : 0;

  const validarPasso = (step: number): string | null => {
    const campo = camposOrdenados[step];
    if (!campo?.obrigatorio) return null;
    const val = respostas[campo.id];
    if (campo.tipo === 'upload_imagem' || campo.tipo === 'upload_referencia') {
      if (!Array.isArray(val) || val.length === 0)
        return 'Esta pergunta é obrigatória.';
    } else if (campo.tipo === 'multipla_escolha') {
      if (!Array.isArray(val) || val.length === 0)
        return 'Esta pergunta é obrigatória.';
    } else if (campo.tipo === 'selecao_unica') {
      if (!val || (typeof val === 'string' && !val.trim()))
        return 'Esta pergunta é obrigatória.';
    } else {
      if (val === undefined || val === null || String(val).trim() === '') {
        return 'Esta pergunta é obrigatória.';
      }
    }
    return null;
  };

  const handleProximo = () => {
    if (readOnly) return;
    const err = validarPasso(currentStep);
    if (err) {
      setErrors((prev) => ({
        ...prev,
        [camposOrdenados[currentStep].id]: err,
      }));
      return;
    }
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleVoltar = () => {
    if (readOnly) return;
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!formulario || !isDisponivel) return;

    const validationErrors: Record<string, string> = {};
    let firstErrorStep: number | null = null;

    for (let i = 0; i < totalSteps; i++) {
      const err = validarPasso(i);
      if (err) {
        validationErrors[camposOrdenados[i].id] = err;
        if (firstErrorStep === null) firstErrorStep = i;
      }
    }

    if (firstErrorStep !== null) {
      setErrors(validationErrors);
      setCurrentStep(firstErrorStep);
      return;
    }

    try {
      await submitMutation.mutateAsync({
        formulario,
        respostas,
        respondente_nome: respondenteName || undefined,
        respondente_email: respondenteEmail || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Erro ao enviar formulário:', err);
      if (err?.code === '23505') {
        setSubmitted(true);
        return;
      }
      alert('Erro ao enviar formulário. Por favor, tente novamente.');
    }
  };

  // ─── Loading ───────────────────────────────────────────
  if (isLoading) {
    return (
      <ContentWrapper
        primaryColor={primaryColor}
        wrapInPublicTheme={wrapInPublicTheme}
        forceHeight={forceHeight}
        preserveDarkMode={preserveDarkMode}
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              Carregando formulário...
            </p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  // ─── Erro / Não encontrado ────────────────────────────
  if (error || !formulario) {
    return (
      <ContentWrapper
        primaryColor={primaryColor}
        wrapInPublicTheme={wrapInPublicTheme}
        forceHeight={forceHeight}
        preserveDarkMode={preserveDarkMode}
      >
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-3 max-w-md">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">Formulário não encontrado</h1>
            <p className="text-sm text-muted-foreground">
              Este link pode ter expirado ou o formulário não está mais
              disponível.
            </p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  // ─── Expirado ─────────────────────────────────────────
  if (isExpirado) {
    return (
      <ContentWrapper
        primaryColor={primaryColor}
        wrapInPublicTheme={wrapInPublicTheme}
        forceHeight={forceHeight}
        preserveDarkMode={preserveDarkMode}
      >
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-3 max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold">Formulário expirado</h1>
            <p className="text-sm text-muted-foreground">
              O prazo para responder este formulário já passou. Entre em contato
              com o estúdio.
            </p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  // ─── Respondido ───────────────────────────────────────
  if (isRespondido || submitted) {
    return (
      <ContentWrapper
        primaryColor={primaryColor}
        wrapInPublicTheme={wrapInPublicTheme}
        forceHeight={forceHeight}
        preserveDarkMode={preserveDarkMode}
      >
        <div className="min-h-screen">
          {formulario.cover_url && (
            <div className="w-full h-56 overflow-hidden bg-neutral-200">
              <img
                src={formulario.cover_url}
                alt="Capa"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="max-w-xl mx-auto px-4 py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">
              {formulario.titulo_cliente || formulario.titulo}
            </h2>
            <p className="text-muted-foreground mb-2">
              {respostaExistente?.mensagem_conclusao ||
                formulario.mensagem_conclusao}
            </p>
            {respostaExistente?.submitted_at && (
              <p className="text-xs text-muted-foreground">
                Enviado em{' '}
                {format(
                  new Date(respostaExistente.submitted_at),
                  "dd/MM/yyyy 'às' HH:mm",
                  { locale: ptBR },
                )}
              </p>
            )}
          </div>
        </div>
      </ContentWrapper>
    );
  }

  // ─── Não publicado ────────────────────────────────────
  if (!overrideForm && formulario.status !== 'publicado') {
    return (
      <ContentWrapper
        primaryColor={primaryColor}
        wrapInPublicTheme={wrapInPublicTheme}
        forceHeight={forceHeight}
        preserveDarkMode={preserveDarkMode}
      >
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-3 max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <X className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold">Formulário indisponível</h1>
            <p className="text-sm text-muted-foreground">
              Este formulário ainda não está disponível para preenchimento.
            </p>
          </div>
        </div>
      </ContentWrapper>
    );
  }

  // ─── Formulário disponível ────────────────────────────
  const coverUrl =
    formulario.cover_url && formulario.cover_url !== '/placeholder.svg'
      ? formulario.cover_url
      : null;
  const tituloExibicao = formulario.titulo_cliente || formulario.titulo;

  return (
    <ContentWrapper
      primaryColor={primaryColor}
      wrapInPublicTheme={wrapInPublicTheme}
      forceHeight={forceHeight}
    >
      <div className="min-h-screen flex">
        {/* ── Painel da Capa (desktop) — full-bleed, sem overlay ── */}
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-neutral-100">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Capa do formulário"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
          )}
        </div>

        {/* ── Painel de Conteúdo ──────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header sticky */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
            <div className="flex items-center justify-between px-6 py-3.5">
              {/* Brand */}
              <div className="flex items-center gap-2 min-w-0">
                {studioLogoUrl ? (
                  <img
                    src={studioLogoUrl}
                    alt={studioName}
                    className="h-6 w-auto object-contain"
                  />
                ) : (
                  <span className="text-sm font-medium text-foreground truncate">
                    {studioName}
                  </span>
                )}
              </div>
              {/* Progresso */}
              <div className="flex items-center gap-2.5">
                <div className="w-24 h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                  {currentStep + 1} de {totalSteps}
                </span>
              </div>
            </div>
          </header>

          {/* Mobile cover */}
          {coverUrl && (
            <div className="lg:hidden w-full h-40 overflow-hidden bg-neutral-200">
              <img
                src={coverUrl}
                alt="Capa do formulário"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Mobile título */}
          {coverUrl && (
            <div className="lg:hidden px-4 pt-4 pb-2">
              <h1 className="text-lg font-semibold leading-snug">
                {tituloExibicao}
              </h1>
              {formulario.descricao && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formulario.descricao}
                </p>
              )}
            </div>
          )}

          {/* Área de scroll */}
          <main className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} noValidate>
              {/* Cabeçalho do formulário (título + descrição) — desktop */}
              {!readOnly && (
                <div className="hidden lg:block max-w-lg mx-auto px-6 pt-10 pb-2">
                  <div className="space-y-3">
                    <h1 className="text-3xl font-normal text-foreground tracking-tight leading-[1.1]">
                      {tituloExibicao}
                    </h1>
                    {formulario.descricao && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {formulario.descricao}
                      </p>
                    )}
                    {formattedDate && (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formattedDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Info do respondente (apenas no primeiro passo) */}
              {currentStep === 0 && (
                <div className="max-w-lg mx-auto px-6 pt-6 pb-4">
                  <div className="bg-white rounded-xl border border-neutral-200 px-5 py-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                    <p className="text-[11px] font-medium text-muted-foreground tracking-wide">
                      Suas informações (opcional)
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="pub-nome" className="text-xs">
                          Nome
                        </Label>
                        <Input
                          id="pub-nome"
                          value={respondenteName}
                          onChange={(e) => setRespondenteName(e.target.value)}
                          placeholder="Ex: Maria Silva"
                          className="h-10"
                          disabled={readOnly}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="pub-email" className="text-xs">
                          Email
                        </Label>
                        <Input
                          id="pub-email"
                          type="email"
                          value={respondenteEmail}
                          onChange={(e) =>
                            setRespondenteEmail(e.target.value)
                          }
                          placeholder="Ex: maria@email.com"
                          className="h-10"
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pergunta atual */}
              <div className="max-w-lg mx-auto px-6 py-6">
                {currentCampo && (
                  <CampoRendererPublico
                    key={currentCampo.id}
                    campo={currentCampo}
                    stepLabel={`${currentStep + 1} de ${totalSteps}`}
                    value={respostas[currentCampo.id]}
                    onChange={(v) => handleChange(currentCampo.id, v)}
                    onFileUpload={(files) =>
                      handleFileUpload(currentCampo.id, files)
                    }
                    onRemoveFile={(idx) => removeFile(currentCampo.id, idx)}
                    isUploading={uploading[currentCampo.id]}
                    error={errors[currentCampo.id]}
                    disabled={readOnly}
                  />
                )}
              </div>

              {/* Navegação */}
              <div className="max-w-lg mx-auto px-6 pb-8">
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVoltar}
                    disabled={readOnly || currentStep === 0}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Anterior
                  </Button>

                  <div className="flex-1" />

                  {currentStep < totalSteps - 1 ? (
                    <Button type="button" onClick={handleProximo} className="gap-1.5">
                      Continuar
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={readOnly || submitMutation.isPending}
                      className="gap-1.5"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          Enviar
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </main>
        </div>
      </div>
    </ContentWrapper>
  );
}

// ─── ContentWrapper ────────────────────────────────────────────

interface ContentWrapperProps {
  primaryColor?: string;
  wrapInPublicTheme: boolean;
  forceHeight?: number;
  preserveDarkMode?: boolean;
  children: React.ReactNode;
}

function ContentWrapper({
  primaryColor,
  wrapInPublicTheme,
  forceHeight,
  preserveDarkMode,
  children,
}: ContentWrapperProps) {
  if (!wrapInPublicTheme) return <>{children}</>;
  return (
    <PublicThemeWrapper primaryColor={primaryColor} forceHeight={forceHeight} preserveDarkMode={preserveDarkMode}>
      {children}
    </PublicThemeWrapper>
  );
}

// ─── CampoRendererPublico ────────────────────────────────────

interface CampoRendererPublicoProps {
  campo: FormularioCampo;
  stepLabel: string;
  value: any;
  onChange: (value: any) => void;
  onFileUpload: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  isUploading?: boolean;
  disabled?: boolean;
  error?: string;
}

function CampoRendererPublico({
  campo,
  stepLabel,
  value,
  onChange,
  onFileUpload,
  onRemoveFile,
  isUploading,
  disabled,
  error,
}: CampoRendererPublicoProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileUpload(acceptedFiles);
    },
    [onFileUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] px-6 py-5 space-y-5">
      {/* Cabeçalho da pergunta */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
            {stepLabel}
          </span>
        </div>
        <h2 className="text-lg font-medium leading-snug text-foreground">
          {campo.label}
          {campo.obrigatorio && (
            <span className="text-destructive ml-1">*</span>
          )}
        </h2>
        {campo.descricao && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {campo.descricao}
          </p>
        )}
      </div>

      {/* Campo de resposta */}
      <div>
        {/* Texto curto */}
        {campo.tipo === 'texto_curto' && (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={campo.placeholder || 'Digite aqui...'}
            disabled={disabled}
            className={cn(
              'text-base h-12',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          />
        )}

        {/* Texto longo */}
        {campo.tipo === 'texto_longo' && (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={campo.placeholder || 'Digite aqui...'}
            rows={4}
            disabled={disabled}
            className={cn(
              'text-base',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          />
        )}

        {/* Data */}
        {campo.tipo === 'data' && (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'text-base h-12',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          />
        )}

        {/* Seleção única (radio) */}
        {campo.tipo === 'selecao_unica' && (
          <RadioGroup
            value={value || ''}
            onValueChange={onChange}
            disabled={disabled}
            className="space-y-2"
          >
            {(campo.opcoes || []).map((opcao, idx) => {
              const label = typeof opcao === 'string' ? opcao : opcao.label;
              return (
                <label
                  key={idx}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                    value === label
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-neutral-200 bg-white hover:border-primary/50',
                  )}
                >
                  <RadioGroupItem value={label} className="mt-0.5" />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              );
            })}
          </RadioGroup>
        )}

        {/* Múltipla escolha (checkbox) */}
        {campo.tipo === 'multipla_escolha' && (
          <div className="space-y-2">
            {(campo.opcoes || []).map((opcao, idx) => {
              const label = typeof opcao === 'string' ? opcao : opcao.label;
              const checked = (value || []).includes(label);
              return (
                <label
                  key={idx}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all',
                    checked
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-neutral-200 bg-white hover:border-primary/50',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) => {
                      const current = value || [];
                      onChange(
                        c
                          ? [...current, label]
                          : current.filter((v: string) => v !== label),
                      );
                    }}
                    disabled={disabled}
                    className="mt-0.5"
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              );
            })}
          </div>
        )}

        {/* Seleção de cores */}
        {campo.tipo === 'selecao_cores' && (
          <div className="space-y-2">
            {getOpcoesCores(campo.opcoes || []).map((opcao, idx) => {
              const selected = value === opcao.label;
              return (
                <label
                  key={idx}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-neutral-200 bg-white hover:border-primary/50',
                  )}
                >
                  {/* Swatch */}
                  <div
                    className="w-9 h-9 rounded-full border-2 border-white shadow-sm shrink-0"
                    style={{ backgroundColor: opcao.hex }}
                    aria-hidden
                  />
                  <RadioGroupItem value={opcao.label} className="sr-only" />
                  <div className="flex-1">
                    <span className="text-sm font-medium block">{opcao.label}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {opcao.hex}
                    </span>
                  </div>
                  {selected && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </label>
              );
            })}
          </div>
        )}

        {/* Upload */}
        {(campo.tipo === 'upload_imagem' ||
          campo.tipo === 'upload_referencia') && (
          <div className="space-y-3">
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : error
                  ? 'border-destructive bg-destructive/5'
                  : 'border-neutral-300 hover:border-primary/50 bg-white',
                (disabled || isUploading) && 'pointer-events-none opacity-60',
              )}
            >
              <input {...getInputProps()} />
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive
                      ? 'Solte os arquivos aqui...'
                      : 'Arraste arquivos ou clique para selecionar'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Imagens (JPG, PNG) ou PDF
                  </p>
                </>
              )}
            </div>
            {(value || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(value as string[]).map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group w-20 h-20 rounded-lg overflow-hidden border"
                  >
                    <img
                      src={url}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveFile(idx)}
                      disabled={disabled}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Erro */}
      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}
