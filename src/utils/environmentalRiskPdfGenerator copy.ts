// src/utils/environmentalRiskPdfGenerator.ts

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { PEST_ENV_ROWS, type EnvDataMap, calculateEnvScore, getEnvAverages } from '../data/environmentalRiskCategories';

export interface EnvRiskPdfInput {
  customer_name: string;
  customer_address: string;
  division: string;
  assessment_date: string;
  responsible_person: string;
  customer_responsible?: string;
  document_number?: string;
  revision_number?: string;
  revision_date?: string;
  riskData: EnvDataMap;
  companyLogo?: string | null;
  branding?: {
    company_name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
  };
}

const M = 10;

const COLORS: Record<string, [number, number, number]> = {
  primary: [255, 255, 255],
  secondary: [21, 128, 61],
  headerBg: [255, 255, 255],
  lines: [21, 128, 61],
  textMain: [20, 83, 45],
  textGray: [60, 60, 60],
};

// Türkçe karakterleri ASCII'ye dönüştür
function toAscii(text: string): string {
  if (!text) return '';
  const map: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C'
  };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, (match) => map[match] || match);
}

// Logo yükleme helper
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
        reject(new Error('Canvas context failed'));
      }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

// Header
async function drawHeader(pdf: jsPDF, W: number, data: EnvRiskPdfInput) {
  const logoUrl = data.companyLogo;
  const branding = data.branding;

  // Yeşil header arka planı (Çizgi şeklinde)
  pdf.setDrawColor(21, 128, 61);
  pdf.setLineWidth(0.5);
  pdf.line(M, 22, W - M, 22);

  // Logo
  let logoTrailingX = M;
  if (logoUrl) {
    try {
      const logoData = await loadImageAsDataUrl(logoUrl);
      const imgProps = pdf.getImageProperties(logoData);
      const ratio = imgProps.width / imgProps.height;
      let imgW = 40;
      let imgH = imgW / ratio;
      if (imgH > 18) { imgH = 18; imgW = imgH * ratio; }
      pdf.addImage(logoData, 'PNG', M, 3, imgW, imgH);
      logoTrailingX = M + imgW + 5;
    } catch (e) {
      console.warn('Logo yuklenemedi:', e);
    }
  }

  // Company Info (Right Side or Center depending on Logo)
  if (branding) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(20, 83, 45);
    pdf.text(toAscii(branding.company_name).toUpperCase(), W - M, 7, { align: 'right' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 100);
    pdf.text(toAscii(branding.address), W - M, 11, { align: 'right' });
    pdf.text(`${toAscii(branding.phone)} | ${toAscii(branding.email)}`, W - M, 15, { align: 'right' });
    if (branding.website) {
      pdf.text(toAscii(branding.website), W - M, 19, { align: 'right' });
    }
  }

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(21, 128, 61);
  const title = toAscii('CEVRE RISK DEGERLENDIRME RAPORU');
  pdf.text(title, logoTrailingX, 10);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Environmental Risk Assessment Report', logoTrailingX, 15);
}

// Müşteri Bilgileri Tablosu
function drawCustomerInfo(pdf: jsPDF, data: EnvRiskPdfInput, y: number): number {
  const c = toAscii(data.customer_name || '');
  const addr = toAscii(data.customer_address || '');
  const div = toAscii(data.division || '');
  const date = data.assessment_date || '';
  const resp = toAscii(data.responsible_person || '');
  const custResp = toAscii(data.customer_responsible || '');

  autoTable(pdf, {
    startY: y,
    body: [
      [toAscii('Musteri Adi'), c, toAscii('Bolum'), div, toAscii('PestMentor Sorumlusu'), resp],
      [toAscii('Adres'), addr, toAscii('Tarih'), date, toAscii('Musteri Sorumlusu'), custResp],
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
      0: { fontStyle: 'bold', cellWidth: 22, textColor: COLORS.textMain },
      1: { cellWidth: 48 },
      2: { fontStyle: 'bold', cellWidth: 18, textColor: COLORS.textMain },
      3: { cellWidth: 24 },
      4: { fontStyle: 'bold', cellWidth: 24, textColor: COLORS.textMain },
      5: { cellWidth: 'auto' },
    },
    margin: { left: M, right: M },
    theme: 'grid',
  });
  return (pdf as any).lastAutoTable.finalY;
}

