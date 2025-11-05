import * as XLSX from 'xlsx';
import type { Customer } from '../types';

export const exportCustomersToExcel = (customers: Customer[]) => {
  const worksheet = XLSX.utils.json_to_sheet(
    customers.map(customer => ({
      'Müşteri No': customer.musteri_no,
      'İsim': customer.kisa_isim,
      'Telefon': customer.telefon || '',
      'E-posta': customer.email || '',
      'Adres': customer.adres || '',
      'Şehir': customer.sehir || ''
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Müşteriler');
  
  XLSX.writeFile(workbook, 'musteriler.xlsx');
};

export const importCustomersFromExcel = async (file: File): Promise<Partial<Customer>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const customers = jsonData.map((row: any) => ({
          kisa_isim: row['İsim']?.toString() || '',
          telefon: row['Telefon']?.toString() || '',
          email: row['E-posta']?.toString() || '',
          adres: row['Adres']?.toString() || '',
          sehir: row['Şehir']?.toString() || ''
        }));
        
        resolve(customers);
      } catch (error) {
        reject(new Error('Excel dosyası işlenirken bir hata oluştu'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Dosya okunamadı'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export const downloadExcelTemplate = () => {
  const template = [
    {
      'İsim': '',
      'Telefon': '',
      'E-posta': '',
      'Adres': '',
      'Şehir': ''
    }
  ];
  
  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Müşteriler');
  
  XLSX.writeFile(workbook, 'musteri-sablonu.xlsx');
};