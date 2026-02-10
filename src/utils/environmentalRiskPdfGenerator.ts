// Dosya: src/utils/environmentalRiskPdfGenerator.ts

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import {
  PEST_ENV_ROWS,
  type EnvDataMap,
  calculateEnvScore,
  getEnvRiskColor,
  getEnvAverages
} from '../data/environmentalRiskCategories';

export interface EnvRiskPdfInput {
  customerName: string;
  customerAddress: string;
  division: string;
  assessmentDate: string;
  responsiblePerson: string;
  customerResponsible: string;
  documentNumber: string;
  revisionNumber: string;
  revisionDate: string;
  riskData: EnvDataMap;
  companyLogo?: string | null;
}

const M = 10; // Margin

// Renkler
const COLORS = {
  primary: [22, 163, 74] as [number, number, number],    // Green-600
  secondary: [21, 128, 61] as [number, number, number],  // Green-700
  headerBg: [254, 252, 232] as [number, number, number], // Krem/Sarı (İstek üzerine)
  lines: [202, 138, 4] as [number, number, number],      // Yellow-600 (Çizgiler)
  textMain: [20, 83, 45] as [number, number, number],
  textGray: [60, 60, 60] as [number, number, number],
};

const tr = (text: string | null | undefined): string => {
  if (!text) return '';
  const map: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
  };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, (match) => map[match]);
};

// --- HEADER ---
function drawHeader(pdf: jsPDF, W: number, logoUrl?: string | null) {
  // Arkaplan
  pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  pdf.rect(0, 0, W, 18, 'F');

  // Logo
  if (logoUrl) {
    try {
      const imgProps = pdf.getImageProperties(logoUrl);
      const ratio = imgProps.width / imgProps.height;
      let imgW = 30, imgH = 30 / ratio;
      if (imgH > 14) { imgH = 14; imgW = 14 * ratio; }
      pdf.addImage(logoUrl, 'PNG', M, 2, imgW, imgH);
    } catch (e) {}
  }

  const textX = logoUrl ? M + 40 : M;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(255, 255, 255);
  pdf.text(tr('ZARARLI KONTROLU RİSK DEĞERLENDİRME FORMU - ÇEVRE'), textX, 8);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Pest Control Risk Assessment Form - Environment', textX, 13);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('', W - M, 8, { align: 'right' });
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('', W - M, 13, { align: 'right' });
}

// --- INFO BOX (Sarı Arkaplanlı) ---
function drawCustomerInfo(pdf: jsPDF, data: EnvRiskPdfInput, y: number): number {
  autoTable(pdf, {
    startY: y,
    body: [
      ['7.3.1. ' + tr('Musteri Adi'), tr(data.customerName), '7.3.3. ' + tr('Bolum'), tr(data.division), '7.3.5. ' + tr('PestMentor Sor.'), tr(data.responsiblePerson)],
      ['7.3.2. ' + tr('Adres'), tr(data.customerAddress), '7.3.4. ' + tr('Tarih'), data.assessmentDate, '7.3.6. ' + tr('Mus. Sor.'), tr(data.customerResponsible)],
    ],
    styles: { fontSize: 6, cellPadding: 1.5, lineColor: COLORS.lines, lineWidth: 0.1, textColor: COLORS.textGray },
    // Krem/Sarı arka plan isteği:
    bodyStyles: { fillColor: COLORS.headerBg }, 
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22, textColor: COLORS.textMain },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', cellWidth: 18, textColor: COLORS.textMain },
      3: { cellWidth: 25 },
      4: { fontStyle: 'bold', cellWidth: 22, textColor: COLORS.textMain },
      5: { cellWidth: 'auto' },
    },
    margin: { left: M, right: M },
    theme: 'grid',
  });
  return (pdf as any).lastAutoTable.finalY;
}

