// src/components/PaidMaterialSales/MonthlyReportModal.tsx
import React from 'react';
import { X, Download } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as XLSX from 'xlsx';

// --- ARAYÜZLER (INTERFACES) ---
interface MonthlyReportItem {
  product_id: string;
  product_name: string;
  total_quantity: number;
  unit_price: number | null; // Updated to allow null
  total_price: number | null; // Updated to allow null
}

interface MonthlyReport {
  branch_id: string | null;
  branch_name: string;
  customer_id: string;
  customer_name: string;
  month: string;
  year: number;
  visit_count: number;
  items: MonthlyReportItem[]; // Bu alanın varlığı garanti ediliyor
  total_amount: number;
  operator_name?: string;
}

interface MonthlyReportModalProps {
  report: MonthlyReport | null; // Raporun null olabileceğini belirt
  isOpen: boolean;
  onClose: () => void;
}

const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ 
  report, 
  isOpen, 
  onClose 
}) => {
  // DÜZELTME: Rapor veya isOpen false ise hiçbir şey render etme
  if (!isOpen || !report) {
    return null;
  }

  // DÜZELTME: Güvenli veri erişimi. `report.items` yoksa boş dizi kullan.
  const items = report.items || [];

  const exportToExcel = () => {
    // Hazırlık verileri
    const reportData = [
      // Header row with report info
      { 
        'Müşteri': report.customer_name, 
        'Şube': report.branch_name, 
        'Dönem': `${report.month} ${report.year}`,
        'Ziyaret Sayısı': report.visit_count,
        'Operatör': report.operator_name || 'Belirtilmemiş',
        'Toplam Tutar': report.total_amount.toLocaleString('tr-TR') + ' ₺'
      },
      {}, // Boş satır
      { 
        'Malzeme Kodu': 'Malzeme Kodu', 
        'Malzeme Adı': 'Malzeme Adı', 
        'Miktar': 'Miktar', 
        'Birim Fiyat': 'Birim Fiyat (₺)', 
        'Toplam': 'Toplam (₺)' 
      }
    ];

    // Ürünleri ekle
    items.forEach(item => {
      reportData.push({
        'Malzeme Kodu': item.product_id,
        'Malzeme Adı': item.product_name,
        'Miktar': item.total_quantity,
        'Birim Fiyat': (item.unit_price ?? 0).toLocaleString('tr-TR'), // Added ?? 0
        'Toplam': (item.total_price ?? 0).toLocaleString('tr-TR') // Added ?? 0
      });
    });

    // Toplam satırını ekle
    reportData.push(
      {},
      {
        'Malzeme Kodu': '', 'Malzeme Adı': '', 'Miktar': '',
        'Birim Fiyat': 'GENEL TOPLAM:',
        'Toplam': report.total_amount.toLocaleString('tr-TR')
      }
    );

    const worksheet = XLSX.utils.json_to_sheet(reportData, { skipHeader: true });
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Aylık Rapor');
    const filename = `${report.branch_name.replace(/\s+/g, '_')}_${report.month}_${report.year}_Rapor.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold">Aylık Rapor: {report.branch_name} - {report.month} {report.year}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div><h4 className="text-sm font-medium text-gray-500 mb-1">Müşteri</h4><p className="font-medium">{report.customer_name}</p></div>
            <div><h4 className="text-sm font-medium text-gray-500 mb-1">Şube</h4><p className="font-medium">{report.branch_name}</p></div>
            <div><h4 className="text-sm font-medium text-gray-500 mb-1">Operatör</h4><p className="font-medium">{report.operator_name || '-'}</p></div>
            <div><h4 className="text-sm font-medium text-gray-500 mb-1">Dönem</h4><p className="font-medium">{report.month} {report.year}</p></div>
            <div><h4 className="text-sm font-medium text-gray-500 mb-1">Ziyaret Sayısı</h4><p className="font-medium">{report.visit_count}</p></div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 pb-2 border-b">Malzeme Listesi</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Malzeme</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Miktar</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.total_quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">{(item.unit_price ?? 0).toLocaleString('tr-TR')} ₺</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">{(item.total_price ?? 0).toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                        <td colSpan={4} className="text-center py-10 text-gray-500">Bu rapor için malzeme kullanımı bulunmuyor.</td>
                    </tr>
                  )}
                </tbody>
                {items.length > 0 && (
                    <tfoot>
                        <tr className="bg-gray-50">
                        <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Genel Toplam:</td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{report.total_amount.toLocaleString('tr-TR')} ₺</td>
                        </tr>
                    </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Kapat</button>
            <button onClick={exportToExcel} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center">
              <Download className="w-4 h-4 mr-2" /> Excel'e Aktar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyReportModal;