// Legends
function drawLegends(pdf: jsPDF, startY: number, W: number): number {
  const contentW = W - (2 * M);
  const colW = (contentW - 4) / 2;
  const xLeft = M;
  const xRight = M + colW + 4;

  const tableStyles = {
    fontSize: 6,
    cellPadding: 1,
    lineColor: COLORS.lines,
    lineWidth: 0.1,
    textColor: COLORS.textGray,
    font: 'helvetica'
  };
  const headStyles = {
    fillColor: COLORS.secondary,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 6,
    font: 'helvetica'
  };
  const colStyles = {
    0: { cellWidth: 5, halign: 'center' as const, fontStyle: 'bold' as const },
    1: { cellWidth: 18, fontStyle: 'bold' as const }
  };

  let yLeft = startY;
  let yRight = startY;

  // Sol kolon
  pdf.setFontSize(7);
  pdf.setTextColor(0);
  pdf.setFont('helvetica', 'bold');

  pdf.text(toAscii('Zararli Populasyonu Durumu'), xLeft, yLeft);
  autoTable(pdf, {
    startY: yLeft + 2,
    head: [['#', 'Seviye', toAscii('Aciklama')]],
    body: [
      ['1', 'YOK', toAscii('Kayit yok / No records')],
      ['2', 'ORTA', 'Potansiyel / Potential'],
      ['3', toAscii('YUKSEK'), 'Mevcut / Present'],
    ],
    styles: tableStyles as any, headStyles: headStyles as any, columnStyles: colStyles as any, tableWidth: colW, margin: { left: xLeft }, theme: 'grid'
  });
  yLeft = (pdf as any).lastAutoTable.finalY + 3;

  pdf.text('Hijyen Durumu', xLeft, yLeft);
  autoTable(pdf, {
    startY: yLeft + 2,
    head: [['#', 'Seviye', toAscii('Aciklama')]],
    body: [
      ['1', 'YOK', toAscii('Beslenme kaynagi yok / No source')],
      ['2', 'ORTA', 'Beslenebilir / Can feed'],
      ['3', toAscii('YUKSEK'), toAscii('Beslenir ve urer / Feed+breed')],
    ],
    styles: tableStyles as any, headStyles: headStyles as any, columnStyles: colStyles as any, tableWidth: colW, margin: { left: xLeft }, theme: 'grid'
  });
  yLeft = (pdf as any).lastAutoTable.finalY + 3;

  pdf.text('Depolama Durumu', xLeft, yLeft);
  autoTable(pdf, {
    startY: yLeft + 2,
    head: [['#', 'Seviye', toAscii('Aciklama')]],
    body: [
      ['1', 'YOK', toAscii('Mesafe yeterli (>45cm)')],
      ['2', 'ORTA', toAscii('Mesafe yetersiz (<45cm)')],
      ['3', toAscii('YUKSEK'), 'Mesafe yok / No distance'],
    ],
    styles: tableStyles as any, headStyles: headStyles as any, columnStyles: colStyles as any, tableWidth: colW, margin: { left: xLeft }, theme: 'grid'
  });
  yLeft = (pdf as any).lastAutoTable.finalY;

  // Sağ kolon
  pdf.text(toAscii('Yalitim Durumu'), xRight, yRight);
  autoTable(pdf, {
    startY: yRight + 2,
    head: [['#', 'Seviye', toAscii('Aciklama')]],
    body: [
      ['1', 'YOK', toAscii('Giris yok / No entry')],
      ['2', 'ORTA', toAscii('Giris var / Entry exists')],
      ['3', toAscii('YUKSEK'), toAscii('Barinma alani / Shelter')],
    ],
    styles: tableStyles as any, headStyles: headStyles as any, columnStyles: colStyles as any, tableWidth: colW, margin: { left: xRight }, theme: 'grid'
  });
  yRight = (pdf as any).lastAutoTable.finalY + 3;

  pdf.text(toAscii('Gozlem Noktalari Durumu'), xRight, yRight);
  autoTable(pdf, {
    startY: yRight + 2,
    head: [['#', 'Seviye', toAscii('Aciklama')]],
    body: [
      ['1', 'YOK', 'Hepsi yerinde / All in place'],
      ['2', 'ORTA', toAscii('Kismen eksik / Partially missing')],
      ['3', toAscii('YUKSEK'), 'Sistem yok / No system'],
    ],
    styles: tableStyles as any, headStyles: headStyles as any, columnStyles: colStyles as any, tableWidth: colW, margin: { left: xRight }, theme: 'grid'
  });
  yRight = (pdf as any).lastAutoTable.finalY + 3;

  // Skor kutuları
  pdf.text('SKOR / SCORE', xRight, yRight);
  const scoreData = [
    { range: toAscii('1-6 DUSUK / LOW'), desc: toAscii('Dusuk olasilik'), bg: [220, 252, 231] },
    { range: '7-12 ORTA / MED', desc: toAscii('Orta olasilik'), bg: [254, 249, 195] },
    { range: toAscii('13-24 YUKSEK/ HIGH'), desc: toAscii('Yuksek olasilik'), bg: [254, 215, 170] },
    { range: toAscii('25+ COK YUKSEK / VHIGH'), desc: toAscii('Cok yuksek olasilik'), bg: [254, 202, 202] },
  ];

  let boxY = yRight + 2;
  scoreData.forEach(item => {
    pdf.setFillColor(item.bg[0], item.bg[1], item.bg[2]);
    pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
    pdf.rect(xRight, boxY, colW, 6, 'FD');

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0);
    pdf.text(item.range, xRight + 2, boxY + 2.5);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5);
    pdf.text(item.desc, xRight + 2, boxY + 5);
    boxY += 6.5;
  });

  return Math.max(yLeft, boxY);
}

