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
}

const M = 8;

function scoreColor(score: number): [number, number, number] {
  if (score === 0) return [255, 255, 255];
  if (score <= 7) return [198, 239, 206];
  if (score <= 14) return [255, 235, 156];
  return [255, 199, 206];
}

function scoreTextColor(score: number): [number, number, number] {
  if (score === 0) return [180, 180, 180];
  if (score <= 7) return [0, 97, 0];
  if (score <= 14) return [156, 101, 0];
  return [156, 0, 6];
}

function drawHeader(pdf: jsPDF, W: number) {
  pdf.setFillColor(139, 90, 43);
  pdf.rect(0, 0, W, 15, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text('7.2. Zararli Kontrolu Risk Degerlendirme Formu - Zararli', M, 6.5);

  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Pest Control Risk Assessment Form - Pest', M, 11);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('PestMentor', W - M, 7, { align: 'right' });
  pdf.setFontSize(5.5);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Pest Control', W - M, 11, { align: 'right' });
}

function drawCustomerInfo(pdf: jsPDF, data: PestRiskPdfInput, y: number): number {
  autoTable(pdf, {
    startY: y,
    body: [
      [
        '7.2.1. Musteri Adi',
        data.customerName || '-',
        '7.2.3. Bolum / Division',
        data.division || '-',
        '7.2.5. Sorumlu ve Imza',
        data.responsiblePerson || '-',
      ],
      [
        '7.2.2. Musteri Adresi',
        data.customerAddress || '-',
        '7.2.4. Tarih / Date',
        data.assessmentDate || '-',
        '7.2.6. Musteri Sorumlusu',
        data.customerResponsible || '-',
      ],
    ],
    styles: { fontSize: 5, cellPadding: 1.5, lineColor: [180, 140, 80], lineWidth: 0.2, textColor: [60, 40, 20] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, fillColor: [255, 248, 230] },
      1: { cellWidth: 34 },
      2: { fontStyle: 'bold', cellWidth: 28, fillColor: [255, 248, 230] },
      3: { cellWidth: 28 },
      4: { fontStyle: 'bold', cellWidth: 28, fillColor: [255, 248, 230] },
      5: { cellWidth: 'auto' },
    },
    margin: { left: M, right: M },
    theme: 'grid',
  });
  return (pdf as any).lastAutoTable.finalY;
}

function drawLegends(pdf: jsPDF, y: number, W: number): number {
  const halfW = (W - 2 * M - 4) / 2;

  const popLevels = [
    ['1', 'YOK', 'Zararlilar ile karsilasilmadi.'],
    ['2', 'DUSUK', 'Zararli ile karsilasilma olasiligi dusuktur.'],
    ['3', 'ORTA', 'Zararlilar son 1-3 yilda potansiyel olarak meydana gelebilir.'],
    ['4', 'YUKSEK', 'Zararlilar 1-3 yil icinde gelecekte meydana gelebilir.'],
    ['5', 'COK YUKSEK', 'Zararlilar mevcut veya meydana gelme olasiligi cok yuksektir.'],
  ];

  const riskLevels = [
    ['1', 'YOK', 'Zararlinin urune bulasmada riski yoktur.'],
    ['2', 'DUSUK', 'Zararlinin urune bulasmada dusuk olasiligi vardir.'],
    ['3', 'ORTA', 'Zararlinin urune bulasmada orta derecede olasiligi vardir.'],
    ['4', 'YUKSEK', 'Zararlinin urune bulasmada yuksek derecede olasiligi vardir.'],
    ['5', 'COK YUKSEK', 'Zararlinin urune bulasmada cok yuksek derecede olasiligi vardir.'],
  ];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6);
  pdf.setTextColor(80, 50, 20);
  pdf.text('Zararli Populasyon Durumu / Pests Population Status', M, y);

  autoTable(pdf, {
    startY: y + 1.5,
    head: [['#', 'Seviye', 'Aciklama']],
    body: popLevels,
    styles: { fontSize: 4.5, cellPadding: 1, lineColor: [200, 170, 120], lineWidth: 0.15, textColor: [60, 40, 20] },
    headStyles: { fillColor: [255, 248, 230], textColor: [100, 70, 30], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 5, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 14, fontStyle: 'bold' },
      2: { cellWidth: halfW - 19 },
    },
    margin: { left: M, right: W - M - halfW },
    theme: 'grid',
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6);
  pdf.setTextColor(80, 50, 20);
  pdf.text('Zararli Risk Dereceleri / Pests Risk Levels', M + halfW + 4, y);

  autoTable(pdf, {
    startY: y + 1.5,
    head: [['#', 'Seviye', 'Aciklama']],
    body: riskLevels,
    styles: { fontSize: 4.5, cellPadding: 1, lineColor: [200, 170, 120], lineWidth: 0.15, textColor: [60, 40, 20] },
    headStyles: { fillColor: [255, 248, 230], textColor: [100, 70, 30], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 5, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 14, fontStyle: 'bold' },
      2: { cellWidth: halfW - 19 },
    },
    margin: { left: M + halfW + 4, right: M },
    theme: 'grid',
  });

  return (pdf as any).lastAutoTable.finalY;
}

