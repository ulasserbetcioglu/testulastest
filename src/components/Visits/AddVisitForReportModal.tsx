import React, { useState, useEffect, useMemo } from 'react'; // ✅ DEĞİŞİKLİK: useMemo eklendi
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, Save, Loader2 as Loader, Calendar, User, Building } from 'lucide-react';

// Arayüz (Interface) tanımları
interface AddVisitForReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData: {
    reportNumber: string;
    operatorId: string;
  };
}

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
    name: string;
}

const AddVisitForReportModal: React.FC<AddVisitForReportModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  // State'ler
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Form State'leri
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState('09:00');
  const [visitType, setVisitType] = useState('periyodik');
  const [notes, setNotes] = useState('');

  // Modal açıldığında gerekli verileri çek
  useEffect(() => {
    if (!isOpen) return;

    const fetchInitialData = async () => {
      setIsDataLoading(true);
      try {
        const [customersRes, branchesRes, operatorRes] = await Promise.all([
          supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
          supabase.from('branches').select('id, sube_adi, customer_id'),
          supabase.from('operators').select('id, name').eq('id', initialData.operatorId).single()
        ]);

        if (customersRes.error) throw customersRes.error;
        if (branchesRes.error) throw branchesRes.error;
        if (operatorRes.error) throw operatorRes.error;

        setCustomers(customersRes.data || []);
        setBranches(branchesRes.data || []);
        setOperator(operatorRes.data || null);

      } catch (error: any) {
        toast.error('Gerekli veriler çekilirken hata oluştu: ' + error.message);
        onClose(); // Hata durumunda modalı kapat
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchInitialData();
  }, [isOpen, initialData.operatorId]);

  // Formu gönderme fonksiyonu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedBranch || !visitDate || !visitTime) {
      toast.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    setIsLoading(true);

    try {
      const visitDateTime = `${visitDate}T${visitTime}:00`;

      const { error } = await supabase.from('visits').insert({
        customer_id: selectedCustomer,
        branch_id: selectedBranch,
        operator_id: initialData.operatorId,
        report_number: initialData.reportNumber,
        visit_date: visitDateTime,
        status: 'completed', // Eksik rapor girildiği için varsayılan olarak 'tamamlandı'
        visit_type: visitType,
        notes: notes,
      });

      if (error) throw error;

      toast.success(`Rapor #${initialData.reportNumber} için ziyaret başarıyla eklendi!`);
      onSave(); // Ana tabloyu yenilemek için
      onClose(); // Modalı kapat

    } catch (error: any) {
      toast.error('Ziyaret eklenirken bir hata oluştu: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBranches = useMemo(() => {
    if (!selectedCustomer) return [];
    return branches.filter(b => b.customer_id === selectedCustomer);
  }, [selectedCustomer, branches]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Eksik Rapor İçin Ziyaret Ekle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {isDataLoading ? (
            <div className="p-10 text-center"><Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></div>
        ) : (
            <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                    <p className="text-sm text-blue-800"><span className="font-semibold">Rapor Numarası:</span> {initialData.reportNumber}</p>
                    <p className="text-sm text-blue-800 mt-1"><span className="font-semibold">Operatör:</span> {operator?.name || 'Yükleniyor...'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
                        <select
                            value={selectedCustomer}
                            onChange={(e) => {
                                setSelectedCustomer(e.target.value);
                                setSelectedBranch(''); // Müşteri değiştiğinde şubeyi sıfırla
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="" disabled>Müşteri Seçin...</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Şube</label>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            disabled={!selectedCustomer}
                            required
                        >
                            <option value="" disabled>Şube Seçin...</option>
                            {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ziyaret Tarihi</label>
                        <input
                            type="date"
                            value={visitDate}
                            onChange={(e) => setVisitDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ziyaret Saati</label>
                        <input
                            type="time"
                            value={visitTime}
                            onChange={(e) => setVisitTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ziyaret Türü</label>
                    <select
                        value={visitType}
                        onChange={(e) => setVisitType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="periyodik">Periyodik Ziyaret</option>
                        <option value="ucretli">Ücretli Ziyaret</option>
                        <option value="acil">Acil Çağrı</option>
                        <option value="teknik">Teknik İnceleme</option>
                        <option value="ilk">İlk Ziyaret</option>
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Ziyaretle ilgili notlar..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
            <div className="flex justify-end items-center p-4 bg-gray-50 border-t rounded-b-xl">
                <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 mr-2"
                >
                İptal
                </button>
                <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center min-w-[120px]"
                >
                {isLoading ? <Loader size={20} className="animate-spin" /> : <><Save size={18} className="mr-2" /> Ziyareti Kaydet</>}
                </button>
            </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default AddVisitForReportModal;