// --- LEGENDS (Tanımlar) ---
function drawLegends(pdf: jsPDF, startY: number, W: number): number {
  const contentW = W - (2 * M);
  const colW = (contentW - 4) / 2; // İki kolon
  const xLeft = M;
  const xRight = M + colW + 4;

  const tableStyles = { fontSize: 5, cellPadding: 0.8, lineColor: COLORS.lines, lineWidth: 0.1, textColor: COLORS.textGray };
  const headStyles = { fillColor: COLORS.secondary, textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const, fontSize: 5 };
  const colStyles = { 0: { cellWidth: 4, halign:'center' as const, fontStyle:'bold' as const}, 1: { cellWidth: 15, fontStyle:'bold' as const } };

  let yLeft = startY;
  let yRight = startY;

  // --- SOL SÜTUN TABLOLARI ---

  // 1. Zararlı Popülasyonu
  pdf.setFontSize(6); pdf.setTextColor(0); pdf.setFont('helvetica', 'bold');
  pdf.text(tr('Zararli Populasyonu Durumu'), xLeft, yLeft);
  autoTable(pdf, {
    startY: yLeft + 2,
    head: [['#', tr('Seviye'), tr('Aciklama')]],
    body: [
      ['1', 'YOK', tr('Kayit yok. / No pests records.')],
      ['2', 'ORTA', tr('Potansiyel veya gelen zararli. / Potential incoming.')],
      ['3', 'YUKSEK', tr('Mevcut veya olasilik cok yuksek. / Present or high probability.')],
    ],
    styles: tableStyles, headStyles, columnStyles: colStyles, tableWidth: colW, margin: { left: xLeft }, theme: 'grid'
  });
  yLeft = (pdf as any).lastAutoTable.finalY + 3;

  // 2. Hijyen Durumu
  pdf.text(tr('Hijyen Durumu'), xLeft, yLeft);
  autoTable(pdf, {
    startY: yLeft + 2,
    head: [['#', tr('Seviye'), tr('Aciklama')]],
    body: [
      ['1', 'YOK', tr('Beslenme kaynagi yok. / No feeding source.')],
      ['2', 'ORTA', tr('Beslenebilir ama ureyemez. / Can feed but not breed.')],
      ['3', 'YUKSEK', tr('Beslenir ve urer. / Feed and breed.')],
    ],
    styles: tableStyles, headStyles, columnStyles: colStyles, tableWidth: colW, margin: { left: xLeft }, theme: 'grid'
  });
  yLeft = (pdf as any).lastAutoTable.finalY + 3;

  // 3. Depolama Durumu
  pdf.text(tr('Depolama Durumu'), xLeft, yLeft);
  autoTable(pdf, {
    startY: yLeft + 2,
    head: [['#', tr('Seviye'), tr('Aciklama')]],
    body: [
      ['1', 'YOK', tr('Mesafe yeterli (min 45cm). / Sufficient distance.')],
      ['2', 'ORTA', tr('Mesafe var ama yetersiz (<45cm). / Insufficient distance.')],
      ['3', 'YUKSEK', tr('Mesafe yok. / No distance.')],
    ],
    styles: tableStyles, headStyles, columnStyles: colStyles, tableWidth: colW, margin: { left: xLeft }, theme: 'grid'
  });
  yLeft = (pdf as any).lastAutoTable.finalY;

  // --- SAĞ SÜTUN TABLOLARI ---

  // 4. Yalıtım Durumu
  pdf.text(tr('Yalitim Durumu'), xRight, yRight);
  autoTable(pdf, {
    startY: yRight + 2,
    head: [['#', tr('Seviye'), tr('Aciklama')]],
    body: [
      ['1', 'YOK', tr('Giris bolgeleri yok. / No entry gaps.')],
      ['2', 'ORTA', tr('Giris bolgeleri mevcut. / Entry gaps exist.')],
      ['3', 'YUKSEK', tr('Barinma alanlari mevcut. / Shelter areas exist.')],
    ],
    styles: tableStyles, headStyles, columnStyles: colStyles, tableWidth: colW, margin: { left: xRight }, theme: 'grid'
  });
  yRight = (pdf as any).lastAutoTable.finalY + 3;

  // 5. Gözlem Noktaları
  pdf.text(tr('Gozlem Noktalari Durumu'), xRight, yRight);
  autoTable(pdf, {
    startY: yRight + 2,
    head: [['#', tr('Seviye'), tr('Aciklama')]],
    body: [
      ['1', 'YOK', tr('Hepsi yerinde ve uygun. / All in place.')],
      ['2', 'ORTA', tr('Kismen eksik veya hatali. / Some missing/error.')],
      ['3', 'YUKSEK', tr('Sistem bulunmuyor. / No system.')],
    ],
    styles: tableStyles, headStyles, columnStyles: colStyles, tableWidth: colW, margin: { left: xRight }, theme: 'grid'
  });
  yRight = (pdf as any).lastAutoTable.finalY + 3;

  // 6. Skor Tablosu
  pdf.text('SKOR / SCORE', xRight, yRight);
  const scoreData = [
    { range: '1-16 YOK / NO', desc: tr('Dusuk olasilik. / Low probability.'), bg: [220, 252, 231] },
    { range: '17-27 ORTA / MED', desc: tr('Orta derecede olasilik. / Medium prob.'), bg: [254, 249, 195] },
    { range: '28-36 YUKSEK / HIGH', desc: tr('Yuksek derecede olasilik. / High prob.'), bg: [254, 202, 202] },
  ];

  let boxY = yRight + 2;
  scoreData.forEach(item => {
    pdf.setFillColor(item.bg[0], item.bg[1], item.bg[2] as number);
    pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
    pdf.rect(xRight, boxY, colW, 8, 'FD');
    
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0);
    pdf.text(item.range, xRight + 2, boxY + 3);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(item.desc, xRight + 2, boxY + 6);
    boxY += 9;
  });

  return Math.max(yLeft, boxY);
}

