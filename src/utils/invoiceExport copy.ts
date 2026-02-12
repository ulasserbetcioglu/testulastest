import * as XLSX from 'xlsx';

import { format } from 'date-fns';

import { tr } from 'date-fns/locale';



interface InvoiceItem {

  description: string;

  explanation?: string;

  quantity: number;

  unitPrice: number;

  vatRate: number;

  warehouseName?: string;

  discountAmount?: number;

  oivRate?: number;

  accommodationTaxRate?: number;

}



interface InvoiceData {

  customerName: string;

  invoiceName: string;

  invoiceDate: string;

  currency?: string;

  exchangeRate?: number;

  dueDate?: string;

  paymentTLEquivalent?: number;

  invoiceType?: string;

  invoiceSeries?: string;

  invoiceNumber?: string;

  category: string;

  items: InvoiceItem[];

  branchName?: string;

}



export const getLastWeekdayOfMonth = (year: number, month: number): Date => {

  const lastDay = new Date(year, month, 0);

  const dayOfWeek = lastDay.getDay();

  if (dayOfWeek === 6) { // Saturday

    lastDay.setDate(lastDay.getDate() - 1);

  } else if (dayOfWeek === 0) { // Sunday

    lastDay.setDate(lastDay.getDate() - 2);

  }

  return lastDay;

};



export const formatDateForInvoice = (date: Date): string => {

  return format(date, 'dd.MM.yyyy', { locale: tr });

};



export const exportInvoicesToExcel = (invoices: InvoiceData[], filename: string): void => {

  const data: any[] = [];

  data.push({});

  data.push({});

  data.push({

    'MÜŞTERİ ÜNVANI *': 'MÜŞTERİ ÜNVANI *',

    'FATURA İSMİ': 'FATURA İSMİ',

    'FATURA TARİHİ': 'FATURA TARİHİ',

    'DÖVİZ CİNSİ': 'DÖVİZ CİNSİ',

    'DÖVİZ KURU': 'DÖVİZ KURU',

    'VADE TARİHİ': 'VADE TARİHİ',

    'TAHSİLAT TL KARŞILIĞI': 'TAHSİLAT TL KARŞILIĞI',

    'FATURA TÜRÜ': 'FATURA TÜRÜ',

    'FATURA SERİ': 'FATURA SERİ',

    'FATURA SIRA NO': 'FATURA SIRA NO',

    'KATEGORİ': 'KATEGORİ',

    'HİZMET/ÜRÜN *': 'HİZMET/ÜRÜN *',

    'HİZMET/ÜRÜN AÇIKLAMASI': 'HİZMET/ÜRÜN AÇIKLAMASI',

    'ÇIKIŞ DEPOSU *': 'ÇIKIŞ DEPOSU *',

    'MİKTAR *': 'MİKTAR *',

    'BİRİM FİYATI *': 'BİRİM FİYATI *',

    'İNDİRİM TUTARI': 'İNDİRİM TUTARI',

    'KDV ORANI *': 'KDV ORANI *',

    'ÖİV ORANI': 'ÖİV ORANI',

    'KONAKLAMA VERGİSİ ORANI': 'KONAKLAMA VERGİSİ ORANI'

  });



  invoices.forEach(invoice => {

    if (invoice.items.length > 0) {

      const firstItem = invoice.items[0];

      const dateParts = invoice.invoiceDate.split('.');

      const day = parseInt(dateParts[0], 10);

      const month = parseInt(dateParts[1], 10) - 1;

      const year = parseInt(dateParts[2], 10);

      const invoiceDate = new Date(year, month, day);



      data.push({

        'MÜŞTERİ ÜNVANI *': invoice.customerName,

        'FATURA İSMİ': invoice.invoiceName,

        'FATURA TARİHİ': invoiceDate,

        'DÖVİZ CİNSİ': invoice.currency || '',

        'DÖVİZ KURU': invoice.exchangeRate || '',

        'VADE TARİHİ': invoice.dueDate || '',

        'TAHSİLAT TL KARŞILIĞI': invoice.paymentTLEquivalent || '',

        'FATURA TÜRÜ': invoice.invoiceType || '',

        'FATURA SERİ': invoice.invoiceSeries || '',

        'FATURA SIRA NO': invoice.invoiceNumber || '',

        'KATEGORİ': invoice.category,

        'HİZMET/ÜRÜN *': firstItem.description,

        'HİZMET/ÜRÜN AÇIKLAMASI': firstItem.explanation || '',

        'ÇIKIŞ DEPOSU *': firstItem.warehouseName || 'Ana Depo',

        'MİKTAR *': firstItem.quantity,

        'BİRİM FİYATI *': firstItem.unitPrice,

        'İNDİRİM TUTARI': firstItem.discountAmount || '',

        'KDV ORANI *': firstItem.vatRate,

        'ÖİV ORANI': firstItem.oivRate || '',

        'KONAKLAMA VERGİSİ ORANI': firstItem.accommodationTaxRate || ''

      });

      

      for (let i = 1; i < invoice.items.length; i++) {

        const item = invoice.items[i];

        data.push({

          'HİZMET/ÜRÜN *': item.description,

          'HİZMET/ÜRÜN AÇIKLAMASI': item.explanation || '',

          'ÇIKIŞ DEPOSU *': item.warehouseName || 'Ana Depo',

          'MİKTAR *': item.quantity,

          'BİRİM FİYATI *': item.unitPrice,

          'İNDİRİM TUTARI': item.discountAmount || '',

          'KDV ORANI *': item.vatRate,

          'ÖİV ORANI': item.oivRate || '',

          'KONAKLAMA VERGİSİ ORANI': item.accommodationTaxRate || ''

        });

      }

    }

  });



  const ws = XLSX.utils.json_to_sheet(data, { skipHeader: true });

  ws['!cols'] = [ { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 } ];

  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, 'Faturalar');

  XLSX.writeFile(wb, filename);

};



