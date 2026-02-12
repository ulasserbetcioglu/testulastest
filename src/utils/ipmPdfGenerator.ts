import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    PEST_CATEGORY_LABELS,
    PEST_SUBCATEGORIES,
    DEFAULT_CONTENT_SECTIONS
} from '../components/Ipm/IpmContractData';

export interface IpmPdfInput {
    id: string;
    customerName: string; // This might be "MainCustomer - Branch" or just "MainCustomer"
    branchName?: string;  // Explicit branch name if available
    mainCustomerName?: string; // Explicit main customer name
    customerAddress: string;
    customerCity: string;
    responsiblePerson: string;
    contractFirmName: string;
    contractFirmPhone: string;
    contractFirmEmail: string;
    contractFirmContact: string;
    startDate: string;
    revisionDate?: string | null;
    revisionNumber: number;
    routineFrequency: string;
    targetPests: Record<string, boolean>;
    scopeAreas: string[];
    contentSections: Record<string, string>;
    customNotes?: string;
    companyLogo?: string | null;
    companyStamp?: string | null;
}

const M = 15; // Margin
const COLORS = {
    primary: [22, 163, 74],      // Green-600 #16a34a
    secondary: [21, 128, 61],    // Green-700
    headerBg: [240, 253, 244],   // Green-50
    lines: [187, 247, 208],      // Green-200
    textMain: [20, 83, 45],
    textGray: [60, 60, 60],
};

// Turkish char replacement
function toAscii(text: string): string {
    if (!text) return '';
    const map: { [key: string]: string } = {
        'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
        'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C'
    };
    return text.replace(/[ğĞüÜşŞıİöÖçÇ]/g, (match) => map[match] || match);
}

// Image loader
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

// --- Draw Functions ---

async function drawHeader(pdf: jsPDF, W: number, data: IpmPdfInput) {
    pdf.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    pdf.rect(0, 0, W, 25, 'F'); // Green top bar

    // Logo
    if (data.companyLogo) {
        try {
            const logoData = await loadImageAsDataUrl(data.companyLogo);
            pdf.addImage(logoData, 'PNG', M, 4, 35, 17);
        } catch (e) {
            console.warn('Logo loading failed', e);
        }
    }

    const textX = data.companyLogo ? M + 40 : M;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(toAscii('ENTEGRE ZARARLI YONETIMI (IPM) PROGRAMI'), textX, 12);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.text('Integrated Pest Management Program', textX, 17);

    // Right side text (Firm Name)
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('PestMentor', W - M, 12, { align: 'right' });
}

function drawInfoTable(pdf: jsPDF, data: IpmPdfInput, startY: number): number {
    // We'll use two columns: Customer Info & Contractor Info
    const customerTitle = toAscii("ISLETME BILGILERI");
    const contractorTitle = toAscii("SOZLESMELI FIRMA");

    // Display Logic: 
    // If we have distinct mainCustomerName and branchName, show both.
    // Otherwise fall back to data.customerName.
    const custName = data.mainCustomerName || data.customerName;
    const branchName = data.branchName || (data.mainCustomerName ? data.customerName : '');
    // ^ logic: if mainName exists, assume customerName is branch or combo. 
    // If not, use customerName as main.

    const custRows = [
        [toAscii("Isletme:"), toAscii(custName)],
        ...(branchName ? [[toAscii("Sube:"), toAscii(branchName)]] : []),
        [toAscii("Adres:"), toAscii(`${data.customerAddress}, ${data.customerCity}`)],
        [toAscii("IPM Sorumlusu:"), toAscii(data.responsiblePerson)],
        [toAscii("Baslangic Tarihi:"), data.startDate]
    ];

    const firmRows = [
        [toAscii("Firma:"), toAscii(data.contractFirmName)],
        [toAscii("Telefon:"), data.contractFirmPhone],
        [toAscii("E-posta:"), toAscii(data.contractFirmEmail)],
        [toAscii("Yetkili:"), toAscii(data.contractFirmContact)]
    ];

    // Split into 2 tables side-by-side manually or use columns?
    // autoTable supports columns but we want distinct blocks. 
    // Let's do one table with 2 major columns (invisible borders)

    // Actually, simpler to do one table with 4 columns: [Label, Val, Label, Val]
    // But rows might be uneven. 
    // Let's do two separate calls to autoTable with same startY?

    const W = pdf.internal.pageSize.getWidth();
    const colW = (W - (2 * M) - 5) / 2;

    // Customer Table
    autoTable(pdf, {
        startY: startY,
        head: [[{ content: customerTitle, colSpan: 2 }]],
        body: custRows,
        theme: 'grid',
        tableWidth: colW,
        margin: { left: M },
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: COLORS.lines, textColor: COLORS.textGray },
        headStyles: { fillColor: COLORS.secondary, textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 25 } }
    });

    const table1Y = (pdf as any).lastAutoTable.finalY;

    // Firm Table
    autoTable(pdf, {
        startY: startY,
        head: [[{ content: contractorTitle, colSpan: 2 }]],
        body: firmRows,
        theme: 'grid',
        tableWidth: colW,
        margin: { left: M + colW + 5 },
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: COLORS.lines, textColor: COLORS.textGray },
        headStyles: { fillColor: COLORS.secondary, textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 25 } }
    });

    const table2Y = (pdf as any).lastAutoTable.finalY;

    return Math.max(table1Y, table2Y) + 5;
}

