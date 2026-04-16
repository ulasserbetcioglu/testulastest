import React from 'react';
import { X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface SaleItem {
  id: string;
  product_id: string;
  product: {
    name: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Sale {
  id: string;
  customer: {
    kisa_isim: string;
  };
  branch: {
    sube_adi: string;
  };
  sale_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'invoiced' | 'paid';
  items: SaleItem[];
  total_amount: number;
  invoice_number?: string;
  invoice_date?: string;
  payment_date?: string;
  notes?: string;
  visit_id?: string;
  visit?: {
    operator: {
      name: string;
    };
  };
}

interface SaleDetailsModalProps {
  sale: Sale;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (saleId: string, newStatus: string) => void;
}

const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({ 
  sale, 
  isOpen, 
  onClose,
  onStatusChange 
}) => {
  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Beklemede
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center">
            <X className="w-3 h-3 mr-1" />
            Reddedildi
          </span>
        );
      case 'invoiced':
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Faturalandı
          </span>
        );
      case 'paid':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
            <CheckCircle className="w-3 h-3 mr-1" />
            Ödendi
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Satış Detayları</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Satış No</h4>
              <p className="font-medium">{sale.id}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Tarih</h4>
              <p className="font-medium">{format(new Date(sale.sale_date), 'dd MMMM yyyy', { locale: tr })}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Müşteri</h4>
              <p className="font-medium">{sale.customer.kisa_isim}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Şube</h4>
              <p className="font-medium">{sale.branch.sube_adi}</p>
            </div>
            {sale.visit?.operator?.name && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Operatör</h4>
                <p className="font-medium">{sale.visit.operator.name}</p>
              </div>
            )}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Durum</h4>
              <div className="flex items-center">
                {getStatusBadge(sale.status)}
                <span className="ml-2">
                  {sale.status === 'pending' ? 'Beklemede' :
                   sale.status === 'approved' ? 'Onaylandı' :
                   sale.status === 'rejected' ? 'Reddedildi' :
                   sale.status === 'invoiced' ? 'Faturalandı' : 'Ödendi'}
                </span>
              </div>
            </div>
            {sale.invoice_number && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Fatura No</h4>
                <p className="font-medium">{sale.invoice_number}</p>
              </div>
            )}
            {sale.invoice_date && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Fatura Tarihi</h4>
                <p className="font-medium">{format(new Date(sale.invoice_date), 'dd MMMM yyyy', { locale: tr })}</p>
              </div>
            )}
            {sale.payment_date && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Ödeme Tarihi</h4>
                <p className="font-medium">{format(new Date(sale.payment_date), 'dd MMMM yyyy', { locale: tr })}</p>
              </div>
            )}
            {sale.visit_id && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Ziyaret No</h4>
                <p className="font-medium">{sale.visit_id}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 pb-2 border-b">Satış Kalemleri</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.unit_price.toLocaleString('tr-TR')} ₺</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">{item.total_price.toLocaleString('tr-TR')} ₺</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">Toplam:</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">{sale.total_amount.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3 pb-2 border-b">Notlar</h4>
              <p className="text-gray-700">{sale.notes}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Kapat
            </button>
            {onStatusChange && (
              <>
                {sale.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onStatusChange(sale.id, 'approved')}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => onStatusChange(sale.id, 'rejected')}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Reddet
                    </button>
                  </>
                )}
                {sale.status === 'approved' && (
                  <button
                    onClick={() => onStatusChange(sale.id, 'invoiced')}
                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                  >
                    Faturala
                  </button>
                )}
                {sale.status === 'invoiced' && (
                  <button
                    onClick={() => onStatusChange(sale.id, 'paid')}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Ödendi İşaretle
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailsModal;