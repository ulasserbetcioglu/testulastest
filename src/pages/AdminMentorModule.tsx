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

  // 1.1 İÇİNDEKİLER
  const [documentContents, setDocumentContents] = useState<DocumentEntry[]>([]);
  const [settings11, setSettings11] = useState<SettingsBase>({ dokumanNo: '1.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 1.2 MÜŞTERİ BİLGİLERİ
  const [formData12, setFormData12] = useState<FormData12>({
    ticariUnvan: '', faaliyetKonusu: '', vergiDairesi: '', vergiNo: '', mersisNo: '', adres: '',
    telefon: '', faks: '', eposta: '', webSitesi: '', yetkiliKisi: '', yetkiliUnvan: '', yetkiliTel: '',
    hizmetBaslangicTarihi: new Date().toISOString().split('T')[0]
  });
  const [settings12, setSettings12] = useState<SettingsBase>({ dokumanNo: '1.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 1.3 ŞUBE BİLGİLERİ (Tablo Verisi)
  const [branchListData, setBranchListData] = useState<any[]>([]); 
  const [settings13, setSettings13] = useState<SettingsBase>({ dokumanNo: '1.3', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 2.1 SÖZLEŞME
  const [contractData, setContractData] = useState<ContractData>({
    sozlesmeTarihi: new Date().toISOString().split('T')[0], sozlesmeNo: '2024-001', hizmetPeriyodu: 'Ayda 1 Kez', hizmetBedeli: '0',
    paraBirimi: 'TL', sozlesmeSuresi: '1 Yıl', baslangicTarihi: new Date().toISOString().split('T')[0],
    bitisTarihi: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    odemeSekli: 'Banka havalesi', kapsam: { kemirgen: true, yuruyenHasere: true, ucanHasere: true, dezenfeksiyon: false }
  });
  const [settings21, setSettings21] = useState<SettingsBase>({ dokumanNo: '2.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 3.1 İZİNLER
  const [permits, setPermits] = useState<Permit[]>([]);
  const [settings31, setSettings31] = useState<SettingsBase>({ dokumanNo: '3.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 3.2 SERTİFİKALAR
  const [staff, setStaff] = useState<Staff[]>([]);
  const [settings32, setSettings32] = useState<SettingsBase>({ dokumanNo: '3.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 4.1 KROKİ
  const [krokiImage, setKrokiImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [legendItems, setLegendItems] = useState<LegendItem[]>([
    { id: 1, kod: 'Kİ', aciklama: 'Kemirgen İstasyonu', renk: '#000000', sekil: 'Kare' },
    { id: 2, kod: 'Yİ', aciklama: 'Yürüyen Haşere İstasyonu', renk: '#000000', sekil: 'Daire' },
    { id: 3, kod: 'ILT', aciklama: 'Sinek Tutucu Cihaz', renk: '#000000', sekil: 'Üçgen' },
    { id: 4, kod: 'FT', aciklama: 'Feromon Tuzak', renk: '#000000', sekil: 'Yıldız' },
  ]);
  const [settings41, setSettings41] = useState<SettingsBase>({ dokumanNo: '4.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 4.2 TAKİP
  const [stations, setStations] = useState<Station[]>([]);
  const [generator, setGenerator] = useState({ prefix: 'Kİ', start: 1, end: 10, type: 'Kemirgen İstasyonu' });
  const [settings42, setSettings42] = useState<SettingsBase>({ dokumanNo: '4.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 5.1 EK-1
  const [applicationRecords, setApplicationRecords] = useState<ApplicationRecord[]>([]);
  const [currentApplication, setCurrentApplication] = useState<ApplicationRecord>({
    id: 0, uygulama_tarihi: new Date().toISOString().split('T')[0], baslangic_saati: '09:00', bitis_saati: '10:00', hava_durumu: 'Açık', sicaklik: '', nem: '',
    uygulanan_alan: '', hedef_hasere: '', kullanilan_urun: '', uygulama_metodu: '', dozaj: '', operatör: '',
    müşteri_yetkilisi: '', müşteri_imza: false, operatör_imza: false
  });
  const [settings51, setSettings51] = useState<SettingsBase>({ dokumanNo: '5.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 5.2 ÜRÜNLER
  const [products, setProducts] = useState<Product[]>([]);
  const [settings52, setSettings52] = useState<SettingsBase>({ dokumanNo: '5.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 5.3 KULLANIM KARTI
  const [usageCards, setUsageCards] = useState<UsageCard[]>([]);
  const [settings53, setSettings53] = useState<SettingsBase>({ dokumanNo: '5.3', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 6.1 ATIK İMHA
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
        if (branchData) {
          setCustomerBranches(branchData);
          // 1.3 için şube listesini hazırla
           const mappedBranches = branchData.map((b: any) => ({
             id: b.id,
             subeAdi: b.sube_adi,
             yetkili: '',
             metrekare: '',
             adres: '',
             telefon: ''
           }));
           setBranchListData(mappedBranches);
        }
      };
      loadCustomerData();
      
      // Müşteri bazlı formları yükle
      loadFormData(selectedCustomerId, null, '1.1');
      loadFormData(selectedCustomerId, null, '1.2');
      loadFormData(selectedCustomerId, null, '1.3');
      loadFormData(selectedCustomerId, null, '2.1');
      loadFormData(selectedCustomerId, null, '3.1');
      loadFormData(selectedCustomerId, null, '3.2');
      loadFormData(selectedCustomerId, null, '5.1');
      loadFormData(selectedCustomerId, null, '5.2');
      loadFormData(selectedCustomerId, null, '5.3');
      loadFormData(selectedCustomerId, null, '6.1');
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
    try {
      let query = supabase.from('activity_files').select('content, settings').eq('customer_id', customerId).eq('file_type', formType);
      
      if (branchId) {
        query = query.eq('branch_id', branchId);
      } else {
        query = query.is('branch_id', null);
      }

      const { data } = await query.single();

      if (data) {
        if (formType === '1.1') { setDocumentContents(data.content); setSettings11(data.settings); }
        if (formType === '1.2') { setFormData12(data.content); setSettings12(data.settings); }
        if (formType === '1.3') { setBranchListData(data.content); setSettings13(data.settings); }
        if (formType === '2.1') { setContractData(data.content); setSettings21(data.settings); }
        if (formType === '3.1') { setPermits(data.content); setSettings31(data.settings); }
        if (formType === '3.2') { setStaff(data.content); setSettings32(data.settings); }
        if (formType === '4.1') { setKrokiImage(data.content.image); setLegendItems(data.content.legend); setSettings41(data.settings); }
        if (formType === '4.2') { setStations(data.content); setSettings42(data.settings); }
        if (formType === '5.1') { setApplicationRecords(data.content.history || []); setCurrentApplication(data.content.current || currentApplication); setSettings51(data.settings); }
        if (formType === '5.2') { setProducts(data.content); setSettings52(data.settings); }
        if (formType === '5.3') { setUsageCards(data.content); setSettings53(data.settings); }
        if (formType === '6.1') { setWasteRecords(data.content); setSettings61(data.settings); }
      }
    } catch (err) {
      console.log(`Veri yok veya hata (${formType}):`, err);
    }
  };

  const saveFormData = async () => {
    if (!selectedCustomerId) return;
    setSaveLoading(true);

    let contentToSave: any = {};
    let settingsToSave: any = {};
    let currentBranchId = null;

    if (activeTab === '1.1') { contentToSave = documentContents; settingsToSave = settings11; }
    else if (activeTab === '1.2') { contentToSave = formData12; settingsToSave = settings12; }
    else if (activeTab === '1.3') { contentToSave = branchListData; settingsToSave = settings13; }
    else if (activeTab === '2.1') { contentToSave = contractData; settingsToSave = settings21; }
    else if (activeTab === '3.1') { contentToSave = permits; settingsToSave = settings31; }
    else if (activeTab === '3.2') { contentToSave = staff; settingsToSave = settings32; }
    else if (activeTab === '4.1') { contentToSave = { image: krokiImage, legend: legendItems }; settingsToSave = settings41; currentBranchId = selectedBranchId; }
    else if (activeTab === '4.2') { contentToSave = stations; settingsToSave = settings42; currentBranchId = selectedBranchId; }
    else if (activeTab === '5.1') { contentToSave = { history: applicationRecords, current: currentApplication }; settingsToSave = settings51; }
    else if (activeTab === '5.2') { contentToSave = products; settingsToSave = settings52; }
    else if (activeTab === '5.3') { contentToSave = usageCards; settingsToSave = settings53; }
    else if (activeTab === '6.1') { contentToSave = wasteRecords; settingsToSave = settings61; }

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

  // --- HANDLERS (ALL) ---
  const handlePrint = () => window.print();

  // 1.1 Handlers
  const addDocumentEntry = () => setDocumentContents([...documentContents, { id: Date.now(), baslik: 'Yeni Doküman', aciklama: '', durum: 'beklemede' }]);
  const removeDocumentEntry = (id: number) => setDocumentContents(documentContents.filter(d => d.id !== id));
  const updateDocumentEntry = (id: number, field: string, value: any) => setDocumentContents(documentContents.map(d => d.id === id ? { ...d, [field]: value } : d));
  const handleSettings11 = (e: any) => setSettings11({ ...settings11, [e.target.name]: e.target.value });

  // 1.2 Handlers
  const handleChange12 = (e: any) => setFormData12({ ...formData12, [e.target.name]: e.target.value });
  const handleSettings12 = (e: any) => setSettings12({ ...settings12, [e.target.name]: e.target.value });

  // 1.3 Handlers
  const addBranch = () => setBranchListData([...branchListData, { id: Date.now(), subeAdi: 'Yeni Şube', yetkili: '', metrekare: '', adres: '', telefon: '' }]);
  const removeBranch = (id: number) => setBranchListData(branchListData.filter(b => b.id !== id));
  const updateBranch = (id: number, field: string, value: any) => setBranchListData(branchListData.map(b => b.id === id ? { ...b, [field]: value } : b));
  const handleSettings13 = (e: any) => setSettings13({ ...settings13, [e.target.name]: e.target.value });

  // 2.1 Handlers
  const handleContractChange = (e: any) => setContractData({ ...contractData, [e.target.name]: e.target.value });
  const handleKapsamChange = (key: string) => setContractData({ ...contractData, kapsam: { ...contractData.kapsam, [key]: !contractData.kapsam[key] } });
  const handleSettings21 = (e: any) => setSettings21({ ...settings21, [e.target.name]: e.target.value });

  // 3.1 Handlers
  const addPermit = () => setPermits([...permits, { id: Date.now(), belgeAdi: 'Yeni Belge', belgeNo: '', verilisTarihi: '', gecerlilikTarihi: '', verenKurum: '' }]);
  const removePermit = (id: number) => setPermits(permits.filter(p => p.id !== id));
  const updatePermit = (id: number, field: string, value: any) => setPermits(permits.map(p => p.id === id ? { ...p, [field]: value } : p));
  const handleSettings31 = (e: any) => setSettings31({ ...settings31, [e.target.name]: e.target.value });

  // 3.2 Handlers
  const addStaff = () => setStaff([...staff, { id: Date.now(), adSoyad: 'Yeni Personel', gorev: 'Operatör', sertifikaNo: '', gecerlilikTarihi: '' }]);
  const removeStaff = (id: number) => setStaff(staff.filter(s => s.id !== id));
  const updateStaff = (id: number, field: string, value: any) => setStaff(staff.map(s => s.id === id ? { ...s, [field]: value } : s));
  const handleSettings32 = (e: any) => setSettings32({ ...settings32, [e.target.name]: e.target.value });

  // 4.1 Handlers
  const handleImageUpload = (e: any) => { const file = e.target.files?.[0]; if (file) setKrokiImage(URL.createObjectURL(file)); };
  const removeKrokiImage = () => setKrokiImage(null);
  const updateLegend = (id: number, field: string, value: any) => setLegendItems(legendItems.map(i => i.id === id ? { ...i, [field]: value } : i));
  const handleSettings41 = (e: any) => setSettings41({ ...settings41, [e.target.name]: e.target.value });

  // 4.2 Handlers
  const generateStations = () => {
    const newStations = [];
    for (let i = generator.start; i <= generator.end; i++) {
      newStations.push({ id: Date.now() + i, no: `${generator.prefix}-${i < 10 ? '0' + i : i}`, location: '', type: generator.type });
    }
    setStations([...stations, ...newStations]);
  };
  const updateStation = (id: number | string, field: string, value: any) => setStations(stations.map(s => s.id === id ? { ...s, [field]: value } : s));
  const removeStation = (id: number | string) => setStations(stations.filter(s => s.id !== id));
  const clearStations = () => { if (window.confirm('Tüm istasyonlar silinsin mi?')) setStations([]); };
  const handleSettings42 = (e: any) => setSettings42({ ...settings42, [e.target.name]: e.target.value });

  // 5.1 Handlers
  const handleApplicationChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setCurrentApplication({ ...currentApplication, [name]: type === 'checkbox' ? checked : value });
  };
  const saveApplicationRecord = () => {
    setApplicationRecords([...applicationRecords, { ...currentApplication, id: Date.now() }]);
    alert('Uygulama kaydı eklendi.');
  };
  const handleSettings51 = (e: any) => setSettings51({ ...settings51, [e.target.name]: e.target.value });

  // 5.2 Handlers
  const addProduct = () => setProducts([...products, { id: Date.now(), urunAdi: 'Yeni Ürün', aktifMadde: '', ruhsatNo: '', hedefHasere: '', antidot: '' }]);
  const removeProduct = (id: number | string) => setProducts(products.filter(p => p.id !== id));
  const updateProduct = (id: number | string, field: string, value: any) => setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p));
  const handleSettings52 = (e: any) => setSettings52({ ...settings52, [e.target.name]: e.target.value });

  // 5.3 Handlers
  const addUsageCard = () => setUsageCards([...usageCards, { id: Date.now(), urun_adi: 'Yeni Ürün', baslangic_stok: 0, kullanim_kayitlari: [] }]);
  const removeUsageCard = (id: number) => setUsageCards(usageCards.filter(c => c.id !== id));
  const handleSettings53 = (e: any) => setSettings53({ ...settings53, [e.target.name]: e.target.value });

  // 6.1 Handlers
  const addWasteRecord = () => setWasteRecords([...wasteRecords, { id: Date.now(), atik_turu: '', miktar: '', imha_tarihi: '', imha_firması: '', belge_no: '', sorumlu_personel: '' }]);
  const removeWasteRecord = (id: number) => setWasteRecords(wasteRecords.filter(r => r.id !== id));
  const updateWasteRecord = (id: number, field: string, value: any) => setWasteRecords(wasteRecords.map(r => r.id === id ? { ...r, [field]: value } : r));
  const handleSettings61 = (e: any) => setSettings61({ ...settings61, [e.target.name]: e.target.value });

  // --- RENDER EDITORS ---
  
  const renderEditor11 = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-2 mb-4"><h2 className="text-sm font-semibold uppercase flex items-center gap-2" style={{ color: BRAND_GREEN }}><BookOpen size={16}/> Doküman Listesi</h2><button onClick={addDocumentEntry} className="bg-green-600 text-white p-1 rounded"><Plus size={16}/></button></div>
      <div className="space-y-3">{documentContents.map(doc => (<div key={doc.id} className="p-3 border rounded bg-white relative"><button onClick={() => removeDocumentEntry(doc.id)} className="absolute top-2 right-2 text-red-500"><Trash2 size={14}/></button><input className="w-full mb-2 p-1 border rounded text-sm font-bold" value={doc.baslik} onChange={e => updateDocumentEntry(doc.id, 'baslik', e.target.value)} /><textarea className="w-full p-1 border rounded text-xs" value={doc.aciklama} onChange={e => updateDocumentEntry(doc.id, 'aciklama', e.target.value)} /><select className="mt-2 w-full p-1 border rounded text-xs" value={doc.durum} onChange={e => updateDocumentEntry(doc.id, 'durum', e.target.value)}><option value="mevcut">Mevcut</option><option value="eksik">Eksik</option><option value="beklemede">Beklemede</option></select></div>))}</div>
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings11.dokumanNo} onChange={handleSettings11} /></div>
    </div>
  );

  const renderEditor12 = () => (
    <div className="space-y-4">
      <h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Müşteri Bilgileri</h2>
      <input className="w-full p-2 border rounded" name="ticariUnvan" placeholder="Ticari Ünvan" value={formData12.ticariUnvan} onChange={handleChange12} />
      <input className="w-full p-2 border rounded" name="faaliyetKonusu" placeholder="Faaliyet Konusu" value={formData12.faaliyetKonusu} onChange={handleChange12} />
      <div className="grid grid-cols-2 gap-2"><input className="p-2 border rounded" name="vergiDairesi" placeholder="Vergi Dairesi" value={formData12.vergiDairesi} onChange={handleChange12} /><input className="p-2 border rounded" name="vergiNo" placeholder="Vergi No" value={formData12.vergiNo} onChange={handleChange12} /></div>
      <textarea className="w-full p-2 border rounded" name="adres" placeholder="Adres" value={formData12.adres} onChange={handleChange12} />
      <div className="grid grid-cols-2 gap-2"><input className="p-2 border rounded" name="telefon" placeholder="Telefon" value={formData12.telefon} onChange={handleChange12} /><input className="p-2 border rounded" name="eposta" placeholder="E-posta" value={formData12.eposta} onChange={handleChange12} /></div>
      <input className="w-full p-2 border rounded" name="yetkiliKisi" placeholder="Yetkili Kişi" value={formData12.yetkiliKisi} onChange={handleChange12} />
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings12.dokumanNo} onChange={handleSettings12} /></div>
    </div>
  );

  const renderEditor13 = () => (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Şube Listesi</h2><button onClick={addBranch} className="bg-green-600 text-white p-1 rounded"><Plus size={16}/></button></div>
      {branchListData.map(b => (<div key={b.id} className="p-2 border rounded relative"><button onClick={() => removeBranch(b.id)} className="absolute top-1 right-1 text-red-500"><Trash2 size={14}/></button><input className="w-full mb-1 p-1 border rounded" placeholder="Şube Adı" value={b.subeAdi} onChange={e => updateBranch(b.id, 'subeAdi', e.target.value)} /><input className="w-full p-1 border rounded" placeholder="Yetkili" value={b.yetkili} onChange={e => updateBranch(b.id, 'yetkili', e.target.value)} /></div>))}
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings13.dokumanNo} onChange={handleSettings13} /></div>
    </div>
  );

  const renderEditor21 = () => (
    <div className="space-y-4">
      <h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Sözleşme Detayları</h2>
      <div className="grid grid-cols-2 gap-2"><input type="date" className="p-2 border rounded" name="baslangicTarihi" value={contractData.baslangicTarihi} onChange={handleContractChange} /><input type="date" className="p-2 border rounded" name="bitisTarihi" value={contractData.bitisTarihi} onChange={handleContractChange} /></div>
      <input className="w-full p-2 border rounded" name="hizmetPeriyodu" placeholder="Periyot" value={contractData.hizmetPeriyodu} onChange={handleContractChange} />
      <input className="w-full p-2 border rounded" name="hizmetBedeli" placeholder="Bedel" value={contractData.hizmetBedeli} onChange={handleContractChange} />
      <div className="space-y-2 border p-2 rounded"><label className="flex gap-2"><input type="checkbox" checked={contractData.kapsam.kemirgen} onChange={() => handleKapsamChange('kemirgen')} /> Kemirgen</label><label className="flex gap-2"><input type="checkbox" checked={contractData.kapsam.yuruyenHasere} onChange={() => handleKapsamChange('yuruyenHasere')} /> Yürüyen Haşere</label></div>
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings21.dokumanNo} onChange={handleSettings21} /></div>
    </div>
  );

  const renderEditor31 = () => (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>İzin ve Ruhsatlar</h2><button onClick={addPermit} className="bg-green-600 text-white p-1 rounded"><Plus size={16}/></button></div>
      {permits.map(p => (<div key={p.id} className="p-2 border rounded relative"><button onClick={() => removePermit(p.id)} className="absolute top-1 right-1 text-red-500"><Trash2 size={14}/></button><input className="w-full mb-1 p-1 border rounded" placeholder="Belge Adı" value={p.belgeAdi} onChange={e => updatePermit(p.id, 'belgeAdi', e.target.value)} /><input className="w-full p-1 border rounded" placeholder="Belge No" value={p.belgeNo} onChange={e => updatePermit(p.id, 'belgeNo', e.target.value)} /></div>))}
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings31.dokumanNo} onChange={handleSettings31} /></div>
    </div>
  );

  const renderEditor32 = () => (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Personel Sertifikaları</h2><button onClick={addStaff} className="bg-green-600 text-white p-1 rounded"><Plus size={16}/></button></div>
      {staff.map(s => (<div key={s.id} className="p-2 border rounded relative"><button onClick={() => removeStaff(s.id)} className="absolute top-1 right-1 text-red-500"><Trash2 size={14}/></button><input className="w-full mb-1 p-1 border rounded" placeholder="Ad Soyad" value={s.adSoyad} onChange={e => updateStaff(s.id, 'adSoyad', e.target.value)} /><input className="w-full p-1 border rounded" placeholder="Sertifika No" value={s.sertifikaNo} onChange={e => updateStaff(s.id, 'sertifikaNo', e.target.value)} /></div>))}
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings32.dokumanNo} onChange={handleSettings32} /></div>
    </div>
  );

  const renderEditor41 = () => (
    <div className="space-y-4">
      <h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Ekipman Krokisi</h2>
      <input type="file" onChange={handleImageUpload} className="w-full text-xs" />
      {krokiImage && <div className="text-xs text-green-600">Görsel yüklendi.</div>}
      <div className="space-y-2 mt-2">{legendItems.map(l => (<div key={l.id} className="flex items-center gap-2"><span className="font-bold w-8">{l.kod}</span><input className="flex-1 p-1 border rounded text-xs" value={l.aciklama} onChange={e => updateLegend(l.id, 'aciklama', e.target.value)} /></div>))}</div>
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings41.dokumanNo} onChange={handleSettings41} /></div>
    </div>
  );

  const renderEditor42 = () => (
    <div className="space-y-4">
      <h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Ekipman Takip</h2>
      <div className="flex gap-2 mb-2"><input type="number" placeholder="Başlangıç" value={generator.start} onChange={e => setGenerator({...generator, start: +e.target.value})} className="w-1/3 p-1 border rounded" /><input type="number" placeholder="Bitiş" value={generator.end} onChange={e => setGenerator({...generator, end: +e.target.value})} className="w-1/3 p-1 border rounded" /><button onClick={generateStations} className="bg-blue-600 text-white p-1 rounded text-xs">Oluştur</button></div>
      <div className="flex justify-between items-center"><span className="text-xs">{stations.length} İstasyon</span><button onClick={clearStations} className="text-red-500 text-xs">Temizle</button></div>
      <div className="max-h-60 overflow-y-auto space-y-1">{stations.map(s => (<div key={s.id} className="flex gap-2 items-center"><span className="w-16 font-bold text-xs">{s.no}</span><input className="flex-1 p-1 border rounded text-xs" placeholder="Lokasyon" value={s.location} onChange={e => updateStation(s.id, 'location', e.target.value)} /><button onClick={() => removeStation(s.id)}><Trash2 size={12} className="text-red-500"/></button></div>))}</div>
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings42.dokumanNo} onChange={handleSettings42} /></div>
    </div>
  );

  const renderEditor51 = () => (
    <div className="space-y-4">
      <h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Uygulama Formu</h2>
      <input type="date" className="w-full p-2 border rounded" name="uygulama_tarihi" value={currentApplication.uygulama_tarihi} onChange={handleApplicationChange} />
      <input className="w-full p-2 border rounded" name="kullanilan_urun" placeholder="Kullanılan Ürün" value={currentApplication.kullanilan_urun} onChange={handleApplicationChange} />
      <input className="w-full p-2 border rounded" name="hedef_hasere" placeholder="Hedef Haşere" value={currentApplication.hedef_hasere} onChange={handleApplicationChange} />
      <button onClick={saveApplicationRecord} className="w-full bg-green-600 text-white p-2 rounded flex justify-center items-center gap-2"><Save size={16}/> Listeye Ekle</button>
      <div className="max-h-40 overflow-y-auto mt-2 space-y-1">{applicationRecords.map(r => (<div key={r.id} className="text-xs border p-1 rounded bg-gray-50">{r.uygulama_tarihi} - {r.kullanilan_urun}</div>))}</div>
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings51.dokumanNo} onChange={handleSettings51} /></div>
    </div>
  );

  const renderEditor52 = () => (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Biyosidal Ürünler</h2><button onClick={addProduct} className="bg-green-600 text-white p-1 rounded"><Plus size={16}/></button></div>
      {products.map(p => (<div key={p.id} className="p-2 border rounded relative"><button onClick={() => removeProduct(p.id)} className="absolute top-1 right-1 text-red-500"><Trash2 size={14}/></button><input className="w-full mb-1 p-1 border rounded" placeholder="Ürün Adı" value={p.urunAdi} onChange={e => updateProduct(p.id, 'urunAdi', e.target.value)} /><input className="w-full p-1 border rounded" placeholder="Aktif Madde" value={p.aktifMadde} onChange={e => updateProduct(p.id, 'aktifMadde', e.target.value)} /></div>))}
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings52.dokumanNo} onChange={handleSettings52} /></div>
    </div>
  );

  const renderEditor53 = () => (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Kullanım Kartları</h2><button onClick={addUsageCard} className="bg-green-600 text-white p-1 rounded"><Plus size={16}/></button></div>
      {usageCards.map(c => (<div key={c.id} className="p-2 border rounded relative"><button onClick={() => removeUsageCard(c.id)} className="absolute top-1 right-1 text-red-500"><Trash2 size={14}/></button><input className="w-full p-1 border rounded" placeholder="Ürün Adı" value={c.urun_adi} readOnly /></div>))}
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings53.dokumanNo} onChange={handleSettings53} /></div>
    </div>
  );

  const renderEditor61 = () => (
    <div className="space-y-4">
      <div className="flex justify-between"><h2 className="text-sm font-bold" style={{ color: BRAND_GREEN }}>Atık Kayıtları</h2><button onClick={addWasteRecord} className="bg-green-600 text-white p-1 rounded"><Plus size={16}/></button></div>
      {wasteRecords.map(w => (<div key={w.id} className="p-2 border rounded relative"><button onClick={() => removeWasteRecord(w.id)} className="absolute top-1 right-1 text-red-500"><Trash2 size={14}/></button><input className="w-full mb-1 p-1 border rounded" placeholder="Atık Türü" value={w.atik_turu} onChange={e => updateWasteRecord(w.id, 'atik_turu', e.target.value)} /><input className="w-full p-1 border rounded" placeholder="Miktar" value={w.miktar} onChange={e => updateWasteRecord(w.id, 'miktar', e.target.value)} /></div>))}
      <div className="mt-4 border-t pt-4"><label className="text-xs">Doküman No</label><input className="w-full p-1 border rounded" name="dokumanNo" value={settings61.dokumanNo} onChange={handleSettings61} /></div>
    </div>
  );


  // --- MAIN LAYOUT ---
  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100 font-sans text-gray-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col print:hidden z-20 shadow-lg">
        <div className="p-6 border-b border-gray-100 bg-green-50">
          <h1 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={20} className="text-green-700"/> Modül Menüsü</h1>
          <p className="text-[10px] text-gray-500 mt-1">Yönetim Paneli</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab('home')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-50"><Home size={18} /> Ana Sayfa</button>
          
          <div className={`mt-2 p-2 rounded border border-green-100 ${selectedCustomerId ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="text-xs font-bold uppercase text-gray-500 mb-1">Seçili Müşteri</div>
            <div className="text-sm font-semibold text-gray-800 truncate">{customers.find(c => c.id === selectedCustomerId)?.cari_isim || 'Seçilmedi'}</div>
          </div>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Modüller</div>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('1.1')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><BookOpen size={16} /> 1.1 İçindekiler</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('1.2')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Building2 size={16} /> 1.2 Müşteri Bilgileri</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('1.3')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Store size={16} /> 1.3 Şube Bilgileri</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('2.1')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><FileSignature size={16} /> 2.1 Sözleşme</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('3.1')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Award size={16} /> 3.1 İzinler</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('3.2')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Users size={16} /> 3.2 Sertifikalar</button>
          <button disabled={!selectedBranchId} onClick={() => setActiveTab('4.1')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Map size={16} /> 4.1 Kroki</button>
          <button disabled={!selectedBranchId} onClick={() => setActiveTab('4.2')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><ClipboardList size={16} /> 4.2 Takip</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('5.1')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><FileText size={16} /> 5.1 EK-1 Form</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('5.2')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Beaker size={16} /> 5.2 Ürün Listesi</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('5.3')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><Package size={16} /> 5.3 Kullanım Kartı</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('6.1')} className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><AlertTriangle size={16} /> 6.1 Atık İmha</button>
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
            {activeTab === '1.1' && renderEditor11()}
            {activeTab === '1.2' && renderEditor12()}
            {activeTab === '1.3' && renderEditor13()}
            {activeTab === '2.1' && renderEditor21()}
            {activeTab === '3.1' && renderEditor31()}
            {activeTab === '3.2' && renderEditor32()}
            {activeTab === '4.1' && renderEditor41()}
            {activeTab === '4.2' && renderEditor42()}
            {activeTab === '5.1' && renderEditor51()}
            {activeTab === '5.2' && renderEditor52()}
            {activeTab === '5.3' && renderEditor53()}
            {activeTab === '6.1' && renderEditor61()}
          </div>
        )}

        {/* SAĞ PANEL (Önizleme) */}
        <div className="flex-1 bg-gray-500 overflow-auto flex justify-center items-start p-8 print:p-0 print:absolute print:inset-0 print:bg-white print:z-50 print:block">
           {activeTab === 'home' && (
             <div className="flex flex-col items-center justify-center h-full p-10 bg-gray-50 text-gray-800">
               <div className="w-full max-w-xl mb-8 space-y-4">
                 <h2 className="text-2xl font-bold text-center mb-6">Yönetim Paneli</h2>
                 <div className="relative">
                    <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full p-3 border rounded-lg shadow-sm">
                        <option value="">1. Adım: Müşteri Seçiniz...</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.cari_isim}</option>)}
                    </select>
                 </div>
                 {selectedCustomerId && (
                   <div className="relative">
                      <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="w-full p-3 border rounded-lg shadow-sm">
                          <option value="">2. Adım: Şube Seçiniz (Opsiyonel)</option>
                          {customerBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
                      </select>
                   </div>
                 )}
               </div>
             </div>
           )}

           {/* Önizlemeler */}
           {activeTab === '1.1' && <Preview11 data={documentContents} settings={settings11} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
           {activeTab === '1.2' && <Preview12 data={formData12} settings={settings12} />}
           {activeTab === '1.3' && <Preview13 data={branchListData} settings={settings13} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
           {activeTab === '2.1' && <Preview21 data={contractData} settings={settings21} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} customerAddress={formData12.adres} customerAuth={formData12.yetkiliKisi} />}
           {activeTab === '3.1' && <Preview31 data={permits} settings={settings31} />}
           {activeTab === '3.2' && <Preview32 data={staff} settings={settings32} />}
           {activeTab === '4.1' && <Preview41 krokiImage={krokiImage} legendItems={legendItems} settings={settings41} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
           {activeTab === '4.2' && <Preview42 stations={stations} settings={settings42} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
           {activeTab === '5.1' && <Preview51 data={currentApplication} settings={settings51} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
           {activeTab === '5.2' && <Preview52 products={products} settings={settings52} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
           {activeTab === '5.3' && <Preview53 usageCards={usageCards} settings={settings53} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
           {activeTab === '6.1' && <Preview61 records={wasteRecords} settings={settings61} customerName={customers.find(c => c.id === selectedCustomerId)?.cari_isim || ''} />}
        </div>
      </main>
    </div>
  );
}