export interface PixPaymentData {
  merchant_name?: string;
  key?: string;
  key_type?: string;
  currency?: string;
  total_amount?: number;
  [key: string]: any;
}

export type NormalizedMessageData = 
  | { type: 'pix'; pixData: PixPaymentData; rawContent: string }
  | { type: 'unsupported'; fallbackText: string; rawContent: string }
  | { type: 'standard'; content: string };

export function normalizeMessageContent(content: string | undefined): NormalizedMessageData {
  if (!content) return { type: 'standard', content: '' };

  try {
    const parsed = JSON.parse(content);
    if (typeof parsed !== 'object' || parsed === null) {
      return { type: 'standard', content };
    }

    let interactiveMessage: any = null;

    if (parsed.message?.interactiveMessage) {
      interactiveMessage = parsed.message.interactiveMessage;
    } else if (parsed.interactiveMessage) {
      interactiveMessage = parsed.interactiveMessage;
    }

    if (interactiveMessage?.nativeFlowMessage?.buttons) {
      const buttons = interactiveMessage.nativeFlowMessage.buttons;
      const paymentInfoBtn = buttons.find((b: any) => b.name === 'payment_info' || b.name === 'payment_method');
      
      if (paymentInfoBtn) {
        let params: any = {};
        if (typeof paymentInfoBtn.buttonParamsJson === 'string') {
          try {
            params = JSON.parse(paymentInfoBtn.buttonParamsJson);
          } catch (e) {
            // ignore
          }
        } else if (paymentInfoBtn.buttonParamsJson) {
          params = paymentInfoBtn.buttonParamsJson;
        }

        const pixData: PixPaymentData = {
          merchant_name: params.merchant_name || params.merchantName,
          key: params.key || params.pix_key || params.pixKey || params.chave_pix || params.chave,
          key_type: params.key_type || params.pix_key_type || params.pixKeyType,
          currency: params.currency,
          total_amount: params.total_amount || params.totalAmount,
          ...params
        };

        return { type: 'pix', pixData, rawContent: content };
      }
    }

    let fallbackText = "Mensagem não suportada";
    if (interactiveMessage?.body?.text) {
      fallbackText = interactiveMessage.body.text;
    } else if (parsed.message?.viewOnceMessage) {
      fallbackText = "Mensagem de visualização única";
    } else if (parsed.message?.documentWithCaptionMessage) {
      fallbackText = "Documento";
    }

    return { type: 'unsupported', fallbackText, rawContent: content };
  } catch (e) {
    return { type: 'standard', content };
  }
}
