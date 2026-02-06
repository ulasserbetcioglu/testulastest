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
}

// --- AYARLAR ---
const M = 8; // Margin (Kenar boşluğu) - Biraz daha daralttık yer kazanmak için
const PAGE_H = 297; // A4 Yükseklik

// --- RENKLER (PestMentor Kurumsal) ---
const COLORS = {
  primary: [22, 163, 74] as [number, number, number],     // Green-600
  secondary: [21, 128, 61] as [number, number, number],   // Green-700
  headerBg: [240, 253, 244] as [number, number, number],  // Green-50
  lines: [187, 247, 208] as [number, number, number],     // Green-200
  textMain: [20, 83, 45] as [number, number, number],     // Green-950
  textGray: [80, 80, 80] as [number, number, number],     // Gri
};

// --- TÜRKÇE KARAKTER DÜZELTME ---
const tr = (text: string | null | undefined): string => {
  if (!text) return '';
  const map: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
  };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, (match) => map[match]);
};

// --- SKOR RENKLERİ ---
function scoreColor(score: number): [number, number, number] {
  if (score === 0) return [255, 255, 255];
  if (score <= 7) return [220, 252, 231]; // Yeşil
  if (score <= 14) return [254, 249, 195]; // Sarı
  return [254, 202, 202]; // Kırmızı
}

function scoreTextColor(score: number): [number, number, number] {
  if (score === 0) return [200, 200, 200];
  if (score <= 7) return [21, 128, 61];
  if (score <= 14) return [161, 98, 7];
  return [153, 27, 27];
}

// --- 1. HEADER (Logo Orantılama Düzeltildi) ---
function drawHeader(pdf: jsPDF, W: number, logoUrl?: string | null) {
  // Arkaplan
  pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  pdf.rect(0, 0, W, 18, 'F'); // Yüksekliği 18mm'e çektik

  // Logo İşleme
  if (logoUrl) {
    try {
      // Logoyu belirli bir kutuya (30x14mm) sığdırıyoruz ama aspect ratio bozulmasın diye
      // jsPDF'in otomatik scaling özelliğini kullanmak yerine manuel boyut veriyoruz.
      // Not: Base64 geliyorsa dimensions'ı bilmek zordur, bu yüzden sabit kutu veriyoruz.
      // Görüntü bozuluyorsa genelde width/height oranı tutmuyordur.
      // Burada 35mm genişlik, 14mm yükseklik ayırdık.
      const imgProps = pdf.getImageProperties(logoUrl);
      const ratio = imgProps.width / imgProps.height;
      let imgW = 30;
      let imgH = 30 / ratio;
      
      if (imgH > 14) {
        imgH = 14;
        imgW = 14 * ratio;
      }
      
      pdf.addImage(logoUrl, 'PNG', M, 2, imgW, imgH);
    } catch (e) {
      // Fallback: Eğer oran hesaplanamazsa sabit kutu
      try {
          pdf.addImage(logoUrl!, 'PNG', M, 2, 25, 14);
      } catch(err) { console.warn('Logo error'); }
    }
  }

  // Başlıklar
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(255, 255, 255);
  const textX = logoUrl ? M + 35 : M;
  
  pdf.text(tr('ZARARLI RISK DEGERLENDIRME FORMU'), textX, 8);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Pest Control Risk Assessment Form', textX, 12);

  // Sağ Üst Bilgi
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('PestMentor', W - M, 8, { align: 'right' });
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Integrated Pest Management', W - M, 12, { align: 'right' });
}

// --- 2. MÜŞTERİ BİLGİLERİ (Compact) ---
function drawCustomerInfo(pdf: jsPDF, data: PestRiskPdfInput, y: number): number {
  autoTable(pdf, {
    startY: y,
    body: [
      [tr('Musteri Adi'), tr(data.customerName), tr('Bolum'), tr(data.division), tr('Sorumlu'), tr(data.responsiblePerson)],
      [tr('Adres'), tr(data.customerAddress), tr('Tarih'), data.assessmentDate, tr('Mus. Sor.'), tr(data.customerResponsible)],
    ],
    styles: { 
        fontSize: 6, 
        cellPadding: 1, 
        lineColor: COLORS.lines, 
        lineWidth: 0.1, 
        textColor: COLORS.textGray 
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 18, fillColor: COLORS.headerBg, textColor: COLORS.textMain },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 15, fillColor: COLORS.headerBg, textColor: COLORS.textMain },
      3: { cellWidth: 20 },
      4: { fontStyle: 'bold', cellWidth: 18, fillColor: COLORS.headerBg, textColor: COLORS.textMain },
      5: { cellWidth: 'auto' },
    },
    margin: { left: M, right: M },
    theme: 'grid',
  });
  return (pdf as any).lastAutoTable.finalY;
}

