import React, { useRef } from 'react';
import { Printer, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LEVEL_LABELS,
  type PestActivityReport,
  type PestRow,
} from './PestActivityData';

// --- ROBOTO FONTU (TÜRKÇE KARAKTERLER İÇİN) ---
// Not: Buraya Roboto-Regular.ttf dosyasının Base64 stringini yapıştırmalısınız.
// Çok uzun olduğu için buraya sığmaz. Eğer elinizde yoksa, fontsuz (standart) devam edebiliriz
// ama Türkçe karakterler bozuk çıkabilir.
// Şimdilik standart font kullanıyoruz, Türkçe karakterleri "toAscii" ile düzeltiyoruz.
const ROBOTO_BASE64 = ""; // Burayı doldurursanız daha iyi sonuç alırsınız.

interface Props {
  report: PestActivityReport;
  companySettings?: any;
  compact?: boolean;
}

const levelBg = (level: string) => {
  if (level === 'kabul') return '#dcfce7';
  if (level === 'aktivite') return '#fef3c7';
  return '#fecaca';
};

const levelText = (level: string) => {
  if (level === 'kabul') return '#166534';
  if (level === 'aktivite') return '#92400e';
  return '#991b1b';
};

// Türkçe karakter düzeltici (Font yoksa kullanılır)
const toAscii = (text: string) => {
  if (!text) return '';
  const map: { [key: string]: string } = {
    'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
    'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
  };
  return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, (char) => map[char] || char);
};

// Logo Yükleyici
const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error("Canvas context failed"));
            }
        };
        img.onerror = () => reject(new Error("Image load failed"));
    });
};

