import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  PEST_CATEGORIES,
  type PestDataMap,
  type PestCategory,
  getCategoryAverage,
  getRiskScore,
} from '../data/pestRiskCategories';

export interface PestRiskPdfInput {
  customerName: string;
  customerAddress: string;
  division: string;
  assessmentDate: string;
  responsiblePerson: string;
  customerResponsible: string;
  documentNumber: string;
  revisionNumber: string;
  revisionDate: string;
  pestData: PestDataMap;
  companyLogo?: string | null;
  companyName?: string;
}

const M = 10;
const COLORS = {
  primary: [22, 163, 74],
  secondary: [21, 128, 61],
  headerBg: [240, 253, 244],
  lines: [187, 247, 208],
  textMain: [20, 83, 45],
  textGray: [60, 60, 60],
};

// Türkçe → ASCII dönüşüm
function toAscii(text: string): string {
  if (!text) return '';
  const map: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
  };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, (match) => map[match] || match);
}

// Logo yükleme
async function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Canvas failed'));
      }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

// Skor renkleri
function scoreColor(score: number): [number, number, number] {
  if (score === 0) return [255, 255, 255];
  if (score <= 8) return [220, 252, 231]; // Düşük - Yeşil
  if (score <= 15) return [254, 249, 195]; // Orta - Sarı
  return [254, 202, 202]; // Yüksek - Kırmızı
}

function scoreTextColor(score: number): [number, number, number] {
  if (score === 0) return [200, 200, 200];
  if (score <= 8) return [21, 128, 61];
  if (score <= 15) return [161, 98, 7];
  return [153, 27, 27];
}

// Header
async function drawHeader(pdf: jsPDF, W: number, logoUrl?: string | null) {
  pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  pdf.rect(0, 0, W, 22, 'F');

  if (logoUrl) {
    try {
      const logoData = await loadImageAsDataUrl(logoUrl);
      const imgW = 35;
      const imgH = 16;
      pdf.addImage(logoData, 'PNG', M, 3, imgW, imgH);
    } catch (e) {
      console.warn('Logo yuklenemedi:', e);
    }
  }

  const textX = logoUrl ? M + 40 : M;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text(toAscii('ZARARLI RISK DEGERLENDIRME FORMU'), textX, 10);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Pest Control Risk Assessment Report', textX, 15);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('PestMentor', W - M, 10, { align: 'right' });
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Integrated Pest Management', W - M, 14, { align: 'right' });
}

// Müşteri bilgileri
function drawCustomerInfo(pdf: jsPDF, data: PestRiskPdfInput, y: number): number {
  const c = toAscii(data.customerName || '');
  const addr = toAscii(data.customerAddress || '');
  const div = toAscii(data.division || '');
  const date = data.assessmentDate || '';
  const resp = toAscii(data.responsiblePerson || '');
  const custResp = toAscii(data.customerResponsible || '');

  autoTable(pdf, {
    startY: y,
    body: [
      [toAscii('Musteri Adi'), c, toAscii('Bolum'), div, toAscii('Sorumlu'), resp],
      [toAscii('Adres'), addr, toAscii('Tarih'), date, toAscii('Mus. Sor.'), custResp],
    ],
    styles: { 
      fontSize: 7, 
      cellPadding: 2, 
      lineColor: COLORS.lines, 
      lineWidth: 0.15, 
      textColor: COLORS.textGray,
      font: 'helvetica'
    },
    bodyStyles: { fillColor: COLORS.headerBg },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20, textColor: COLORS.textMain },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', cellWidth: 16, textColor: COLORS.textMain },
      3: { cellWidth: 22 },
      4: { fontStyle: 'bold', cellWidth: 18, textColor: COLORS.textMain },
      5: { cellWidth: 'auto' },
    },
    margin: { left: M, right: M },
    theme: 'grid',
  });
  return (pdf as any).lastAutoTable.finalY;
}

