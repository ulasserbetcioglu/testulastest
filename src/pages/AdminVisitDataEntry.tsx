import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
  Search, Calendar, Save, Loader2, CheckCircle, AlertCircle,
  Filter, MapPin, Box, ChevronRight, ArrowLeft, RefreshCw
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // useSearchParams eklendi

// --- Interfaces ---
interface Customer { id: string; kisa_isim: string; }
interface Branch { id: string; sube_adi: string; customer_id: string; }

interface Visit {
  id: string;
  visit_date: string;
  status: string;
  visit_type: string;
  equipment_checks: Record<string, any>;
  branch_id: string;
  operator?: { name: string };
}

interface BranchEquipment {
  id: string;
  equipment_code: string;
  department: string;
  equipment: {
    id: string;
    name: string;
    properties?: Record<string, {
      type: 'boolean' | 'number' | 'string';
      label: string;
    }>;
  };
}

const AdminVisitDataEntry: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // URL parametrelerini oku

  // --- State ---
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Selection State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  // Data State
  const [equipmentList, setEquipmentList] = useState<BranchEquipment[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Filters
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });

  // --- Effects ---
  useEffect(() => {
    fetchCustomers();
  }, []);

  // URL Parametrelerini Kontrol Et ve Otomatik Seç
  useEffect(() => {
    const paramCustomerId = searchParams.get('customer_id');
    const paramBranchId = searchParams.get('branch_id');

    if (paramCustomerId && customers.length > 0) {
      setSelectedCustomerId(paramCustomerId);

      // Müşteri seçildikten sonra şubeleri çek
      fetchBranches(paramCustomerId).then(() => {
        if (paramBranchId) {
          setSelectedBranchId(paramBranchId);
          // Şube de seçilirse ziyaretleri otomatik getir (küçük bir gecikme ile state'in oturmasını bekle)
          setTimeout(() => {
            fetchVisits(paramBranchId);
          }, 100);
        }
      });
    }
  }, [customers, searchParams]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchBranches(selectedCustomerId);
      setVisits([]);
      setSelectedVisit(null);
    } else {
      setBranches([]);
    }
  }, [selectedCustomerId]);

  // --- Data Fetching ---
  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, kisa_isim').eq('is_active', true).order('kisa_isim');
    setCustomers(data || []);
  };

  const fetchBranches = async (customerId: string) => {
    const { data } = await supabase.from('branches').select('id, sube_adi, customer_id').eq('customer_id', customerId).order('sube_adi');
    setBranches(data || []);
  };

  // fetchVisits fonksiyonunu parametre alabilir hale getirdim (otomatik tetikleme için)
  const fetchVisits = async (branchIdParam?: string) => {
    const targetBranchId = branchIdParam || selectedBranchId;

    if (!targetBranchId) {
      // Manuel tetiklemede uyarı ver, otomatik tetiklemede sessiz kal
      if (!branchIdParam) toast.error('Lütfen bir şube seçiniz');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id, visit_date, status, visit_type, equipment_checks, branch_id,
          operator:operator_id(name)
        `)
        .eq('branch_id', targetBranchId)
        .gte('visit_date', dateRange.from)
        .lte('visit_date', dateRange.to)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      setVisits((data as any) || []);

      if (data?.length === 0 && !branchIdParam) {
        toast.info('Bu tarih aralığında ziyaret bulunamadı.');
      }
    } catch (error: any) {
      toast.error('Ziyaretler çekilirken hata: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Form Handling ---
  const applyDefaultValues = (equipment: BranchEquipment[], currentFormData: Record<string, any>) => {
    const newFormData = { ...currentFormData };
    let changed = false;

    equipment.forEach(item => {
      const eqId = item.id;
      const eqName = item.equipment.name;

      // Yem İstasyonu
      if (eqName === 'Yem İstasyonu') {
        if (newFormData[eqId]?.kemirgenAktivitesi === undefined) {
          newFormData[eqId] = { ...(newFormData[eqId] || {}), kemirgenAktivitesi: false };
          changed = true;
        }
        if (newFormData[eqId]?.yemTuketimi === undefined) {
          newFormData[eqId] = { ...(newFormData[eqId] || {}), yemTuketimi: false };
          changed = true;
        }
      }

      // Fare - Sıçan Kapanı
      if (eqName === 'Fare - Sıçan Kapanı' || eqName.includes('Kapanı')) {
        if (newFormData[eqId]?.kemirgenAktivitesi === undefined) {
          newFormData[eqId] = { ...(newFormData[eqId] || {}), kemirgenAktivitesi: false };
          changed = true;
        }
      }

      // EFK / UV Cihazlar için lamba durumu varsayılan true
      if (eqName.includes('Sinek Kontrol') || eqName.includes('UV Işık')) {
        if (newFormData[eqId]?.lambaCalismaDurumu === undefined) {
          newFormData[eqId] = { ...(newFormData[eqId] || {}), lambaCalismaDurumu: true };
          changed = true;
        }
      }
    });

    if (changed) setFormData(newFormData);
  };

  const handleAutoFillEFK = () => {
    const efkEquipments = equipmentList.filter(item =>
      item.equipment.name.includes('Sinek Kontrol') ||
      item.equipment.name.includes('UV Işık') ||
      item.equipment.name.includes('EFK')
    );

    if (efkEquipments.length === 0) {
      toast.error('Bu şubede EFK/Sinek cihazı bulunamadı.');
      return;
    }

    const newFormData = { ...formData };

    // Zararlı türleri ve ağırlıkları (Karasinek ve Meyve Sineği %50 daha fazla)
    const pestWeights = [
      { key: 'karasinekSayisi', weight: 3 },
      { key: 'meyvesinegiSayisi', weight: 3 },
      { key: 'ariSayisi', weight: 2 },
      { key: 'ambarZararlisiSayisi', weight: 2 },
      { key: 'sivrisinekSayisi', weight: 2 },
      { key: 'digerSayisi', weight: 2 }
    ];

    // Ağırlıklı havuz oluştur
    const weightsPool: string[] = [];
    pestWeights.forEach(p => {
      for (let i = 0; i < p.weight; i++) weightsPool.push(p.key);
    });

    efkEquipments.forEach(item => {
      const eqId = item.id;

      // Her cihazda mutlaka aktivite olacak
      const totalPestCount = Math.floor(Math.random() * 20) + 1; // 1 ile 20 arası

      const efkData: any = {
        lambaCalismaDurumu: true,
        karasinekSayisi: 0,
        meyvesinegiSayisi: 0,
        ariSayisi: 0,
        ambarZararlisiSayisi: 0,
        sivrisinekSayisi: 0,
        digerSayisi: 0
      };

      // Toplam sayıyı zararlı türlerine dağıt
      for (let i = 0; i < totalPestCount; i++) {
        const randomPestKey = weightsPool[Math.floor(Math.random() * weightsPool.length)];
        efkData[randomPestKey]++;
      }

      newFormData[eqId] = { ...(newFormData[eqId] || {}), ...efkData };
    });

    setFormData(newFormData);
    toast.success(`${efkEquipments.length} EFK cihazı için veri oluşturuldu. Her cihazda aktivite (max 20) tanımlandı.`);
  };

  const handleBulkNoTraps = () => {
    const traps = equipmentList.filter(item =>
      item.equipment.name === 'Fare - Sıçan Kapanı' || item.equipment.name.includes('Kapanı')
    );

    if (traps.length === 0) {
      toast.error('Bu şubede tanımlı kapan bulunamadı.');
      return;
    }

    const newFormData = { ...formData };
    traps.forEach(item => {
      newFormData[item.id] = { ...(newFormData[item.id] || {}), kemirgenAktivitesi: false };
    });

    setFormData(newFormData);
    toast.success(`${traps.length} adet kapan için toplu "Hayır" seçildi.`);
  };

  const handleAutoFillRodentStations = () => {
    const stations = equipmentList.filter(item => item.equipment.name === 'Yem İstasyonu');

    if (stations.length === 0) {
      toast.error('Bu şubede tanımlı yem istasyonu bulunamadı.');
      return;
    }

    const newFormData = { ...formData };

    // %10 - %15 arası aktivite oranı
    const activeRate = 0.1 + (Math.random() * 0.05);
    const activeCount = Math.max(1, Math.floor(stations.length * activeRate));

    const shuffled = [...stations].sort(() => 0.5 - Math.random());
    const residents = shuffled.slice(0, activeCount);

    stations.forEach(item => {
      const eqId = item.id;
      const isActive = residents.some(r => r.id === eqId);

      if (isActive) {
        newFormData[eqId] = {
          ...(newFormData[eqId] || {}),
          kemirgenAktivitesi: true,
          activity: true,
          yemTuketimi: true,
          kemirgenTuru: 'Fare',
          broken: false,
          missing: false,
          kirik: false,
          kayip: false
        };
      } else {
        newFormData[eqId] = {
          ...(newFormData[eqId] || {}),
          kemirgenAktivitesi: false,
          activity: false,
          yemTuketimi: false,
          broken: false,
          missing: false,
          kirik: false,
          kayip: false
        };
      }
    });

    setFormData(newFormData);
    toast.success(`${stations.length} Yem İstasyonu için veri oluşturuldu. (${activeCount} istasyonda aktivite tanımlandı)`);
  };

  const handleBulkNoBrokenMissing = () => {
    const stations = equipmentList.filter(item => item.equipment.name === 'Yem İstasyonu');

    if (stations.length === 0) {
      toast.error('Bu şubede tanımlı yem istasyonu bulunamadı.');
      return;
    }

    const newFormData = { ...formData };
    stations.forEach(item => {
      newFormData[item.id] = {
        ...(newFormData[item.id] || {}),
        broken: false,
        missing: false,
        kirik: false,
        kayip: false
      };
    });

    setFormData(newFormData);
    toast.success(`${stations.length} adet yem istasyonu için Kırık/Kayıp "Hayır" olarak set edildi.`);
  };

  const handleSelectVisit = async (visit: Visit) => {
    setLoading(true);
    try {
      // 1. Şubenin güncel ekipman listesini çek
      const { data: eqData, error: eqError } = await supabase
        .from('branch_equipment')
        .select(`
          id, equipment_code, department,
          equipment:equipment_id ( id, name, properties )
        `)
        .eq('branch_id', visit.branch_id)
        .order('equipment_code');

      if (eqError) throw eqError;

      const currentEqList = (eqData as any) || [];
      setEquipmentList(currentEqList);

      // 2. Mevcut verileri form state'ine yükle
      const currentFormData = visit.equipment_checks || {};
      setFormData(currentFormData);

      // 3. Varsayılanları uygula
      applyDefaultValues(currentEqList, currentFormData);

      setSelectedVisit(visit);
    } catch (error: any) {
      toast.error('Ekipman bilgileri alınamadı: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (equipmentId: string, propertyKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [equipmentId]: {
        ...(prev[equipmentId] || {}),
        [propertyKey]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!selectedVisit) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('visits')
        .update({
          equipment_checks: formData,
        })
        .eq('id', selectedVisit.id);

      if (error) throw error;

      toast.success('Veriler başarıyla güncellendi');

      setVisits(prev => prev.map(v => v.id === selectedVisit.id ? { ...v, equipment_checks: formData } : v));

    } catch (error: any) {
      toast.error('Kaydetme hatası: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Render Helpers ---
  const renderInput = (eqId: string, propKey: string, propConfig: { type: string; label: string }) => {
    const currentValue = formData[eqId]?.[propKey] ?? '';

    if (propConfig.type === 'boolean') {
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleInputChange(eqId, propKey, true)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${currentValue === true ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Evet / Var
          </button>
          <button
            type="button"
            onClick={() => handleInputChange(eqId, propKey, false)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${currentValue === false ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            Hayır / Yok
          </button>
        </div>
      );
    }

    if (propConfig.type === 'number') {
      return (
        <input
          type="number"
          value={currentValue}
          onChange={(e) => handleInputChange(eqId, propKey, parseFloat(e.target.value))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="0"
        />
      );
    }

    return (
      <input
        type="text"
        value={currentValue}
        onChange={(e) => handleInputChange(eqId, propKey, e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Veri giriniz..."
      />
    );
  };

  // --- Main Render ---
  if (selectedVisit) {
    // DETAY / DÜZENLEME EKRANI
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setSelectedVisit(null)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Ziyaret Listesine Dön
          </button>

          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-blue-100">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Box className="text-blue-600" />
                  Ziyaret Veri Girişi
                </h1>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <p><strong>Müşteri:</strong> {customers.find(c => c.id === selectedCustomerId)?.kisa_isim}</p>
                  <p><strong>Şube:</strong> {branches.find(b => b.id === selectedBranchId)?.sube_adi}</p>
                  <p><strong>Tarih:</strong> {format(parseISO(selectedVisit.visit_date), 'dd MMMM yyyy HH:mm', { locale: tr })}</p>
                  <p><strong>Operatör:</strong> {selectedVisit.operator?.name || '-'}</p>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-all"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Değişiklikleri Kaydet
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleAutoFillEFK}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Otomatik Veri Oluştur (EFK/Sinek)
              </button>

              <button
                onClick={handleBulkNoTraps}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-all text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Kapanları Toplu Hayır Yap
              </button>

              <button
                onClick={handleAutoFillRodentStations}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-all text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Yem İst. Otomatik Veri (%10-15)
              </button>

              <button
                onClick={handleBulkNoBrokenMissing}
                className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-all text-sm font-medium"
              >
                <AlertCircle className="w-4 h-4" />
                Kırık/Kayıp Toplu Hayır
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {equipmentList.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-lg shadow text-gray-500">
                Bu şubede tanımlı ekipman bulunamadı.
              </div>
            ) : (
              equipmentList.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <div>
                      <span className="font-bold text-gray-800 mr-2">{item.equipment_code}</span>
                      <span className="text-sm text-gray-500">({item.department})</span>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {item.equipment.name}
                    </span>
                  </div>

                  <div className="p-4">
                    {item.equipment.properties && Object.keys(item.equipment.properties).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(item.equipment.properties)
                          .filter(([key]) => !(item.equipment.name === 'Yem İstasyonu' && key === 'kemirgenSayisi'))
                          .map(([key, config]) => (
                            <div key={key}>
                              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                                {config.label || key}
                              </label>
                              {renderInput(item.id, key, config)}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Bu ekipman türü için özellik tanımı yok.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // LİSTELEME / FİLTRELEME EKRANI
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ziyaret Veri Yönetimi</h1>
          <p className="text-gray-600">Trend analizleri için geçmiş ziyaretlerin ekipman verilerini düzenleyin.</p>
        </div>

        {/* Filtreler */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
              <div className="relative">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                >
                  <option value="">Seçiniz...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                </select>
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şube</label>
              <div className="relative">
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  disabled={!selectedCustomerId}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white disabled:bg-gray-100"
                >
                  <option value="">Seçiniz...</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
                </select>
                <MapPin className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => fetchVisits()}
                  disabled={loading || !selectedBranchId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700">Ziyaret Listesi</h3>
            <span className="text-xs text-gray-500">{visits.length} kayıt bulundu</span>
          </div>

          {visits.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Kriterlere uygun ziyaret bulunamadı. Lütfen filtreleri kontrol edin.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  onClick={() => handleSelectVisit(visit)}
                  className="p-4 hover:bg-blue-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white transition-colors">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {format(parseISO(visit.visit_date), 'dd MMMM yyyy - HH:mm', { locale: tr })}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {visit.status === 'completed' ? 'Tamamlandı' : visit.status}
                          </span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>{visit.visit_type || 'Standart'}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>Op: {visit.operator?.name || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <span className={`text-xs px-2 py-1 rounded-full ${visit.equipment_checks && Object.keys(visit.equipment_checks).length > 0
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {visit.equipment_checks && Object.keys(visit.equipment_checks).length > 0
                            ? `${Object.keys(visit.equipment_checks).length} Veri Girilmiş`
                            : 'Veri Yok'}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVisitDataEntry;