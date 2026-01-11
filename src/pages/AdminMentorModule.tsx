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
      // Müşterileri çek
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
        // Şubeleri çek
        const { data: branchData } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', selectedCustomerId);
        if (branchData) setCustomerBranches(branchData);
      };
      loadCustomerData();
      
      // Müşteri bazlı form verilerini yükle (Örn: 1.2)
      loadFormData(selectedCustomerId, null, '1.2');
    }
  }, [selectedCustomerId]);

  // Şube seçilince
  useEffect(() => {
    if (selectedBranchId) {
      // Şube bazlı formları yükle (4.1, 4.2)
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
        // Diğer form tipleri için de benzer maplemeler...
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

    // Aktif taba göre kaydedilecek veriyi belirle
    if (activeTab === '1.2') { contentToSave = formData12; settingsToSave = settings12; }
    else if (activeTab === '4.1') { contentToSave = { image: krokiImage, legend: legendItems }; settingsToSave = settings41; currentBranchId = selectedBranchId; }
    // Diğer tablar...

    try {
      const { error } = await supabase.from('activity_files').upsert({
        customer_id: selectedCustomerId,
        branch_id: currentBranchId, // Sadece şube bazlı formlarda dolu olmalı
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
  const handleSettings12 = (e: React.ChangeEvent<HTMLInputElement>) => setSettings12({ ...settings12, [e.target.name]: e.target.value });
  const handleChange12 = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData12({ ...formData12, [e.target.name]: e.target.value });

  // ... Diğer handler'lar (önceki koddan kopyalanacak)

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
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('2.1')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"><FileSignature size={18} /> 2.1 Hizmet Sözleşmesi</button>
          
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
            {/* Örnek 1.2 Editörü */}
            {activeTab === '1.2' && (
              <div className="space-y-6">
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: BRAND_GREEN }}><Building2 size={16} /> Firma Bilgileri</h2>
                  <div className="space-y-3">
                    <div><label className="text-xs font-medium text-gray-500">Ticari Ünvan</label><textarea name="ticariUnvan" value={formData12.ticariUnvan} onChange={handleChange12} rows={2} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div>
                    {/* Diğer inputlar buraya gelecek... */}
                  </div>
                </section>
                {/* Doküman Ayarları */}
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><FileText size={16} /> Doküman Ayarları</h2>
                  <div className="grid grid-cols-3 gap-2">
                     <input type="text" name="dokumanNo" value={settings12.dokumanNo} onChange={handleSettings12} className="p-2 border rounded text-sm" placeholder="No" />
                     {/* ... */}
                  </div>
                </section>
              </div>
            )}
            
            {/* ... Diğer editörler buraya eklenecek ... */}
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
           {/* Diğer önizlemeler... */}
        </div>
      </main>
    </div>
  );
}