import { escapeHtml } from '../helpers.ts';

export interface PhotographerSelectionEmailParams {
  photographerName: string;
  clienteNome: string;
  galleryName: string;
  selectedPhotosCount: number;
  totalPhotosCount: number;
  percentSelected: number;
  formattedDateTime: string;
  dashboardUrl: string;
}

export interface ClientSelectionEmailParams {
  allowDownload: boolean;
  clienteNome: string;
  galleryName: string;
  selectedPhotosCount: number;
  formattedDateTime: string;
  studioName: string;
  studioLogoUrl?: string | null;
  galleryUrl?: string;
  customBodyText?: string | null;
}

/**
 * Converte data ISO/timestamp para formato longo elegante:
 * Ex: "10 de setembro de 2026 às 14:32"
 */
export function formatLongDateTime(value: unknown): string {
  const date = value ? new Date(String(value)) : new Date();
  if (isNaN(date.getTime())) return 'Data não disponível';
  
  const day = date.getDate();
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day} de ${month} de ${year} às ${hours}:${minutes}`;
}

/**
 * Constrói o e-mail transacional para o Fotógrafo (Layout Dark + Métricas 2x2)
 * Fidelidade ao Mockup 1 (E-MAIL PARA O FOTÓGRAFO)
 */
export function buildPhotographerSelectionEmail(params: PhotographerSelectionEmailParams): string {
  const {
    clienteNome,
    galleryName,
    selectedPhotosCount,
    totalPhotosCount,
    percentSelected,
    formattedDateTime,
    dashboardUrl,
  } = params;

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seleção finalizada - ${escapeHtml(galleryName)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#EFEFEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#18181B;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(clienteNome)} concluiu a seleção da galeria ${escapeHtml(galleryName)} (${selectedPhotosCount} fotos selecionadas).
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background-color:#EFEFEA;padding:32px 12px 48px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#FFFFFF;border:1px solid #E4E0D9;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.04);">
            
            <!-- HEADER ESCURO LUNARI -->
            <tr>
              <td style="background-color:#161616;padding:22px 28px;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td align="left" style="font-family:Georgia,'Times New Roman',serif;font-size:16px;letter-spacing:0.28em;color:#FFFFFF;text-transform:uppercase;font-weight:600;">
                      L U N A R I
                    </td>
                    <td align="right" style="font-size:9px;letter-spacing:0.12em;color:#A1A1AA;text-transform:uppercase;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                      SEU ESTÚDIO EM PERFEITA ÓRBITA.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CORPO DO E-MAIL -->
            <tr>
              <td style="padding:34px 28px 28px;">
                
                <!-- Eyebrow + Sino -->
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin-bottom:14px;">
                  <tr>
                    <td align="left">
                      <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9B7844;">
                        SELEÇÃO FINALIZADA
                      </span>
                    </td>
                    <td align="right">
                      <div style="width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background-color:#F7EFE6;color:#9B7844;font-size:12px;display:inline-block;">
                        🔔
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Título Editorial -->
                <h1 style="margin:0 0 14px;color:#18181B;font-size:26px;line-height:1.25;font-weight:400;font-family:Georgia,'Times New Roman',serif;">
                  Seu cliente finalizou a seleção!
                </h1>

                <!-- Subtítulo -->
                <p style="margin:0 0 26px;color:#52525B;font-size:14px;line-height:1.6;">
                  <strong>${escapeHtml(clienteNome)}</strong> concluiu a seleção da galeria <strong>${escapeHtml(galleryName)}</strong>. As fotos escolhidas já estão registradas no Lunari.
                </p>

                <!-- GRID 2x2 DE MÉTRICAS -->
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:20px;">
                  <tr>
                    <!-- Cliente -->
                    <td style="width:50%;background:#F9F9F8;border:1px solid #ECEAE6;border-radius:8px;padding:14px 16px;vertical-align:top;">
                      <div style="font-size:11px;color:#71717A;text-transform:uppercase;font-weight:600;letter-spacing:0.04em;margin-bottom:4px;">
                        👤 &nbsp;Cliente
                      </div>
                      <div style="font-size:14px;color:#18181B;font-weight:700;line-height:1.3;">
                        ${escapeHtml(clienteNome)}
                      </div>
                    </td>
                    <!-- Data e Hora -->
                    <td style="width:50%;background:#F9F9F8;border:1px solid #ECEAE6;border-radius:8px;padding:14px 16px;vertical-align:top;">
                      <div style="font-size:11px;color:#71717A;text-transform:uppercase;font-weight:600;letter-spacing:0.04em;margin-bottom:4px;">
                        📅 &nbsp;Data e hora
                      </div>
                      <div style="font-size:13px;color:#18181B;font-weight:700;line-height:1.3;">
                        ${escapeHtml(formattedDateTime)}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <!-- Galeria / Sessão -->
                    <td style="width:50%;background:#F9F9F8;border:1px solid #ECEAE6;border-radius:8px;padding:14px 16px;vertical-align:top;">
                      <div style="font-size:11px;color:#71717A;text-transform:uppercase;font-weight:600;letter-spacing:0.04em;margin-bottom:4px;">
                        📁 &nbsp;Galeria / Sessão
                      </div>
                      <div style="font-size:14px;color:#18181B;font-weight:700;line-height:1.3;">
                        ${escapeHtml(galleryName)}
                      </div>
                    </td>
                    <!-- Seleção -->
                    <td style="width:50%;background:#F9F9F8;border:1px solid #ECEAE6;border-radius:8px;padding:14px 16px;vertical-align:top;">
                      <div style="font-size:11px;color:#71717A;text-transform:uppercase;font-weight:600;letter-spacing:0.04em;margin-bottom:4px;">
                        🖼️ &nbsp;Seleção
                      </div>
                      <div style="font-size:14px;color:#18181B;font-weight:700;line-height:1.3;">
                        ${selectedPhotosCount} de ${totalPhotosCount} fotos
                      </div>
                      <div style="font-size:12px;color:#A1A1AA;font-weight:500;margin-top:2px;">
                        ${percentSelected}% da galeria
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- BOTÃO CTA LUNARI -->
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:24px 0;">
                  <tr>
                    <td>
                      <a href="${escapeHtml(dashboardUrl)}" style="display:block;text-align:center;background-color:#18181B;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;border-radius:8px;padding:15px 24px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                        VER SELEÇÃO COMPLETA NO LUNARI &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- PRÓXIMOS PASSOS -->
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#FBF9F7;border:1px solid #EFEAE3;border-radius:8px;padding:14px 16px;">
                  <tr>
                    <td style="width:34px;vertical-align:top;padding-top:2px;font-size:18px;">
                      📊
                    </td>
                    <td style="vertical-align:top;">
                      <div style="font-size:13px;font-weight:700;color:#18181B;margin-bottom:2px;">
                        Próximos passos
                      </div>
                      <div style="font-size:13px;color:#71717A;line-height:1.5;">
                        Agora você pode seguir com a edição e dar continuidade ao seu fluxo de atendimento.
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- DIVIDER & FOOTER INTERNO -->
                <div style="margin-top:32px;padding-top:20px;border-top:1px solid #ECEAE6;">
                  <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                    <tr>
                      <td align="left" style="vertical-align:middle;">
                        <div style="font-family:Georgia,serif;font-size:13px;letter-spacing:0.24em;color:#18181B;font-weight:700;text-transform:uppercase;">
                          L U N A R I
                        </div>
                        <div style="font-size:11px;color:#A1A1AA;margin-top:4px;">
                          Mais tempo para o que realmente importa: suas histórias.
                        </div>
                      </td>
                      <td align="right" style="vertical-align:middle;">
                        <a href="https://app.lunarihub.com" style="font-size:12px;color:#71717A;text-decoration:none;font-weight:500;">
                          app.lunarihub.com
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Constrói o e-mail transacional para o Cliente
 * Suporta Cenário A (Download Liberado) e Cenário B (Sem Download)
 * Respeita personalização do texto do fotógrafo dentro da casca visual elegante
 */
export function buildClientSelectionConfirmedEmail(params: ClientSelectionEmailParams): string {
  const {
    allowDownload,
    clienteNome,
    galleryName,
    selectedPhotosCount,
    formattedDateTime,
    studioName,
    studioLogoUrl,
    galleryUrl,
    customBodyText,
  } = params;

  // 1. Branding do cabeçalho (Logo do estúdio ou Nome estilizado)
  const headerBrand = studioLogoUrl
    ? `<img src="${escapeHtml(studioLogoUrl)}" alt="${escapeHtml(studioName)}" style="max-height:48px;max-width:200px;height:auto;width:auto;object-fit:contain;display:block;" />`
    : `<span style="font-family:Georgia,'Times New Roman',serif;font-size:16px;letter-spacing:0.22em;color:#18181B;text-transform:uppercase;font-weight:700;">${escapeHtml(studioName)}</span>`;

  // 2. Eyebrow e Mensagem Principal
  const eyebrowText = allowDownload ? 'SUAS FOTOS ESTÃO PRONTAS' : 'SELEÇÃO FINALIZADA';

  // Mensagem do corpo: se o fotógrafo customizou, usa o texto dele. Se não, usa a cópia padrão do mockup.
  let messageContent = '';
  if (customBodyText && customBodyText.trim().length > 0) {
    messageContent = customBodyText
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 16px;color:#52525B;font-size:15px;line-height:1.65;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
      .join('');
  } else {
    messageContent = allowDownload
      ? `<p style="margin:0 0 20px;color:#52525B;font-size:15px;line-height:1.65;">Sua galeria foi finalizada e suas fotos já estão disponíveis para acesso e download.</p>`
      : `<p style="margin:0 0 20px;color:#52525B;font-size:15px;line-height:1.65;">Sua seleção de fotos foi concluída.<br>As fotos que você escolheu já foram recebidas pela fotógrafa, que dará continuidade ao processo.</p>`;
  }

  // 3. Métricas Cards (Lado a Lado)
  const metric1Label = allowDownload ? 'Fotos disponíveis' : 'Fotos selecionadas';
  const metric1Sub = allowDownload ? 'fotos para download' : 'fotos escolhidas';

  // 4. CTA Button (Apenas no Cenário A - Download Liberado)
  const ctaButtonHtml = allowDownload && galleryUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:26px 0 22px;">
        <tr>
          <td>
            <a href="${escapeHtml(galleryUrl)}" style="display:block;text-align:center;background-color:#18181B;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;border-radius:8px;padding:16px 28px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
              ACESSAR MINHAS FOTOS &rarr;
            </a>
          </td>
        </tr>
      </table>`
    : '';

  // 5. Box Explicativo ("Como funciona?" vs "O que acontece agora?")
  const explanationBox = allowDownload
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#F9F9F8;border:1px solid #ECEAE6;border-radius:8px;padding:16px;margin-bottom:28px;">
        <tr>
          <td style="width:36px;vertical-align:top;padding-top:2px;font-size:20px;">
            📥
          </td>
          <td style="vertical-align:top;">
            <div style="font-size:13px;font-weight:700;color:#18181B;margin-bottom:3px;">
              Como funciona?
            </div>
            <div style="font-size:13px;color:#71717A;line-height:1.5;">
              Acesse a galeria, faça o download das suas fotos conforme as permissões definidas pela fotógrafa e guarde essas memórias com você.
            </div>
          </td>
        </tr>
      </table>`
    : `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background:#F9F9F8;border:1px solid #ECEAE6;border-radius:8px;padding:16px;margin-bottom:28px;">
        <tr>
          <td style="width:36px;vertical-align:top;padding-top:2px;font-size:20px;">
            ✓
          </td>
          <td style="vertical-align:top;">
            <div style="font-size:13px;font-weight:700;color:#18181B;margin-bottom:3px;">
              O que acontece agora?
            </div>
            <div style="font-size:13px;color:#71717A;line-height:1.5;">
              A fotógrafa seguirá com as próximas etapas e entrará em contato com você quando houver novidades. Não é necessário realizar nenhuma ação neste momento.
            </div>
          </td>
        </tr>
      </table>`;

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(eyebrowText)} - ${escapeHtml(galleryName)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#EFEFEA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#18181B;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(clienteNome)}, sua seleção da galeria ${escapeHtml(galleryName)} foi confirmada com sucesso.
    </div>

    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;background-color:#EFEFEA;padding:32px 12px 48px;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background:#FFFFFF;border:1px solid #E4E0D9;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.04);">
            
            <!-- HEADER COM BRANDING DO FOTÓGRAFO -->
            <tr>
              <td style="background-color:#FFFFFF;padding:26px 32px 20px;border-bottom:1px solid #F0ECE7;">
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td align="left" style="vertical-align:middle;">
                      ${headerBrand}
                    </td>
                    <td align="right" style="vertical-align:middle;font-size:9px;letter-spacing:0.14em;color:#A1A1AA;text-transform:uppercase;font-weight:500;">
                      FOTOGRAFIA QUE PERMANECE
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- CORPO PRINCIPAL -->
            <tr>
              <td style="padding:34px 32px 32px;">
                
                <!-- Eyebrow -->
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9B7844;margin-bottom:12px;">
                  ${escapeHtml(eyebrowText)}
                </div>

                <!-- Saudação Editorial -->
                <h1 style="margin:0 0 14px;color:#18181B;font-size:30px;line-height:1.2;font-weight:400;font-family:Georgia,'Times New Roman',serif;">
                  Olá, ${escapeHtml(clienteNome)}!
                </h1>

                <!-- Texto do E-mail (Customizado ou Padrão) -->
                <div style="margin-bottom:24px;">
                  ${messageContent}
                </div>

                <!-- CARDS DE MÉTRICAS (2 COLUNAS) -->
                <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:separate;border-spacing:8px;margin-bottom:20px;">
                  <tr>
                    <!-- Fotos -->
                    <td style="width:50%;background:#F9F9F8;border:1px solid #ECEAE6;border-radius:8px;padding:14px 16px;vertical-align:top;">
                      <div style="font-size:11px;color:#71717A;font-weight:500;margin-bottom:4px;">
                        🖼️ &nbsp;${escapeHtml(metric1Label)}
                      </div>
                      <div style="font-size:22px;color:#18181B;font-weight:700;line-height:1.2;">
                        ${selectedPhotosCount}
                      </div>
                      <div style="font-size:11px;color:#A1A1AA;font-weight:400;margin-top:2px;">
                        ${escapeHtml(metric1Sub)}
                      </div>
                    </td>
                    <!-- Finalizada em -->
                    <td style="width:50%;background:#F9F9F8;border:1px solid #ECEAE6;border-radius:8px;padding:14px 16px;vertical-align:top;">
                      <div style="font-size:11px;color:#71717A;font-weight:500;margin-bottom:4px;">
                        📅 &nbsp;Finalizada em
                      </div>
                      <div style="font-size:13px;color:#18181B;font-weight:700;line-height:1.4;margin-top:4px;">
                        ${escapeHtml(formattedDateTime)}
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button (se permitido) -->
                ${ctaButtonHtml}

                <!-- Box Explicativo -->
                ${explanationBox}

                <!-- ASSINATURA CARINHOSA DO FOTÓGRAFO -->
                <div style="text-align:center;margin:32px 0 16px;border-top:1px solid #F4F1EC;padding-top:24px;">
                  <p style="margin:0 0 10px;color:#71717A;font-size:13px;font-weight:500;">
                    Obrigado por fazer parte dessa história!
                  </p>
                  <div style="color:#C4A47C;font-size:16px;line-height:1;margin-bottom:10px;">
                    ♡
                  </div>
                  <p style="margin:0;color:#71717A;font-size:12px;line-height:1.6;">
                    Com carinho,<br>
                    <strong style="color:#18181B;font-size:14px;font-family:Georgia,serif;">${escapeHtml(studioName)}</strong>
                  </p>
                </div>

                <!-- FOOTER DISCRETO LUNARI -->
                <div style="margin-top:28px;padding-top:18px;border-top:1px solid #ECEAE6;">
                  <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;">
                    <tr>
                      <td align="left" style="vertical-align:middle;">
                        <span style="font-size:10px;color:#A1A1AA;display:block;margin-bottom:2px;">Enviado por</span>
                        <span style="font-family:Georgia,serif;font-size:12px;letter-spacing:0.2em;color:#18181B;font-weight:700;text-transform:uppercase;">
                          L U N A R I
                        </span>
                      </td>
                      <td align="right" style="vertical-align:middle;font-size:10px;color:#A1A1AA;line-height:1.4;">
                        Tecnologia para fotógrafos<br>que valorizam histórias.
                      </td>
                    </tr>
                  </table>
                </div>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
