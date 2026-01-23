import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Search, Download, CheckSquare, XSquare, Eye, Loader2, Filter, ReceiptText, Plus, Save, X, Printer, User, Building, Calendar, CreditCard, FileText } from 'lucide-react';
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
  description?: string;
  is_checked_by_admin: boolean;
  customer: { kisa_isim: string } | null;
  branch: { sube_adi: string } | null;
  operator: { name: string } | null;
}

// Form verisi için arayüz
interface ReceiptFormData {
  customer_id: string;
  branch_id: string;
  receipt_no: string;
  amount: string;
  receipt_date: string;
  payment_method: string;
  description: string;
}

interface DropdownItem {
  id: string;
  name: string;
}

const AdminCollectionReceipts: React.FC = () => {
  // --- STATE TANIMLARI ---
  const [receipts, setReceipts] = useState<CollectionReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [checkedStatusFilter, setCheckedStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Yeni Makbuz Ekleme State'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerList, setCustomerList] = useState<DropdownItem[]>([]);
  const [branchList, setBranchList] = useState<DropdownItem[]>([]);
  
  // ✅ YENİ: Detay Görüntüleme State'leri
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CollectionReceipt | null>(null);
  
  const initialFormData: ReceiptFormData = {
    customer_id: '',
    branch_id: '',
    receipt_no: '',
    amount: '',
    receipt_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'bank_transfer',
    description: ''
  };
  
  const [formData, setFormData] = useState<ReceiptFormData>(initialFormData);

  // --- DATA FETCHING ---
  useEffect(() => {
    fetchReceipts();
    fetchCustomers();
  }, []);

  // Müşteri değiştiğinde şubeleri getir
  useEffect(() => {
    if (formData.customer_id) {
      fetchBranches(formData.customer_id);
    } else {
      setBranchList([]);
    }
  }, [formData.customer_id]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
    if (data) {
      setCustomerList(data.map(c => ({ id: c.id, name: c.kisa_isim })));
    }
  };

  const fetchBranches = async (customerId: string) => {
    const { data } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', customerId).order('sube_adi');
    if (data) {
      setBranchList(data.map(b => ({ id: b.id, name: b.sube_adi })));
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collection_receipts')
        .select(`
          id, receipt_no, amount, receipt_date, payment_method, created_at, is_checked_by_admin, description,
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

  // --- İŞLEM FONKSİYONLARI ---

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.amount || !formData.receipt_no) {
      toast.error('Lütfen zorunlu alanları doldurun (Müşteri, Tutar, Makbuz No).');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('collection_receipts').insert({
        receipt_no: formData.receipt_no,
        customer_id: formData.customer_id,
        branch_id: formData.branch_id || null,
        amount: parseFloat(formData.amount),
        receipt_date: formData.receipt_date,
        payment_method: formData.payment_method,
        description: formData.description,
        created_by: user?.id,
        is_checked_by_admin: true
      });

      if (error) throw error;

      toast.success('Tahsilat makbuzu başarıyla oluşturuldu.');
      setIsModalOpen(false);
      setFormData(initialFormData);
      fetchReceipts();

    } catch (err: any) {
      toast.error('Makbuz oluşturulurken hata: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckReceipt = useCallback(async (receiptId: string, isChecked: boolean) => {
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

  // ✅ YENİ: Detay Görüntüleme Fonksiyonu
  const handleViewDetails = (receipt: CollectionReceipt) => {
    setSelectedReceipt(receipt);
    setIsDetailModalOpen(true);
  };

  // ✅ YENİ: Yazdırma Fonksiyonu
  const handlePrint = () => {
    window.print();
  };

  // --- YARDIMCI FONKSİYONLAR ---

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
      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center justify-center">
        <CheckSquare className="w-3 h-3 mr-1" /> Onaylandı
      </span>
    ) : (
      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center justify-center">
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
      'Operatör': receipt.operator?.name || 'Admin',
      'Ödeme Yöntemi': getPaymentMethodText(receipt.payment_method),
      'Açıklama': receipt.description || '-',
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8 print:hidden">
        <h1 className="text-4xl font-bold text-gray-800">Tahsilat Makbuzları Yönetimi</h1>
        <div className="flex gap-2">
            <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
                <Plus size={20} /> Makbuz Oluştur
            </button>
            <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
            >
                <Download size={20} /> Excel'e Aktar
            </button>
        </div>
      </header>

      {/* Arama ve Filtreleme (Print'te Gizli) */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100 print:hidden">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Makbuz no, müşteri, şube veya operatör ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
          >
            <Filter className="w-5 h-5" /> Filtrele
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Tümü</option>
                <option value="checked">Onaylandı</option>
                <option value="pending">Beklemede</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 print:hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Makbuz No</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarih</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Müşteri / Şube</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tahsil Eden</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ödeme Tipi</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Tutar</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                        <ReceiptText className="w-12 h-12 text-gray-300 mb-2" />
                        <p>Gösterilecek tahsilat makbuzu bulunamadı.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReceipts.map(receipt => (
                  <tr key={receipt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{receipt.receipt_no}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{format(new Date(receipt.receipt_date), 'dd.MM.yyyy')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{receipt.customer?.kisa_isim || '-'}</div>
                        <div className="text-xs text-gray-500">{receipt.branch?.sube_adi}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {receipt.operator?.name ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {receipt.operator.name}
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                Admin
                            </span>
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{getPaymentMethodText(receipt.payment_method)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={receipt.is_checked_by_admin}
                        onChange={(e) => handleCheckReceipt(receipt.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mb-1 cursor-pointer"
                      />
                      <div>{getCheckedStatusBadge(receipt.is_checked_by_admin)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                        {receipt.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(receipt)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Detay Göster"
                      >
                        <Eye size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MAKBUZ OLUŞTURMA MODALI --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ReceiptText className="text-blue-600" /> Yeni Tahsilat Makbuzu
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateReceipt} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Müşteri Seçimi */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri <span className="text-red-500">*</span></label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value, branch_id: '' })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {customerList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Şube Seçimi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şube (Opsiyonel)</label>
                  <select
                    value={formData.branch_id}
                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                    disabled={!formData.customer_id}
                  >
                    <option value="">Genel (Merkez)</option>
                    {branchList.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* Makbuz No */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Makbuz No <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.receipt_no}
                    onChange={(e) => setFormData({ ...formData, receipt_no: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Örn: 2024-001"
                    required
                  />
                </div>

                {/* Tutar */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (TL) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono font-semibold"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Tarih */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={formData.receipt_date}
                    onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                {/* Ödeme Yöntemi */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-4 mt-1">
                    {[
                      { val: 'bank_transfer', label: 'Havale/EFT' },
                      { val: 'credit_card', label: 'Kredi Kartı' },
                      { val: 'cash', label: 'Nakit' },
                      { val: 'other', label: 'Diğer' }
                    ].map(opt => (
                      <label key={opt.val} className="flex items-center cursor-pointer">
                        <input
                          type="radio"
                          name="payment_method"
                          value={opt.val}
                          checked={formData.payment_method === opt.val}
                          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Açıklama */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Varsa notlarınız..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-md shadow-blue-200"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ DETAY GÖRÜNTÜLEME MODALI */}
      {isDetailModalOpen && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:w-full">
            
            {/* Header (Print'te Gizli) */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 print:hidden">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ReceiptText className="text-blue-600" /> Tahsilat Makbuzu Detayı
              </h2>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* İçerik */}
            <div className="p-8 print:p-0">
                
                {/* Makbuz Başlığı (Logo Yerine Gelebilir) */}
                <div className="text-center mb-8 border-b-2 border-dashed border-gray-200 pb-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">TAHSİLAT MAKBUZU</h1>
                    <p className="text-gray-500 font-mono text-sm">No: {selectedReceipt.receipt_no}</p>
                    <p className="text-gray-400 text-xs mt-1">{format(new Date(selectedReceipt.created_at), 'dd.MM.yyyy HH:mm')}</p>
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                    
                    {/* Tutar (Öne Çıkan) */}
                    <div className="col-span-2 bg-green-50 border border-green-100 p-4 rounded-lg flex justify-between items-center">
                        <span className="text-green-700 font-semibold">Tahsil Edilen Tutar</span>
                        <span className="text-2xl font-bold text-green-700">
                            {selectedReceipt.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Müşteri</label>
                        <div className="flex items-start gap-2 text-gray-800 font-medium">
                            <User size={16} className="mt-0.5 text-gray-400"/>
                            {selectedReceipt.customer?.kisa_isim}
                        </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Şube</label>
                        <div className="flex items-start gap-2 text-gray-800">
                            <Building size={16} className="mt-0.5 text-gray-400"/>
                            {selectedReceipt.branch?.sube_adi || 'Genel Merkez'}
                        </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Tarih</label>
                        <div className="flex items-start gap-2 text-gray-800">
                            <Calendar size={16} className="mt-0.5 text-gray-400"/>
                            {format(new Date(selectedReceipt.receipt_date), 'dd MMMM yyyy', { locale: tr })}
                        </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Ödeme Yöntemi</label>
                        <div className="flex items-start gap-2 text-gray-800">
                            <CreditCard size={16} className="mt-0.5 text-gray-400"/>
                            {getPaymentMethodText(selectedReceipt.payment_method)}
                        </div>
                    </div>

                    <div className="col-span-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Açıklama</label>
                        <div className="flex items-start gap-2 text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 min-h-[60px]">
                            <FileText size={16} className="mt-0.5 text-gray-400 shrink-0"/>
                            {selectedReceipt.description || 'Açıklama girilmemiş.'}
                        </div>
                    </div>

                    <div className="col-span-2 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                        <span>Tahsil Eden: <strong>{selectedReceipt.operator?.name || 'Admin'}</strong></span>
                        <span>Durum: {selectedReceipt.is_checked_by_admin ? 'Onaylandı' : 'Beklemede'}</span>
                    </div>
                </div>
            </div>

            {/* Footer (Print'te Gizli) */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 print:hidden">
                <button 
                    onClick={() => setIsDetailModalOpen(false)} 
                    className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                    Kapat
                </button>
                <button 
                    onClick={handlePrint} 
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-md"
                >
                    <Printer size={18} /> Yazdır
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCollectionReceipts;