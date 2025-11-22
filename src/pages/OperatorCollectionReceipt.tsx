// src/pages/OperatorCollectionReceipt.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase'; // Supabase yapılandırmanızın doğru olduğu varsayılmıştır
import { toast } from 'sonner'; // Toast bildirimleri için sonner kütüphanesi
import { Loader2, DollarSign, Calendar as CalendarIcon, User, Building, ReceiptText, Eye, Download, Plus, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- ARAYÜZLER (INTERFACES) ---
interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

interface Operator {
  id: string;
  auth_id: string;
  assigned_customers: string[] | null; // Eklendi
  assigned_branches: string[] | null; // Eklendi
}

interface CollectionReceipt {
  id: string;
  receipt_no: string;
  amount: number;
  receipt_date: string;
  payment_method: string;
  created_at: string;
  customer: { kisa_isim: string } | null;
  branch: { sube_adi: string } | null;
}

// --- BİLEŞENLER (COMPONENTS) ---

/**
 * Makbuz Önizleme Modalı
 */
const ReceiptPreview: React.FC<{ receipt: CollectionReceipt | null; onClose: () => void }> = ({ receipt, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!receipt) return null; // Ensure receipt object exists

  // Safely access customer and branch names, providing fallbacks
  const customerName = receipt.customer?.kisa_isim || 'Belirtilmemiş Müşteri';
  const branchName = receipt.branch?.sube_adi || 'Belirtilmemiş Şube';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Makbuz Önizleme</h3>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <div ref={receiptRef} className="p-6 bg-white">
          {/* Makbuz Tasarımı */}
          <div className="border-2 border-gray-300 p-6 bg-gradient-to-b from-blue-50 to-white">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-blue-800">TAHSİLAT MAKBUZU</h2>
              <div className="w-20 h-1 bg-blue-600 mx-auto mt-2"></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Makbuz No:</p>
                <p className="font-bold text-lg">{receipt.receipt_no}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tarih:</p>
                <p className="font-bold">{format(new Date(receipt.receipt_date), 'dd.MM.yyyy', { locale: tr })}</p>
              </div>
            </div>
            
            <div className="border-t border-gray-300 pt-4 mb-4">
              <div className="mb-3">
                <p className="text-sm text-gray-600">Müşteri:</p>
                <p className="font-semibold text-lg">{customerName}</p> {/* Use safe customerName */}
              </div>
              
              {receipt.branch && ( // Only show branch if branch object exists
                <div className="mb-3">
                  <p className="text-sm text-gray-600">Şube:</p>
                  <p className="font-semibold">{branchName}</p> {/* Use safe branchName */}
                </div>
              )}
              
              <div className="mb-3">
                <p className="text-sm text-gray-600">Ödeme Yöntemi:</p>
                <p className="font-semibold">
                  {receipt.payment_method === 'cash' && 'Nakit'}
                  {receipt.payment_method === 'credit_card' && 'Kredi Kartı'}
                  {receipt.payment_method === 'bank_transfer' && 'Banka Havalesi/EFT'}
                  {receipt.payment_method === 'other' && 'Diğer'}
                </p>
              </div>
            </div>
            
            <div className="border-t-2 border-blue-300 pt-4">
              <div className="flex justify-between items-center bg-blue-100 p-3 rounded">
                <p className="text-lg font-bold text-blue-800">TOPLAM TUTAR:</p>
                <p className="2xl font-bold text-blue-800">
                  ₺{(receipt.amount ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {/* Safely access amount */}
                </p>
              </div>
            </div>
            
            <div className="mt-6 text-center text-xs text-gray-500">
              <p>Bu makbuz {format(new Date(receipt.created_at), 'dd.MM.yyyy HH:mm', { locale: tr })} tarihinde oluşturulmuştur.</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t flex gap-2">
          <button
            onClick={() => {
              toast.info('İndirme özelliği demo sürümde mevcut değil');
            }}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Download size={16} />
            JPEG İndir
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

const OperatorCollectionReceipt: React.FC = () => {
  // --- STATE YÖNETİMİ ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOperator, setCurrentOperator] = useState<Operator | null>(null);
  const [assignedCustomers, setAssignedCustomers] = useState<Customer[]>([]);
  const [assignedBranches, setAssignedBranches] = useState<Branch[]>([]);
  const [receipts, setReceipts] = useState<CollectionReceipt[]>([]); // Makbuz listesi için state
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create'); // 'create' veya 'list'
  
  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [receiptAmount, setReceiptAmount] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>(format(new Date(), 'yyyy-MM-dd')); // Varsayılan olarak bugünün tarihi
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [receiptNo, setReceiptNo] = useState<string>(''); // Makbuz numarası alanı eklendi
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Liste filtreleme
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('');
  
  // Modal state
  const [selectedReceipt, setSelectedReceipt] = useState<CollectionReceipt | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Tek seferlik müşteri/şube giriş state'leri
  const [isOneTimeCustomer, setIsOneTimeCustomer] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualBranchName, setManualBranchName] = useState('');

  // --- Veri Çekme İşlevi ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Mevcut kullanıcıyı al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı. Lütfen giriş yapın.');

      // 2. Kullanıcının operatör ID'sini ve atamalarını al
      const { data: operatorData, error: operatorError } = await supabase
        .from('operators')
        .select('id, auth_id, assigned_customers, assigned_branches') // assigned_customers ve assigned_branches seçildi
        .eq('auth_id', user.id)
        .single();

      if (operatorError) throw operatorError;
      if (!operatorData) throw new Error('Operatör bilgisi bulunamadı.');
      setCurrentOperator(operatorData);
      const operatorId = operatorData.id;
      const operatorAssignedCustomers = operatorData.assigned_customers;
      const operatorAssignedBranches = operatorData.assigned_branches;

      // 3. Atanmış müşteri ID'lerine sahip tüm müşterileri çek (veya atanmamışsa tümünü)
      let customerQuery = supabase.from('customers').select('id, kisa_isim').eq('is_one_time', false).order('kisa_isim');
      if (operatorAssignedCustomers && operatorAssignedCustomers.length > 0) {
          customerQuery = customerQuery.in('id', operatorAssignedCustomers);
      }
      const { data: customersData, error: customersError } = await customerQuery;
      if (customersError) throw customersError;
      setAssignedCustomers(customersData || []);

      // 4. Atanmış şube ID'lerine sahip tüm şubeleri çek (veya atanmamışsa tümünü)
      let branchQuery = supabase.from('branches').select('id, sube_adi, customer_id').eq('is_one_time', false).order('sube_adi');
      if (operatorAssignedBranches && operatorAssignedBranches.length > 0) {
          branchQuery = branchQuery.in('id', operatorAssignedBranches);
      } else if (operatorAssignedCustomers && operatorAssignedCustomers.length > 0) {
          // Eğer belirli şube atamaları yoksa ama müşteri atamaları varsa, o müşterilerin şubelerini getir
          branchQuery = branchQuery.in('customer_id', operatorAssignedCustomers);
      }
      const { data: branchesData, error: branchesError } = await branchQuery;
      if (branchesError) throw branchesError;
      setAssignedBranches(branchesData || []);

      // 5. Operatörün makbuzlarını çek
      const { data: receiptsData, error: receiptsError } = await supabase
        .from('collection_receipts')
        .select(`
          id, receipt_no, amount, receipt_date, payment_method, created_at,
          customer:customer_id(kisa_isim),
          branch:branch_id(sube_adi)
        `)
        .eq('operator_id', operatorId) // Sadece kendi makbuzlarını gör
        .order('created_at', { ascending: false }); // En yeni makbuzlar üstte

      if (receiptsError) throw receiptsError;
      setReceipts(receiptsData || []);

    } catch (err: any) {
      setError(err.message);
      toast.error(`Veri yüklenirken bir hata oluştu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []); // Bağımlılıklar boş, sadece bir kere çalışacak

  useEffect(() => {
    fetchData();
  }, [fetchData]); // fetchData değiştiğinde tekrar çalıştır

  // Seçilen müşteriye göre şubeleri filtrele
  const filteredBranches = useMemo(() => {
    if (!selectedCustomerId) return assignedBranches;
    return assignedBranches.filter(branch => branch.customer_id === selectedCustomerId);
  }, [selectedCustomerId, assignedBranches]);

  // Makbuz listesini filtrele
  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      const matchesSearch = receipt.receipt_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            receipt.customer?.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPayment = selectedPaymentFilter ? receipt.payment_method === selectedPaymentFilter : true;
      return matchesSearch && matchesPayment;
    });
  }, [receipts, searchTerm, selectedPaymentFilter]);

  // Makbuz numarası oluşturma (basit bir örnek)
  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    // Mevcut makbuz sayısına göre basit bir numara üretimi
    const count = receipts.length + 1; 
    return `MKBZ-${year}-${String(count).padStart(3, '0')}`;
  };

  // --- Tahsilat Makbuzu Oluşturma İşlevi ---
  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault(); // Formun varsayılan submit davranışını engelle
    
    if (!currentOperator) {
      toast.error('Operatör bilgisi yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }

    // Form validasyonu
    if (!receiptAmount || !receiptDate || !paymentMethod) {
      toast.error('Lütfen tüm zorunlu alanları doldurun (Tutar, Tarih, Ödeme Yöntemi).');
      return;
    }
    if (isNaN(parseFloat(receiptAmount)) || parseFloat(receiptAmount) <= 0) {
      toast.error('Geçerli bir tutar giriniz.');
      return;
    }

    let finalCustomerId = selectedCustomerId;
    let finalBranchId = selectedBranchId;

    if (isOneTimeCustomer) {
      if (!manualCustomerName.trim()) {
        toast.error('Lütfen tek seferlik müşteri adını girin.');
        return;
      }
      
      // Yeni tek seferlik müşteri oluştur
      const { data: newCustomerData, error: newCustomerError } = await supabase
        .from('customers')
        .insert({ kisa_isim: manualCustomerName.trim(), is_one_time: true })
        .select('id')
        .single();

      if (newCustomerError) throw newCustomerError;
      finalCustomerId = newCustomerData.id;

      if (manualBranchName.trim()) {
        // Yeni tek seferlik şube oluştur
        const { data: newBranchData, error: newBranchError } = await supabase
          .from('branches')
          .insert({ sube_adi: manualBranchName.trim(), customer_id: finalCustomerId, is_one_time: true })
          .select('id')
          .single();
        
        if (newBranchError) throw newBranchError;
        finalBranchId = newBranchData.id;
      } else {
        finalBranchId = ''; // Manuel şube adı girilmediyse boş bırak
      }
    } else {
      if (!selectedCustomerId) {
        toast.error('Lütfen bir müşteri seçin.');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newReceiptNo = receiptNo || generateReceiptNumber(); // Eğer boşsa otomatik oluştur

      const { data, error } = await supabase
        .from('collection_receipts')
        .insert({
          operator_id: currentOperator.id,
          customer_id: finalCustomerId,
          branch_id: finalBranchId || null, // Şube seçilmediyse null gönder
          amount: parseFloat(receiptAmount),
          receipt_date: receiptDate,
          payment_method: paymentMethod,
          receipt_no: newReceiptNo,
        })
        .select(`
          id, receipt_no, amount, receipt_date, payment_method, created_at,
          customer:customer_id(kisa_isim),
          branch:branch_id(sube_adi)
        `); // Eklenen kaydı geri döndür ve ilişkili verileri çek

      if (error) throw error;

      toast.success('Tahsilat makbuzu başarıyla oluşturuldu!');
      
      // Yeni makbuzu listeye ekle
      if (data && data.length > 0) {
        setReceipts(prev => [data[0] as CollectionReceipt, ...prev]);
      }

      // Formu sıfırla
      setSelectedCustomerId('');
      setSelectedBranchId('');
      setReceiptAmount('');
      setReceiptDate(format(new Date(), 'yyyy-MM-dd'));
      setPaymentMethod('');
      setReceiptNo(''); // Makbuz numarasını da sıfırla
      setIsOneTimeCustomer(false);
      setManualCustomerName('');
      setManualBranchName('');

    } catch (err: any) {
      setError(err.message);
      toast.error(`Tahsilat makbuzu oluşturulurken hata: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER BÖLÜMÜ ---
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
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-inter">
      {/* Tab Navigation */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="flex">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'create' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Plus size={20} />
              Yeni Makbuz Oluştur
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 py-4 px-6 text-center font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ReceiptText size={20} />
              Makbuz Listesi ({receipts.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'create' ? (
        // Makbuz Oluşturma Formu
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 text-center">
              Tahsilat Makbuzu Oluştur
            </h2>
            
            <form onSubmit={handleCreateReceipt} className="space-y-5"> {/* form etiketi eklendi */}
              {/* Tek Seferlik Müşteri Seçeneği */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isOneTimeCustomer"
                  checked={isOneTimeCustomer}
                  onChange={(e) => {
                    setIsOneTimeCustomer(e.target.checked);
                    setSelectedCustomerId(''); // Seçimi sıfırla
                    setSelectedBranchId('');
                    setManualCustomerName('');
                    setManualBranchName('');
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isOneTimeCustomer" className="ml-2 block text-sm text-gray-700">
                  Tek Seferlik Müşteri
                </label>
              </div>

              {isOneTimeCustomer ? (
                // Manuel Müşteri ve Şube Girişi
                <>
                  <div>
                    <label htmlFor="manualCustomerName" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <User size={16} /> Müşteri Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="manualCustomerName"
                      value={manualCustomerName}
                      onChange={(e) => setManualCustomerName(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tek seferlik müşteri adı"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="manualBranchName" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Building size={16} /> Şube Adı (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      id="manualBranchName"
                      value={manualBranchName}
                      onChange={(e) => setManualBranchName(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tek seferlik şube adı"
                    />
                  </div>
                </>
              ) : (
                // Mevcut Müşteri ve Şube Seçimi
                <>
                  {/* Müşteri Seçimi */}
                  <div>
                    <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <User size={16} /> Müşteri <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="customer"
                      value={selectedCustomerId}
                      onChange={(e) => {
                        setSelectedCustomerId(e.target.value);
                        setSelectedBranchId(''); // Müşteri değişince şube seçimini sıfırla
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Müşteri Seçiniz</option>
                      {assignedCustomers.map(customer => (
                        <option key={customer.id} value={customer.id}>{customer.kisa_isim}</option>
                      ))}
                    </select>
                  </div>

                  {/* Şube Seçimi (Opsiyonel) */}
                  <div>
                    <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <Building size={16} /> Şube (Opsiyonel)
                    </label>
                    <select
                      id="branch"
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!selectedCustomerId || filteredBranches.length === 0}
                    >
                      <option value="">Şube Seçiniz</option>
                      {filteredBranches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.sube_adi}</option>
                      ))}
                    </select>
                    {!selectedCustomerId && <p className="text-xs text-gray-500 mt-1">Önce müşteri seçiniz.</p>}
                    {selectedCustomerId && filteredBranches.length === 0 && <p className="text-xs text-gray-500 mt-1">Seçilen müşteriye ait şube bulunmuyor.</p>}
                  </div>
                </>
              )}

              {/* Tahsilat Tutarı */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <DollarSign size={16} /> Tutar <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: 150.75"
                  required
                />
              </div>

              {/* Tahsilat Tarihi */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <CalendarIcon size={16} /> Tarih <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Ödeme Yöntemi */}
              <div>
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <ReceiptText size={16} /> Ödeme Yöntemi <span className="text-red-500">*</span>
                </label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Yöntem Seçiniz</option>
                  <option value="cash">Nakit</option>
                  <option value="credit_card">Kredi Kartı</option>
                  <option value="bank_transfer">Banka Havalesi/EFT</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              {/* Makbuz Numarası (Opsiyonel) */}
              <div>
                <label htmlFor="receiptNo" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <ReceiptText size={16} /> Makbuz Numarası (Opsiyonel)
                </label>
                <input
                  type="text"
                  id="receiptNo"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn: MKBZ-2025-001"
                />
              </div>

              {/* Form Gönderme Butonu */}
              <button
                type="submit"
                className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Makbuz Oluşturuluyor...
                  </>
                ) : (
                  'Makbuz Oluştur'
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // Makbuz Listesi
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg">
            {/* Filtreler */}
            <div className="p-6 border-b">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Makbuz no veya müşteri adı ile ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={selectedPaymentFilter}
                    onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Tüm Ödeme Yöntemleri</option>
                    <option value="cash">Nakit</option>
                    <option value="credit_card">Kredi Kartı</option>
                    <option value="bank_transfer">Banka Havalesi/EFT</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Makbuz Listesi */}
            <div className="p-6">
              {filteredReceipts.length === 0 ? (
                <div className="text-center py-12">
                  <ReceiptText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Henüz makbuz bulunamadı</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredReceipts.map(receipt => (
                    <div key={receipt.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {receipt.receipt_no}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {format(new Date(receipt.receipt_date), 'dd.MM.yyyy', { locale: tr })}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Müşteri:</p>
                              <p className="font-semibold">{receipt.customer?.kisa_isim}</p>
                            </div>
                            
                            {receipt.branch && (
                              <div>
                                <p className="text-sm text-gray-600">Şube:</p>
                                <p className="font-semibold">{receipt.branch.sube_adi}</p>
                              </div>
                            )}
                            
                            <div>
                              <p className="text-sm text-gray-600">Tutar:</p>
                              <p className="font-bold text-lg text-green-600">
                                ₺{receipt.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <button
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              setShowPreview(true);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <Eye size={16} />
                            Görüntüle
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Makbuz Önizleme Modal */}
      {showPreview && (
        <ReceiptPreview 
          receipt={selectedReceipt} 
          onClose={() => {
            setShowPreview(false);
            setSelectedReceipt(null);
          }} 
        />
      )}
    </div>
  );
};

export default OperatorCollectionReceipt;
