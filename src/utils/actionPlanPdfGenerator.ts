import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface ActionPlanPdfInput {
    customerName: string; // Used as fallback or combined
    branchName?: string;
    mainCustomerName?: string;
    customerAddress: string;
    customerCity: string;
    responsiblePerson: string;
    reportDate: string;
    companyLogo?: string | null;
    items: ActionPlanItem[];
}

export interface ActionPlanItem {
    danger_source: string;
    detection_method: string;
    critical_limit: string;
    responsible: string;
    corrective_action: string;
    record_type: string;
}

const M = 10;
const COLORS: { [key: string]: [number, number, number] } = {
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

// Header
async function drawHeader(pdf: jsPDF, W: number, logoUrl?: string | null) {
    // Yeşil header arka planı
    pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    pdf.rect(0, 0, W, 20, 'F');

    // Logo (PNG desteği)
    if (logoUrl) {
        try {
            const logoData = await loadImageAsDataUrl(logoUrl);
            const imgW = 35;
            const imgH = 14;
            pdf.addImage(logoData, 'PNG', M, 3, imgW, imgH);
        } catch (e) {
            console.warn('Logo yuklenemedi:', e);
        }
    }

    const textX = logoUrl ? M + 40 : M;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(255, 255, 255);
    pdf.text(toAscii('ACIL EYLEM PLANI / KRITIK LIMITLER'), textX, 9);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Pest Control Action Plan & Critical Limits', textX, 14);

    // Sağ taraf - PestMentor
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('PestMentor', W - M, 9, { align: 'right' });
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Integrated Pest Management', W - M, 14, { align: 'right' });
}

// Müşteri Bilgileri Tablosu
function drawCustomerInfo(pdf: jsPDF, data: ActionPlanPdfInput, y: number): number {
    const custName = data.mainCustomerName || data.customerName; // Main Customer
    const div = data.branchName || (data.mainCustomerName ? data.customerName : ''); // Branch / Division
    const addr = toAscii(data.customerAddress || '');
    const date = data.reportDate || '';
    const resp = toAscii(data.responsiblePerson || '');
    // Action Plan doesn't have explicit customer responsible field in input, leaving blank or omitting
    const custResp = '';

    autoTable(pdf, {
        startY: y,
        body: [
            [toAscii('Musteri Adi'), toAscii(custName), toAscii('Bolum'), toAscii(div), toAscii('PestMentor'), resp],
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

// Tablo
function drawActionPlanTable(pdf: jsPDF, items: ActionPlanItem[], startY: number): number {
    const tableColumn = [
        toAscii("Tehlike Kaynagi"),
        toAscii("Tespit Yontemi"),
        toAscii("Kritik Limit"),
        toAscii("Sorumlu"),
        toAscii("Duzeltici Faaliyet"),
        toAscii("Kayit")
    ];

    const tableRows = items.map(item => [
        toAscii(item.danger_source),
        toAscii(item.detection_method),
        toAscii(item.critical_limit),
        toAscii(item.responsible),
        toAscii(item.corrective_action),
        toAscii(item.record_type)
    ]);

    autoTable(pdf, {
        startY: startY,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        styles: {
            fontSize: 7,
            cellPadding: 2,
            lineColor: COLORS.lines,
            lineWidth: 0.1,
            textColor: COLORS.textGray,
            font: 'helvetica'
        },
        headStyles: {
            fillColor: COLORS.secondary,
            textColor: [255, 255, 255] as [number, number, number],
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2,
            font: 'helvetica'
        },
        columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold' },
            1: { cellWidth: 30 },
            2: { cellWidth: 30, textColor: [220, 38, 38], fontStyle: 'bold' }, // Red for critical limit
            3: { cellWidth: 25 },
            4: { cellWidth: 'auto' },
            5: { cellWidth: 20 }
        },
        margin: { left: M, right: M },
    });

    return (pdf as any).lastAutoTable.finalY;
}

// Footer
function drawFooter(pdf: jsPDF, W: number, H: number) {
    const footerY = H - 10;
    pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
    pdf.line(M, footerY, W - M, footerY);

    pdf.setFontSize(6);
    pdf.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);

    pdf.text(toAscii('PestMentor System - Acil Eylem Plani'), M, footerY + 4);

    const now = format(new Date(), 'dd.MM.yyyy HH:mm');
    pdf.text(toAscii(`Olusturulma Tarihi: ${now}`), W / 2, footerY + 4, { align: 'center' });

    pdf.text('Sayfa 1 / 1', W - M, footerY + 4, { align: 'right' });
}

// Ana export
export async function generateActionPlanPdf(data: ActionPlanPdfInput) {
    // A4 Landscape for Action Plan as tables can be wide
    const pdf = new jsPDF('l', 'mm', 'a4');
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();

    await drawHeader(pdf, W, data.companyLogo);

    let y = 24;
    y = drawCustomerInfo(pdf, data, y);

    y += 5;
    drawActionPlanTable(pdf, data.items, y);

    drawFooter(pdf, W, H);

    const safeName = toAscii((data.customerName || 'Plan').replace(/[^a-zA-Z0-9ğĞüÜşŞıİöÖçÇ\s]/g, '_').substring(0, 25));
    pdf.save(`Acil_Eylem_Plani_${safeName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