function getSectionText(data: IpmPdfInput, key: string): string {
    let text = data.contentSections[key] ?? DEFAULT_CONTENT_SECTIONS[key] ?? '';
    // Replace vars
    text = text
        .replace(/\{customer_name\}/g, toAscii(data.mainCustomerName || data.customerName))
        .replace(/\{customer_address\}/g, toAscii(data.customerAddress))
        .replace(/\{customer_city\}/g, toAscii(data.customerCity))
        .replace(/\{contract_firm_name\}/g, toAscii(data.contractFirmName))
        .replace(/\{responsible_person\}/g, toAscii(data.responsiblePerson))
        .replace(/\{routine_frequency\}/g, toAscii(data.routineFrequency))
        .replace(/\{start_date\}/g, data.startDate);

    return toAscii(text);
}

function drawSectionHeader(pdf: jsPDF, title: string, y: number) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    pdf.text(toAscii(title), M, y);
    // Underline
    const textW = pdf.getTextWidth(toAscii(title));
    pdf.setDrawColor(COLORS.lines[0], COLORS.lines[1], COLORS.lines[2]);
    pdf.line(M, y + 1, M + textW, y + 1);
    return y + 5;
}

function drawTextContent(pdf: jsPDF, text: string, y: number): number {
    // using autoTable with no border for converting text to safe multi-page blocks
    autoTable(pdf, {
        startY: y,
        body: [[text]],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 0, textColor: COLORS.textGray, overflow: 'linebreak', font: 'helvetica' },
        margin: { left: M, right: M }
    });
    return (pdf as any).lastAutoTable.finalY + 4;
}

function drawTargetPests(pdf: jsPDF, data: IpmPdfInput, y: number): number {
    y = drawSectionHeader(pdf, "3 - HEDEF ZARARLILAR", y);

    // Intro text
    const intro = getSectionText(data, 'hedef_zararlilar_giris');
    y = drawTextContent(pdf, intro, y);

    // Pest Grid
    // We'll list active pests with checkmarks
    const rows: string[][] = [];

    Object.entries(PEST_CATEGORY_LABELS).forEach(([key, label], idx) => {
        const isActive = data.targetPests[key];
        const statusStr = isActive ? '[X]' : '[ ]';
        const labelStr = `3.${idx + 1} - ${label}`;

        let subText = '';
        if (isActive && PEST_SUBCATEGORIES[key]) {
            const subs = PEST_SUBCATEGORIES[key].map(s => `${s.code} ${s.name} (${s.latin})`);
            subText = subs.join("\n");
        }

        rows.push([statusStr, toAscii(labelStr), toAscii(subText)]);
    });

    autoTable(pdf, {
        startY: y,
        head: [[toAscii("Drm"), toAscii("Zararli Grubu"), toAscii("Turler")]],
        body: rows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: COLORS.lines, textColor: COLORS.textGray },
        headStyles: { fillColor: COLORS.secondary, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 40, fontStyle: 'bold' },
            2: { cellWidth: 'auto' }
        },
        margin: { left: M, right: M }
    });

    return (pdf as any).lastAutoTable.finalY + 5;
}