export const generateInvoicesFromSales = (

  sales: any[], 

  customers: any[]

): InvoiceData[] => {

  const invoices: InvoiceData[] = [];

  const salesByCustomerBranchAndMonth: Record<string, any[]> = {};

  

  sales.forEach(sale => {

    if (!sale.customer || !sale.customer.id) return;

    const saleDate = new Date(sale.sale_date);

    const monthYear = `${saleDate.getMonth() + 1}-${saleDate.getFullYear()}`;

    const branchId = sale.branch?.id || 'no-branch';

    const key = `${sale.customer.id}-${branchId}-${monthYear}`;

    if (!salesByCustomerBranchAndMonth[key]) {

      salesByCustomerBranchAndMonth[key] = [];

    }

    salesByCustomerBranchAndMonth[key].push(sale);

  });

  

  Object.entries(salesByCustomerBranchAndMonth).forEach(([key, customerSales]) => {

    if (customerSales.length === 0) return;

    const firstSale = customerSales[0];

    const customer = customers.find(c => c.id === firstSale.customer.id);

    if (!customer) return;

    

    const customerName = customer.cari_isim || customer.kisa_isim;

    const branchName = firstSale.branch?.sube_adi || '';

    const saleDate = new Date(firstSale.sale_date);

    const month = saleDate.getMonth() + 1;

    const year = saleDate.getFullYear();

    const monthName = format(saleDate, 'MMMM', { locale: tr }).toUpperCase();

    const invoiceDate = getLastWeekdayOfMonth(year, month);

    

    const items: InvoiceItem[] = [];

    customerSales.forEach(sale => {

      (sale.items || []).forEach((item: any) => {

        if (!item.product) return;

        let vatRate = item.product.vat_rate || 20;

        

        items.push({

          description: item.product.name,

          explanation: `${branchName} ${monthName} MALZEME BEDELİ`,

          quantity: item.quantity,

          unitPrice: item.unit_price,

          vatRate: vatRate,

          warehouseName: 'Ana Depo'

        });

      });

    });

    

    if (items.length > 0) {

      invoices.push({

        customerName,

        invoiceName: `${branchName} ${monthName} MALZEME BEDELİ`,

        invoiceDate: formatDateForInvoice(invoiceDate),

        category: 'MALZEME',

        items,

        branchName

      });

    }

  });

  

  return invoices;

};



export const generateInvoicesFromVisits = (

  visits: any[], 

  customers: any[]

): InvoiceData[] => {

  const invoices: InvoiceData[] = [];

  const visitsByCustomerBranchAndMonth: Record<string, any[]> = {};

  

  visits.forEach(visit => {

    if (!visit.customer || !visit.customer.id) return;

    const visitDate = new Date(visit.visit_date);

    const monthYear = `${visitDate.getMonth() + 1}-${visitDate.getFullYear()}`;

    const branchId = visit.branch?.id || 'no-branch';

    const key = `${visit.customer.id}-${branchId}-${monthYear}`;

    if (!visitsByCustomerBranchAndMonth[key]) {

      visitsByCustomerBranchAndMonth[key] = [];

    }

    visitsByCustomerBranchAndMonth[key].push(visit);

  });

  

  Object.entries(visitsByCustomerBranchAndMonth).forEach(([key, customerVisits]) => {

    if (customerVisits.length === 0) return;

    

    const firstVisit = customerVisits[0];

    const customer = customers.find(c => c.id === firstVisit.customer.id);

    if (!customer) return;

    

    const customerName = customer.cari_isim || customer.kisa_isim;

    const branchName = firstVisit.branch?.sube_adi || 'Genel';

    const visitDate = new Date(firstVisit.visit_date);

    const month = visitDate.getMonth() + 1;

    const year = visitDate.getFullYear();

    const monthName = format(visitDate, 'MMMM', { locale: tr }).toUpperCase();

    const invoiceDate = getLastWeekdayOfMonth(year, month);

    

    // ✅ DÜZELTME: Rapor numaraları birleştiriliyor.

    const reportNumbers = customerVisits

      .map((visit: any) => visit.report_number)

      .filter(Boolean) // null veya undefined olanları kaldır

      .join(', ');



    const visitCount = customerVisits.length;

    const items: InvoiceItem[] = [];

    

    let unitPrice = 0;

    const branch = firstVisit.branch;

    if (branch && branch.pricing && branch.pricing.per_visit_price) {

      unitPrice = branch.pricing.per_visit_price;

    } else if (customer.pricing && customer.pricing.per_visit_price) {

      unitPrice = customer.pricing.per_visit_price;

    } else if (branch && branch.pricing && branch.pricing.monthly_price) {

      unitPrice = branch.pricing.monthly_price / visitCount;

    } else if (customer.pricing && customer.pricing.monthly_price) {

      unitPrice = customer.pricing.monthly_price / visitCount;

    }

    

    if (unitPrice > 0) {

      items.push({

        description: 'Zararlı Mücadelesi',

        // ✅ DÜZELTME: 'reportNumber' yerine birleştirilmiş 'reportNumbers' kullanılıyor.

        explanation: `${branchName} ${monthName} ${reportNumbers ? `(Rapor No: ${reportNumbers}) ` : ''}Zararlı Mücadelesi`,

        quantity: visitCount,

        unitPrice,

        vatRate: 20

      });

    }

    

    if (items.length > 0) {

      invoices.push({

        customerName,

        invoiceName: `${monthName} Zararlı Mücadelesi`,

        invoiceDate: formatDateForInvoice(invoiceDate),

        category: 'HİZMET',

        items,

        branchName

      });

    }

  });

  

  return invoices;

};