// --- 3. ORTA BÖLÜM: TANIMLAR + MATRİS + YORUMLAR (Yan Yana) ---
function drawMiddleSection(pdf: jsPDF, startY: number, W: number): number {
  const contentW = W - (2 * M);
  
  // Alan Paylaşımı: Sol (%35), Orta (%25), Sağ (%40)
  const col1W = contentW * 0.38;
  const col2W = contentW * 0.24;
  const col3W = contentW * 0.38; // Kalan
  
  const x1 = M;
  const x2 = M + col1W + 2; // +2mm gap
  const x3 = x2 + col2W + 2;

  // --- SOL KOLON: Popülasyon ve Risk Tanımları ---
  const tableStyles = { fontSize: 4.5, cellPadding: 0.8, lineColor: COLORS.lines, lineWidth: 0.1, textColor: COLORS.textGray };
  const headStyles = { fillColor: COLORS.secondary, textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const, fontSize: 4.5 };
  
  pdf.setFontSize(6);
  pdf.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.text(tr('1. Populasyon & Risk Tanimi'), x1, startY);

  // Popülasyon Tablosu
  autoTable(pdf, {
    startY: startY + 2,
    head: [['#', tr('Sev.'), tr('Populasyon Durumu (1-5)')]],
    body: [
      ['1', 'YOK', tr('Zararli ile karsilasilmadi')],
      ['2', 'DUSUK', tr('Karsilasilma olasiligi dusuktur')],
      ['3', 'ORTA', tr('Son 1-3 yilda gorulmus olabilir')],
      ['4', 'YUKSEK', tr('1-3 yil icinde gorulmesi muhtemel')],
      ['5', 'COK YUK', tr('Mevcut veya olasilik cok yuksek')],
    ],
    styles: tableStyles, headStyles,
    columnStyles: { 0: { cellWidth: 4, halign: 'center', fontStyle:'bold'}, 1: { cellWidth: 10, fontStyle:'bold'} },
    tableWidth: col1W, margin: { left: x1 }, theme: 'grid'
  });
  
  const midY1 = (pdf as any).lastAutoTable.finalY + 1;

  // Risk Tablosu
  autoTable(pdf, {
    startY: midY1,
    head: [['#', tr('Sev.'), tr('Risk Derecesi (1-5)')]],
    body: [
      ['1', 'YOK', tr('Urune bulasma riski yoktur')],
      ['2', 'DUSUK', tr('Dusuk bulasma olasiligi')],
      ['3', 'ORTA', tr('Orta derecede bulasma riski')],
      ['4', 'YUKSEK', tr('Yuksek derecede bulasma riski')],
      ['5', 'COK YUK', tr('Cok yuksek/Kritik risk')],
    ],
    styles: tableStyles, headStyles,
    columnStyles: { 0: { cellWidth: 4, halign: 'center', fontStyle:'bold'}, 1: { cellWidth: 10, fontStyle:'bold'} },
    tableWidth: col1W, margin: { left: x1 }, theme: 'grid'
  });
  const endY1 = (pdf as any).lastAutoTable.finalY;

  // --- ORTA KOLON: Risk Matrisi ---
  pdf.text(tr('2. Risk Matriksi'), x2, startY);
  const cellSize = 5; // Daha küçük hücreler
  const matX = x2 + 2;
  const matY = startY + 8; // Biraz aşağıdan başla
  
  // Eksen İsimleri
  pdf.setFontSize(5);
  pdf.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
  pdf.text(tr('Risk Derecesi ->'), matX + 10, matY - 2);
  pdf.textWithLink(tr('Populasyon ->'), matX - 2, matY + 20, { angle: 90 } as any);

  for(let r=0; r<5; r++) {
      for(let c=0; c<5; c++) {
          const score = (r+1)*(c+1);
          const bg = scoreColor(score);
          const cx = matX + (c*cellSize);
          const cy = matY + (r*cellSize);
          
          pdf.setFillColor(bg[0], bg[1], bg[2]);
          pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
          pdf.rect(cx, cy, cellSize, cellSize, 'FD');
          
          if(score > 0) {
              const tc = scoreTextColor(score);
              pdf.setTextColor(tc[0], tc[1], tc[2]);
              pdf.setFont('helvetica', 'bold');
              pdf.text(score.toString(), cx+cellSize/2, cy+cellSize/2+1, {align:'center'});
          }
      }
      // Satır Numarası
      pdf.setTextColor(COLORS.textMain[0], COLORS.textMain[1], COLORS.textMain[2]);
      pdf.text((r+1).toString(), matX - 2, matY + (r*cellSize) + 3.5);
  }
  // Sütun Numarası
  for(let c=0; c<5; c++) pdf.text((c+1).toString(), matX + (c*cellSize) + 2, matY + (5*cellSize) + 3);

  // --- SAĞ KOLON: Skor Yorumları ---
  pdf.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6);
  pdf.text(tr('3. Skor Yorumlari & Aksiyon'), x3, startY);

  const interpretations = [
      { r: '1-7 DUSUK', bg: [220, 252, 231], t: 'Urune kirlilik riski yok. Rutin kontroller.' },
      { r: '8-14 ORTA', bg: [254, 249, 195], t: 'Capraz bulasma kontrol edilmeli. Rutin onlemler.' },
      { r: '15-25 YUKSEK', bg: [254, 202, 202], t: 'Ilave kontroller, hijyen/yalitim revizyonu sart. Acil onlem.' }
  ];

  let boxY = startY + 2;
  interpretations.forEach(item => {
      pdf.setFillColor(item.bg[0], item.bg[1], item.bg[2] as number);
      pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
      pdf.rect(x3, boxY, col3W, 10, 'FD');
      
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(COLORS.textMain[0], COLORS.textMain[1], COLORS.textMain[2]);
      pdf.text(tr(item.r), x3 + 2, boxY + 3);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
      // Metni sığdır
      const splitText = pdf.splitTextToSize(tr(item.t), col3W - 4);
      pdf.text(splitText, x3 + 2, boxY + 6);
      
      boxY += 12;
  });

  return Math.max(endY1, boxY, matY + 30);
}

