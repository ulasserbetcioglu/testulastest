import React, { useRef, useState } from 'react';
import { Printer, FileDown, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import {
  LEVEL_LABELS,
  type PestActivityReport,
  type PestRow,
} from './PestActivityData';

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

const PestActivityPreview: React.FC<Props> = ({ report, companySettings, compact }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

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
          <div style="font-size:9px;font-weight:bold;color:#15803d;font-family:Arial,sans-serif;">ZARARLI AKT\u0130V\u0130TES\u0130 KR\u0130T\u0130K L\u0130M\u0130TLER\u0130 & AKS\u0130YON PLANI</div>
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
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = { top: 8, bottom: 8, left: 8, right: 8 };
      const footerH = 7;
      const contentWidth = pdfWidth - margin.left - margin.right;
      const RENDER_W = 1200;
      const SCALE = 2;

      const cloneWrap = document.createElement('div');
      cloneWrap.style.cssText = `position:fixed;left:-10000px;top:0;width:${RENDER_W}px;background:#fff;z-index:-1;overflow:visible;`;
      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      clone.style.width = `${RENDER_W}px`;
      clone.style.maxWidth = `${RENDER_W}px`;
      clone.style.overflow = 'visible';
      cloneWrap.appendChild(clone);
      document.body.appendChild(cloneWrap);

      const headerEl = document.createElement('div');
      headerEl.style.cssText = `position:fixed;left:-10000px;top:0;width:${RENDER_W}px;background:#fff;z-index:-1;`;
      headerEl.innerHTML = `
        <div style="border-top:3px solid #15803d;padding:8px 20px 6px;border-bottom:1px solid #e5e7eb;">
          <div style="display:flex;align-items:center;gap:10px;">
            ${companySettings?.logo_url ? `<img src="${companySettings.logo_url}" style="height:24px;object-fit:contain;" crossorigin="anonymous" />` : ''}
            <div style="flex:1;">
              <div style="font-size:9px;font-weight:bold;color:#15803d;font-family:Arial,sans-serif;">ZARARLI AKT\u0130V\u0130TES\u0130 KR\u0130T\u0130K L\u0130M\u0130TLER\u0130 & AKS\u0130YON PLANI</div>
              <div style="font-size:7px;color:#666;font-family:Arial,sans-serif;">${report.customer_name}</div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(headerEl);

      const logoImg = headerEl.querySelector('img');
      if (logoImg) {
        await new Promise<void>((resolve) => {
          if (logoImg.complete) resolve();
          else { logoImg.onload = () => resolve(); logoImg.onerror = () => resolve(); }
        });
      }
      await new Promise((r) => setTimeout(r, 100));

      const wrapRect = cloneWrap.getBoundingClientRect();
      const breakSet = new Set<number>();
      breakSet.add(0);

      Array.from(clone.children).forEach((child) => {
        const r = (child as HTMLElement).getBoundingClientRect();
        breakSet.add(Math.round(r.bottom - wrapRect.top));
      });

      clone.querySelectorAll('tr').forEach((row) => {
        const r = row.getBoundingClientRect();
        breakSet.add(Math.round(r.bottom - wrapRect.top));
      });

      const totalDomH = cloneWrap.scrollHeight;
      breakSet.add(totalDomH);
      const breaks = [...breakSet].sort((a, b) => a - b);

      const canvasOpts = { scale: SCALE, useCORS: true, logging: false, backgroundColor: '#ffffff', width: RENDER_W };
      const [headerCanvas, contentCanvas] = await Promise.all([
        html2canvas(headerEl, canvasOpts),
        html2canvas(cloneWrap, { ...canvasOpts, windowWidth: RENDER_W }),
      ]);
      document.body.removeChild(cloneWrap);
      document.body.removeChild(headerEl);

      const headerImgData = headerCanvas.toDataURL('image/jpeg', 0.95);
      const headerImgH = (headerCanvas.height * contentWidth) / headerCanvas.width;

      const domToPdf = contentWidth / RENDER_W;
      const contentTopN = margin.top + headerImgH + 2;
      const page1Avail = pageHeight - margin.top - margin.bottom - footerH;
      const pageNAvail = pageHeight - contentTopN - margin.bottom - footerH;

      const pages: Array<{ startPx: number; endPx: number }> = [];
      let curStart = 0;
      let pgIdx = 0;

      while (curStart < totalDomH) {
        const availMm = pgIdx === 0 ? page1Avail : pageNAvail;
        const availPx = availMm / domToPdf;
        const maxEnd = curStart + availPx;

        let bestBreak = curStart;
        for (const bp of breaks) {
          if (bp <= curStart) continue;
          if (bp <= maxEnd + 0.5) {
            bestBreak = bp;
          } else {
            break;
          }
        }

        if (bestBreak <= curStart) {
          bestBreak = Math.min(Math.ceil(curStart + availPx), totalDomH);
        }

        pages.push({ startPx: curStart, endPx: Math.min(bestBreak, totalDomH) });
        curStart = bestBreak;
        pgIdx++;
      }

      const totalPages = pages.length;

      const drawFooter = (pg: number) => {
        const y = pageHeight - margin.bottom - footerH;
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, y, pdfWidth, footerH + margin.bottom, 'F');
        pdf.setDrawColor(220, 220, 220);
        pdf.line(margin.left, y + 1, pdfWidth - margin.right, y + 1);
        pdf.setFontSize(7);
        pdf.setTextColor(170, 170, 170);
        pdf.text(`Sayfa ${pg} / ${totalPages}`, pdfWidth / 2, y + 4.5, { align: 'center' });
      };

      const drawHeader = () => {
        pdf.addImage(headerImgData, 'JPEG', margin.left, margin.top, contentWidth, headerImgH);
      };

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        const { startPx, endPx } = pages[i];
        const srcY = Math.round(startPx * SCALE);
        const srcH = Math.round((endPx - startPx) * SCALE);
        if (srcH <= 0) continue;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = contentCanvas.width;
        sliceCanvas.height = srcH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, srcH);
        ctx.drawImage(contentCanvas, 0, srcY, contentCanvas.width, srcH, 0, 0, contentCanvas.width, srcH);

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
        const sliceHMm = (endPx - startPx) * domToPdf;
        const yStart = i === 0 ? margin.top : contentTopN;

        if (i > 0) drawHeader();
        pdf.addImage(sliceData, 'JPEG', margin.left, yStart, contentWidth, sliceHMm);
        drawFooter(i + 1);
      }

      const safeName = report.customer_name.replace(/[^a-zA-Z0-9_\-]/g, '_');
      pdf.save(`Zararli_Kritik_Limitler_${safeName}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const pestRows: PestRow[] = report.pest_rows || [];

  return (
    <div>
      {!compact && (
        <div className="flex gap-2 mb-4 justify-end print:hidden">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Printer size={16} /> Yazdir
          </button>
          <button onClick={handleExportPdf} disabled={exporting} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} PDF Indir
          </button>
        </div>
      )}

      <div ref={reportRef} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
          PestMentor biyologlariniz gorevlilerini tarafindan <b>bu tablo</b> uygulamasina gecer.
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
        if (trimmed === 'AKTIVITE:') return <><br key={`br-${i}`} /><span key={i} className="font-bold text-amber-700 text-[10px]">{trimmed} </span></>;
        if (trimmed === 'ISTILA:') return <><br key={`br-${i}`} /><span key={i} className="font-bold text-red-700 text-[10px]">{trimmed} </span></>;
        return <span key={i} className="text-gray-600">{trimmed}</span>;
      })}
    </div>
  );
}

export default PestActivityPreview;
