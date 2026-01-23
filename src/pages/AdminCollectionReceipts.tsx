import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Search, Download, CheckSquare, XSquare, Eye, Loader2, Filter, ReceiptText, Plus, Save, X, Printer, Building } from 'lucide-react';
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

// --- YARDIMCI FONKSİYONLAR ---
const getPaymentMethodText = (method: string) => {
  switch (method) {
    case 'cash': return 'Nakit';
    case 'credit_card': return 'Kredi Kartı';
    case 'bank_transfer': return 'Havale / EFT';
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

// --- BİLEŞEN: MAKBUZ ÖNİZLEME MODALI (PROFESYONEL TASARIM) ---
const ReceiptPreview: React.FC<{ receipt: CollectionReceipt | null; onClose: () => void }> = ({ receipt, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null;

  const customerName = receipt.customer?.kisa_isim || 'Belirtilmemiş Müşteri';
  const branchName = receipt.branch?.sube_adi || 'Genel Merkez / Şube Yok';
  const operatorName = receipt.operator?.name || 'Yönetici (Admin)';

  const handlePrint = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=800,width=800');
      
      if (printWindow) {
        printWindow.document.write('<html><head><title>Tahsilat Makbuzu</title>');
        // Print stilleri
        printWindow.document.write(`
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 20px; -webkit-print-color-adjust: exact; }
            .receipt-container { border: 1px solid #e5e7eb; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-area { color: #1e40af; font-size: 24px; font-weight: 800; display: flex; align-items: center; gap: 10px; }
            .receipt-title { text-align: right; }
            .title-text { font-size: 20px; font-weight: 700; color: #1f2937; margin: 0; }
            .meta-text { font-size: 13px; color: #6b7280; margin-top: 5px; }
            .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
            .info-box { background-color: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #f3f4f6; }
            .label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; margin-bottom: 5px; display: block; }
            .value { font-size: 14px; font-weight: 600; color: #111827; margin: 0; }
            .total-section { background-color: #ecfdf5; border: 1px solid #d1fae5; padding: 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
            .total-label { font-size: 16px; font-weight: 700; color: #065f46; }
            .total-amount { font-size: 24px; font-weight: 800; color: #059669; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
            .sign-box { text-align: center; }
            .sign-line { height: 1px; background-color: #d1d5db; width: 80%; margin: 0 auto 10px auto; }
            .sign-label { font-size: 12px; color: #6b7280; font-weight: 500; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 10px; color: #9ca3af; }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:p-0">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Modal Başlığı */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <ReceiptText size={20} className="text-blue-600" /> Makbuz Önizleme
          </h3>
          <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        {/* Makbuz İçeriği (Yazdırılacak Alan) */}
        <div className="overflow-y-auto p-6 bg-gray-100 flex-1 flex justify-center">
          <div ref={receiptRef} className="bg-white p-8 shadow-md border border-gray-200 w-full max-w-[210mm] min-h-[140mm] relative receipt-container">
            
            {/* Üst Kısım: Logo ve Başlık */}
            <div className="header flex justify-between items-start border-b-2 border-gray-100 pb-6 mb-8">
              <div>
                <div className="logo-area flex items-center gap-2 text-blue-800 font-extrabold text-2xl mb-1">
                  <div className="w-8 h-8 bg-blue-800 rounded flex items-center justify-center text-white text-sm">İ</div>
                  İLAÇLAMATİK
                </div>
                <p className="text-xs text-gray-500 font-medium ml-1">Profesyonel Hizmet Çözümleri</p>
              </div>
              <div className="receipt-title text-right">
                <h2 className="title-text text-xl font-bold text-gray-800 tracking-tight uppercase">TAHSİLAT MAKBUZU</h2>
                <div className="meta-text text-sm text-gray-500 mt-1 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                  No: <span className="text-gray-900 font-bold">{receipt.receipt_no}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Tarih: {format(new Date(receipt.receipt_date), 'dd.MM.yyyy', { locale: tr })}
                </p>
              </div>
            </div>

            {/* Orta Kısım: Grid Bilgiler */}
            <div className="grid-container grid grid-cols-2 gap-8 mb-8">
              {/* Sol: Müşteri */}
              <div className="info-box bg-gray-50 p-4 rounded-lg border border-gray-100 h-full">
                <span className="label text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Müşteri Bilgileri</span>
                <p className="value text-base font-bold text-gray-900 mb-1">{customerName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building size={14} /> {branchName}
                </div>
              </div>
              
              {/* Sağ: Ödeme Detayları */}
              <div className="info-box bg-gray-50 p-4 rounded-lg border border-gray-100 h-full">
                <span className="label text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Ödeme Detayları</span>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Ödeme Yöntemi:</span>
                  <span className="text-sm font-semibold text-gray-900">{getPaymentMethodText(receipt.payment_method)}</span>
                </div>
                {receipt.description && (
                  <div className="text-xs text-gray-500 italic mt-2 border-t pt-2">
                    "{receipt.description}"
                  </div>
                )}
              </div>
            </div>

            {/* Alt Kısım: Tutar */}
            <div className="total-section bg-green-50 border border-green-100 p-5 rounded-lg flex justify-between items-center mb-10 shadow-sm">
              <span className="total-label text-green-800 font-bold text-lg">TAHSİL EDİLEN TUTAR</span>
              <span className="total-amount text-3xl font-extrabold text-green-700 tracking-tight">
                ₺{receipt.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* İmza Alanları */}
            <div className="signatures grid grid-cols-2 gap-12 mt-8">
              <div className="sign-box text-center">
                <div className="sign-line h-px bg-gray-300 w-3/4 mx-auto mb-2"></div>
                <p className="sign-label text-xs text-gray-500 font-medium">Tahsil Eden ({operatorName})</p>
                <p className="text-[10px] text-gray-400">İmza / Kaşe</p>
              </div>
              <div className="sign-box text-center">
                <div className="sign-line h-px bg-gray-300 w-3/4 mx-auto mb-2"></div>
                <p className="sign-label text-xs text-gray-500 font-medium">Ödeme Yapan</p>
                <p className="text-[10px] text-gray-400">İmza</p>
              </div>
            </div>

            {/* Footer */}
            <div className="footer mt-12 pt-4 border-t border-gray-100 text-center">
              <p className="text-[10px] text-gray-400">
                Bu belge elektronik ortamda oluşturulmuştur. Geçerli bir ödeme kanıtı niteliğindedir.<br/>
                Oluşturulma Zamanı: {format(new Date(receipt.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
              </p>
            </div>

          </div>
        </div>
        
        {/* Alt Butonlar */}
        <div className="p-4 border-t bg-white flex gap-3 print:hidden">
          <button onClick={handlePrint} className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-md transition-all">
            <Printer size={18} /> Yazdır
          </button>
          <button onClick={onClose} className="bg-gray-100 text-gray-700 py-2.5 px-6 rounded-lg hover:bg-gray-200 font-medium transition-all">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

// --- ANA SAYFA BİLEŞENİ ---
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
  
  // Detay Görüntüleme State'leri
  const [showPreview, setShowPreview] = useState(false);
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
        is_checked_by_admin: true // Admin oluşturduğu için otomatik onaylı
      });

      if (error) throw error;

      toast.success('Tahsilat makbuzu başarıyla oluşturuldu.');
      setIsModalOpen(false);
      setFormData(initialFormData);
      fetchReceipts(); // Listeyi yenile

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

  const handleViewDetails = (receipt: CollectionReceipt) => {
    setSelectedReceipt(receipt);
    setShowPreview(true);
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
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
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

      {/* Arama ve Filtreleme */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
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
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
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
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
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

      {/* ✅ DETAY GÖRÜNTÜLEME ve YAZDIRMA MODALI */}
      {showPreview && selectedReceipt && (
        <ReceiptPreview receipt={selectedReceipt} onClose={() => { setShowPreview(false); setSelectedReceipt(null); }} />
      )}
    </div>
  );
};

export default AdminCollectionReceipts;