// Tanımlar ve Matris
function drawDefinitionsAndMatrix(pdf: jsPDF, startY: number, W: number): number {
  const contentW = W - (2 * M);
  const col1W = contentW * 0.42;
  const col2W = contentW * 0.58;
  
  const x1 = M;
  const x2 = M + col1W + 3;

  const tableStyles = { 
    fontSize: 6, 
    cellPadding: 1.2, 
    lineColor: COLORS.lines, 
    lineWidth: 0.1, 
    textColor: COLORS.textGray,
    font: 'helvetica'
  };
  const headStyles = { 
    fillColor: COLORS.secondary, 
    textColor: [255,255,255] as [number,number,number], 
    fontStyle: 'bold' as const, 
    fontSize: 6.5,
    font: 'helvetica'
  };

  // SOL: Tanımlar
  pdf.setFontSize(7);
  pdf.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text(toAscii('POPULASYON & RISK TANIMLARI'), x1, startY);

  autoTable(pdf, {
    startY: startY + 3,
    head: [['#', toAscii('Seviye'), toAscii('Populasyon Durumu')]],
    body: [
      ['1', 'YOK', toAscii('Zararli ile karsilasilmadi')],
      ['2', toAscii('DUSUK'), toAscii('Karsilasilma olasiligi dusuk')],
      ['3', 'ORTA', toAscii('Son 1-3 yilda gorulmus')],
      ['4', toAscii('YUKSEK'), toAscii('1-3 yil icinde muhtemel')],
      ['5', toAscii('COK YUK'), toAscii('Mevcut/Cok yuksek olasilik')],
    ],
    styles: tableStyles, headStyles,
    columnStyles: { 
      0: { cellWidth: 6, halign: 'center', fontStyle:'bold'}, 
      1: { cellWidth: 14, fontStyle:'bold'} 
    },
    tableWidth: col1W, 
    margin: { left: x1 }, 
    theme: 'grid'
  });
  
  const midY = (pdf as any).lastAutoTable.finalY + 2;

  autoTable(pdf, {
    startY: midY,
    head: [['#', toAscii('Seviye'), toAscii('Risk Derecesi')]],
    body: [
      ['1', 'YOK', toAscii('Urune bulasma riski yok')],
      ['2', toAscii('DUSUK'), toAscii('Dusuk bulasma olasiligi')],
      ['3', 'ORTA', toAscii('Orta derece bulasma')],
      ['4', toAscii('YUKSEK'), toAscii('Yuksek bulasma riski')],
      ['5', toAscii('COK YUK'), toAscii('Kritik/Cok yuksek')],
    ],
    styles: tableStyles, headStyles,
    columnStyles: { 
      0: { cellWidth: 6, halign: 'center', fontStyle:'bold'}, 
      1: { cellWidth: 14, fontStyle:'bold'} 
    },
    tableWidth: col1W, 
    margin: { left: x1 }, 
    theme: 'grid'
  });
  
  const endY1 = (pdf as any).lastAutoTable.finalY;

  // SAĞ: Risk Matrisi + Yorumlar
  pdf.setFontSize(7);
  pdf.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text(toAscii('RISK MATRISI & YORUMLARI'), x2, startY);

  // Matris
  const cellSize = 6;
  const matX = x2 + 5;
  const matY = startY + 8;

  pdf.setFontSize(5.5);
  pdf.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
  pdf.text(toAscii('Risk ->'), matX + 10, matY - 2);

  // Matris çizimi
  for(let r=0; r<5; r++) {
    for(let c=0; c<5; c++) {
      const score = (r+1) * (c+1);
      const bg = scoreColor(score);
      const cx = matX + (c * cellSize);
      const cy = matY + (r * cellSize);
      
      pdf.setFillColor(bg[0], bg[1], bg[2]);
      pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
      pdf.rect(cx, cy, cellSize, cellSize, 'FD');
      
      if(score > 0) {
        const tc = scoreTextColor(score);
        pdf.setTextColor(tc[0], tc[1], tc[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6);
        pdf.text(score.toString(), cx + cellSize/2, cy + cellSize/2 + 1, {align:'center'});
      }
    }
    pdf.setTextColor(COLORS.textMain[0], COLORS.textMain[1], COLORS.textMain[2]);
    pdf.setFontSize(5.5);
    pdf.text((r+1).toString(), matX - 3, matY + (r * cellSize) + 3.5);
  }
  
  for(let c=0; c<5; c++) {
    pdf.text((c+1).toString(), matX + (c * cellSize) + 2.5, matY + (5 * cellSize) + 3.5);
  }

  // Yorumlar
  const interpretY = matY + 35;
  const interpretations = [
    { r: toAscii('1-8 DUSUK AYDA 1 ZİYARET'), bg: [220, 252, 231], t: toAscii('Urune kirlilik riski yok. Rutin kontroller yeterli.') },
    { r: '9-15 ORTA AYDA 2 ZİYARET', bg: [254, 249, 195], t: toAscii('Capraz bulasma kontrol edilmeli. Onlemler alinmali.') },
    { r: toAscii('16-25 YUKSEK AYDA 4 ZİYARET'), bg: [254, 202, 202], t: toAscii('Acil onlem gerekli. Hijyen/yalitim revizyonu sart.') }
  ];

  let boxY = interpretY;
  interpretations.forEach(item => {
    pdf.setFillColor(item.bg[0], item.bg[1], item.bg[2]);
    pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
    pdf.rect(x2, boxY, col2W, 9, 'FD');
    
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(COLORS.textMain[0], COLORS.textMain[1], COLORS.textMain[2]);
    pdf.text(item.r, x2 + 2, boxY + 3.5);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.5);
    pdf.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
    const splitText = pdf.splitTextToSize(item.t, col2W - 4);
    pdf.text(splitText, x2 + 2, boxY + 6.5);
    
    boxY += 10;
  });

  return Math.max(endY1, boxY);
}

