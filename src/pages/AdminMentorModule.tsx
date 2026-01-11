import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, Building2, MapPin, User, FileText, Plus, Trash2, Home, 
  Store, FileSignature, CheckSquare, Calendar, DollarSign, Award, 
  Users, Map, Upload, Image as ImageIcon, ClipboardList, Settings, Beaker,
  BookOpen, Package, AlertTriangle, Filter, Save, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  A4Header, Preview11, Preview12, Preview13, Preview21, Preview31, 
  Preview32, Preview41, Preview42, Preview51, Preview52, Preview53, Preview61 
} from '../components/ActivityForms/ActivityPreviews';
import { 
  SettingsBase, FormData12, ContractData, Permit, Staff, 
  LegendItem, Station, Product, ApplicationRecord, UsageCard, 
  DocumentEntry, WasteRecord 
} from '../types/activity-forms';

const BRAND_GREEN = '#006837';

interface CustomerSummary {
  id: string;
  cari_isim: string;
}

export default function AdminMentorModule() {
  // --- STATE YÖNETİMİ ---
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  
  // Seçim State'leri
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [customerBranches, setCustomerBranches] = useState<any[]>([]);

  // FORM DATA STATES
  const [formData12, setFormData12] = useState<FormData12>({
    ticariUnvan: '', faaliyetKonusu: '', vergiDairesi: '', vergiNo: '', mersisNo: '', adres: '',
    telefon: '', faks: '', eposta: '', webSitesi: '', yetkiliKisi: '', yetkiliUnvan: '', yetkiliTel: '',
    hizmetBaslangicTarihi: new Date().toISOString().split('T')[0]
  });
  const [settings12, setSettings12] = useState<SettingsBase>({ dokumanNo: '1.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // Diğer tüm state tanımları
  const [branches, setBranches] = useState<any[]>([]); 
  const [settings13, setSettings13] = useState<SettingsBase>({ dokumanNo: '1.3', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [contractData, setContractData] = useState<ContractData>({
    sozlesmeTarihi: new Date().toISOString().split('T')[0], sozlesmeNo: '2024-001', hizmetPeriyodu: 'Ayda 1 Kez', hizmetBedeli: '0',
    paraBirimi: 'TL', sozlesmeSuresi: '1 Yıl', baslangicTarihi: new Date().toISOString().split('T')[0],
    bitisTarihi: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    odemeSekli: 'Banka havalesi', kapsam: { kemirgen: true, yuruyenHasere: true, ucanHasere: true, dezenfeksiyon: false }
  });
  const [settings21, setSettings21] = useState<SettingsBase>({ dokumanNo: '2.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [permits, setPermits] = useState<Permit[]>([]);
  const [settings31, setSettings31] = useState<SettingsBase>({ dokumanNo: '3.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [staff, setStaff] = useState<Staff[]>([]);
  const [settings32, setSettings32] = useState<SettingsBase>({ dokumanNo: '3.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [krokiImage, setKrokiImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [legendItems, setLegendItems] = useState<LegendItem[]>([
    { id: 1, kod: 'Kİ', aciklama: 'Kemirgen İstasyonu', renk: '#000000', sekil: 'Kare' },
    { id: 2, kod: 'Yİ', aciklama: 'Yürüyen Haşere İstasyonu', renk: '#000000', sekil: 'Daire' },
    { id: 3, kod: 'ILT', aciklama: 'Sinek Tutucu Cihaz', renk: '#000000', sekil: 'Üçgen' },
    { id: 4, kod: 'FT', aciklama: 'Feromon Tuzak', renk: '#000000', sekil: 'Yıldız' },
  ]);
  const [settings41, setSettings41] = useState<SettingsBase>({ dokumanNo: '4.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [stations, setStations] = useState<Station[]>([]);
  const [generator, setGenerator] = useState({ prefix: 'Kİ', start: 1, end: 10, type: 'Kemirgen İstasyonu' });
  const [settings42, setSettings42] = useState<SettingsBase>({ dokumanNo: '4.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [products, setProducts] = useState<Product[]>([]);
  const [settings52, setSettings52] = useState<SettingsBase>({ dokumanNo: '5.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [documentContents, setDocumentContents] = useState<DocumentEntry[]>([]);
  const [settings11, setSettings11] = useState<SettingsBase>({ dokumanNo: '1.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [applicationRecords, setApplicationRecords] = useState<ApplicationRecord[]>([]);
  const [currentApplication, setCurrentApplication] = useState<ApplicationRecord>({
    id: 0, uygulama_tarihi: '', baslangic_saati: '', bitis_saati: '', hava_durumu: '', sicaklik: '', nem: '',
    uygulanan_alan: '', hedef_hasere: '', kullanilan_urun: '', uygulama_metodu: '', dozaj: '', operatör: '',
    müşteri_yetkilisi: '', müşteri_imza: false, operatör_imza: false
  });
  const [settings51, setSettings51] = useState<SettingsBase>({ dokumanNo: '5.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [usageCards, setUsageCards] = useState<UsageCard[]>([]);
  const [settings53, setSettings53] = useState<SettingsBase>({ dokumanNo: '5.3', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [settings61, setSettings61] = useState<SettingsBase>({ dokumanNo: '6.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const { data: customerData } = await supabase.from('customers').select('id, cari_isim');
      if (customerData) setCustomers(customerData);
      setLoading(false);
    };
    fetchInitialData();
  }, []);

  // Müşteri seçilince
  useEffect(() => {
    if (selectedCustomerId) {
      const loadCustomerData = async () => {
        const { data: branchData } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', selectedCustomerId);
        if (branchData) setCustomerBranches(branchData);
      };
      loadCustomerData();
      
      // Load all customer-level forms
      loadFormData(selectedCustomerId, null, '1.2');
      // Add other form loads here if needed
    }
  }, [selectedCustomerId]);

  // Şube seçilince
  useEffect(() => {
    if (selectedBranchId) {
      loadFormData(selectedCustomerId, selectedBranchId, '4.1');
      loadFormData(selectedCustomerId, selectedBranchId, '4.2');
    }
  }, [selectedBranchId]);

  // --- SUPABASE FORM OPERATIONS ---
  const loadFormData = async (customerId: string, branchId: string | null, formType: string) => {
    setLoading(true);
    try {
      let query = supabase.from('activity_files').select('content, settings').eq('customer_id', customerId).eq('file_type', formType);
      
      if (branchId) {
        query = query.eq('branch_id', branchId);
      } else {
        query = query.is('branch_id', null);
      }

      const { data, error } = await query.single();

      if (data) {
        // Form tipine göre state güncelle
        if (formType === '1.2') { setFormData12(data.content); setSettings12(data.settings); }
        if (formType === '4.1') { setKrokiImage(data.content.image); setLegendItems(data.content.legend); setSettings41(data.settings); }
        // Add other form type mapping logic here
      }
    } catch (err) {
      console.error('Veri yüklenirken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveFormData = async () => {
    if (!selectedCustomerId) return;
    setSaveLoading(true);

    let contentToSave: any = {};
    let settingsToSave: any = {};
    let currentBranchId = null;

    if (activeTab === '1.2') { contentToSave = formData12; settingsToSave = settings12; }
    else if (activeTab === '4.1') { contentToSave = { image: krokiImage, legend: legendItems }; settingsToSave = settings41; currentBranchId = selectedBranchId; }
    // Add logic for saving other tabs here

    try {
      const { error } = await supabase.from('activity_files').upsert({
        customer_id: selectedCustomerId,
        branch_id: currentBranchId,
        file_type: activeTab,
        content: contentToSave,
        settings: settingsToSave,
        updated_at: new Date().toISOString()
      }, { onConflict: 'customer_id, branch_id, file_type' });

      if (error) throw error;
      alert('Kayıt başarılı!');
    } catch (err) {
      console.error('Kaydetme hatası:', err);
      alert('Kaydedilirken bir hata oluştu.');
    } finally {
      setSaveLoading(false);
    }
  };

  // --- HANDLERS ---
  const handlePrint = () => window.print();
  
  // 1.2 Handlers
  const handleSettings12 = (e: React.ChangeEvent<HTMLInputElement>) => setSettings12({ ...settings12, [e.target.name]: e.target.value });
  const handleChange12 = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData12({ ...formData12, [e.target.name]: e.target.value });

  // 4.1 Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const file = e.target.files?.[0]; 
    if (file) { 
      const imageUrl = URL.createObjectURL(file); 
      setKrokiImage(imageUrl); 
    } 
  };
  const removeKrokiImage = () => { 
    setKrokiImage(null); 
    if(fileInputRef.current) fileInputRef.current.value = ""; 
  };
  const handleSettings41 = (e: React.ChangeEvent<HTMLInputElement>) => setSettings41({ ...settings41, [e.target.name]: e.target.value });
  const updateLegend = (id: number, field: keyof LegendItem, value: string) => { 
    setLegendItems(legendItems.map(item => item.id === id ? { ...item, [field]: value } : item)); 
  };

  // 4.2 Handlers
  const generateStations = () => { 
    const newStations: Station[] = []; 
    const start = parseInt(generator.start.toString()); 
    const end = parseInt(generator.end.toString()); 
    if (isNaN(start) || isNaN(end) || start > end) return; 
    for (let i = start; i <= end; i++) { 
      const numStr = i < 10 ? `0${i}` : `${i}`; 
      newStations.push({ id: Date.now() + i, no: `${generator.prefix}-${numStr}`, location: '', type: generator.type }); 
    } 
    setStations([...stations, ...newStations]); 
  };
  const updateStation = (id: number | string, field: keyof Station, value: string) => { 
    setStations(stations.map(s => s.id === id ? { ...s, [field]: value } : s)); 
  };
  const removeStation = (id: number | string) => { 
    setStations(stations.filter(s => s.id !== id)); 
  };
  const clearStations = () => { 
    if(window.confirm('Tüm listeyi silmek istediğinize emin misiniz?')) { 
      setStations([]); 
    } 
  };
  const handleSettings42 = (e: React.ChangeEvent<HTMLInputElement>) => setSettings42({ ...settings42, [e.target.name]: e.target.value });


  // --- RENDER COMPONENTS ---

  const renderEditor12 = () => (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: BRAND_GREEN }}><Building2 size={16} /> Firma Bilgileri</h2>
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-500">Ticari Ünvan</label><textarea name="ticariUnvan" value={formData12.ticariUnvan} onChange={handleChange12} rows={2} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
          <div><label className="text-xs font-medium text-gray-500">Faaliyet Konusu</label><input type="text" name="faaliyetKonusu" value={formData12.faaliyetKonusu} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs font-medium text-gray-500">Vergi Dairesi</label><input type="text" name="vergiDairesi" value={formData12.vergiDairesi} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
            <div><label className="text-xs font-medium text-gray-500">Vergi No</label><input type="text" name="vergiNo" value={formData12.vergiNo} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
          </div>
          <div><label className="text-xs font-medium text-gray-500">Mersis No</label><input type="text" name="mersisNo" value={formData12.mersisNo} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><MapPin size={16} /> İletişim & Adres</h2>
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-500">Adres</label><textarea name="adres" value={formData12.adres} onChange={handleChange12} rows={3} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
          <div className="grid grid-cols-2 gap-2">
             <div><label className="text-xs font-medium text-gray-500">Telefon</label><input type="text" name="telefon" value={formData12.telefon} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
             <div><label className="text-xs font-medium text-gray-500">E-posta</label><input type="text" name="eposta" value={formData12.eposta} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
          </div>
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><User size={16} /> Yetkili Kişi</h2>
        <div className="space-y-3">
          <div><label className="text-xs font-medium text-gray-500">Ad Soyad</label><input type="text" name="yetkiliKisi" value={formData12.yetkiliKisi} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
          <div className="grid grid-cols-2 gap-2">
             <div><label className="text-xs font-medium text-gray-500">Ünvan</label><input type="text" name="yetkiliUnvan" value={formData12.yetkiliUnvan} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
             <div><label className="text-xs font-medium text-gray-500">Cep Tel</label><input type="text" name="yetkiliTel" value={formData12.yetkiliTel} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
          </div>
           <div><label className="text-xs font-medium text-gray-500">Başlangıç Tarihi</label><input type="date" name="hizmetBaslangicTarihi" value={formData12.hizmetBaslangicTarihi} onChange={handleChange12} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><FileText size={16} /> Doküman Ayarları</h2>
        <div className="grid grid-cols-3 gap-2">
           <input type="text" name="dokumanNo" value={settings12.dokumanNo} onChange={handleSettings12} className="p-2 border rounded text-sm" placeholder="No" />
           <input type="text" name="yayinTarihi" value={settings12.yayinTarihi} onChange={handleSettings12} className="p-2 border rounded text-sm" placeholder="Tarih" />
           <input type="text" name="revizyonNo" value={settings12.revizyonNo} onChange={handleSettings12} className="p-2 border rounded text-sm" placeholder="Rev" />
        </div>
      </section>
    </div>
  );

  const renderEditor41 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-800 mb-4">İşletmenin yerleşim planını (krokisini) yükleyin. Sağ tarafta A4 üzerine yerleşecek ve altına otomatik lejant eklenecektir.</div>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: BRAND_GREEN }}><Upload size={16} /> Kroki Görseli</h2><div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-green-500 transition-colors bg-white">{krokiImage ? (<div className="w-full"><img src={krokiImage} alt="Kroki Önizleme" className="max-h-40 mx-auto mb-2 shadow-sm border" /><button onClick={removeKrokiImage} className="text-xs text-red-500 hover:text-red-700 underline font-semibold">Görseli Kaldır</button></div>) : (<><ImageIcon size={32} className="text-gray-400 mb-2" /><label className="cursor-pointer"><span className="text-green-600 font-semibold text-sm hover:underline">Görsel Seç</span><input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" /></label><p className="text-xs text-gray-400 mt-1">PNG, JPG formatında kat planı.</p></>)}</div></section>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><Map size={16} /> Lejant (İşaret Dili)</h2><div className="space-y-3">{legendItems.map(item => (<div key={item.id} className="p-2 border rounded bg-white flex flex-col gap-2"><div className="flex justify-between items-center"><span className="font-bold text-sm bg-gray-100 px-2 rounded text-gray-700">{item.kod}</span></div><input type="text" value={item.aciklama} onChange={(e) => updateLegend(item.id, 'aciklama', e.target.value)} className="w-full p-1 border rounded text-xs" /></div>))}</div><div className="text-[10px] text-gray-400 mt-2 italic">* Lejant maddeleri standarttır, açıklamalarını düzenleyebilirsiniz.</div></section>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><FileText size={16} /> Doküman Ayarları</h2><div className="grid grid-cols-3 gap-2"><input type="text" name="dokumanNo" value={settings41.dokumanNo} onChange={handleSettings41} className="p-2 border rounded text-sm" placeholder="No" /><input type="text" name="yayinTarihi" value={settings41.yayinTarihi} onChange={handleSettings41} className="p-2 border rounded text-sm" placeholder="Tarih" /><input type="text" name="revizyonNo" value={settings41.revizyonNo} onChange={handleSettings41} className="p-2 border rounded text-sm" placeholder="Rev" /></div></section>
    </div>
  );

  const renderEditor42 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-800 mb-4">
        Sahada kullanılacak boş "Ekipman Takip Formu" oluşturun. İstasyonları tek tek girmek yerine otomatik oluşturucuyu kullanabilirsiniz.
      </div>
      <section className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: BRAND_GREEN }}><Settings size={16} /> Otomatik Oluşturucu</h2>
        <div className="grid grid-cols-3 gap-2 mb-2">
           <div><label className="text-[10px] text-gray-500">Kod (Örn: Kİ)</label><input type="text" value={generator.prefix} onChange={(e) => setGenerator({...generator, prefix: e.target.value})} className="w-full p-2 border rounded text-sm" /></div>
           <div><label className="text-[10px] text-gray-500">Başlangıç No</label><input type="number" value={generator.start} onChange={(e) => setGenerator({...generator, start: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
            <div><label className="text-[10px] text-gray-500">Bitiş No</label><input type="number" value={generator.end} onChange={(e) => setGenerator({...generator, end: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm" /></div>
        </div>
        <div className="mb-3">
            <label className="text-[10px] text-gray-500">Tip / Açıklama</label>
            <select value={generator.type} onChange={(e) => setGenerator({...generator, type: e.target.value})} className="w-full p-2 border rounded text-sm">
                <option>Kemirgen İstasyonu</option><option>Yürüyen Haşere İstasyonu</option><option>Sinek Tutucu Cihaz (EFC)</option><option>Feromon Tuzak</option>
            </select>
        </div>
        <button onClick={generateStations} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-semibold transition">Listeye Ekle</button>
      </section>
      <section>
        <div className="flex justify-between items-center mb-3 border-t pt-4">
           <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: BRAND_GREEN }}><ClipboardList size={16} /> İstasyon Listesi ({stations.length})</h2>
           {stations.length > 0 && (<button onClick={clearStations} className="text-xs text-red-500 hover:underline">Tümünü Sil</button>)}
        </div>
        {stations.length === 0 ? (<div className="text-center text-gray-400 py-8 text-sm border-2 border-dashed rounded">{selectedBranchId ? "Bu şubede kayıtlı istasyon bulunamadı." : "İstasyonları görmek için şube seçiniz."}</div>) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {stations.map((station, index) => (
                    <div key={station.id} className="flex items-center gap-2 bg-white p-2 border rounded text-sm">
                        <span className="bg-gray-100 text-gray-600 font-mono text-xs px-2 py-1 rounded w-8 text-center">{index+1}</span>
                        <input type="text" value={station.no} onChange={(e) => updateStation(station.id, 'no', e.target.value)} className="w-20 font-bold p-1 border rounded text-center" />
                        <input type="text" placeholder="Lokasyon (Opsiyonel)" value={station.location} onChange={(e) => updateStation(station.id, 'location', e.target.value)} className="flex-1 p-1 border rounded" />
                        <button onClick={() => removeStation(station.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>
        )}
      </section>
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><FileText size={16} /> Doküman Ayarları</h2>
        <div className="grid grid-cols-3 gap-2">
           <input type="text" name="dokumanNo" value={settings42.dokumanNo} onChange={handleSettings42} className="p-2 border rounded text-sm" placeholder="No" />
           <input type="text" name="yayinTarihi" value={settings42.yayinTarihi} onChange={handleSettings42} className="p-2 border rounded text-sm" placeholder="Tarih" />
           <input type="text" name="revizyonNo" value={settings42.revizyonNo} onChange={handleSettings42} className="p-2 border rounded text-sm" placeholder="Rev" />
        </div>
      </section>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100 font-sans text-gray-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col print:hidden z-20 shadow-lg">
        <div className="p-6 border-b border-gray-100 bg-green-50">
          <h1 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={20} className="text-green-700"/> Modül Menüsü</h1>
          <p className="text-[10px] text-gray-500 mt-1">Yönetim Paneli</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'home' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Home size={18} /> Ana Sayfa
          </button>

          {/* Müşteri Seçimi Göstergesi */}
          <div className={`mt-2 p-2 rounded border border-green-100 ${selectedCustomerId ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="text-xs font-bold uppercase text-gray-500 mb-1">Seçili Müşteri</div>
            <div className="text-sm font-semibold text-gray-800 truncate">
                {customers.find(c => c.id === selectedCustomerId)?.cari_isim || 'Seçilmedi'}
            </div>
          </div>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Modüller</div>
          
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('1.2')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Building2 size={18} /> 1.2 Müşteri Bilgileri</button>
          
          {/* Şube Bazlılar */}
          <div className="pt-2 pb-1 px-4 text-[10px] font-bold text-green-600 uppercase tracking-wider">Şube Dokümanları</div>
          <button disabled={!selectedBranchId} onClick={() => setActiveTab('4.1')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Map size={18} /> 4.1 Ekipman Krokisi</button>
          <button disabled={!selectedBranchId} onClick={() => setActiveTab('4.2')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><ClipboardList size={18} /> 4.2 Ekipman Takip</button>
        </nav>

        <div className="p-4 border-t border-gray-100 flex gap-2">
           {activeTab !== 'home' && (
             <>
              <button onClick={saveFormData} disabled={saveLoading} className="flex-1 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-2 rounded-lg shadow transition text-sm font-medium">
                {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Kaydet
              </button>
              <button onClick={handlePrint} className="flex-1 flex justify-center items-center gap-2 bg-green-700 hover:bg-green-800 text-white py-2 px-2 rounded-lg shadow transition text-sm font-medium">
                <Printer size={16} /> Yazdır
              </button>
             </>
           )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* SOL PANEL (Editör) */}
        {activeTab !== 'home' && (
          <div className="w-[400px] bg-white border-r border-gray-200 overflow-y-auto h-full p-6 print:hidden z-10">
            {/* Editörler */}
            {activeTab === '1.2' && renderEditor12()}
            {activeTab === '4.1' && renderEditor41()}
            {activeTab === '4.2' && renderEditor42()}
          </div>
        )}

        {/* SAĞ PANEL (Önizleme) */}
        <div className="flex-1 bg-gray-500 overflow-auto flex justify-center items-start p-8 print:p-0 print:absolute print:inset-0 print:bg-white print:z-50 print:block">
           {activeTab === 'home' && (
             <div className="flex flex-col items-center justify-center h-full p-10 bg-gray-50 text-gray-800">
               {/* Ana Sayfa Seçim Ekranı */}
               <div className="w-full max-w-xl mb-8 space-y-4">
                 <div className="relative">
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full p-3 border rounded-lg shadow-sm">
                        <option value="">1. Adım: Müşteri Seçiniz...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.cari_isim}</option>)}
                    </select>
                 </div>
                 {selectedCustomerId && (
                   <div className="relative">
                      <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="w-full p-3 border rounded-lg shadow-sm">
                          <option value="">2. Adım: Şube Seçiniz</option>
                          {customerBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
                      </select>
                   </div>
                 )}
               </div>
             </div>
           )}

           {/* Önizlemeler */}
           {activeTab === '1.2' && <Preview12 data={formData12} settings={settings12} />}
           {activeTab === '4.1' && <Preview41 krokiImage={krokiImage} legendItems={legendItems} settings={settings41} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
           {activeTab === '4.2' && <Preview42 stations={stations} settings={settings42} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
        </div>
      </main>
    </div>
  );
}