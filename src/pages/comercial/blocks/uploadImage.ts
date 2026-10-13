import { gestaoR2Upload } from '@/lib/gestaoR2Upload';

// Upload de imagem para propostas: redimensiona no client (máx 1920px,
// JPEG 85%; PNG/WebP com transparência seguem PNG) e envia para o R2 via Edge Function do Studio.
export async function uploadProposalImage(file: File): Promise<string> {
  return uploadSingleImage(file);
}

/**
 * Upload múltiplo de imagens para propostas (em paralelo, na ordem escolhida).
 * Uma foto que falha não derruba o lote: volta em `failed`.
 */
export async function uploadMultipleProposalImages(
  files: FileList | File[],
  onProgress?: (done: number, total: number) => void
): Promise<{ urls: string[]; failed: number }> {
  const fileArray = Array.from(files);
  let done = 0;
  onProgress?.(0, fileArray.length);
  const results = await Promise.allSettled(
    fileArray.map((file) =>
      uploadSingleImage(file).finally(() => onProgress?.(++done, fileArray.length))
    )
  );
  const urls = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  return { urls, failed: results.length - urls.length };
}

/** Algum pixel (quase) transparente? Só então vale manter o canal alfa. */
function hasTransparency(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  } catch {
    // canvas sem leitura permitida: segue como JPEG
  }
  return false;
}

function uploadSingleImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1920;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // PNG/WebP com transparência (galhos e detalhes decorativos) seguem PNG: o JPEG achataria o fundo em preto
        const keepAlpha = !!ctx && /^image\/(png|webp)$/.test(file.type) && hasTransparency(ctx, width, height);
        const mime = keepAlpha ? 'image/png' : 'image/jpeg';

        canvas.toBlob(async (blob) => {
          if (!blob) return reject(new Error('Failed to convert to blob'));
          // A extensão segue o conteúdo gerado pelo canvas, não o arquivo original
          const filename = `${crypto.randomUUID()}.${blob.type === 'image/png' ? 'png' : 'jpg'}`;

          try {
            const resizedFile = new File([blob], filename, { type: blob.type || 'image/jpeg' });
            const response = await gestaoR2Upload({
              file: resizedFile,
              context: 'proposals'
            });
            resolve(response.url || `https://media.lunarihub.com/${response.storagePath}`);
          } catch (err) {
            reject(err);
          }
        }, mime, keepAlpha ? undefined : 0.85);
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}
