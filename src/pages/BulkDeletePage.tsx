import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Users, Building, Trash2, Search, Loader2, AlertTriangle, X } from 'lucide-react';

// --- ARAYÜZLER (INTERFACES) ---
interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer: {
    kisa_isim: string;
  } | null;
}

// --- ONAY MODALI BİLEŞENİ ---
const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemCount: number;
  itemType: string;
}> = ({ isOpen, onClose, onConfirm, itemCount, itemType }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex items-start">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Silme İşlemini Onayla</h3>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Seçili <strong>{itemCount}</strong> adet {itemType} kalıcı olarak silinecektir. Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?
              </p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button onClick={onConfirm} type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm">
            Evet, Sil
          </button>
          <button onClick={onClose} type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">
            İptal
          </button>
        </div>
      </div>
    </div>
  );
};


// --- ANA SAYFA BİLEŞENİ ---
const BulkDeletePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'branches'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const customersPromise = supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
      const branchesPromise = supabase.from('branches').select('id, sube_adi, customer:customer_id(kisa_isim)').order('sube_adi');

      const [customersRes, branchesRes] = await Promise.all([customersPromise, branchesPromise]);

      if (customersRes.error) throw customersRes.error;
      if (branchesRes.error) throw branchesRes.error;

      setCustomers(customersRes.data || []);
      setBranches(branchesRes.data || []);

    } catch (error: any) {
      toast.error("Veriler yüklenirken bir hata oluştu: " + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // DÜZELTME: Veri yapısı, arama ve filtreleme için birleştirildi.
  const displayItems = useMemo(() => {
    let list;
    if (activeTab === 'customers') {
      list = customers.map(c => ({ id: c.id, name: c.kisa_isim }));
    } else {
      list = branches.map(b => ({
        id: b.id,
        name: `${b.sube_adi} (${b.customer?.kisa_isim || 'Bilinmeyen'})`,
      }));
    }

    if (!searchTerm) return list;

    return list.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeTab, customers, branches, searchTerm]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(displayItems.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };
  
  const handleDelete = async () => {
    setShowConfirmModal(false);
    if (selectedIds.size === 0) {
      toast.warning("Lütfen silmek için en az bir öğe seçin.");
      return;
    }

    const table = activeTab === 'customers' ? 'customers' : 'branches';
    const idsToDelete = Array.from(selectedIds);

    try {
      const { error } = await supabase.from(table).delete().in('id', idsToDelete);
      if (error) throw error;
      
      toast.success(`${idsToDelete.length} adet kayıt başarıyla silindi.`);
      setSelectedIds(new Set());
      fetchData(); // Veriyi yenile
    } catch (error: any) {
      toast.error("Silme işlemi sırasında bir hata oluştu: " + error.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <ConfirmationModal 
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleDelete}
        itemCount={selectedIds.size}
        itemType={activeTab === 'customers' ? 'müşteri' : 'şube'}
      />

      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Toplu Silme İşlemleri</h1>
        </div>
        <button 
          onClick={() => setShowConfirmModal(true)} 
          disabled={selectedIds.size === 0} 
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={18} /> Seçilenleri Sil ({selectedIds.size})
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b">
          <div className="flex -mb-px">
            <button onClick={() => { setActiveTab('customers'); setSelectedIds(new Set()); setSearchTerm(''); }} className={`px-4 py-3 font-medium text-sm transition-colors duration-200 ${activeTab === 'customers' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>
              Müşteriler
            </button>
            <button onClick={() => { setActiveTab('branches'); setSelectedIds(new Set()); setSearchTerm(''); }} className={`px-4 py-3 font-medium text-sm transition-colors duration-200 ${activeTab === 'branches' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'}`}>
              Şubeler
            </button>
          </div>
        </div>
        
        <div className="p-4">
            <div className="relative mb-4">
                <input type="text" placeholder="Arama yap..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 pl-10 border border-gray-300 rounded-lg"/>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-3 text-left">
                  <input type="checkbox" onChange={handleSelectAll} checked={displayItems.length > 0 && selectedIds.size === displayItems.length} className="rounded"/>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{activeTab === 'customers' ? 'Müşteri Adı' : 'Şube Adı (Müşteri)'}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={2} className="p-8 text-center"><Loader2 className="animate-spin inline-block"/></td></tr>
              ) : displayItems.length === 0 ? (
                <tr><td colSpan={2} className="p-8 text-center text-gray-500">Gösterilecek kayıt bulunamadı.</td></tr>
              ) : (
                displayItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${selectedIds.has(item.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4">
                      <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => handleSelect(item.id)} className="rounded"/>
                    </td>
                    {/* DÜZELTME: Artık birleştirilmiş 'name' özelliği kullanılıyor. */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
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

export default BulkDeletePage;
