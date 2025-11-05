import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Search, Download, CheckSquare, XSquare, Eye, Loader2, Filter, ReceiptText } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as XLSX from 'xlsx';

// --- ARAYÜZLER (INTERFACES) ---
interface CollectionReceipt {
  id: string;
  receipt_no: string;
  amount: number;
  receipt_date: string;
  payment_method: string;
  created_at: string;
  is_checked_by_admin: boolean;
  customer: { kisa_isim: string } | null;
  branch: { sube_adi: string } | null;
  operator: { name: string } | null;
}

const AdminCollectionReceipts: React.FC = () => {
  const [receipts, setReceipts] = useState<CollectionReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [checkedStatusFilter, setCheckedStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collection_receipts')
        .select(`
          id, receipt_no, amount, receipt_date, payment_method, created_at, is_checked_by_admin,
          customer:customer_id(kisa_isim),
          branch:branch_id(sube_adi),
          operator:operator_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error("Makbuzlar yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckReceipt = useCallback(async (receiptId: string, isChecked: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== 'admin@ilaclamatik.com') {
      toast.error('Bu işlemi gerçekleştirmek için admin yetkisine sahip olmalısınız.');
      return;
    }
    try {
      const { error } = await supabase
        .from('collection_receipts')
        .update({ is_checked_by_admin: isChecked })
        .eq('id', receiptId);

      if (error) throw error;

      setReceipts(prev => prev.map(receipt =>
        receipt.id === receiptId ? { ...receipt, is_checked_by_admin: isChecked } : receipt
      ));
      toast.success('Makbuz durumu güncellendi.');
    } catch (err: any) {
      toast.error(`Makbuz durumu güncellenirken hata: ${err.message}`);
    }
  }, []);

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'Nakit';
      case 'credit_card': return 'Kredi Kartı';
      case 'bank_transfer': return 'Banka Havalesi/EFT';
      case 'other': return 'Diğer';
      default: return method;
    }
  };

  const getCheckedStatusBadge = (isChecked: boolean) => {
    return isChecked ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
        <CheckSquare className="w-3 h-3 mr-1" /> Onaylandı
      </span>
    ) : (
      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center">
        <XSquare className="w-3 h-3 mr-1" /> Beklemede
      </span>
    );
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      const matchesSearch = 
        receipt.receipt_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.customer?.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.branch?.sube_adi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.operator?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPaymentMethod = selectedPaymentMethod ? receipt.payment_method === selectedPaymentMethod : true;
      const matchesCheckedStatus = checkedStatusFilter === '' ? true : 
                                   checkedStatusFilter === 'checked' ? receipt.is_checked_by_admin : !receipt.is_checked_by_admin;
      
      return matchesSearch && matchesPaymentMethod && matchesCheckedStatus;
    });
  }, [receipts, searchTerm, selectedPaymentMethod, checkedStatusFilter]);

  const exportToExcel = () => {
    const data = filteredReceipts.map(receipt => ({
      'Makbuz No': receipt.receipt_no,
      'Tutar': receipt.amount,
      'Tarih': format(new Date(receipt.receipt_date), 'dd.MM.yyyy'),
      'Müşteri': receipt.customer?.kisa_isim || '-',
      'Şube': receipt.branch?.sube_adi || '-',
      'Operatör': receipt.operator?.name || '-',
      'Ödeme Yöntemi': getPaymentMethodText(receipt.payment_method),
      'Onay Durumu': receipt.is_checked_by_admin ? 'Onaylandı' : 'Beklemede',
      'Oluşturulma Tarihi': format(new Date(receipt.created_at), 'dd.MM.yyyy HH:mm'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tahsilat Makbuzları');
    XLSX.writeFile(wb, 'tahsilat_makbuzlari.xlsx');
    toast.success('Excel dosyası başarıyla indirildi.');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span className="ml-3 text-lg text-gray-700">Veriler Yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-red-600 text-lg p-4 bg-red-100 rounded-lg shadow-md">
          <p>Hata oluştu:</p>
          <p className="font-mono mt-2">{error}</p>
          <p className="mt-4 text-sm text-gray-700">Lütfen sayfayı yenilemeyi deneyin veya yöneticinize başvurun.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Tahsilat Makbuzları Yönetimi</h1>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Download size={20} /> Excel'e Aktar
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Makbuz no, müşteri, şube veya operatör ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Filter className="w-5 h-5" /> Filtrele
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tümü</option>
                <option value="cash">Nakit</option>
                <option value="credit_card">Kredi Kartı</option>
                <option value="bank_transfer">Banka Havalesi/EFT</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Onay Durumu</label>
              <select
                value={checkedStatusFilter}
                onChange={(e) => setCheckedStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tümü</option>
                <option value="checked">Onaylandı</option>
                <option value="pending">Beklemede</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Makbuz No</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operatör</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ödeme Yöntemi</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Onay Durumu</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    Gösterilecek tahsilat makbuzu bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map(receipt => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{receipt.receipt_no}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{receipt.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(receipt.receipt_date), 'dd.MM.yyyy')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{receipt.customer?.kisa_isim || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{receipt.branch?.sube_adi || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{receipt.operator?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getPaymentMethodText(receipt.payment_method)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={receipt.is_checked_by_admin}
                        onChange={(e) => handleCheckReceipt(receipt.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="mt-1">{getCheckedStatusBadge(receipt.is_checked_by_admin)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toast.info('Detay görüntüleme özelliği eklenecek.')}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCollectionReceipts;
