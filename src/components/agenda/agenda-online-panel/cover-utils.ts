/**
 * Gera um placeholder LQIP (Low Quality Image Placeholder) a partir de uma imagem.
 * Retorna uma string base64 JPEG de ~16x12px que o componente de capa usa como fundo blur-up.
 *
 * Roda 100% client-side usando Canvas — sem upload extra.
 */
export async function generateLqip(file: File, targetSize = 16): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const aspect = img.width / img.height;
        const w = targetSize;
        const h = Math.max(8, Math.round(targetSize / aspect));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas context não disponível'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem para LQIP'));
    };

    img.src = url;
  });
}

/**
 * Converte uma posição em grid 3x3 ("x y" com x,y em [0,1,2]) para
 * coordenadas CSS object-position ("X% Y%").
 *  | 0 1 2 |
 *  | 3 4 5 |
 *  | 6 7 8 |
 */
export function gridToObjectPosition(cell: number): string {
  if (cell < 0 || cell > 8) return '50% 50%';
  const col = cell % 3;
  const row = Math.floor(cell / 3);
  const x = [0, 50, 100][col];
  const y = [0, 50, 100][row];
  return `${x}% ${y}%`;
}

/**
 * Converte "X% Y%" para cell (0-8) — para inicializar o uploader
 * quando o fotógrafo edita uma capa já configurada.
 */
export function objectPositionToGrid(position: string | null | undefined): number {
  if (!position) return 4;
  const match = position.match(/(\d+)%\s+(\d+)%/);
  if (!match) {
    if (position.includes('top')) return rowColToCell(0, 1);
    if (position.includes('bottom')) return rowColToCell(2, 1);
    if (position.includes('left')) return rowColToCell(1, 0);
    if (position.includes('right')) return rowColToCell(1, 2);
    return 4;
  }
  const x = Math.round(Number(match[1]) / 50);
  const y = Math.round(Number(match[2]) / 50);
  return rowColToCell(y, x);
}

function rowColToCell(row: number, col: number): number {
  return Math.min(2, Math.max(0, row)) * 3 + Math.min(2, Math.max(0, col));
}