// Ana Matris Tablosu
function drawMainMatrix(pdf: jsPDF, data: EnvDataMap, startY: number): number {
  const body = [];
  const avgs = getEnvAverages(data);

  PEST_ENV_ROWS.forEach(row => {
    const d = data[row.key] || { hygiene: 0, insulation: 0, storage: 0, monitoring: 0, population: 0 };
    const envTotal = d.hygiene + d.insulation + d.storage + d.monitoring;
    const score = calculateEnvScore(d);

    body.push([
      `${toAscii(row.label)}\n${row.labelEn}`,
      d.hygiene || '-',
      d.insulation || '-',
      d.storage || '-',
      d.monitoring || '-',
      envTotal || '-',
      d.population || '-',
      score || '-',
    ]);
  });

  // Ortalama satırı
  const avgEnvTotal = (
    parseFloat(avgs.avgH) +
    parseFloat(avgs.avgI) +
    parseFloat(avgs.avgS) +
    parseFloat(avgs.avgM)
  ).toFixed(1);

  body.push([
    'ORTALAMA / AVERAGE',
    avgs.avgH, avgs.avgI, avgs.avgS, avgs.avgM,
    avgEnvTotal,
    avgs.avgP,
    avgs.avgScore
  ]);

  autoTable(pdf, {
    startY: startY,
    head: [[
      toAscii('Zararli Turu / Pest Type'),
      'Hijyen\nHygiene',
      toAscii('Yalitim\nInsulation'),
      'Depolama\nStorage',
      toAscii('Gozlem\nMonitor'),
      toAscii('Cevre Top.\nEnv. Total'),
      'Pop.\nPop.',
      'Skor\nScore'
    ]],
    body: body,
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      lineColor: COLORS.lines,
      lineWidth: 0.1,
      textColor: COLORS.textGray,
      halign: 'center',
      valign: 'middle',
      font: 'helvetica'
    },
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 6.5,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 36, halign: 'left', fontStyle: 'bold' },
      5: { fontStyle: 'bold', fillColor: COLORS.headerBg },
      6: { fontStyle: 'bold' },
      7: { fontStyle: 'bold' }
    },
    margin: { left: M, right: M },
    didParseCell: (hook) => {
      // Skor renklendirme
      if (hook.section === 'body' && hook.column.index === 7) {
        const val = Number(hook.cell.raw);
        if (val > 0) {
          let bg: [number, number, number];
          if (val <= 6) bg = [220, 252, 231];
          else if (val <= 12) bg = [254, 249, 195];
          else if (val <= 24) bg = [254, 215, 170];
          else bg = [254, 202, 202];

          hook.cell.styles.fillColor = bg;
          hook.cell.styles.textColor = [0, 0, 0];
        }
      }
      // Ortalama satırı
      if (hook.section === 'body' && hook.row.index === body.length - 1) {
        hook.cell.styles.fillColor = COLORS.headerBg;
        hook.cell.styles.fontStyle = 'bold';
      }
    }
  });

  return (pdf as any).lastAutoTable.finalY || startY;
}

// Footer notları
function drawFooterNotes(pdf: jsPDF, startY: number, W: number, data: EnvRiskPdfInput) {
  const note3 = toAscii("NOTLAR: Detayli Risk Analizi Aciklamasi dokumaninda yer almaktadir.");

  let y = startY + 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(20, 83, 45);
  pdf.text(note3, M, y);

  // Footer Branding
  const footerY = pdf.internal.pageSize.getHeight() - 15;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.2);
  pdf.line(M, footerY - 5, W - M, footerY - 5);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  if (data.branding) {
    pdf.text(toAscii(data.branding.company_name), M, footerY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${toAscii(data.branding.phone)} | ${toAscii(data.branding.email)}`, M, footerY + 4);
    if (data.branding.website) pdf.text(toAscii(data.branding.website), M, footerY + 8);
  }

  pdf.setFontSize(6);
  pdf.setTextColor(150, 150, 150);
  const meta = toAscii(`Dokuman: ${data.document_number || '-'} | Rev: ${data.revision_number || '01'} | Tarih: ${data.revision_date || format(new Date(), 'dd.MM.yyyy')}`);
  pdf.text(meta, W - M, footerY, { align: 'right' });
  pdf.text(`Sayfa 1 / 1`, W - M, footerY + 4, { align: 'right' });
}

// Ana export fonksiyonu
export async function generateEnvironmentalRiskAssessmentPdf(data: EnvRiskPdfInput) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();

  // 1. Header (await logo yükleme)
  await drawHeader(pdf, W, data);

  // 2. Customer Info
  let y = 22;
  y = drawCustomerInfo(pdf, data, y);

  // 3. Legends
  y += 3;
  y = drawLegends(pdf, y, W);

  // 4. Main Matrix
  y += 3;
  y = drawMainMatrix(pdf, data.riskData, y);

  // 5. Footer notes
  drawFooterNotes(pdf, y, W, data);

  const safeName = toAscii((data.customer_name || 'Rapor').replace(/[^a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s]/g, '_').substring(0, 25));
  pdf.save(`Cevre_Risk_${safeName}.pdf`);
}