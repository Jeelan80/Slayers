/**
 * Utility to generate synthetic identity card image blobs in browser using HTML5 Canvas.
 * Generates realistic student/government ID cards for live hackathon evaluation.
 */

export interface CardRenderOptions {
  name: string;
  dob: string;
  idNumber: string;
  institution: string;
  idType: string;
  isBlurry?: boolean;
  isTampered?: boolean;
  tamperedText?: string;
  filename?: string;
}

export async function generateSyntheticCard(options: CardRenderOptions): Promise<File> {
  const {
    name,
    dob,
    idNumber,
    institution,
    idType,
    isBlurry = false,
    isTampered = false,
    filename = 'document_id.jpg',
  } = options;

  const width = 720;
  const height = 450;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // 1. Card Base Background (modern dark card with subtle gradient & border)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f172a'); // slate-900
  bgGrad.addColorStop(0.5, '#1e293b'); // slate-800
  bgGrad.addColorStop(1, '#0b1120'); // deep slate
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  roundRect(ctx, 0, 0, width, height, 20);
  ctx.fill();

  // Decorative border
  ctx.strokeStyle = '#38bdf8'; // sky-400
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // 2. Header Strip
  const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
  headerGrad.addColorStop(0, '#1d4ed8'); // blue-700
  headerGrad.addColorStop(1, '#0284c7'); // sky-600
  ctx.fillStyle = headerGrad;
  ctx.beginPath();
  roundRect(ctx, 2, 2, width - 4, 76, 18);
  ctx.fill();

  // Institution & Header Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px "Segoe UI", Inter, sans-serif';
  ctx.fillText((institution || 'HACKINGLY VERIFIED INSTITUTION').toUpperCase(), 28, 38);

  ctx.fillStyle = '#93c5fd'; // blue-200
  ctx.font = '600 12px "Segoe UI", Inter, sans-serif';
  ctx.fillText(`OFFICIAL CREDENTIAL VERIFICATION · ${idType.replace('_', ' ')}`, 28, 60);

  // Security Hologram / Chip Icon
  drawSecurityChip(ctx, width - 85, 20);

  // 3. Participant Photo Frame
  const photoX = 36;
  const photoY = 105;
  const photoW = 145;
  const photoH = 185;

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  roundRect(ctx, photoX, photoY, photoW, photoH, 12);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw Avatar Silhouette inside photo frame
  drawAvatar(ctx, photoX + photoW / 2, photoY + photoH / 2 - 5, name);

  // Photo ID Stamp
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('BIOMETRIC RECORDED', photoX + 10, photoY + photoH + 20);

  // 4. Identity Text Fields
  const textX = 210;
  let textY = 125;

  // Field: Full Name
  drawField(ctx, textX, textY, 'FULL NAME', name.toUpperCase(), '#ffffff', 18);
  textY += 50;

  // Field: ID Number
  drawField(ctx, textX, textY, 'DOCUMENT ID NUMBER', idNumber || 'ABC20261023', '#38bdf8', 16, true);
  textY += 48;

  // Field: Date of Birth
  if (isTampered) {
    // Visual Tamper: altered DOB with mismatched background slice
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px "Segoe UI", sans-serif';
    ctx.fillText('DATE OF BIRTH', textX, textY);

    // Tampered patch
    ctx.fillStyle = '#f43f5e';
    ctx.globalAlpha = 0.25;
    ctx.fillRect(textX - 4, textY + 5, 140, 26);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = '#f87171'; // red-400
    ctx.font = 'bold 15px monospace';
    ctx.fillText(dob || '2007-04-14', textX, textY + 24);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('⚠️ ELA COMPRESSION ANOMALY', textX + 155, textY + 22);
  } else {
    drawField(ctx, textX, textY, 'DATE OF BIRTH', dob || '2005-03-14', '#ffffff', 15);
  }
  textY += 48;

  // Field: Issue Validity
  drawField(ctx, textX, textY, 'STATUS / VALIDITY', 'ACTIVE PARTICIPANT · VALID 2026', '#34d399', 13);

  // 5. Machine-Readable QR / Barcode Pattern
  drawQrPattern(ctx, width - 150, height - 160, 115, isTampered ? 'ORIGINAL_DOB:2005-03-14' : `ID:${idNumber}|DOB:${dob}`);

  // 6. Security Watermark & Guilloche Bands
  ctx.save();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(36, height - 52);
  ctx.lineTo(width - 36, height - 52);
  ctx.stroke();
  ctx.restore();

  // Bottom Legal & Security Disclaimer
  ctx.fillStyle = '#64748b';
  ctx.font = '10px "Segoe UI", monospace';
  ctx.fillText('SECURITY PROTECTED BY VERIFORGE DQVC ENGINE · ANTI-FORGERY AUDIT SECURE', 36, height - 25);
  ctx.fillText('VER: 2.4.0-SLAYERS', width - 160, height - 25);

  // 7. If Blurry requested: Apply heavy 2-pass box blur to simulate bad camera/motion blur
  if (isBlurry) {
    applyCanvasBlur(ctx, width, height, 12);
  }

  // Convert canvas to Blob -> File
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create image blob'));
          return;
        }
        const file = new File([blob], filename, { type: 'image/jpeg' });
        resolve(file);
      },
      'image/jpeg',
      isBlurry ? 0.65 : 0.92
    );
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawField(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  value: string,
  valueColor: string,
  fontSize: number,
  isMono: boolean = false
) {
  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = '600 11px "Segoe UI", sans-serif';
  ctx.fillText(label, x, y);

  ctx.fillStyle = valueColor;
  ctx.font = isMono ? `bold ${fontSize}px monospace` : `bold ${fontSize}px "Segoe UI", Inter, sans-serif`;
  ctx.fillText(value, x, y + 22);
}

function drawSecurityChip(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#f59e0b'; // amber-500
  ctx.beginPath();
  roundRect(ctx, x, y, 48, 36, 6);
  ctx.fill();

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Internal lines
  ctx.beginPath();
  ctx.moveTo(x + 16, y);
  ctx.lineTo(x + 16, y + 36);
  ctx.moveTo(x + 32, y);
  ctx.lineTo(x + 32, y + 36);
  ctx.moveTo(x, y + 18);
  ctx.lineTo(x + 48, y + 18);
  ctx.stroke();
}

function drawAvatar(ctx: CanvasRenderingContext2D, cx: number, cy: number, name: string) {
  // Head
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.arc(cx, cy - 18, 28, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders
  ctx.beginPath();
  ctx.arc(cx, cy + 50, 48, Math.PI, 0);
  ctx.fill();

  // Initials badge
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(initials, cx, cy - 12);
  ctx.textAlign = 'left';
}

function drawQrPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  _content: string
) {
  // Background box for QR
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  roundRect(ctx, x, y, size, size, 8);
  ctx.fill();

  // Render QR-like matrix grid with corner finder patterns
  ctx.fillStyle = '#0f172a';
  const margin = 8;
  const innerSize = size - margin * 2;
  const cells = 21;
  const cellSize = innerSize / cells;

  const startX = x + margin;
  const startY = y + margin;

  // Pseudo-random deterministic pattern based on cell coordinates
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      // 3 Corner finder patterns (7x7)
      const isTopLeft = r < 7 && c < 7;
      const isTopRight = r < 7 && c >= cells - 7;
      const isBottomLeft = r >= cells - 7 && c < 7;

      if (isTopLeft || isTopRight || isBottomLeft) {
        const localR = isTopLeft ? r : isTopRight ? r : r - (cells - 7);
        const localC = isTopLeft ? c : isTopRight ? c - (cells - 7) : c;
        const isBorder = localR === 0 || localR === 6 || localC === 0 || localC === 6;
        const isCenter = localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4;
        if (isBorder || isCenter) {
          ctx.fillRect(startX + c * cellSize, startY + r * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      } else {
        // Data bits
        if ((r * 13 + c * 7 + (r ^ c)) % 3 === 0) {
          ctx.fillRect(startX + c * cellSize, startY + r * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      }
    }
  }

  // Label under QR
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DQVC ENCRYPTED', x + size / 2, y + size + 14);
  ctx.textAlign = 'left';
}

function applyCanvasBlur(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Fast horizontal & vertical box blur
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let k = -radius; k <= radius; k += 3) {
          const sampleX = Math.min(width - 1, Math.max(0, x + k));
          const sampleIdx = (y * width + sampleX) * 4;
          r += data[sampleIdx];
          g += data[sampleIdx + 1];
          b += data[sampleIdx + 2];
          count++;
        }

        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}
