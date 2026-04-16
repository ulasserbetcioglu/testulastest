import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

// Add type definition for jspdf-autotable extension
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: { finalY: number };
    }
}

interface BiocidalProduct {
    id: string;
    name: string;
    active_ingredient: string;
    concentration: string;
    target_pest: string;
    cas_no: string;
    manufacturer: string;
    license_date: string;
    license_number: string;
}

interface PDFGeneratorParams {
    products: BiocidalProduct[];
    branchData: any;
    companySettings: any;
}

const M = 15; // Margin
const COLORS = {
    primary: [22, 163, 74],       // Green-600 #16a34a
    primaryDark: [21, 128, 61],   // Green-700 #15803d
    headerBg: [240, 253, 244],    // Green-50 #f0fdf4
    rowAlt: [240, 253, 244],      // Green-50 for alternating rows
    border: [187, 247, 208],      // Green-200 #bbf7d0
    textDark: [20, 83, 45],       // Dark green #14532d
    textGray: [60, 60, 60],       // Medium gray #3c3c3c
    textLight: [100, 100, 100],   // Light gray
    warning: [245, 158, 11],      // Orange #f59e0b
    danger: [220, 38, 38],        // Red #dc2626
    success: [22, 163, 74],       // Green-600 #16a34a
    white: [255, 255, 255]
};

// Turkish char replacement helper
function toAscii(text: string): string {
    if (!text) return '';
    const map: { [key: string]: string } = {
        'ğ': 'g', 'Ğ': 'G', 'ü': 'u', 'Ü': 'U', 'ş': 's', 'Ş': 'S',
        'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O', 'ç': 'c', 'Ç': 'C',
        'â': 'a', 'Â': 'A', 'î': 'i', 'Î': 'I'
    };
    return text.replace(/[ğĞüÜşŞıİöÖçÇâÂîÎ]/g, (match) => map[match] || match);
}

// Logo Loader
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

