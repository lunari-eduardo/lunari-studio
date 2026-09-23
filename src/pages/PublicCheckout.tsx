import { Toaster as Sonner } from '@/components/ui/sonner';
import { PublicThemeWrapper } from '@/components/shared/PublicThemeWrapper';
import CheckoutShell, { CheckoutSkeleton } from './checkout/CheckoutShell';
import ProviderCheckout, { Provedor } from './checkout/ProviderCheckout';
import { PayerValue } from './checkout/PayerGate';
import { AsaasCheckout } from '@/components/AsaasCheckout';

import { usePublicCheckoutData } from './checkout/public/hooks/usePublicCheckoutData';
import { PublicCheckoutSuccess } from './checkout/public/components/PublicCheckoutSuccess';
import { PublicCheckoutError } from './checkout/public/components/PublicCheckoutError';
import { PreCheckoutContactStep, PreCheckoutContactValues } from '@/components/gallery/PreCheckoutContactStep';
import { useState } from 'react';

export default function PublicCheckout() {
  const {
    loading,
    error,
    data,
    isConfirmed,
    setPixConfirmed,
    payerName,
    setPayerName,
    payerEmail,
    setPayerEmail,
    payerPhone,
    setPayerPhone,
    payerCpf,
    setPayerCpf,
    handlePersistContact,
  } = usePublicCheckoutData();

  const [passedPreCheckout, setPassedPreCheckout] = useState(false);

  if (loading) {
    return (
      <PublicThemeWrapper>
        <CheckoutSkeleton />
      </PublicThemeWrapper>
    );
  }

  if (error || !data) {
    return <PublicCheckoutError error={error} />;
  }

  if (isConfirmed) {
    const isBookingDeposit = Boolean(data?.cobranca?.descricao?.includes('Sinal de Agendamento'));
    return (
      <PublicCheckoutSuccess
        primaryColor={data?.theme?.primaryColor || undefined}
        title={isBookingDeposit ? 'Horário Reservado e Confirmado!' : undefined}
        description={
          isBookingDeposit
            ? 'O pagamento do seu sinal foi confirmado e seu horário na agenda está garantido com sucesso!'
            : undefined
        }
        studioName={data?.photographer?.name || undefined}
      />
    );
  }

  const provedorAtual = (data?.provedor ?? 'asaas') as string;
  const needsPreCheckout = data.payerMissing && 
    (data.payerMissing.name || data.payerMissing.email || data.payerMissing.phone || data.payerMissing.cpfCnpj) 
    && !passedPreCheckout;

  if (needsPreCheckout) {
    return (
      <PublicThemeWrapper primaryColor={data.theme?.primaryColor || undefined}>
        <PreCheckoutContactStep
          valorTotal={data.cobranca.valor}
          provider={provedorAtual as any}
          studioName={data.photographer.name || undefined}
          photographerFirstName={data.photographer.name?.split(' ')[0] || undefined}
          prefill={{
            fullName: payerName,
            email: payerEmail,
            phone: payerPhone,
            cpfCnpj: payerCpf,
          }}
          missing={data.payerMissing}
          externalErrors={{}}
          onBack={() => {
            // Em cobranças diretas/públicas, não há "voltar". Recarrega a página.
            window.location.reload();
          }}
          onSubmit={async (values: PreCheckoutContactValues) => {
            setPayerName(values.nome);
            setPayerEmail(values.email);
            setPayerPhone(values.phone);
            setPayerCpf(values.cpfCnpj);
            await handlePersistContact({
              nome: values.nome,
              email: values.email,
              phone: values.phone,
              cpfCnpj: values.cpfCnpj,
            });
            
            // Para não pedir de novo nos sub-componentes
            if (data.payerMissing) {
              data.payerMissing.name = false;
              data.payerMissing.email = false;
              data.payerMissing.phone = false;
              data.payerMissing.cpfCnpj = false;
            }
            if (data.payerHints) {
              data.payerHints.fullName = values.nome;
              data.payerHints.email = values.email;
              data.payerHints.phone = values.phone;
              data.payerHints.cpfCnpj = values.cpfCnpj;
            }

            setPassedPreCheckout(true);
          }}
        />
      </PublicThemeWrapper>
    );
  }

  // Provedores não transparentes (ex: infinitepay)
  if (provedorAtual !== 'asaas' && provedorAtual !== 'mercadopago') {
    const payerValue: PayerValue = {
      nome: payerName,
      email: payerEmail,
      telefone: payerPhone,
      cpfCnpj: payerCpf,
    };
    return (
      <PublicThemeWrapper primaryColor={data.theme?.primaryColor || undefined}>
        <CheckoutShell
          photographer={data.photographer}
          valor={data.cobranca.valor}
          descricao={data.cobranca.descricao}
        >
          <Sonner />
          <ProviderCheckout
            provedor={provedorAtual as Provedor}
            cobrancaId={data.cobranca.id}
            provider={data.provider || {}}
            payer={payerValue}
            onPayerChange={(v) => {
              setPayerName(v.nome);
              setPayerEmail(v.email);
              setPayerPhone(v.telefone);
              setPayerCpf(v.cpfCnpj);
            }}
            onPaid={() => setPixConfirmed(true)}
          />
        </CheckoutShell>
      </PublicThemeWrapper>
    );
  }

  const { cobranca, photographer, settings, provider } = data;

  return (
    <PublicThemeWrapper primaryColor={data.theme?.primaryColor || undefined}>
      <Sonner />
      <AsaasCheckout
        data={{
          userId: photographer.userId,
          valorTotal: cobranca.valor,
          descricao: cobranca.descricao,
          cobrancaId: cobranca.id,
          provedor: provedorAtual,
          mpPublicKey: provider?.mpPublicKey,
          enabledMethods: {
            pix: settings.habilitarPix,
            creditCard: settings.habilitarCartao,
            boleto: settings.habilitarBoleto,
          },
          maxParcelas: settings.maxParcelas || 12,
          absorverTaxa: settings.absorverTaxa,
          ireiAntecipar: settings.ireiAntecipar,
          repassarTaxaAntecipacao: settings.repassarTaxaAntecipacao,
          incluirTaxaAntecipacao: settings.incluirTaxaAntecipacao,
        }}
        initialAccountFees={data.accountFees || undefined}
        studioName={photographer.name || undefined}
        studioLogoUrl={photographer.logoUrl || undefined}
        payerHints={{
          fullName: data.payerHints?.fullName,
          email: data.payerHints?.email,
          phone: data.payerHints?.phone,
          cpfCnpj: data.payerHints?.cpfCnpj,
        }}
        payerMissing={data.payerMissing}
        onPaymentConfirmed={() => setPixConfirmed(true)}
        onPersistContact={handlePersistContact}
      />
    </PublicThemeWrapper>
  );
}