// --- MAIN MATRIX TABLE ---
function drawMainMatrix(pdf: jsPDF, data: EnvDataMap, startY: number): number {
  const body = [];
  const avgs = getEnvAverages(data);

  // Satırları oluştur
  PEST_ENV_ROWS.forEach(row => {
    const d = data[row.key];
    const envTotal = d.hygiene + d.insulation + d.storage + d.monitoring;
    const score = calculateEnvScore(d);
    
    body.push([
      tr(row.label) + '\n' + row.labelEn, // Zararlı Türü
      d.hygiene || '-', // Hijyen
      d.insulation || '-', // Yalıtım
      d.storage || '-', // Depolama
      d.monitoring || '-', // Gözlem
      envTotal || '-', // Çevre Toplamı
      d.population || '-', // Popülasyon
      score || '-', // Skor
    ]);
  });

  // Ortalama Satırı
  body.push([
    tr('ORTALAMA / AVERAGE'),
    avgs.avgH, avgs.avgI, avgs.avgS, avgs.avgM,
    (avgs.avgH + avgs.avgI + avgs.avgS + avgs.avgM).toFixed(1), // Çevre Toplam Ort.
    avgs.avgP,
    avgs.avgScore
  ]);

  autoTable(pdf, {
    startY: startY,
    head: [[
      tr('Zararli Turu / Pest Type'),
      tr('Hijyen\nHygien'),
      tr('Yalitim\nProfiling'),
      tr('Depolama\nStorage'),
      tr('Gozlem Nok.\nMonitoring'),
      tr('Cevre Sartlari Top.\nEnv. Total'),
      tr('Zararli Pop.\nPopulation'),
      tr('Skor\nScore')
    ]],
    body: body,
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 2, lineColor: COLORS.lines, lineWidth: 0.1, textColor: COLORS.textGray, halign: 'center', valign: 'middle' },
    headStyles: { fillColor: COLORS.secondary, textColor: [255,255,255], fontStyle: 'bold', fontSize: 6 },
    columnStyles: { 
      0: { cellWidth: 35, halign: 'left', fontStyle: 'bold' }, // İsim
      5: { fontStyle: 'bold', fillColor: COLORS.headerBg }, // Env Total
      6: { fontStyle: 'bold' }, // Pop
      7: { fontStyle: 'bold' } // Skor
    },
    margin: { left: M, right: M },
    didParseCell: (hook) => {
      // Renklendirme (Skor Sütunu - Index 7)
      if (hook.section === 'body' && hook.column.index === 7) {
        const val = Number(hook.cell.raw);
        if (val > 0) {
          let bg;
          if (val <= 16) bg = [220, 252, 231]; // Yeşil
          else if (val <= 27) bg = [254, 249, 195]; // Sarı
          else bg = [254, 202, 202]; // Kırmızı
          
          hook.cell.styles.fillColor = bg as [number, number, number];
          hook.cell.styles.textColor = [0, 0, 0];
        }
      }
      // Ortalama Satırı Stil
      if (hook.section === 'body' && hook.row.index === body.length - 1) {
        hook.cell.styles.fillColor = COLORS.headerBg;
        hook.cell.styles.fontStyle = 'bold';
      }
    }
  });

  return (pdf as any).lastAutoTable.finalY;
}

// --- FOOTER NOTES ---
function drawFooterNotes(pdf: jsPDF, startY: number, W: number) {
  const contentW = W - (2 * M);
  
  pdf.setFontSize(5);
  pdf.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
  pdf.setFont('helvetica', 'normal');

  const note1 = tr("Risk analizleri inceleme, denetleme ve ucuncu goz denetimi asamalarinda uygulanabilirliginin kurali tek basina yararli bir analiz metodu degildir. Diger Metodolojilere basvurma yapisi olarak bu analizde bu sistem toplamlari (formul) kullanilmistir. Sonuc olarak risk analizi teke analizin kurulun teskil ederek onayini almaktadir.");
  const note2 = "Formula: Total of subjects related to environmental conditions X Population Conditions = Score. It is used as a preliminary data for other types of analyses.";
  const note3 = tr("NOTLAR: Risk Analizi Aciklamasi dokumaninda yer almaktadir.");

  let y = startY + 5;
  const lines1 = pdf.splitTextToSize(note1, contentW);
  pdf.text(lines1, M, y);
  y += (lines1.length * 2) + 2;

  const lines2 = pdf.splitTextToSize(note2, contentW);
  pdf.text(lines2, M, y);
  y += (lines2.length * 2) + 2;

  pdf.setFont('helvetica', 'bold');
  pdf.text(note3, M, y);
}

// --- ANA EXPORT FONKSİYONU ---
export function generateEnvironmentalRiskAssessmentPdf(data: EnvRiskPdfInput) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();
  
  // 1. Header
  drawHeader(pdf, W, data.companyLogo);
  
  // 2. Info
  let y = 20;
  y = drawCustomerInfo(pdf, data, y);
  
  // 3. Legends
  y += 4;
  y = drawLegends(pdf, y, W);
  
  // 4. Main Matrix
  y += 4;
  y = drawMainMatrix(pdf, data.riskData, y);
  
  // 5. Notes
  drawFooterNotes(pdf, y, W);

  const safeName = (data.customerName || 'Rapor').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
  pdf.save(`Cevre_Risk_${safeName}.pdf`);
}