function drawRiskMatrix(pdf: jsPDF, y: number): number {
  const startX = M;
  const cellSize = 8;
  const headerW = 18;
  const labels = ['1 YOK', '2 DUSUK', '3 ORTA', '4 YUKSEK', '5 C.YUKSEK'];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6);
  pdf.setTextColor(80, 50, 20);
  pdf.text('Zararli Risk Dereceleri / Pest Risk Levels', startX + headerW + 2, y - 1);

  pdf.setFontSize(4);
  pdf.setTextColor(80, 50, 20);
  for (let c = 0; c < 5; c++) {
    const cx = startX + headerW + c * cellSize;
    pdf.setFillColor(255, 248, 230);
    pdf.rect(cx, y, cellSize, 5, 'FD');
    pdf.text(labels[c], cx + cellSize / 2, y + 3.2, { align: 'center' });
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(5);
  pdf.setTextColor(80, 50, 20);
  pdf.text('Risk Matriksi', startX, y + 1);
  pdf.setFontSize(3.5);
  pdf.text('(Gerceklesme Skoru)', startX, y + 3.5);

  const matrixStartY = y + 5;
  for (let r = 0; r < 5; r++) {
    const ry = matrixStartY + r * cellSize;
    pdf.setFillColor(255, 248, 230);
    pdf.setDrawColor(200, 170, 120);
    pdf.rect(startX, ry, headerW, cellSize, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(4);
    pdf.setTextColor(80, 50, 20);
    pdf.text(labels[r], startX + 1, ry + cellSize / 2 + 1);

    for (let c = 0; c < 5; c++) {
      const cx = startX + headerW + c * cellSize;
      const score = (r + 1) * (c + 1);
      const bg = scoreColor(score);
      pdf.setFillColor(bg[0], bg[1], bg[2]);
      pdf.setDrawColor(200, 170, 120);
      pdf.rect(cx, ry, cellSize, cellSize, 'FD');

      if (score > 0) {
        const tc = scoreTextColor(score);
        pdf.setTextColor(tc[0], tc[1], tc[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6);
        pdf.text(String(score), cx + cellSize / 2, ry + cellSize / 2 + 1.5, { align: 'center' });
      }
    }
  }

  return matrixStartY + 5 * cellSize;
}

function drawScoreInterpretation(pdf: jsPDF, y: number, W: number): number {
  const interpretations = [
    { range: '1-7 YOK / LOW', color: [198, 239, 206] as [number, number, number], text: 'Zararli turu ve yogunlugu urunde herhangi bir kirlilige yol acmaz.' },
    { range: '8-14 ORTA / MEDIUM', color: [255, 235, 156] as [number, number, number], text: 'Zararli turu ve yogunlugu rutin onlemlerle kirlilige neden olmaz. Capraz bulasmalar kontrol edilmelidir.' },
    { range: '15-25 YUKSEK / HIGH', color: [255, 199, 206] as [number, number, number], text: 'Ilave kontroller, ucuncu goz denetimler, hijyen, yalitim, depolama planlarinin revizyonu gibi onlemler alinmalidir.' },
  ];

  const startX = M + 18 + 5 * 8 + 6;

  for (let i = 0; i < interpretations.length; i++) {
    const iy = y + i * 8;
    const item = interpretations[i];

    pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
    pdf.setDrawColor(200, 170, 120);
    pdf.rect(startX, iy, W - M - startX, 7, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(5);
    pdf.setTextColor(60, 40, 20);
    pdf.text(item.range, startX + 2, iy + 3);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(4);
    pdf.setTextColor(80, 60, 30);
    const lines = pdf.splitTextToSize(item.text, W - M - startX - 4);
    pdf.text(lines, startX + 2, iy + 5.5);
  }

  return y + 3 * 8 + 2;
}

function drawPestCategoryTable(
  pdf: jsPDF,
  category: PestCategory,
  catData: Record<string, { pop: number; risk: number }> | undefined,
  startX: number,
  startY: number,
  tableWidth: number,
): number {
  const body: any[][] = [];
  for (const pest of category.pests) {
    const d = catData?.[pest.key] || { pop: 0, risk: 0 };
    const score = getRiskScore(d.pop, d.risk);
    body.push([
      `${pest.label}\n${pest.labelEn}`,
      d.pop || '',
      d.risk || '',
      score || '',
    ]);
  }

  const avg = getCategoryAverage(catData);
  body.push([
    'Ortalama\nAverage',
    avg.avgPop ? avg.avgPop.toFixed(1) : '',
    avg.avgRisk ? avg.avgRisk.toFixed(1) : '',
    avg.avgScore ? avg.avgScore.toFixed(1) : '',
  ]);

  autoTable(pdf, {
    startY,
    head: [[
      { content: `${category.label}\n${category.labelEn}`, styles: { halign: 'left' as const } },
      { content: 'Pop.\nDu', styles: { halign: 'center' as const } },
      { content: 'Risk\nDer', styles: { halign: 'center' as const } },
      { content: 'Risk\nMat.', styles: { halign: 'center' as const } },
    ]],
    body,
    styles: {
      fontSize: 4.5,
      cellPadding: 1,
      lineColor: [180, 140, 80],
      lineWidth: 0.15,
      textColor: [60, 40, 20],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [139, 90, 43],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 4.5,
    },
    columnStyles: {
      0: { cellWidth: tableWidth - 27, fontStyle: 'bold' },
      1: { cellWidth: 9, halign: 'center' },
      2: { cellWidth: 9, halign: 'center' },
      3: { cellWidth: 9, halign: 'center' },
    },
    margin: { left: startX, right: 210 - startX - tableWidth },
    theme: 'grid',
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index === 3) {
        const val = Number(hookData.cell.raw);
        if (val > 0) {
          const bg = scoreColor(val);
          const tc = scoreTextColor(val);
          hookData.cell.styles.fillColor = bg;
          hookData.cell.styles.textColor = tc;
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
      if (hookData.section === 'body' && hookData.row.index === body.length - 1) {
        hookData.cell.styles.fillColor = [245, 240, 230];
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fontSize = 4;
      }
    },
  });

  return (pdf as any).lastAutoTable.finalY;
}

function drawFooter(pdf: jsPDF, data: PestRiskPdfInput, W: number, H: number) {
  const footerY = H - 10;
  pdf.setDrawColor(200, 170, 120);
  pdf.line(M, footerY, W - M, footerY);

  pdf.setFontSize(4.5);
  pdf.setTextColor(150, 130, 100);
  pdf.setFont('helvetica', 'normal');
  pdf.text('PestMentor - Zararli Kontrolu Risk Degerlendirme Raporu', M, footerY + 3.5);

  pdf.text(
    `Dokuman No: ${data.documentNumber || '-'}  |  Revizyon: ${data.revisionNumber || '-'}  |  Tarih: ${data.revisionDate || '-'}`,
    W / 2,
    footerY + 3.5,
    { align: 'center' },
  );

  const pageCount = (pdf as any).internal.getNumberOfPages();
  pdf.text(`Sayfa ${pdf.getCurrentPageInfo().pageNumber} / ${pageCount}`, W - M, footerY + 3.5, { align: 'right' });
}

export function generatePestRiskAssessmentPdf(data: PestRiskPdfInput) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  drawHeader(pdf, W);

  let y = drawCustomerInfo(pdf, data, 18);
  y += 3;

  y = drawLegends(pdf, y, W);
  y += 3;

  const matrixEndY = drawRiskMatrix(pdf, y);
  drawScoreInterpretation(pdf, y + 2, W);
  y = Math.max(matrixEndY, y + 26) + 4;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(139, 90, 43);
  pdf.text('Risk Matriksi (Gerceklesme Skoru) / Risk Matrix (Realization Score)', M, y);
  y += 3;

  const colW = 62;
  const gap = 3;
  const col1X = M;
  const col2X = M + colW + gap;
  const col3X = M + 2 * (colW + gap);

  const col1Cats = [PEST_CATEGORIES[0], PEST_CATEGORIES[1], PEST_CATEGORIES[2]];
  const col2Cats = [PEST_CATEGORIES[3], PEST_CATEGORIES[4]];
  const col3Cats = [PEST_CATEGORIES[5], PEST_CATEGORIES[6]];

  let col1Y = y;
  for (const cat of col1Cats) {
    col1Y = drawPestCategoryTable(pdf, cat, data.pestData[cat.key], col1X, col1Y, colW);
    col1Y += 2;
  }

  let col2Y = y;
  for (const cat of col2Cats) {
    col2Y = drawPestCategoryTable(pdf, cat, data.pestData[cat.key], col2X, col2Y, colW);
    col2Y += 2;
  }

  let col3Y = y;
  for (const cat of col3Cats) {
    col3Y = drawPestCategoryTable(pdf, cat, data.pestData[cat.key], col3X, col3Y, colW);
    col3Y += 2;
  }

  drawFooter(pdf, data, W, H);

  const customerSafe = (data.customerName || 'Rapor').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  pdf.save(`Risk_Degerlendirme_${customerSafe}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
