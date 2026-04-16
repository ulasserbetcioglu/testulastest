import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface BiocidalPdfInput {
  visitDate: string;
  startTime?: string;
  endTime?: string;
  customerName: string;
  customerAddress: string;
  branchName?: string;
  operatorName: string;
  operatorCertificate?: string;
  responsibleManager?: string; // Mesul Müdür
  pestTypes: string[];
  notes: string;
  biocidalUsage: Array<{
    name: string;
    licenseNumber?: string;
    manufacturer?: string;
    activeIngredient?: string;
    batchNumber?: string;
    quantity: string;
    dosage: string;
    unit: string;
    applicationMethod?: string;
  }>;
  companyLogo?: string | null;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  reportNumber?: string;
}

const M = 15; // Margin
// Turkce karakterleri ASCII'ye donustur (PDF font destegi icin)
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

export async function generateBiocidalVisitPdf(data: BiocidalPdfInput) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  // --- HEADER SECTION ---
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(toAscii('BIYOSIDAL URUN UYGULAMA ISLEM FORMU'), W / 2, 15, { align: 'center' });
  pdf.setFontSize(12);
  pdf.text(toAscii('(EK-1)'), W / 2, 21, { align: 'center' });

  // Company Logo & Info
  if (data.companyLogo) {
     try {
       // Note: In a real environment, we'd use loadImageAsDataUrl like in the reference
       // For now, we'll just leave space or assume the caller provides valid dataUrl
     } catch(e) {}
  }

  let y = 30;

  // --- 1. FORM BILGILERI TABLOSU ---
  autoTable(pdf, {
    startY: y,
    body: [
      [toAscii('Uygulama Yapan Firmaya Ait Bilgiler'), '', toAscii('Uygulama Yapılan Yere Ait Bilgiler'), ''],
      [toAscii('Unvanı'), toAscii(data.companyName || 'PestMentor'), toAscii('Adı/Unvanı'), toAscii(data.customerName)],
      [toAscii('Adresi'), toAscii(data.companyAddress || ''), toAscii('Adresi'), toAscii(data.customerAddress)],
      [toAscii('Tel/Faks'), toAscii(data.companyPhone || ''), toAscii('Sube/Bolum'), toAscii(data.branchName || '-')],
    ],
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica', cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 55 },
    },
    didParseCell: (data) => {
       if (data.row.index === 0) {
         data.cell.styles.fillColor = [220, 220, 220];
         data.cell.styles.fontStyle = 'bold';
         data.cell.styles.halign = 'center';
       }
    }
  });

  y = (pdf as any).lastAutoTable.finalY + 5;

  // --- 2. EKIP BILGILERI ---
  autoTable(pdf, {
    startY: y,
    head: [[toAscii('Ekip Bilgileri'), toAscii('Adı Soyadı'), toAscii('Sertifika/Belge No')]],
    body: [
      [toAscii('Mesul Mudur'), toAscii(data.responsibleManager || '-'), '-'],
      [toAscii('Ekip Sorumlusu'), toAscii(data.operatorName), toAscii(data.operatorCertificate || '-')],
      [toAscii('Uygulayıcı'), toAscii(data.operatorName), toAscii(data.operatorCertificate || '-')],
    ],
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica' },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } }
  });

  y = (pdf as any).lastAutoTable.finalY + 5;

  // --- 3. UYGULAMA BILGILERI ---
  const pestText = data.pestTypes.join(', ');
  autoTable(pdf, {
    startY: y,
    body: [
      [toAscii('Uygulama Tarihi'), data.visitDate, toAscii('Hedef Zararlılar'), toAscii(pestText)],
      [toAscii('Baslangıc Saati'), data.startTime || '-', toAscii('Bitis Saati'), data.endTime || '-'],
    ],
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 55 },
    }
  });

  y = (pdf as any).lastAutoTable.finalY + 5;

  // --- 4. KULLANILAN BIYOSIDAL URUNLER ---
  const productRows = data.biocidalUsage.map(u => [
    toAscii(u.name),
    toAscii(u.manufacturer || '-'),
    toAscii(u.licenseNumber || '-'),
    toAscii(u.activeIngredient || '-'),
    toAscii(u.batchNumber || '-'),
    toAscii(`${u.dosage} / ${u.quantity} ${u.unit}`)
  ]);

  autoTable(pdf, {
    startY: y,
    head: [[
      toAscii('Urun Adı'),
      toAscii('Uretici/Ithalatcı'),
      toAscii('Ruhsat No'),
      toAscii('Aktif Madde'),
      toAscii('Sarj No'),
      toAscii('Doz / Miktar')
    ]],
    body: productRows.length > 0 ? productRows : [[toAscii('Biyosidal urun kullanılmadı'), '', '', '', '', '']],
    theme: 'grid',
    styles: { fontSize: 7, font: 'helvetica' },
    headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  y = (pdf as any).lastAutoTable.finalY + 5;

  // --- 5. NOTLAR VE YONTEM ---
  autoTable(pdf, {
    startY: y,
    body: [
      [toAscii('Uygulama Yontemi'), toAscii(data.biocidalUsage[0]?.applicationMethod || 'Pulverizasyon / Jel')],
      [toAscii('Notlar / Acıklamalar'), toAscii(data.notes || '-')]
    ],
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 } }
  });

  y = (pdf as any).lastAutoTable.finalY + 20;

  // --- 6. IMZA ALANI ---
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(toAscii('Uygulayıcı / Ekip Sorumlusu'), M, y);
  pdf.text(toAscii('Musteri Yetkilisi'), W - M - 40, y);

  pdf.setFont('helvetica', 'normal');
  pdf.text(toAscii(data.operatorName), M, y + 5);
  pdf.text(toAscii(data.customerName), W - M - 40, y + 5);

  pdf.setFontSize(7);
  pdf.text(toAscii('(İmza / Kaşe)'), M, y + 15);
  pdf.text(toAscii('(İmza / Kaşe)'), W - M - 40, y + 15);

  // --- FOOTER ---
  pdf.setFontSize(7);
  pdf.setTextColor(100);
  pdf.text(toAscii('Bu form T.C. Saglık Bakanlıgı Biyosidal Urunlerin Kullanım Usul ve Esasları Hakkında Yonetmelik geregi duzenlenmistir.'), W / 2, H - 10, { align: 'center' });

  // Save
  const fileName = `EK1_Raporu_${toAscii(data.customerName).replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  pdf.save(fileName);
}
