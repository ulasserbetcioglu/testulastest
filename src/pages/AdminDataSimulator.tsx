import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { 
  Wand2, 
  Building2, 
  MapPin, 
  Loader2, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Settings2,
  Save,
  Edit3,
  Eye
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

// Müşterinin Gördüğü Trend Analiz Sayfasını İçe Aktarıyoruz
import BranchTrendAnalysis from './BranchTrendAnalysis';

const AdminDataSimulator = () => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [refreshPreview, setRefreshPreview] = useState(0); // Alt bileşeni yenilemek için
  
  // Seçim State'leri
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [currentBranchName, setCurrentBranchName] = useState('');
  
  // Tarih ve Veri
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [visits, setVisits] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  
  // Simülasyon & Düzenleme
  const [selectedVisits, setSelectedVisits] = useState<string[]>([]);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [targetEquipmentType, setTargetEquipmentType] = useState<string>('all');
  
  // MANUEL DÜZENLEME STATE'LERİ
  const [editModeId, setEditModeId] = useState<string | null>(null); // Hangi ziyaret düzenleniyor
  const [editFormData, setEditFormData] = useState<Record<string, any>>({}); // Düzenlenen veriler

  const [simParams, setSimParams] = useState({
    activityPercent: 20,
    minVal: 1,
    maxVal: 5
  });

  // 1. Müşterileri Çek
  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('id, kisa_isim, cari_isim').order('kisa_isim');
      setCustomers(data || []);
    };
    fetchCustomers();
  }, []);

  // 2. Şubeleri Çek
  useEffect(() => {
    if (selectedCustomerId) {
      const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', selectedCustomerId).order('sube_adi');
        setBranches(data || []);
        setSelectedBranchId('');
      };
      fetchBranches();
    } else {
      setBranches([]);
    }
  }, [selectedCustomerId]);

  // Şube adı güncelleme (Rapor başlığı için)
  useEffect(() => {
    if(selectedBranchId) {
      const b = branches.find(br => br.id === selectedBranchId);
      if(b) setCurrentBranchName(b.sube_adi);
    }
  }, [selectedBranchId]);

  // 3. Verileri Getir
  const fetchData = async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      // Ekipmanları al
      const { data: eqData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, equipment:equipment_id(name)')
        .eq('branch_id', selectedBranchId);
      
      setEquipments(eqData || []);

      // Ziyaretleri al
      const { data: visitData } = await supabase
        .from('visits')
        .select('id, visit_date, status, equipment_checks')
        .eq('branch_id', selectedBranchId)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .order('visit_date', { ascending: false });

      setVisits(visitData || []);
      setSelectedVisits([]);
      setRefreshPreview(prev => prev + 1); // Önizlemeyi yenile
      
      if (visitData?.length === 0) toast.info('Ziyaret bulunamadı.');
    } catch (error) {
      toast.error('Veri hatası');
    } finally {
      setLoading(false);
    }
  };

  const equipmentTypes = ['all', ...new Set(equipments.map(e => e.equipment?.name).filter(Boolean))];

  // --- SİMÜLASYON (OTOMATİK) ---
  const applySimulation = async () => {
    if (selectedVisits.length === 0) { toast.error('Ziyaret seçmelisiniz.'); return; }
    if (!confirm(`${selectedVisits.length} ziyaret güncellenecek. Onaylıyor musunuz?`)) return;

    setProcessing(true);
    try {
      const updates = selectedVisits.map(async (visitId) => {
        const originalVisit = visits.find(v => v.id === visitId);
        if (!originalVisit) return;
        const newChecks = { ...originalVisit.equipment_checks } || {};
        const targetEquipments = equipments.filter(eq => targetEquipmentType === 'all' ? true : eq.equipment?.name === targetEquipmentType);

        targetEquipments.forEach(eq => {
          const key = eq.equipment_code || eq.id;
          const isActive = Math.random() < (simParams.activityPercent / 100);

          if (isActive) {
            const randomValue = Math.floor(Math.random() * (simParams.maxVal - simParams.minVal + 1)) + simParams.minVal;
            newChecks[key] = {
              status: 'problem',
              control_result: randomValue,
              description: `Simülasyon: ${randomValue} adet`,
              activity: true
            };
          } else {
            newChecks[key] = { status: 'ok', control_result: 'Temiz', activity: false };
          }
        });

        await supabase.from('visits').update({ equipment_checks: newChecks, status: 'completed' }).eq('id', visitId);
      });

      await Promise.all(updates);
      toast.success('Simülasyon tamamlandı!');
      fetchData(); 
    } catch (e) { toast.error('Hata'); } finally { setProcessing(false); }
  };

  // --- MANUEL DÜZENLEME BAŞLAT ---
  const startEditing = (visit: any) => {
    setEditModeId(visit.id);
    setExpandedVisitId(visit.id);
    // Mevcut veriyi form state'ine kopyala
    setEditFormData(visit.equipment_checks || {});
  };

  // --- MANUEL VERİ DEĞİŞTİRME ---
  const handleEditChange = (key: string, value: string) => {
    const numVal = parseFloat(value);
    const isNumber = !isNaN(numVal);
    
    // Hem sayısal hem string değerleri destekleyen yapı
    setEditFormData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        // Eğer sayı girildiyse sayı, yazıysa yazı kaydet
        control_result: isNumber ? numVal : value,
        status: (isNumber && numVal > 0) || (typeof value === 'string' && value.toLowerCase().includes('var')) ? 'problem' : 'ok',
        activity: (isNumber && numVal > 0) || (typeof value === 'string' && value.toLowerCase().includes('var'))
      }
    }));
  };

  // --- MANUEL KAYDET ---
  const saveManualEdit = async (visitId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('visits')
        .update({ equipment_checks: editFormData, status: 'completed' })
        .eq('id', visitId);

      if (error) throw error;
      toast.success('Ziyaret verileri güncellendi.');
      setEditModeId(null);
      fetchData();
    } catch (error) {
      toast.error('Kaydetme hatası');
    } finally {
      setProcessing(false);
    }
  };

  // Tümünü Seç
  const toggleSelectAll = () => {
    if (selectedVisits.length === visits.length) setSelectedVisits([]);
    else setSelectedVisits(visits.map(v => v.id));
  };

  // Tekil Seçim
  const toggleSelect = (id: string) => {
    if (selectedVisits.includes(id)) setSelectedVisits(prev => prev.filter(v => v !== id));
    else setSelectedVisits(prev => [...prev, id]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-20">
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Wand2 className="w-8 h-8 text-purple-600" /> Admin Veri Simülatörü
        </h1>
        <p className="text-gray-500 mt-2">Trend analizlerini manipüle etmek, test etmek ve müşteri görünümünü kontrol etmek için kullanılır.</p>
      </div>

      {/* 1. SEÇİM ALANI */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Müşteri</label>
          <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
            <option value="">Seçiniz...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim || c.cari_isim}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Şube</label>
          <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={!selectedCustomerId}>
            <option value="">Seçiniz...</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="w-full p-2 border rounded-lg text-sm"/>
          <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="w-full p-2 border rounded-lg text-sm"/>
        </div>
        <button onClick={fetchData} disabled={!selectedBranchId || loading} className="bg-gray-900 text-white p-2 rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2 text-sm font-medium">
          {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <RefreshCw className="w-4 h-4"/>} Listele
        </button>
      </div>

      {/* 2. SİMÜLASYON PANELİ */}
      {visits.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 p-5 rounded-xl shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-4 border-b border-purple-200 pb-2">
            <Settings2 className="w-5 h-5 text-purple-700"/>
            <h3 className="font-bold text-purple-900">Otomatik Veri Üretimi (Opsiyonel)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-1">Ekipman Türü</label>
              <select value={targetEquipmentType} onChange={(e) => setTargetEquipmentType(e.target.value)} className="w-full p-2 border border-purple-300 rounded-lg text-sm">
                <option value="all">Tüm Ekipmanlar</option>
                {equipmentTypes.filter(t => t !== 'all').map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-1">Aktivite Oranı: %{simParams.activityPercent}</label>
              <input type="range" min="0" max="100" step="5" value={simParams.activityPercent} onChange={(e) => setSimParams({...simParams, activityPercent: Number(e.target.value)})} className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-purple-800 mb-1">Değer Aralığı</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="100" value={simParams.minVal} onChange={(e) => setSimParams({...simParams, minVal: Number(e.target.value)})} className="w-16 p-2 border border-purple-300 rounded-lg text-sm text-center"/>
                <span className="text-purple-400">-</span>
                <input type="number" min="1" max="100" value={simParams.maxVal} onChange={(e) => setSimParams({...simParams, maxVal: Number(e.target.value)})} className="w-16 p-2 border border-purple-300 rounded-lg text-sm text-center"/>
              </div>
            </div>
            <div className="flex items-end">
              <button onClick={applySimulation} disabled={processing || selectedVisits.length === 0} className="w-full bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {processing ? <Loader2 className="animate-spin w-4 h-4"/> : <Wand2 className="w-4 h-4"/>} Uygula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ZİYARET LİSTESİ VE MANUEL DÜZENLEME */}
      {visits.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-12">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div className="flex items-center gap-3">
              <button onClick={toggleSelectAll} className="text-gray-500 hover:text-gray-700">
                {selectedVisits.length === visits.length && visits.length > 0 ? <CheckCircle2 className="w-5 h-5 text-purple-600"/> : <CheckCircle2 className="w-5 h-5 text-gray-300"/>}
              </button>
              <span className="text-sm font-semibold text-gray-700">Ziyaret Listesi & Manuel Düzenleme</span>
            </div>
            <span className="text-xs bg-white border px-2 py-1 rounded text-gray-500">Toplam: {visits.length}</span>
          </div>

          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {visits.map((visit) => {
              const checkCount = visit.equipment_checks ? Object.keys(visit.equipment_checks).length : 0;
              const isSelected = selectedVisits.includes(visit.id);
              const isExpanded = expandedVisitId === visit.id;
              const isEditing = editModeId === visit.id;

              return (
                <div key={visit.id} className={`transition-colors ${isSelected ? 'bg-purple-50/30' : 'hover:bg-gray-50'} ${isEditing ? 'bg-orange-50 border-l-4 border-orange-400' : ''}`}>
                  <div className="flex items-center p-4 gap-4">
                    <button onClick={() => toggleSelect(visit.id)} className="text-purple-600">
                      {isSelected ? <CheckCircle2 className="w-5 h-5"/> : <div className="w-5 h-5 border-2 border-gray-300 rounded-full"/>}
                    </button>

                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-900">{format(parseISO(visit.visit_date), 'dd MMMM yyyy', { locale: tr })}</div>
                      <div className="text-xs text-gray-500 font-mono">{visit.id.slice(0, 8)}</div>
                    </div>

                    <div className="w-40 text-sm">
                      {checkCount > 0 ? <span className="text-green-600 font-medium">{checkCount} Kayıt</span> : <span className="text-gray-400">Veri Yok</span>}
                    </div>

                    {isEditing ? (
                      <div className="flex gap-2">
                        <button onClick={() => saveManualEdit(visit.id)} disabled={processing} className="p-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 text-xs">
                          {processing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Kaydet
                        </button>
                        <button onClick={() => setEditModeId(null)} className="p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs">İptal</button>
                      </div>
                    ) : (
                      <button onClick={() => startEditing(visit)} className="p-2 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1 text-xs border border-blue-200">
                        <Edit3 className="w-4 h-4"/> Düzenle
                      </button>
                    )}

                    <button onClick={() => setExpandedVisitId(isExpanded ? null : visit.id)} className="p-1 hover:bg-gray-200 rounded-full text-gray-500">
                      {isExpanded ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="bg-gray-100 p-4 border-t border-gray-200 shadow-inner">
                      {isEditing ? (
                        // --- DÜZENLEME MODU (INPUTLAR) ---
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {equipments.map(eq => {
                            const key = eq.equipment_code || eq.id;
                            const val = editFormData[key];
                            const displayVal = typeof val === 'object' ? val.control_result : val;
                            
                            return (
                              <div key={key} className="bg-white p-2 rounded border border-orange-200 shadow-sm flex items-center justify-between">
                                <div className="text-xs font-bold text-gray-700 mr-2 truncate w-24" title={key}>{key}</div>
                                <input 
                                  type="text" 
                                  value={displayVal || ''} 
                                  onChange={(e) => handleEditChange(key, e.target.value)}
                                  className="border border-gray-300 rounded p-1 text-xs w-full focus:ring-2 focus:ring-orange-500 outline-none"
                                  placeholder="Değer gir (Sayı veya Metin)"
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // --- GÖRÜNTÜLEME MODU (READ-ONLY) ---
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {visit.equipment_checks && Object.entries(visit.equipment_checks).map(([key, val]: [string, any]) => (
                            <div key={key} className="bg-white p-2 rounded border border-gray-200 text-xs flex justify-between items-center">
                              <span className="font-mono font-semibold text-gray-700">{key}</span>
                              <span className={`px-2 py-0.5 rounded font-medium ${
                                String(typeof val==='object'?val.control_result:val).match(/yok|temiz|0/i) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {typeof val === 'object' ? val.control_result : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. CANLI ÖNİZLEME ALANI (Müşteri Görünümü) */}
      {selectedBranchId && visits.length > 0 && (
        <div className="mt-16 border-t-4 border-gray-800 pt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
              <Eye className="w-8 h-8 text-blue-600"/> 
              Müşteri Görünümü & PDF Çıktı
            </h2>
            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
              Aşağıdaki alan, müşterinin gördüğü ekranın birebir aynısıdır.
            </div>
          </div>
          
          <div className="border-4 border-dashed border-gray-300 rounded-xl p-2 bg-gray-50">
            {/* React Key özelliği sayesinde refreshPreview değişince bileşen yeniden yüklenir */}
            <BranchTrendAnalysis 
              key={refreshPreview} 
              branchId={selectedBranchId} 
              branchName={currentBranchName} 
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDataSimulator;