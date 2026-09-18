/**
 * Client-side synthetic ID card generator.
 * Produces a realistic-looking college ID PNG via HTML5 Canvas and
 * returns it as a File object ready for multipart submission.
 */

export type ScenarioId = 'genuine' | 'duplicate' | 'tampered' | 'underage';

export interface ScenarioPayload {
  name: string;
  dob: string;         // YYYY-MM-DD
  id_number: string;
  institution: string;
  email: string;
  file: File;
}

const SCENARIO_DATA: Record<ScenarioId, Omit<ScenarioPayload, 'file'>> = {
  genuine: {
    name: 'Ravi Kumar',
    dob: '2003-06-14',
    id_number: 'CS21B1024',
    institution: 'Indian Institute of Technology, Bombay',
    email: 'ravi.kumar@iitb.ac.in',
  },
  duplicate: {
    name: 'Ravi Kumar',
    dob: '2003-06-14',
    id_number: 'CS21B1024',
    institution: 'Indian Institute of Technology, Bombay',
    email: 'ravi.kumar@iitb.ac.in',
  },
  tampered: {
    name: 'Aditi Sharma',
    dob: '2004-11-02',
    id_number: 'EE22B0781',
    institution: 'BITS Pilani',
    email: 'aditi.sharma@pilani.bits-pilani.ac.in',
  },
  underage: {
    name: 'Rohan Verma',
    dob: '2010-03-22',
    id_number: 'HS10A0342',
    institution: 'Delhi Public School, RK Puram',
    email: 'rohan.verma@dpsrkp.in',
  },
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawAvatar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  // Circle background
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.15, r * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Shoulders
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.85, r * 0.75, Math.PI, 0);
  ctx.fill();
}

function drawQRish(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#0f172a';
  const cell = size / 21;
  // Deterministic pseudo-QR
  for (let r = 0; r < 21; r++) {
    for (let c = 0; c < 21; c++) {
      const v = (r * 31 + c * 17 + r * c) % 5;
      if (v < 2) ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
    }
  }
  // Finder patterns
  const drawFinder = (fx: number, fy: number) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(fx, fy, cell * 7, cell * 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx + cell, fy + cell, cell * 5, cell * 5);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(fx + cell * 2, fy + cell * 2, cell * 3, cell * 3);
  };
  drawFinder(x, y);
  drawFinder(x + cell * 14, y);
  drawFinder(x, y + cell * 14);
}

async function canvasToFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Canvas blob generation failed'));
      resolve(new File([blob], filename, { type: 'image/png' }));
    }, 'image/png', 0.95);
  });
}

export async function generateScenarioCard(scenario: ScenarioId): Promise<ScenarioPayload> {
  const data = SCENARIO_DATA[scenario];
  const W = 900, H = 560;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Card background with soft gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = grad;
  drawRoundedRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  // Top brand strip
  ctx.fillStyle = '#009E7E';
  drawRoundedRect(ctx, 0, 0, W, 90, 24);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px "Helvetica", Arial, sans-serif';
  ctx.fillText(data.institution.toUpperCase(), 32, 55);
  ctx.font = '16px "Helvetica", Arial, sans-serif';
  ctx.fillText('STUDENT IDENTITY CARD  •  2025-2026', 32, 78);

  // Left avatar block
  drawAvatar(ctx, 150, 260, 90);

  // Signature line
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(70, 400);
  ctx.lineTo(230, 400);
  ctx.stroke();
  ctx.fillStyle = '#475569';
  ctx.font = '12px "Helvetica", Arial, sans-serif';
  ctx.fillText('Signature', 130, 418);

  // Data column
  const labelX = 300;
  const valueX = 300;
  let y = 150;
  const drawField = (label: string, value: string, tamperColor?: string) => {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px "Helvetica", Arial, sans-serif';
    ctx.fillText(label.toUpperCase(), labelX, y);
    ctx.fillStyle = tamperColor ?? '#0f172a';
    ctx.font = 'bold 22px "Helvetica", Arial, sans-serif';
    ctx.fillText(value, valueX, y + 26);
    y += 62;
  };

  drawField('Name', data.name);
  drawField('Student ID', data.id_number);

  // Tampered scenario: draw DOB with obvious retouch artefacts
  if (scenario === 'tampered') {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px "Helvetica", Arial, sans-serif';
    ctx.fillText('DATE OF BIRTH', labelX, y);

    // "Original" faded text under the tampered block
    ctx.fillStyle = 'rgba(180, 40, 40, 0.35)';
    ctx.font = 'bold 22px "Helvetica", Arial, sans-serif';
    ctx.fillText('2010-11-02', valueX, y + 26);

    // Tampered overlay rectangle
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(valueX - 4, y + 8, 170, 26);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Helvetica", Arial, sans-serif';
    ctx.fillText(data.dob, valueX, y + 28);
    y += 62;
  } else {
    drawField('Date of Birth', data.dob);
  }

  drawField('Email', data.email);

  // QR bottom-right (mismatch for tampered scenario)
  drawQRish(ctx, W - 170, H - 170, 130);
  ctx.fillStyle = '#64748b';
  ctx.font = '11px "Helvetica", Arial, sans-serif';
  ctx.fillText('Scan to verify', W - 160, H - 20);

  // Footer bar
  ctx.fillStyle = '#0f172a';
  drawRoundedRect(ctx, 0, H - 40, W, 40, 0);
  ctx.fill();
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "Helvetica", Arial, sans-serif';
  ctx.fillText('Valid until: 2027-06-30   •   Property of the institution', 32, H - 16);

  const file = await canvasToFile(canvas, `${scenario}-id.png`);
  return { ...data, file };
}