export const generateApprovedPesticidesPDF = async ({
    products,
    branchData,
    companySettings
}: PDFGeneratorParams) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- MODERN HEADER ---
    // Green header bar
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Accent stripe
    doc.setFillColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    doc.rect(0, 25, pageWidth, 2, 'F');

    // Logo with white background
    if (companySettings?.logo_url) {
        try {
            const logoData = await loadImageAsDataUrl(companySettings.logo_url);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(M - 1, 3, 32, 18, 2, 2, 'F');
            doc.addImage(logoData, 'PNG', M + 1, 4.5, 28, 15);
        } catch (e) {
            console.warn('Logo loading failed', e);
        }
    }

    // Title - Modern Layout
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(toAscii("ONAYLI PESTISIT LISTESI"), M + 35, 12);

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(220, 252, 231);
    doc.text("Approved Pesticide List", M + 35, 18);

    // Right Side Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Pest Control", pageWidth - M, 10, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Form No: PL-01", pageWidth - M, 15, { align: "right" });
    doc.text(`Rev: ${format(new Date(), 'dd.MM.yyyy')}`, pageWidth - M, 20, { align: "right" });

    let yPos = 35;

    // --- MODERN INFO CARDS ---
    const clientName = branchData?.customers?.kisa_isim || branchData?.customers?.cari_isim || '-';
    const rawAddress = branchData?.customers?.adres || '';
    const branchName = branchData?.sube_adi ? ` - ${branchData.sube_adi}` : '';
    const fullAddress = `${rawAddress}${branchName}`;

    const cardWidth = (pageWidth - 3 * M) / 2;
    
    // Client Card
    doc.setFillColor(COLORS.headerBg[0], COLORS.headerBg[1], COLORS.headerBg[2]);
    doc.roundedRect(M, yPos, cardWidth, 22, 2, 2, 'F');
    
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.roundedRect(M, yPos, cardWidth, 6, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(toAscii("MUSTERI BILGILERI"), M + 3, yPos + 4);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
    doc.text(toAscii("Musteri Adi / Client:"), M + 3, yPos + 10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    doc.text(toAscii(clientName), M + 3, yPos + 14);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
    const addressLines = doc.splitTextToSize(toAscii(fullAddress), cardWidth - 6);
    doc.text(addressLines.slice(0, 2), M + 3, yPos + 18);

    // Date Card
    doc.setFillColor(COLORS.headerBg[0], COLORS.headerBg[1], COLORS.headerBg[2]);
    doc.roundedRect(M + cardWidth + M/2, yPos, cardWidth, 22, 2, 2, 'F');
    
    doc.setFillColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    doc.roundedRect(M + cardWidth + M/2, yPos, cardWidth, 6, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(toAscii("DOKUMAN BILGILERI"), M + cardWidth + M/2 + 3, yPos + 4);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
    doc.text(toAscii("Tarih / Date:"), M + cardWidth + M/2 + 3, yPos + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    doc.text(format(new Date(), 'dd.MM.yyyy'), M + cardWidth + M/2 + 3, yPos + 17);

    yPos += 28;

    // --- WARNING SECTION (Modern Box) ---
    doc.setFillColor(COLORS.rowAlt[0], COLORS.rowAlt[1], COLORS.rowAlt[2]);
    doc.roundedRect(M, yPos, pageWidth - 2 * M, 28, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    doc.text(toAscii("ONEMLI NOTLAR / IMPORTANT NOTES:"), M + 3, yPos + 4);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
    
    const warnings = [
        "1. ZEHIR DANISMA MERKEZI (UZEM): 114",
        "2. ACIL DURUM TELEFONU: 112",
        "3. KULLANILAN PESTISITLERIN MSDS VE ETIKETLERI MEVCUTTUR.",
        "4. LISTE DISI PESTISIT KULLANILMASI ICIN ONAY ZORUNLUDUR.",
        "5. SAGLIK BAKANLIGI YAYINLARINDAN ALINMISTIR."
    ];

    let warningY = yPos + 8;
    warnings.forEach(w => {
        doc.text(toAscii(w), M + 3, warningY);
        warningY += 4;
    });

    yPos += 32;

    // --- SIGNATURES (Modern Design) ---
    const sigHeaders = [[toAscii("PestMentor Sorumlusu / Responsible"), toAscii("Musteri Sorumlusu / Client Rep.")]];
    const sigRows = [['\n\n\n', '\n\n\n']];

    doc.autoTable({
        startY: yPos,
        head: sigHeaders,
        body: sigRows,
        theme: 'grid',
        margin: { left: M, right: M },
        styles: {
            fontSize: 8,
            lineColor: COLORS.border,
            textColor: COLORS.textGray,
            halign: 'center',
            valign: 'middle',
            lineWidth: 0.2
        },
        headStyles: {
            fillColor: COLORS.primaryDark,
            textColor: COLORS.white,
            fontStyle: 'bold',
            cellPadding: 3
        },
        columnStyles: {
            0: { cellWidth: (pageWidth - 2 * M) / 2 },
            1: { cellWidth: (pageWidth - 2 * M) / 2 }
        }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // --- PRODUCTS TABLE (Modern Grid Design) ---
    const columns = [
        { header: toAscii('Ticari Adi\nName'), dataKey: 'name' },
        { header: toAscii('Aktif Maddesi\nActive Ing.'), dataKey: 'active' },
        { header: toAscii('Konsantrasyon\nConc.'), dataKey: 'conc' },
        { header: toAscii('Hedef Zararli\nTarget Pest'), dataKey: 'target' },
        { header: toAscii('Cas No'), dataKey: 'cas' },
        { header: toAscii('Uretici Firma\nManufacturer'), dataKey: 'manuf' },
        { header: toAscii('Ruhsat No/Tarih\nLicence'), dataKey: 'licence' },
    ];

    const body = products.map(p => ({
        name: toAscii(p.name),
        active: toAscii(p.active_ingredient),
        conc: toAscii(p.concentration),
        target: toAscii(p.target_pest),
        cas: p.cas_no,
        manuf: toAscii(p.manufacturer),
        licence: `${p.license_number}\n${p.license_date ? format(new Date(p.license_date), 'dd.MM.yyyy') : ''}`
    }));

    doc.autoTable({
        startY: yPos,
        head: [columns.map(c => c.header)],
        body: body.map(row => Object.values(row)),
        theme: 'grid',
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 3
        },
        styles: {
            fontSize: 7,
            overflow: 'linebreak',
            cellWidth: 'wrap',
            valign: 'middle',
            textColor: COLORS.textDark,
            lineColor: COLORS.border,
            lineWidth: 0.15
        },
        alternateRowStyles: {
            fillColor: COLORS.rowAlt
        },
        columnStyles: {
            0: { cellWidth: 35, fontStyle: 'bold' },
            1: { cellWidth: 25 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 25 },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 25 },
            6: { cellWidth: 'auto', halign: 'center' }
        },
        didDrawPage: (_data: any) => {
            // Modern Footer
            const footerY = pageHeight - 8;
            
            // Footer background
            doc.setFillColor(COLORS.rowAlt[0], COLORS.rowAlt[1], COLORS.rowAlt[2]);
            doc.rect(0, footerY - 2, pageWidth, 10, 'F');
            
            doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
            doc.setLineWidth(0.5);
            doc.line(M, footerY - 2, pageWidth - M, footerY - 2);
            
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
            
            const leftFooter = `Tel: ${companySettings?.phone || ''} | Web: ${companySettings?.website || ''}`;
            doc.text(toAscii(leftFooter), M, footerY + 2);
            
            doc.text(toAscii(`Olusturulma: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`), pageWidth / 2, footerY + 2, { align: 'center' });
            
            doc.setFont("helvetica", "bold");
            doc.text(`${doc.getNumberOfPages()}`, pageWidth - M, footerY + 2, { align: 'right' });
        }
    });

    const fileName = `Onayli_Pestisit_Listesi_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
};