// Zararlı Tabloları
function drawPestTables(pdf: jsPDF, data: PestDataMap, startY: number, W: number): number {
  const contentW = W - (2 * M);
  const colW = (contentW - 4) / 3;
  const x1 = M;
  const x2 = M + colW + 2;
  const x3 = M + (colW * 2) + 4;

  const col1Cats = [PEST_CATEGORIES[0], PEST_CATEGORIES[1], PEST_CATEGORIES[2]];
  const col2Cats = [PEST_CATEGORIES[3], PEST_CATEGORIES[4]];
  const col3Cats = [PEST_CATEGORIES[5], PEST_CATEGORIES[6]];

  const drawCat = (cat: PestCategory, x: number, y: number): number => {
    const body = [];
    for(const p of cat.pests) {
      const d = data[cat.key]?.[p.key] || {pop:0, risk:0};
      const sc = getRiskScore(d.pop, d.risk);
      body.push([toAscii(p.label), d.pop||'-', d.risk||'-', sc||'-']);
    }
    const avg = getCategoryAverage(data[cat.key]);
    body.push([toAscii('ORTALAMA'), avg.avgPop.toFixed(1), avg.avgRisk.toFixed(1), avg.avgScore.toFixed(1)]);

    autoTable(pdf, {
      startY: y,
      head: [[{content: toAscii(cat.label), styles:{halign:'left'}}, 'P', 'R', 'Skor']],
      body: body,
      theme: 'grid',
      styles: { 
        fontSize: 5.5, 
        cellPadding: 1, 
        lineColor: COLORS.lines, 
        lineWidth: 0.1, 
        textColor: COLORS.textGray,
        font: 'helvetica'
      },
      headStyles: { 
        fillColor: COLORS.secondary, 
        textColor: [255,255,255] as [number,number,number], 
        fontStyle: 'bold', 
        fontSize: 5.5, 
        cellPadding: 1.2,
        font: 'helvetica'
      },
      columnStyles: { 
        0: { cellWidth: 'auto', fontStyle:'bold' },
        1: { cellWidth: 6, halign:'center' },
        2: { cellWidth: 6, halign:'center' },
        3: { cellWidth: 7, halign:'center', fontStyle:'bold' }
      },
      margin: { left: x },
      tableWidth: colW,
      didParseCell: (hook) => {
        if (hook.section === 'body' && hook.column.index === 3) {
          const val = Number(hook.cell.raw);
          if (val > 0) {
            const c = scoreColor(val);
            const tc = scoreTextColor(val);
            hook.cell.styles.fillColor = c;
            hook.cell.styles.textColor = tc;
          }
        }
        if (hook.section === 'body' && hook.row.index === body.length - 1) {
          hook.cell.styles.fillColor = COLORS.headerBg;
          hook.cell.styles.fontStyle = 'bold';
        }
      }
    });
    return (pdf as any).lastAutoTable.finalY + 2;
  };

  let y1 = startY, y2 = startY, y3 = startY;
  col1Cats.forEach(c => { y1 = drawCat(c, x1, y1); });
  col2Cats.forEach(c => { y2 = drawCat(c, x2, y2); });
  col3Cats.forEach(c => { y3 = drawCat(c, x3, y3); });

  return Math.max(y1, y2, y3);
}

// Footer
function drawFooter(pdf: jsPDF, data: PestRiskPdfInput, W: number, H: number) {
  const footerY = H - 10;
  pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
  pdf.line(M, footerY, W - M, footerY);

  pdf.setFontSize(6);
  pdf.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
  
  pdf.text(toAscii('PestMentor System - Otomatik Risk Analiz Raporu'), M, footerY + 4);
  
  const centerText = toAscii(`Dokuman: ${data.documentNumber || '-'} | Rev: ${data.revisionNumber || '01'} | Tarih: ${data.revisionDate}`);
  pdf.text(centerText, W/2, footerY + 4, { align: 'center' });
  
  pdf.text('Sayfa 1 / 1', W - M, footerY + 4, { align: 'right' });
}

// Ana export
export async function generatePestRiskAssessmentPdf(data: PestRiskPdfInput) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  await drawHeader(pdf, W, data.companyLogo);
  
  let y = 24;
  y = drawCustomerInfo(pdf, data, y);
  
  y += 3;
  y = drawDefinitionsAndMatrix(pdf, y, W);
  
  y += 3;
  drawPestTables(pdf, data.pestData, y, W);
  
  drawFooter(pdf, data, W, H);

  const safeName = toAscii((data.customerName || 'Rapor').replace(/[^a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s]/g, '_').substring(0, 25));
  pdf.save(`Zararli_Risk_${safeName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}