// Main generation function
export async function generateIpmPdf(data: IpmPdfInput) {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();

    await drawHeader(pdf, W, data);

    let y = 30;

    // 1. Info
    y = drawInfoTable(pdf, data, y);

    // 2. Sections (Iterative)
    // 1 - AMAC
    y = drawSectionHeader(pdf, "1 - AMAC", y);
    y = drawTextContent(pdf, getSectionText(data, 'amac'), y);

    // 2 - KISALTMALAR
    y = drawSectionHeader(pdf, "2 - KISALTMALAR VE KAVRAMLAR", y);
    y = drawTextContent(pdf, getSectionText(data, 'kisaltmalar'), y);

    // 3 - HEDEF ZARARLILAR
    y = drawTargetPests(pdf, data, y);

    // 4 - ILGILI DOKUMANLAR
    y = drawSectionHeader(pdf, "4 - ILGILI DOKUMANLAR", y);
    y = drawTextContent(pdf, getSectionText(data, 'ilgili_dokumanlar'), y);

    // 5 - IPM UYGULAMALARI (Grouped)
    y = drawSectionHeader(pdf, "5 - IPM UYGULAMALARI", y);
    y = drawTextContent(pdf, getSectionText(data, 'ipm_uygulamalari_giris'), y);

    // Sub-sections 5.X
    const sec5 = ['gozlem_uygulamalari', 'onleyici_uygulamalar', 'rutin_kontroller'];
    for (const k of sec5) {
        y += 2;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(toAscii(CONTENT_SECTION_LABELS[k] || k), M, y);
        y += 4;
        y = drawTextContent(pdf, getSectionText(data, k), y);
    }

    // 6 - YURUTME (Grouped)
    y = drawSectionHeader(pdf, "6 - IPM UYGULAMALARININ YURUTULMESI", y);
    const sec6 = ['ipm_yurutulme_1', 'zararli_takip', 'ic_alan_aparatlari', 'dis_alan_aparatlari', 'rutin_periyotlar', 'acil_carilar', 'egitim'];
    for (const k of sec6) {
        // Check formatting (labels often include 6.x)
        const label = CONTENT_SECTION_LABELS[k] || k;
        y += 2;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(toAscii(label), M, y);
        y += 4;
        y = drawTextContent(pdf, getSectionText(data, k), y);
    }

    // 7, 8, 9, 10...
    const remaining = [
        { k: 'kimyasal', t: '7 - KIMYASAL UYGULAMASI' },
        { k: 'personel', t: '8 - UYGULAMA PERSONELI' },
        { k: 'arac_gerecler', t: '9 - UYGULAMA ARAC GERECLERI' },
        { k: 'gecerlilik', t: '10 - GECERLILIK' }
    ];

    for (const item of remaining) {
        y = drawSectionHeader(pdf, item.t, y);
        y = drawTextContent(pdf, getSectionText(data, item.k), y);

        // Special case for validity details box
        if (item.k === 'gecerlilik') {
            const detail = getSectionText(data, 'gecerlilik_detay');
            autoTable(pdf, {
                startY: y - 2,
                body: [[detail]],
                theme: 'plain',
                styles: { fontSize: 9, fontStyle: 'bold', textColor: COLORS.textMain, fillColor: COLORS.headerBg, cellPadding: 3, font: 'helvetica' },
                margin: { left: M, right: M }
            });
            y = (pdf as any).lastAutoTable.finalY + 5;
        }
    }

    // Footer lines
    const footerY = H - 15;
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(toAscii(`Dokuman: IPM-01 | Rev: ${data.revisionNumber} | Tarih: ${data.revisionDate || format(new Date(), 'dd.MM.yyyy')}`), M, footerY);
    pdf.text('PestMentor.com', W - M, footerY, { align: 'right' });

    const safeName = toAscii((data.customerName || 'ipm').replace(/[^a-zA-Z0-9]/g, '_'));
    pdf.save(`IPM_Sozlesmesi_${safeName}.pdf`);
}