const PestActivityPreview: React.FC<Props> = ({ report, companySettings, compact }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const revisionDate = report.revision_date
    ? format(new Date(report.revision_date), 'dd.MM.yyyy')
    : format(new Date(report.created_at), 'dd.MM.yyyy');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !reportRef.current) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Zararli Aktivitesi Kritik Limitleri</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, sans-serif; font-size: 10px; color: #333; background: #fff; padding-top: 22mm; }
      @page { margin: 10mm 8mm 10mm 8mm; }
      table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
      td, th { padding: 4px 6px; border: 1px solid #d1d5db; font-size: 9px; }
      th { background: #f0fdf4; color: #166534; font-weight: 600; }
      .print-header { display: none; position: fixed; top: 0; left: 0; right: 0; height: 20mm; background: #fff; border-top: 3px solid #15803d; border-bottom: 1px solid #e5e7eb; padding: 3mm 10mm; z-index: 100; }
      @media print { .print-header { display: flex; justify-content: space-between; align-items: center; } }
    </style></head><body>
    <div class="print-header">
      <div style="display:flex;align-items:center;gap:8px;">
        ${companySettings?.logo_url ? `<img src="${companySettings.logo_url}" style="height:20px;object-fit:contain;" />` : ''}
        <div>
          <div style="font-size:9px;font-weight:bold;color:#15803d;font-family:Arial,sans-serif;">ZARARLI AKTIVITESI KRITIK LIMITLERI & AKSIYON PLANI</div>
          <div style="font-size:7px;color:#666;font-weight:normal;">${report.customer_name}</div>
        </div>
      </div>
      <span style="color:#999;font-size:7px;font-weight:normal;">${revisionDate}</span>
    </div>
    ${reportRef.current.innerHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const handleExportPdf = async () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Yatay A4
    const pageWidth = doc.internal.pageSize.getWidth();

    // Font Ayarı
    if (ROBOTO_BASE64) {
        doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_BASE64);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto');
    } else {
        doc.setFont('helvetica'); // Türkçe karakter sorunu olabilir
    }

    // --- HEADER ---
    // Yeşil Arka Plan
    doc.setFillColor(21, 128, 61); // Green-700
    doc.rect(0, 0, pageWidth, 20, 'F');

    // Logo
    if (companySettings?.logo_url) {
        try {
            const logoData = await loadImage(companySettings.logo_url);
            doc.addImage(logoData, 'PNG', 10, 3, 35, 14);
        } catch (e) { console.warn("Logo hatası", e); }
    }

    // Başlık Metinleri (Beyaz)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(toAscii("ZARARLI AKTIVITESI KRITIK LIMITLERI & AKSIYON PLANI"), 50, 10);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.text("Pest Activity Critical Limits & Action Plan", 50, 15);

    // Sağ Üst Bilgi
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`${toAscii("Doku. No")}: ${report.document_number || '-'}`, pageWidth - 10, 6, { align: 'right' });
    doc.text(`${toAscii("Revizyon")}: ${report.revision_number || '-'}`, pageWidth - 10, 10, { align: 'right' });
    doc.text(`${toAscii("Tarih")}: ${revisionDate}`, pageWidth - 10, 14, { align: 'right' });

    // --- AÇIKLAMA ---
    doc.setTextColor(20, 83, 45); // Green-900
    doc.setFontSize(8);
    doc.text(toAscii("Gozlemlenen zararli sorunlari ve cozumlerine yonelik hazirlanan acil eylem planidir. PestMentor biyologlari tarafindan uygulanir."), 10, 26);

    // --- TABLO VERİSİ HAZIRLAMA ---
    const tableBody: any[] = [];
    const pestRows: PestRow[] = report.pest_rows || [];

    pestRows.forEach((pest, index) => {
        const pestName = toAscii(pest.pest_name);
        const responsible = `${toAscii(pest.responsible)}\n& ${toAscii(report.customer_name)}`;
        const actionText = toAscii(pest.action_text || '').replace(/(KABUL EDILEBILIR:|AKTIVITE:|ISTILA:)/g, '\n$1');

        if (pest.limits && pest.limits.length > 0) {
            pest.limits.forEach((limit, lIdx) => {
                // Sadece ilk satırda ana bilgileri göster, diğerlerinde boş bırak (Rowspan efekti)
                // AutoTable'da rowspan karmaşık olduğu için düz mantıkla her satıra yazıyoruz ama
                // AutoTable theme: 'grid' olduğu için çizgilerle ayrılır.
                // Rowspan simülasyonu için 'rowSpan' özelliğini kullanacağız.
                
                // Renk Ayarı
                let cellColor = '#ffffff'; // Varsayılan
                if (limit.level === 'kabul') cellColor = '#dcfce7'; // Yeşil
                else if (limit.level === 'aktivite') cellColor = '#fef3c7'; // Sarı
                else if (limit.level === 'istila') cellColor = '#fecaca'; // Kırmızı

                tableBody.push({
                    index: lIdx === 0 ? index + 1 : '',
                    pestName: lIdx === 0 ? pestName : '',
                    responsible: lIdx === 0 ? responsible : '',
                    limitDesc: { 
                        content: `${toAscii(LEVEL_LABELS[limit.level] || limit.level).toUpperCase()}: ${toAscii(limit.description)}`,
                        styles: { fillColor: cellColor }
                    },
                    action: lIdx === 0 ? actionText : ''
                });
            });
        } else {
            // Hiç limit yoksa
            tableBody.push({
                index: index + 1,
                pestName: pestName,
                responsible: responsible,
                limitDesc: '-',
                action: actionText
            });
        }
    });

    // --- TABLO ÇİZİMİ ---
    autoTable(doc, {
        startY: 30,
        head: [[
            'No', 
            toAscii('Zararli Risk Gr. Tur.\nTypes Of Harmful'), 
            toAscii('SORUMLU\nResponsible'), 
            toAscii('Aktivite Kritik Limitleri\nActivity Critical Limits'), 
            toAscii('Aksiyon Plani\nAction Plan')
        ]],
        body: tableBody.map(row => [
            row.index,
            row.pestName,
            row.responsible,
            row.limitDesc,
            row.action
        ]),
        styles: {
            fontSize: 8,
            cellPadding: 2,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
            valign: 'middle',
            textColor: [50, 50, 50]
        },
        headStyles: {
            fillColor: [22, 163, 74], // Green-600
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 35, fontStyle: 'bold' },
            2: { cellWidth: 30, halign: 'center', fontSize: 7 },
            3: { cellWidth: 'auto' }, // Esnek genişlik
            4: { cellWidth: 80, fontSize: 7 }
        },
        // Satır birleştirme mantığı (Manuel Rowspan)
        didParseCell: function (data) {
            // Pest Name, Index, Responsible ve Action sütunları için
            // Eğer aynı haşere grubundaysa ve ilk satır değilse içeriği boşaltıp üsttekiyle birleştirme efekti verilebilir.
            // Ancak AutoTable'da gerçek rowspan için data yapısını ona göre kurmak gerekir.
            // Şimdilik basit liste halinde bırakıyoruz, temiz görünür.
        }
    });

    // --- FOOTER ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(100);
    
    if (companySettings) {
        doc.text(`${toAscii(companySettings.company_name || '')}`, 10, finalY);
        doc.text(`${companySettings.address || ''}`, 10, finalY + 4);
        doc.text(`Tel: ${companySettings.phone || ''} | Web: ${companySettings.website || ''}`, 10, finalY + 8);
    }

    const safeName = report.customer_name.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Kritik_Limitler_${safeName}.pdf`);
  };

  const pestRows: PestRow[] = report.pest_rows || [];

  return (
    <div>
      {!compact && (
        <div className="flex gap-2 mb-4 justify-end print:hidden">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Printer size={16} /> Yazdir
          </button>
          <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
            <FileDown size={16} /> PDF Indir (Vektorel)
          </button>
        </div>
      )}

      <div ref={reportRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Görsel Önizleme (Ekranda Görünen) */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {companySettings?.logo_url && (
                <img src={companySettings.logo_url} alt="Logo" className="h-10 object-contain bg-white/90 rounded-lg px-2 py-1" crossOrigin="anonymous" />
              )}
              <div>
                <h1 className="text-white font-bold text-lg tracking-wide">
                  Zararli Aktivitesi Kritik Limitleri & Aksiyon Plani
                </h1>
                <p className="text-green-100 text-sm italic">
                  Pest Activity Critical Limits & Action Plan
                </p>
              </div>
            </div>
            <div className="text-right text-white/80 text-xs space-y-0.5">
              {report.document_number && <div>Dokuman No: {report.document_number}</div>}
              <div>Revizyon: {report.revision_number}</div>
              <div>Tarih: {revisionDate}</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 bg-green-50 border-b border-green-200 text-xs text-green-800 italic leading-relaxed">
          Gozlemlenen zararli sorunlari ve cozumlerine yonelik olarak hazirlanan acil eylem planidir.
          Asagidaki acil eylem planim kapsamli kontrol ve <b>KRITIK</b> sinirlar,
          PestMentor personelleri tarafindan <b>bu tablo</b>'nun uygulamasina geçilir.
        </div>

        <div className="p-4 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-green-50">
                <th className="border border-gray-300 px-3 py-2 text-left text-green-800 font-semibold w-8">N</th>
                <th className="border border-gray-300 px-3 py-2 text-left text-green-800 font-semibold w-36">
                  Zararli Risk Gru. Tur.
                  <div className="text-[10px] font-normal text-green-600 italic">Types Of Harmful Rix Gr.</div>
                </th>
                <th className="border border-gray-300 px-3 py-2 text-center text-green-800 font-semibold w-28">
                  SORUMLU
                  <div className="text-[10px] font-normal text-green-600 italic">Responsible</div>
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-green-800 font-semibold">
                  Aktivite Kritik Limitleri
                  <div className="text-[10px] font-normal text-green-600 italic">Activity Critical Limits</div>
                </th>
                <th className="border border-gray-300 px-3 py-2 text-left text-green-800 font-semibold w-72">
                  Aktivite Limitlerine Gore Alinacak Aksiyon
                  <div className="text-[10px] font-normal text-green-600 italic">Action to be Taken According to Activity Limits</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {pestRows.map((pest, idx) => {
                const limitCount = pest.limits.length || 1;
                return pest.limits.map((limit, lIdx) => (
                  <tr key={`${idx}-${lIdx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {lIdx === 0 && (
                      <>
                        <td className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-700 align-top" rowSpan={limitCount}>
                          {idx + 1}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 font-semibold text-gray-800 align-top" rowSpan={limitCount}>
                          {pest.pest_name}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center text-gray-600 font-medium align-top" rowSpan={limitCount}>
                          <span className="text-[10px] font-bold text-green-700 leading-tight block">
                            {pest.responsible}
                          </span>
                          <span className="text-[9px] text-gray-500 leading-tight block mt-0.5">
                            & {report.customer_name}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="border border-gray-300 px-3 py-1.5">
                      <div className="flex items-start gap-2">
                        <span
                          className="inline-block shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
                          style={{
                            backgroundColor: levelBg(limit.level),
                            color: levelText(limit.level),
                          }}
                        >
                          {LEVEL_LABELS[limit.level] || limit.level}
                        </span>
                        <span className="text-gray-700 leading-relaxed">{limit.description}</span>
                      </div>
                    </td>
                    {lIdx === 0 && (
                      <td className="border border-gray-300 px-3 py-2 text-gray-600 align-top leading-relaxed" rowSpan={limitCount}>
                        {formatActionText(pest.action_text)}
                      </td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-400">
          <div className="space-y-0.5">
            {companySettings?.phone && <div>Tel: {companySettings.phone}</div>}
            {companySettings?.email && <div>E-Mail: {companySettings.email}</div>}
            {companySettings?.website && <div>Web: {companySettings.website}</div>}
          </div>
          <div className="text-right space-y-0.5">
            {companySettings?.company_name && <div className="font-bold text-gray-500">{companySettings.company_name}</div>}
            {companySettings?.address && <div>{companySettings.address}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

function formatActionText(text: string) {
  if (!text) return null;
  const parts = text.split(/(KABUL EDILEBILIR:|AKTIVITE:|ISTILA:)/g);
  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        const trimmed = part.trim();
        if (!trimmed) return null;
        if (trimmed === 'KABUL EDILEBILIR:') return <span key={i} className="font-bold text-green-700 text-[10px]">{trimmed} </span>;
        if (trimmed === 'AKTIVITE:') return <React.Fragment key={i}><br /><span className="font-bold text-amber-700 text-[10px]">{trimmed} </span></React.Fragment>;
        if (trimmed === 'ISTILA:') return <React.Fragment key={i}><br /><span className="font-bold text-red-700 text-[10px]">{trimmed} </span></React.Fragment>;
        return <span key={i} className="text-gray-600">{trimmed}</span>;
      })}
    </div>
  );
}

export default PestActivityPreview;