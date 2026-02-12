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

interface Station {
    id: string;
    code: string;
    name: string;
    type: string;
    order_no?: number;
}

interface Visit {
    visit_date: string;
    equipment_checks: Record<string, any>;
}

interface PDFGeneratorParams {
    stations: Station[];
    visits: Visit[];
    branchData: any;
    companySettings: any;
    startDate: Date;
    endDate: Date;
}

const M = 15; // Margin
const COLORS = {
    primary: [16, 185, 129],      // Modern teal/green #10b981
    primaryDark: [5, 150, 105],   // Darker shade #059669
    accent: [59, 130, 246],       // Blue accent #3b82f6
    headerBg: [236, 253, 245],    // Very light green #ecfdf5
    rowAlt: [249, 250, 251],      // Light gray #f9fafb
    border: [209, 213, 219],      // Gray border #d1d5db
    textDark: [17, 24, 39],       // Almost black #111827
    textGray: [75, 85, 99],       // Medium gray #4b5563
    textLight: [156, 163, 175],   // Light gray #9ca3af
    warning: [245, 158, 11],      // Orange #f59e0b
    danger: [239, 68, 68],        // Red #ef4444
    success: [34, 197, 94],       // Green #22c55e
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

// Helper function to draw rounded rectangle
function drawRoundedRect(doc: jsPDF, x: number, y: number, width: number, height: number, radius: number, fillColor: number[]) {
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    
    // Draw rounded rectangle using lines and arcs
    doc.roundedRect(x, y, width, height, radius, radius, 'F');
}

export const generateRodentMonitoringPDF = async ({
    stations,
    visits,
    branchData,
    companySettings,
    startDate,
    endDate
}: PDFGeneratorParams) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- MODERN HEADER ---
    // Gradient-like header with two-tone design
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Accent stripe
    doc.setFillColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    doc.rect(0, 25, pageWidth, 2, 'F');

    // Logo with shadow effect
    if (companySettings?.logo_url) {
        try {
            const logoData = await loadImageAsDataUrl(companySettings.logo_url);
            // White background for logo
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(M - 1, 3, 37, 18, 2, 2, 'F');
            doc.addImage(logoData, 'PNG', M + 1, 4.5, 33, 15);
        } catch (e) {
            console.warn('Logo loading failed', e);
        }
    }

    // Modern Title Layout
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    const mainTitle = toAscii("KEMIRGEN YEM ISTASYONU");
    doc.text(mainTitle, pageWidth - M, 10, { align: 'right' });
    
    doc.setFontSize(14);
    const subTitle = toAscii("IZLEME FORMU");
    doc.text(subTitle, pageWidth - M, 16, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 252, 231);
    doc.text("Rodent Bait Station Monitoring Form", pageWidth - M, 21, { align: 'right' });

    let yPos = 35;

    // --- MODERN INFO CARDS ---
    const customerName = branchData?.customers?.kisa_isim || branchData?.customers?.cari_isim || '-';
    const cardWidth = (pageWidth - 3 * M) / 2;
    
    // Customer Card
    doc.setFillColor(COLORS.headerBg[0], COLORS.headerBg[1], COLORS.headerBg[2]);
    doc.roundedRect(M, yPos, cardWidth, 18, 2, 2, 'F');
    
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.roundedRect(M, yPos, cardWidth, 6, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(toAscii("MUSTERI BILGILERI"), M + 3, yPos + 4);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
    doc.text(toAscii("Musteri / Customer:"), M + 3, yPos + 10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    doc.text(toAscii(customerName), M + 3, yPos + 14.5);

    // Period Card
    doc.setFillColor(COLORS.headerBg[0], COLORS.headerBg[1], COLORS.headerBg[2]);
    doc.roundedRect(M + cardWidth + M/2, yPos, cardWidth, 18, 2, 2, 'F');
    
    doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.roundedRect(M + cardWidth + M/2, yPos, cardWidth, 6, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(toAscii("DONEM BILGILERI"), M + cardWidth + M/2 + 3, yPos + 4);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
    doc.text(toAscii("Izleme Donemi:"), M + cardWidth + M/2 + 3, yPos + 10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    const periodText = `${format(startDate, 'dd.MM.yyyy')} - ${format(endDate, 'dd.MM.yyyy')}`;
    doc.text(periodText, M + cardWidth + M/2 + 3, yPos + 14.5);

    yPos += 22;

    // Branch info
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
    doc.text(toAscii(`Sube: ${branchData?.sube_adi || '-'}`), M, yPos);
    doc.text(toAscii(`Rapor Tarihi: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`), pageWidth - M, yPos, { align: 'right' });
    
    yPos += 6;

    // --- MODERN LEGEND WITH ICONS ---
    doc.setFillColor(COLORS.rowAlt[0], COLORS.rowAlt[1], COLORS.rowAlt[2]);
    doc.roundedRect(M, yPos, pageWidth - 2 * M, 12, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
    doc.text(toAscii("DURUM KODLARI / STATUS CODES:"), M + 3, yPos + 4);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    
    const legendItems = [
        { code: "A", desc: "Aktivite / Activity", color: COLORS.danger },
        { code: "K", desc: "Kirik / Broken", color: COLORS.warning },
        { code: "T", desc: "Temiz / Clean", color: COLORS.success },
        { code: "P", desc: "Pasif / Passive", color: COLORS.textGray },
        { code: "Y", desc: "Yenilendi / Renewed", color: COLORS.accent },
        { code: "X", desc: "Ulasilamadi / No Access", color: COLORS.textLight }
    ];
    
    let legendX = M + 3;
    legendItems.forEach((item, idx) => {
        if (idx === 3) {
            legendX = M + 3;
            yPos += 4;
        }
        
        // Color indicator
        doc.setFillColor(item.color[0], item.color[1], item.color[2]);
        doc.circle(legendX, yPos + 6.5, 1.5, 'F');
        
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.setFont("helvetica", "bold");
        doc.text(item.code + ":", legendX + 3, yPos + 7);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
        doc.text(toAscii(item.desc), legendX + 8, yPos + 7);
        
        legendX += 45;
    });

    yPos += 8;

    // --- PREPARE TABLE DATA ---
    const sortedVisits = [...visits].sort((a, b) => 
        new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
    );

    const tableHeaders = [
        { title: toAscii("Sayi No"), dataKey: 'code' },
        { title: toAscii("Bolge / Konum"), dataKey: 'name' },
        ...sortedVisits.map(v => ({
            title: format(new Date(v.visit_date), 'dd.MM.yy'),
            dataKey: `v_${v.visit_date}`
        }))
    ];

    const sortedStations = [...stations].sort((a, b) => 
        (a.order_no || 0) - (b.order_no || 0)
    );

    const tableBody = sortedStations.map(station => {
        const row: any = {
            name: toAscii(station.name),
            code: station.code || station.id.substring(0, 6)
        };

        sortedVisits.forEach(visit => {
            const check = visit.equipment_checks?.[station.id];
            let status = "-";
            if (check) {
                if (check.activity) status = "A";
                else if (check.broken) status = "K";
                else if (check.missing) status = "K";
                else if (check.renewed) status = "Y";
                else if (check.unreachable) status = "X";
                else status = "P";
            }
            row[`v_${visit.visit_date}`] = status;
        });

        return row;
    });

    // --- MODERN TABLE ---
    doc.autoTable({
        startY: yPos,
        columns: tableHeaders,
        body: tableBody,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 2.5,
            lineColor: COLORS.border,
            lineWidth: 0.15,
            textColor: COLORS.textDark,
            halign: 'center',
            valign: 'middle',
            fontStyle: 'normal'
        },
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 3
        },
        alternateRowStyles: {
            fillColor: COLORS.rowAlt
        },
        columnStyles: {
            0: { 
                cellWidth: 18, 
                fontStyle: 'bold',
                fillColor: [248, 250, 252],
                textColor: COLORS.primary
            },
            1: { 
                cellWidth: 60, 
                halign: 'left',
                fontStyle: 'normal'
            }
        },
        didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.dataKey.toString().startsWith('v_')) {
                const val = data.cell.raw;
                if (val === 'A') {
                    data.cell.styles.textColor = COLORS.danger;
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [254, 242, 242]; // Light red bg
                } else if (val === 'K') {
                    data.cell.styles.textColor = COLORS.warning;
                    data.cell.styles.fontStyle = 'bold';
                } else if (val === 'Y') {
                    data.cell.styles.textColor = COLORS.accent;
                    data.cell.styles.fontStyle = 'bold';
                } else if (val === 'T') {
                    data.cell.styles.textColor = COLORS.success;
                    data.cell.styles.fontStyle = 'bold';
                } else if (val === 'P') {
                    data.cell.styles.textColor = COLORS.textLight;
                }
            }
        },
        didDrawPage: (data: any) => {
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
            
            const docRef = `DOK: IPM-F-04  |  REV: 00`;
            doc.text(toAscii(docRef), M, footerY + 2);
            
            doc.text(toAscii(`Olusturulma: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`), pageWidth / 2, footerY + 2, { align: 'center' });
            
            doc.setFont("helvetica", "bold");
            doc.text(`${doc.getNumberOfPages()}`, pageWidth - M, footerY + 2, { align: 'right' });
        }
    });

    // Calculate summary statistics
    const totalStations = stations.length;
    const totalVisits = visits.length;
    let totalActivities = 0;
    let totalBroken = 0;
    
    visits.forEach(visit => {
        Object.values(visit.equipment_checks || {}).forEach((check: any) => {
            if (check.activity) totalActivities++;
            if (check.broken || check.missing) totalBroken++;
        });
    });

    // Add summary section at the end
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    
    if (finalY < pageHeight - 40) {
        // Summary box
        doc.setFillColor(COLORS.headerBg[0], COLORS.headerBg[1], COLORS.headerBg[2]);
        doc.roundedRect(M, finalY, pageWidth - 2 * M, 20, 2, 2, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.text(toAscii("OZET / SUMMARY"), M + 3, finalY + 5);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        
        const summaryText = [
            `Toplam Istasyon Sayisi: ${totalStations}`,
            `Kontrol Sayisi: ${totalVisits}`,
            `Tespit Edilen Aktivite: ${totalActivities}`,
            `Hasarli/Kayip Istasyon: ${totalBroken}`
        ];
        
        let summaryX = M + 3;
        summaryText.forEach((text, idx) => {
            doc.text(toAscii(text), summaryX, finalY + 12);
            summaryX += 70;
        });
    }

    const safeName = toAscii((customerName || 'kemirgen').replace(/[^a-zA-Z0-9]/g, '_'));
    const fileName = `Kemirgen_Izleme_${safeName}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
};