// --- 4. DATA TABLOLARI (Sıkıştırılmış 3 Kolon) ---
function drawPestTables(pdf: jsPDF, data: PestDataMap, startY: number, W: number): number {
    const contentW = W - (2 * M);
    const colW = (contentW - 4) / 3; // 2mm gap x 2
    const x1 = M;
    const x2 = M + colW + 2;
    const x3 = M + (colW * 2) + 4;

    const col1Cats = [PEST_CATEGORIES[0], PEST_CATEGORIES[1], PEST_CATEGORIES[2]];
    const col2Cats = [PEST_CATEGORIES[3], PEST_CATEGORIES[4]];
    const col3Cats = [PEST_CATEGORIES[5], PEST_CATEGORIES[6]];

    // Tablo çizim fonksiyonu
    const drawCat = (cat: PestCategory, x: number, y: number): number => {
        const body = [];
        // Verileri hazırla
        for(const p of cat.pests) {
            const d = data[cat.key]?.[p.key] || {pop:0, risk:0};
            const sc = getRiskScore(d.pop, d.risk);
            body.push([tr(p.label), d.pop||'-', d.risk||'-', sc||'-']);
        }
        // Ortalama
        const avg = getCategoryAverage(data[cat.key]);
        body.push([tr('ORTALAMA'), avg.avgPop.toFixed(1), avg.avgRisk.toFixed(1), avg.avgScore.toFixed(1)]);

        autoTable(pdf, {
            startY: y,
            head: [[{content: tr(cat.label), styles:{halign:'left'}}, 'P', 'R', 'S']],
            body: body,
            theme: 'grid',
            styles: { fontSize: 5, cellPadding: 0.8, lineColor: COLORS.lines, lineWidth: 0.1, textColor: COLORS.textGray },
            headStyles: { fillColor: COLORS.secondary, textColor: [255,255,255], fontStyle: 'bold', fontSize: 5, cellPadding: 1 },
            columnStyles: { 
                0: { cellWidth: 'auto', fontStyle:'bold' },
                1: { cellWidth: 5, halign:'center' },
                2: { cellWidth: 5, halign:'center' },
                3: { cellWidth: 6, halign:'center', fontStyle:'bold' }
            },
            margin: { left: x },
            tableWidth: colW,
            didParseCell: (hook) => {
                // Son sütun (Skor) renklendirme
                if (hook.section === 'body' && hook.column.index === 3) {
                    const val = Number(hook.cell.raw);
                    if (val > 0) {
                        const c = scoreColor(val);
                        const tc = scoreTextColor(val);
                        hook.cell.styles.fillColor = c;
                        hook.cell.styles.textColor = tc;
                    }
                }
                // Son satır (Ortalama)
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

// --- 5. FOOTER ---
function drawFooter(pdf: jsPDF, data: PestRiskPdfInput, W: number, H: number) {
  const footerY = H - 8;
  pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
  pdf.line(M, footerY, W - M, footerY);

  pdf.setFontSize(6);
  pdf.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
  
  pdf.text('PestMentor System - ' + tr('Otomatik Risk Analiz Raporu'), M, footerY + 4);
  
  const centerText = `${tr('Dokuman')}: ${data.documentNumber || '-'} | Rev: ${data.revisionNumber || '01'} | ${tr('Tarih')}: ${data.revisionDate}`;
  pdf.text(centerText, W/2, footerY + 4, { align: 'center' });
  
  pdf.text('Sayfa 1 / 1', W - M, footerY + 4, { align: 'right' });
}

// --- ANA EXPORT FONKSİYONU ---
export function generatePestRiskAssessmentPdf(data: PestRiskPdfInput) {
  const pdf = new jsPDF('p', 'mm', 'a4'); // A4 Dikey
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  // 1. Header
  drawHeader(pdf, W, data.companyLogo);
  
  // 2. Info
  let y = 20;
  y = drawCustomerInfo(pdf, data, y);
  
  // 3. Orta Bölüm (Tanımlar, Matris, Yorumlar)
  y += 3;
  y = drawMiddleSection(pdf, y, W);
  
  // 4. Tablolar (Zararlı Verileri)
  y += 3;
  // Kalan yer kontrolü yapmıyoruz, sığdırmaya zorladık.
  drawPestTables(pdf, data.pestData, y, W);
  
  // 5. Footer
  drawFooter(pdf, data, W, H);

  // Kaydet
  const safeName = (data.customerName || 'Rapor').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
  pdf.save(`Risk_Degerlendirme_${safeName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}