import React, { useState } from 'react';
import { X, AlertCircle, ArrowRight, Save, Search, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import type { Customer } from '../../types';

interface MergeCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  customers: Customer[];
}

const MergeCustomerModal: React.FC<MergeCustomerModalProps> = ({ isOpen, onClose, onSave, customers }) => {
  const [targetId, setTargetId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [asBranch, setAsBranch] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [targetSearch, setTargetSearch] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');

  if (!isOpen) return null;

  const filteredTargetCustomers = customers.filter(c => 
    c.id !== sourceId && 
    (c.kisa_isim.toLowerCase().includes(targetSearch.toLowerCase()) || 
     c.musteri_no.toLowerCase().includes(targetSearch.toLowerCase()))
  );

  const filteredSourceCustomers = customers.filter(c => 
    c.id !== targetId && 
    (c.kisa_isim.toLowerCase().includes(sourceSearch.toLowerCase()) || 
     c.musteri_no.toLowerCase().includes(sourceSearch.toLowerCase()))
  );

  const handleMerge = async () => {
    if (!targetId || !sourceId) {
      toast.error('Lütfen hem hedef hem de kaynak müşteriyi seçin.');
      return;
    }

    if (targetId === sourceId) {
      toast.error('Aynı müşteriyi kendisiyle birleştiremezsiniz.');
      return;
    }

    const confirmMessage = asBranch 
      ? 'Kaynak müşteri SİLİNECEK ve tüm verileri hedef müşterinin YENİ ŞUBESİ olarak aktarılacaktır. Emin misiniz?' 
      : 'Kaynak müşteri SİLİNECEK ve tüm verileri doğrudan hedef müşteriye aktarılacaktır. Emin misiniz?';

    if (!window.confirm(confirmMessage)) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('merge_customers', {
        target_id: targetId,
        source_id: sourceId,
        as_branch: asBranch
      });

      if (error) throw error;

      toast.success('Müşteriler başarıyla birleştirildi.');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Merge error:', err);
      toast.error('Birleştirme işlemi sırasında hata oluştu: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Save size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Müşteri Birleştirme (Veri Aktarımı)</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-amber-800">
            <AlertCircle className="shrink-0" size={20} />
            <div className="text-sm">
              <p className="font-bold mb-1">Dikkat: Bu işlem geri alınamaz!</p>
              <p>Mükerrer veya yanlış açılan müşterileri ana kayıtlarla birleştirmek için kullanılır. Tüm ziyaretler, ekipmanlar ve raporlar hedef müşteriye aktarılacaktır.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Hedef Müşteri (Kalacak olan) */}
            <div className="space-y-4 p-4 border-2 border-blue-100 rounded-xl bg-blue-50/30">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-blue-900 uppercase tracking-wider">HEDEF MÜŞTERİ (Ana Kayıt)</label>
                <div className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded uppercase">Bu Kayıt Kalacak</div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Müşteri ara..."
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-inner">
                {filteredTargetCustomers.length > 0 ? (
                  filteredTargetCustomers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setTargetId(c.id); setTargetSearch(c.kisa_isim); }}
                      className={`p-3 border-b hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between ${targetId === c.id ? 'bg-blue-100 border-blue-300' : ''}`}
                    >
                      <div>
                        <div className="font-bold text-gray-800">{c.kisa_isim}</div>
                        <div className="text-xs text-gray-500">{c.musteri_no} | {c.sehir}</div>
                      </div>
                      {targetId === c.id && <CheckCircle size={18} className="text-blue-600" />}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 italic">Müşteri bulunamadı</div>
                )}
              </div>
            </div>

            {/* Orta Ok - Desktop Only */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-white p-2 rounded-full border shadow-lg text-gray-400">
              <ArrowRight size={24} />
            </div>

            {/* Kaynak Müşteri (Silinecek olan) */}
            <div className="space-y-4 p-4 border-2 border-red-100 rounded-xl bg-red-50/30">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-red-900 uppercase tracking-wider">KAYNAK MÜŞTERİ (Mükerrer)</label>
                <div className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase">Bu Kayıt Silinecek</div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Müşteri ara..."
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              <div className="h-64 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-inner">
                {filteredSourceCustomers.length > 0 ? (
                  filteredSourceCustomers.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setSourceId(c.id); setSourceSearch(c.kisa_isim); }}
                      className={`p-3 border-b hover:bg-red-50 cursor-pointer transition-colors flex items-center justify-between ${sourceId === c.id ? 'bg-red-100 border-red-300' : ''}`}
                    >
                      <div>
                        <div className="font-bold text-gray-800">{c.kisa_isim}</div>
                        <div className="text-xs text-gray-500">{c.musteri_no} | {c.sehir}</div>
                      </div>
                      {sourceId === c.id && <CheckCircle size={18} className="text-red-600" />}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400 italic">Müşteri bulunamadı</div>
                )}
              </div>
            </div>
          </div>

          {/* Opsiyonlar */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle size={18} className="text-green-600" />
              Aktarım Seçenekleri
            </h3>
            
            <label className="flex items-center gap-3 p-4 bg-white rounded-lg border cursor-pointer hover:border-blue-500 transition-all select-none group">
              <input
                type="checkbox"
                checked={asBranch}
                onChange={(e) => setAsBranch(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">Kaynak müşteriyi "Şube" olarak ekle</div>
                <div className="text-sm text-gray-500">Önerilen yöntemdir. Kaynak müşterinin verileri hedef müşteri altında yeni bir şubeye aktarılır.</div>
              </div>
            </label>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            disabled={!targetId || !sourceId || isLoading}
            onClick={handleMerge}
            className={`flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg transition-all shadow-lg active:scale-95 disabled:bg-gray-400 disabled:shadow-none disabled:active:scale-100 ${!isLoading && 'hover:bg-blue-700 hover:shadow-blue-200'}`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Aktarılıyor...
              </>
            ) : (
              <>
                <Save size={20} />
                Verileri Aktar ve Birleştir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeCustomerModal;
