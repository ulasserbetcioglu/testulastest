import React, { useState, useRef, useEffect } from 'react';
import { Printer, Building2, MapPin, Phone, Mail, User, FileText, Plus, Trash2, Home, Store, Ligature as FileSignature, CheckSquare, DollarSign, Award, ShieldCheck, Users, Map, Upload, Image as ImageIcon, ClipboardList, Settings, Beaker, Search, Loader2, Save, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Kurumsal Yeşil Tonu
const BRAND_GREEN = '#006837'; // Mentor Yeşili
const BRAND_LIGHT_GREEN = '#e6f4ea';

// Logo URL
const LOGO_URL = "https://pestmentor.com.tr/pestmentor-logo-png-297x97.webp";

// --- TİP TANIMLAMALARI ---
interface SettingsBase {
  dokumanNo: string;
  revizyonNo: string;
  yayinTarihi: string;
}

interface FormData12 {
  ticariUnvan: string;
  faaliyetKonusu: string;
  vergiDairesi: string;
  vergiNo: string;
  mersisNo: string;
  adres: string;
  telefon: string;
  faks: string;
  eposta: string;
  webSitesi: string;
  yetkiliKisi: string;
  yetkiliUnvan: string;
  yetkiliTel: string;
  hizmetBaslangicTarihi: string;
  [key: string]: string;
}

interface Branch {
  id: number | string;
  subeAdi: string;
  yetkili: string;
  metrekare: string;
  adres: string;
  telefon: string;
}

interface ContractData {
  sozlesmeTarihi: string;
  sozlesmeNo: string;
  hizmetPeriyodu: string;
  hizmetBedeli: string;
  paraBirimi: string;
  sozlesmeSuresi: string;
  baslangicTarihi: string;
  bitisTarihi: string;
  odemeSekli: string;
  kapsam: {
    kemirgen: boolean;
    yuruyenHasere: boolean;
    ucanHasere: boolean;
    dezenfeksiyon: boolean;
    [key: string]: boolean;
  };
}

interface Permit {
  id: number;
  belgeAdi: string;
  belgeNo: string;
  verilisTarihi: string;
  gecerlilikTarihi: string;
  verenKurum: string;
}

interface Staff {
  id: number;
  adSoyad: string;
  gorev: string;
  sertifikaNo: string;
  gecerlilikTarihi: string;
}

interface LegendItem {
  id: number;
  kod: string;
  aciklama: string;
  renk: string;
  sekil: string;
}

interface Station {
  id: number | string;
  no: string;
  location: string;
  type: string;
}

interface Product {
  id: number | string;
  urunAdi: string;
  aktifMadde: string;
  ruhsatNo: string;
  hedefHasere: string;
  antidot: string;
}

interface CustomerSummary {
  id: string;
  cari_isim: string;
}

export default function AdminMentorModule() {
  // --- STATE YÖNETİMİ ---
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Şube Seçimi State'leri
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [customerBranches, setCustomerBranches] = useState<any[]>([]);

  // 1.2 MÜŞTERİ BİLGİLERİ VERİSİ
  const [formData12, setFormData12] = useState<FormData12>({
    ticariUnvan: '',
    faaliyetKonusu: '',
    vergiDairesi: '',
    vergiNo: '',
    mersisNo: '',
    adres: '',
    telefon: '',
    faks: '',
    eposta: '',
    webSitesi: '',
    yetkiliKisi: '',
    yetkiliUnvan: '',
    yetkiliTel: '',
    hizmetBaslangicTarihi: new Date().toISOString().split('T')[0]
  });

  const [settings12, setSettings12] = useState<SettingsBase>({
    dokumanNo: '1.2',
    revizyonNo: '00',
    yayinTarihi: '01.01.2024'
  });

  // 1.3 ŞUBE BİLGİLERİ VERİSİ (Tablo Görünümü İçin)
  const [branches, setBranches] = useState<Branch[]>([]);
  const [settings13, setSettings13] = useState<SettingsBase>({
    dokumanNo: '1.3',
    revizyonNo: '00',
    yayinTarihi: '01.01.2024'
  });

  // 2.1 HİZMET SÖZLEŞMESİ VERİSİ
  const [contractData, setContractData] = useState<ContractData>({
    sozlesmeTarihi: new Date().toISOString().split('T')[0],
    sozlesmeNo: '2024-001',
    hizmetPeriyodu: 'Ayda 1 Kez (Periyodik)',
    hizmetBedeli: '0',
    paraBirimi: 'TL',
    sozlesmeSuresi: '1 Yıl',
    baslangicTarihi: new Date().toISOString().split('T')[0],
    bitisTarihi: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    odemeSekli: 'Hizmet sonrası fatura tarihinden itibaren 7 gün içinde banka havalesi.',
    kapsam: {
      kemirgen: true,
      yuruyenHasere: true,
      ucanHasere: true,
      dezenfeksiyon: false
    }
  });
  const [settings21, setSettings21] = useState<SettingsBase>({ dokumanNo: '2.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 3.1 & 3.2 İZİN VE PERSONEL
  const [permits, setPermits] = useState<Permit[]>([]);
  const [settings31, setSettings31] = useState<SettingsBase>({ dokumanNo: '3.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [settings32, setSettings32] = useState<SettingsBase>({ dokumanNo: '3.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 4.1 & 4.2 KROKİ VE EKİPMAN
  const [krokiImage, setKrokiImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [legendItems, setLegendItems] = useState<LegendItem[]>([
    { id: 1, kod: 'Kİ', aciklama: 'Kemirgen İstasyonu (Rodent Station)', renk: '#000000', sekil: 'Kare' },
    { id: 2, kod: 'Yİ', aciklama: 'Yürüyen Haşere İstasyonu (Monitor)', renk: '#000000', sekil: 'Daire' },
    { id: 3, kod: 'ILT', aciklama: 'Sinek Tutucu Cihaz (EFC)', renk: '#000000', sekil: 'Üçgen' },
    { id: 4, kod: 'FT', aciklama: 'Feromon Tuzak', renk: '#000000', sekil: 'Yıldız' },
  ]);
  const [settings41, setSettings41] = useState<SettingsBase>({ dokumanNo: '4.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [stations, setStations] = useState<Station[]>([]);
  const [generator, setGenerator] = useState({ prefix: 'Kİ', start: 1, end: 10, type: 'Kemirgen İstasyonu' });
  const [settings42, setSettings42] = useState<SettingsBase>({ dokumanNo: '4.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // 5.2 ÜRÜNLER
  const [products, setProducts] = useState<Product[]>([]);
  const [settings52, setSettings52] = useState<SettingsBase>({ dokumanNo: '5.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // KAYDEDİLMİŞ FAALİYET DOSYALARI
  const [savedFiles, setSavedFiles] = useState<any[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // --- VERİ ÇEKME İŞLEMLERİ ---
  useEffect(() => {
    fetchCustomers();
    fetchSystemProducts();
    fetchOperators();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetails(selectedCustomerId);
      fetchCustomerBranches(selectedCustomerId);
      fetchSavedFiles(selectedCustomerId);
      // Müşteri değiştiğinde şube seçimini sıfırla
      setSelectedBranchId('');
      setStations([]);
      setKrokiImage(null);
      setSelectedFileId('');
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (selectedBranchId) {
      fetchBranchStations(selectedBranchId);
      // Şube krokisini de burada çekebilirsiniz varsa
      // fetchBranchFloorPlan(selectedBranchId);
    } else {
      setStations([]);
    }
  }, [selectedBranchId]);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('customers').select('id, cari_isim').order('cari_isim');
    if (error) {
      console.error('Error fetching customers:', error);
      toast.error('Müşteri listesi alınamadı.');
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const fetchSystemProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').eq('category', 'pesticide'); 
    if (!error && data) {
      const mappedProducts: Product[] = data.map((p: any) => ({
        id: p.id,
        urunAdi: p.name,
        aktifMadde: p.active_ingredient || '',
        ruhsatNo: p.registration_number || '',
        hedefHasere: p.target_pests || '',
        antidot: p.antidote || ''
      }));
      setProducts(mappedProducts);
    }
  };

  const fetchOperators = async () => {
    const { data, error } = await supabase.from('operators').select('*');
    if (!error && data) {
        const mappedStaff: Staff[] = data.map((op: any) => ({
            id: op.id,
            adSoyad: op.full_name,
            gorev: 'Biyosidal Ürün Uygulayıcı',
            sertifikaNo: op.certification_number || '',
            gecerlilikTarihi: ''
        }));
        setStaff(mappedStaff);
    }
  }

  const fetchCustomerDetails = async (id: string) => {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (!error && data) {
      setFormData12({
        ticariUnvan: data.cari_isim,
        faaliyetKonusu: '', 
        vergiDairesi: data.vergi_dairesi || '',
        vergiNo: data.vergi_no || '',
        mersisNo: '', 
        adres: data.fatura_adresi || data.address || '',
        telefon: data.telefon || data.phone || '',
        faks: '',
        eposta: data.eposta || data.email || '',
        webSitesi: '',
        yetkiliKisi: data.yetkili_kisi || '',
        yetkiliUnvan: '',
        yetkiliTel: data.yetkili_telefon || '',
        hizmetBaslangicTarihi: new Date().toISOString().split('T')[0]
      });
    }
  };

  const fetchCustomerBranches = async (customerId: string) => {
    const { data, error } = await supabase.from('branches').select('*').eq('customer_id', customerId);
    if (!error && data) {
      // 1. Dropdown için ham veriyi sakla
      setCustomerBranches(data);

      // 2. Tablo görünümü (1.3) için formatla
      const mappedBranches: Branch[] = data.map((b: any) => ({
        id: b.id,
        subeAdi: b.sube_adi || b.title || b.name,
        yetkili: b.yetkili_kisi || '',
        metrekare: '',
        adres: b.adres || b.address || '',
        telefon: b.telefon || b.phone || ''
      }));
      setBranches(mappedBranches);
    }
  };

  const fetchBranchStations = async (branchId: string) => {
    try {
      const { data, error } = await supabase
        .from('branch_equipment')
        .select(`
          id,
          equipment_code,
          department,
          equipment:equipment_id (
            id,
            name,
            category
          )
        `)
        .eq('branch_id', branchId)
        .order('equipment_code', { ascending: true });

      if (error) {
        console.error('Ekipmanlar çekilirken hata:', error);
        setStations([]);
        toast.error('Ekipmanlar yüklenemedi');
        return;
      }

      if (data && data.length > 0) {
        const mappedStations: Station[] = data.map((item: any) => ({
          id: item.id,
          no: item.equipment_code || '',
          location: item.department || '',
          type: item.equipment?.name || ''
        }));

        setStations(mappedStations);
        toast.success(`${mappedStations.length} adet ekipman yüklendi.`);
      } else {
        setStations([]);
        toast.info('Bu şubeye ait kayıtlı ekipman bulunamadı.');
      }
    } catch (err) {
      console.error('Beklenmeyen hata:', err);
      setStations([]);
      toast.error('Ekipmanlar yüklenirken hata oluştu');
    }
  };

  // --- HANDLERS ---
  const handleChange12 = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setFormData12(prev => ({ ...prev, [name]: value })); };
  const handleSettings12 = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setSettings12(prev => ({ ...prev, [name]: value })); };
  
  const addBranch = () => { setBranches([...branches, { id: Date.now(), subeAdi: 'Yeni Şube', yetkili: '', metrekare: '', adres: '', telefon: '' }]); };
  const updateBranch = (id: number | string, field: keyof Branch, value: string) => { setBranches(branches.map(b => b.id === id ? { ...b, [field]: value } : b)); };
  const removeBranch = (id: number | string) => { setBranches(branches.filter(b => b.id !== id)); };
  const handleSettings13 = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setSettings13(prev => ({ ...prev, [name]: value })); };
  
  const handleContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const { name, value } = e.target; setContractData(prev => ({ ...prev, [name]: value })); };
  const handleKapsamChange = (key: string) => { setContractData(prev => ({ ...prev, kapsam: { ...prev.kapsam, [key]: !prev.kapsam[key] } })); };
  const handleSettings21 = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setSettings21(prev => ({ ...prev, [name]: value })); };
  
  const addPermit = () => { setPermits([...permits, { id: Date.now(), belgeAdi: 'Yeni Belge', belgeNo: '', verilisTarihi: '', gecerlilikTarihi: '', verenKurum: '' }]); };
  const updatePermit = (id: number, field: keyof Permit, value: string) => { setPermits(permits.map(p => p.id === id ? { ...p, [field]: value } : p)); };
  const removePermit = (id: number) => { setPermits(permits.filter(p => p.id !== id)); };
  const handleSettings31 = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setSettings31(prev => ({ ...prev, [name]: value })); };
  
  const addStaff = () => { setStaff([...staff, { id: Date.now(), adSoyad: 'Yeni Personel', gorev: 'Operatör', sertifikaNo: '', gecerlilikTarihi: '' }]); };
  const updateStaff = (id: number, field: keyof Staff, value: string) => { setStaff(staff.map(s => s.id === id ? { ...s, [field]: value } : s)); };
  const removeStaff = (id: number) => { setStaff(staff.filter(s => s.id !== id)); };
  const handleSettings32 = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setSettings32(prev => ({ ...prev, [name]: value })); };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const imageUrl = URL.createObjectURL(file); setKrokiImage(imageUrl); } };
  const removeKrokiImage = () => { setKrokiImage(null); if(fileInputRef.current) fileInputRef.current.value = ""; };
  const handleSettings41 = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setSettings41(prev => ({ ...prev, [name]: value })); };
  const updateLegend = (id: number, field: keyof LegendItem, value: string) => { setLegendItems(legendItems.map(item => item.id === id ? { ...item, [field]: value } : item)); };
  
  const generateStations = () => { const newStations: Station[] = []; const start = parseInt(generator.start.toString()); const end = parseInt(generator.end.toString()); if (isNaN(start) || isNaN(end) || start > end) return; for (let i = start; i <= end; i++) { const numStr = i < 10 ? `0${i}` : `${i}`; newStations.push({ id: Date.now() + i, no: `${generator.prefix}-${numStr}`, location: '', type: generator.type }); } setStations([...stations, ...newStations]); };
  const updateStation = (id: number, field: keyof Station, value: string) => { setStations(stations.map(s => s.id === id ? { ...s, [field]: value } : s)); };
  const removeStation = (id: number) => { setStations(stations.filter(s => s.id !== id)); };
  const clearStations = () => { if(window.confirm('Tüm listeyi silmek istediğinize emin misiniz?')) { setStations([]); } };
  const handleSettings42 = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setSettings42(prev => ({ ...prev, [name]: value })); };

  const addProduct = () => { setProducts([...products, { id: Date.now(), urunAdi: 'Yeni Ürün', aktifMadde: '', ruhsatNo: '', hedefHasere: '', antidot: '' }]); };
  const updateProduct = (id: number | string, field: keyof Product, value: string) => { setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p)); };
  const removeProduct = (id: number | string) => { setProducts(products.filter(p => p.id !== id)); };
  const handleSettings52 = (e: React.ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setSettings52(prev => ({ ...prev, [name]: value })); };

  const handlePrint = () => { window.print(); };

  const handleSave = async () => {
    if (!selectedCustomerId) {
      toast.error('Lütfen önce bir müşteri seçin');
      return;
    }

    const title = `${formData12.ticariUnvan} - Faaliyet Dosyası - ${new Date().toLocaleDateString('tr-TR')}`;

    const formDataToSave = {
      formData12,
      branches,
      contractData,
      permits,
      staff,
      legendItems,
      stations,
      products,
      krokiImage,
      settings12,
      settings13,
      settings21,
      settings31,
      settings32,
      settings41,
      settings42,
      settings52
    };

    try {
      setIsSaving(true);

      if (selectedFileId) {
        const { error } = await supabase
          .from('activity_files')
          .update({
            title,
            form_data: formDataToSave,
            branch_id: selectedBranchId || null,
            updated_at: new Date().toISOString(),
            status: 'published'
          })
          .eq('id', selectedFileId);

        if (error) throw error;
        toast.success('Faaliyet dosyası güncellendi');
      } else {
        const { data, error } = await supabase
          .from('activity_files')
          .insert({
            customer_id: selectedCustomerId,
            branch_id: selectedBranchId || null,
            title,
            form_data: formDataToSave,
            status: 'published'
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setSelectedFileId(data.id);
          toast.success('Faaliyet dosyası kaydedildi');
        }
      }

      fetchSavedFiles(selectedCustomerId);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Kaydederken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchSavedFiles = async (customerId: string) => {
    try {
      let query = supabase
        .from('activity_files')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSavedFiles(data || []);
    } catch (error) {
      console.error('Error fetching saved files:', error);
    }
  };

  const loadSavedFile = (file: any) => {
    if (file.form_data) {
      const data = file.form_data;
      if (data.formData12) setFormData12(data.formData12);
      if (data.branches) setBranches(data.branches);
      if (data.contractData) setContractData(data.contractData);
      if (data.permits) setPermits(data.permits);
      if (data.staff) setStaff(data.staff);
      if (data.legendItems) setLegendItems(data.legendItems);
      if (data.stations) setStations(data.stations);
      if (data.products) setProducts(data.products);
      if (data.krokiImage) setKrokiImage(data.krokiImage);
      if (data.settings12) setSettings12(data.settings12);
      if (data.settings13) setSettings13(data.settings13);
      if (data.settings21) setSettings21(data.settings21);
      if (data.settings31) setSettings31(data.settings31);
      if (data.settings32) setSettings32(data.settings32);
      if (data.settings41) setSettings41(data.settings41);
      if (data.settings42) setSettings42(data.settings42);
      if (data.settings52) setSettings52(data.settings52);

      setSelectedFileId(file.id);
      toast.success('Faaliyet dosyası yüklendi');
    }
  };

  const deleteSavedFile = async (fileId: string) => {
    if (!confirm('Bu faaliyet dosyasını silmek istediğinize emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('activity_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      toast.success('Faaliyet dosyası silindi');
      if (selectedFileId === fileId) {
        setSelectedFileId('');
      }
      fetchSavedFiles(selectedCustomerId);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Silerken hata oluştu');
    }
  };

  // --- ORTAK BİLEŞEN: HEADER ---
  const A4Header = ({ title, settings }: { title: string, settings: SettingsBase }) => (
    <div className="border-2 border-black mb-6">
      <div className="flex">
        <div className="w-1/4 border-r-2 border-black flex flex-col items-center justify-center p-2 text-center">
          <img src={LOGO_URL} alt="Mentor Logo" className="max-h-12 mb-1" />
          <div className="text-[10px] italic font-bold" style={{ color: BRAND_GREEN }}>Leave pest to us.</div>
        </div>
        <div className="w-2/4 border-r-2 border-black flex items-center justify-center p-2">
          <h1 className="text-xl font-bold text-center uppercase">{title}</h1>
        </div>
        <div className="w-1/4 text-xs">
          <div className="border-b border-black p-1 flex justify-between"><span className="font-bold">Doküman No:</span><span>{settings.dokumanNo}</span></div>
          <div className="border-b border-black p-1 flex justify-between"><span className="font-bold">Yayın Tarihi:</span><span>{settings.yayinTarihi}</span></div>
          <div className="border-b border-black p-1 flex justify-between"><span className="font-bold">Revizyon No:</span><span>{settings.revizyonNo}</span></div>
          <div className="p-1 flex justify-between"><span className="font-bold">Sayfa No:</span><span>1 / 1</span></div>
        </div>
      </div>
    </div>
  );

  // --- RENDER BİLEŞENLERİ ---

  // ANA SAYFA
  const renderHome = () => (
    <div className="flex flex-col items-center justify-center h-full p-10 bg-gray-50 text-gray-800 overflow-y-auto">
      <div className="flex flex-col items-center mb-10">
        <img src={LOGO_URL} alt="Mentor Logo" className="h-20 mb-2" />
        <p className="text-xl italic font-bold" style={{ color: BRAND_GREEN }}>"Leave pest to us."</p>
      </div>
      
      {/* SEÇİM ALANI */}
      <div className="w-full max-w-xl mb-8 space-y-4">
        {/* Müşteri Seçimi */}
        <div className="relative">
            <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
              <Building2 size={16} />
            </div>
            <select 
                value={selectedCustomerId} 
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white text-sm font-medium transition-colors hover:border-green-400"
            >
                <option value="">1. Adım: Müşteri Seçiniz...</option>
                {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.cari_isim}</option>
                ))}
            </select>
        </div>

        {/* Şube Seçimi (Sadece müşteri seçiliyse görünür) */}
        {selectedCustomerId && (
          <div className="relative animate-in slide-in-from-top-2 duration-300">
             <div className="absolute left-3 top-2.5 text-gray-400 pointer-events-none">
               <Store size={16} />
             </div>
             <select 
                 value={selectedBranchId} 
                 onChange={(e) => setSelectedBranchId(e.target.value)}
                 className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white text-sm font-medium transition-colors hover:border-green-400"
             >
                 <option value="">2. Adım: Şube Seçiniz (Ekipman ve Krokiler İçin)</option>
                 {customerBranches.map(b => (
                     <option key={b.id} value={b.id}>{b.sube_adi}</option>
                 ))}
             </select>
          </div>
        )}
      </div>

      {!selectedCustomerId && (
          <div className="text-center text-gray-500 bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-lg">
             <Filter className="mx-auto mb-2 text-yellow-600" size={24} />
              <p className="font-medium text-yellow-800">Lütfen İşlem Yapmak İçin Müşteri Seçiniz</p>
              <p className="text-sm mt-1">Sol menüdeki formları görüntülemek ve düzenlemek için önce bir müşteri seçimi yapmalısınız.</p>
          </div>
      )}

      {selectedCustomerId && savedFiles.length > 0 && (
          <div className="w-full max-w-4xl mt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={24} />
              Kaydedilmiş Faaliyet Dosyaları
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedFiles.map(file => (
                <div
                  key={file.id}
                  className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 flex-1">{file.title}</h3>
                    <button
                      onClick={() => deleteSavedFile(file.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {new Date(file.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <button
                    onClick={() => loadSavedFile(file)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    Yükle ve Düzenle
                  </button>
                </div>
              ))}
            </div>
          </div>
      )}
      
      {selectedCustomerId && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl animate-in fade-in zoom-in duration-300">
            {/* MÜŞTERİ BAZLI MODÜLLER */}
            <div className="col-span-full mb-2">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Genel / Müşteri Bazlı Dokümanlar</h3>
            </div>
            
            <button onClick={() => setActiveTab('1.2')} className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-600 flex flex-col items-center text-center h-full">
            <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors"><Building2 size={32} color={BRAND_GREEN} className="group-hover:text-white" style={{ color: 'inherit' }} /></div>
            <h2 className="text-sm font-bold mb-2 text-gray-800">1.2. Müşteri Bilgileri</h2>
            </button>

            <button onClick={() => setActiveTab('1.3')} className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-600 flex flex-col items-center text-center h-full">
            <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors"><Store size={32} color={BRAND_GREEN} className="group-hover:text-white" style={{ color: 'inherit' }} /></div>
            <h2 className="text-sm font-bold mb-2 text-gray-800">1.3. Şube Bilgileri</h2>
            </button>

            <button onClick={() => setActiveTab('2.1')} className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-600 flex flex-col items-center text-center h-full">
            <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors"><FileSignature size={32} color={BRAND_GREEN} className="group-hover:text-white" style={{ color: 'inherit' }} /></div>
            <h2 className="text-sm font-bold mb-2 text-gray-800">2.1. Hizmet Sözleşmesi</h2>
            </button>

            <button onClick={() => setActiveTab('3.1')} className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-600 flex flex-col items-center text-center h-full">
            <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors"><Award size={32} color={BRAND_GREEN} className="group-hover:text-white" style={{ color: 'inherit' }} /></div>
            <h2 className="text-sm font-bold mb-2 text-gray-800">3.1. İzin ve Ruhsatlar</h2>
            </button>

            <button onClick={() => setActiveTab('3.2')} className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-600 flex flex-col items-center text-center h-full">
            <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors"><Users size={32} color={BRAND_GREEN} className="group-hover:text-white" style={{ color: 'inherit' }} /></div>
            <h2 className="text-sm font-bold mb-2 text-gray-800">3.2. Sertifikalar</h2>
            </button>

             <button onClick={() => setActiveTab('5.2')} className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-transparent hover:border-green-600 flex flex-col items-center text-center h-full">
            <div className="bg-green-100 p-4 rounded-full mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors"><Beaker size={32} color={BRAND_GREEN} className="group-hover:text-white" style={{ color: 'inherit' }} /></div>
            <h2 className="text-sm font-bold mb-2 text-gray-800">5.2. Biyosidal Ürünler</h2>
            </button>

            {/* ŞUBE BAZLI MODÜLLER */}
            <div className="col-span-full mt-6 mb-2">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2 flex justify-between">
                 <span>Şube Bazlı Dokümanlar</span>
                 {!selectedBranchId && <span className="text-red-500 normal-case font-normal">* Şube seçimi gereklidir</span>}
               </h3>
            </div>

            <button 
              onClick={() => {
                if(!selectedBranchId) { toast.error("Lütfen önce şube seçiniz."); return; }
                setActiveTab('4.1');
              }} 
              className={`group bg-white p-6 rounded-xl shadow-md transition-all border-2 border-transparent flex flex-col items-center text-center h-full ${selectedBranchId ? 'hover:shadow-xl hover:border-green-600 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            >
            <div className={`bg-green-100 p-4 rounded-full mb-4 transition-colors ${selectedBranchId ? 'group-hover:bg-green-600 group-hover:text-white' : ''}`}><Map size={32} color={BRAND_GREEN} className={selectedBranchId ? "group-hover:text-white" : ""} style={{ color: 'inherit' }} /></div>
            <h2 className="text-sm font-bold mb-2 text-gray-800">4.1. Ekipman Krokisi</h2>
            </button>

            <button 
               onClick={() => {
                if(!selectedBranchId) { toast.error("Lütfen önce şube seçiniz."); return; }
                setActiveTab('4.2');
              }} 
              className={`group bg-white p-6 rounded-xl shadow-md transition-all border-2 border-transparent flex flex-col items-center text-center h-full ${selectedBranchId ? 'hover:shadow-xl hover:border-green-600 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            >
            <div className={`bg-green-100 p-4 rounded-full mb-4 transition-colors ${selectedBranchId ? 'group-hover:bg-green-600 group-hover:text-white' : ''}`}><ClipboardList size={32} color={BRAND_GREEN} className={selectedBranchId ? "group-hover:text-white" : ""} style={{ color: 'inherit' }} /></div>
            <h2 className="text-sm font-bold mb-2 text-gray-800">4.2. Ekipman Takip</h2>
            </button>

        </div>
      )}
    </div>
  );

  // EDİTÖRLER
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

  const renderEditor13 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-800 mb-4">
        Firmanın şubeleri otomatik olarak veritabanından çekilmiştir. Gerekirse manuel ekleme yapabilirsiniz.
      </div>
      <div className="flex justify-between items-center border-b pb-2 mb-4"><h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: BRAND_GREEN }}><Store size={16} /> Şube Listesi</h2><button onClick={addBranch} className="bg-green-600 text-white p-1.5 rounded hover:bg-green-700 transition"><Plus size={16}/></button></div>
      <div className="space-y-4">{branches.map((branch, index) => (<div key={branch.id} className="p-3 bg-white border rounded shadow-sm relative group"><div className="absolute top-2 right-2 flex gap-2"><span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">#{index + 1}</span><button onClick={() => removeBranch(branch.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div><div className="space-y-2 mt-2"><input type="text" placeholder="Şube Adı" value={branch.subeAdi} onChange={(e) => updateBranch(branch.id, 'subeAdi', e.target.value)} className="w-full p-2 border rounded text-sm font-semibold outline-none focus:border-green-600" /><div className="grid grid-cols-2 gap-2"><input type="text" placeholder="Şube Yetkilisi" value={branch.yetkili} onChange={(e) => updateBranch(branch.id, 'yetkili', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" /><input type="text" placeholder="Metrekare (m²)" value={branch.metrekare} onChange={(e) => updateBranch(branch.id, 'metrekare', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" /></div><div className="grid grid-cols-2 gap-2"><input type="text" placeholder="Telefon" value={branch.telefon} onChange={(e) => updateBranch(branch.id, 'telefon', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" /></div><textarea placeholder="Şube Açık Adresi" value={branch.adres} onChange={(e) => updateBranch(branch.id, 'adres', e.target.value)} rows={2} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" /></div></div>))}</div>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><FileText size={16} /> Doküman Ayarları</h2><div className="grid grid-cols-3 gap-2"><input type="text" name="dokumanNo" value={settings13.dokumanNo} onChange={handleSettings13} className="p-2 border rounded text-sm" placeholder="No" /><input type="text" name="yayinTarihi" value={settings13.yayinTarihi} onChange={handleSettings13} className="p-2 border rounded text-sm" placeholder="Tarih" /><input type="text" name="revizyonNo" value={settings13.revizyonNo} onChange={handleSettings13} className="p-2 border rounded text-sm" placeholder="Rev" /></div></section>
    </div>
  );

  const renderEditor21 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-800 mb-4">Müşteri bilgileri 1.2 modülünden otomatik alınır. Burada sözleşmenin teknik detaylarını giriniz.</div>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: BRAND_GREEN }}><FileText size={16} /> Sözleşme Künyesi</h2><div className="grid grid-cols-2 gap-2 mb-3"><div><label className="text-xs font-medium text-gray-500">Sözleşme No</label><input type="text" name="sozlesmeNo" value={contractData.sozlesmeNo} onChange={handleContractChange} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div><div><label className="text-xs font-medium text-gray-500">Tarih</label><input type="date" name="sozlesmeTarihi" value={contractData.sozlesmeTarihi} onChange={handleContractChange} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-medium text-gray-500">Başlangıç Tarihi</label><input type="text" name="baslangicTarihi" value={contractData.baslangicTarihi} onChange={handleContractChange} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div><div><label className="text-xs font-medium text-gray-500">Bitiş Tarihi</label><input type="text" name="bitisTarihi" value={contractData.bitisTarihi} onChange={handleContractChange} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div></div></section>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><CheckSquare size={16} /> Hizmet Kapsamı (Zararlılar)</h2><div className="space-y-2"><label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"><input type="checkbox" checked={contractData.kapsam.kemirgen} onChange={() => handleKapsamChange('kemirgen')} className="accent-green-700" /><span className="text-sm">Kemirgen Kontrolü (Fare, Sıçan vb.)</span></label><label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"><input type="checkbox" checked={contractData.kapsam.yuruyenHasere} onChange={() => handleKapsamChange('yuruyenHasere')} className="accent-green-700" /><span className="text-sm">Yürüyen Haşere Kontrolü (Hamamböceği vb.)</span></label><label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"><input type="checkbox" checked={contractData.kapsam.ucanHasere} onChange={() => handleKapsamChange('ucanHasere')} className="accent-green-700" /><span className="text-sm">Uçan Haşere Kontrolü (Sinek, Sivrisinek vb.)</span></label><label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded"><input type="checkbox" checked={contractData.kapsam.dezenfeksiyon} onChange={() => handleKapsamChange('dezenfeksiyon')} className="accent-green-700" /><span className="text-sm">Dezenfeksiyon Hizmeti (Virüs, Bakteri vb.)</span></label></div></section>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><DollarSign size={16} /> Ücret ve Periyot</h2><div className="space-y-3"><div><label className="text-xs font-medium text-gray-500">Hizmet Periyodu</label><input type="text" name="hizmetPeriyodu" value={contractData.hizmetPeriyodu} onChange={handleContractChange} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div><div className="grid grid-cols-2 gap-2"><div><label className="text-xs font-medium text-gray-500">Hizmet Bedeli</label><input type="text" name="hizmetBedeli" value={contractData.hizmetBedeli} onChange={handleContractChange} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div><div><label className="text-xs font-medium text-gray-500">Para Birimi</label><select name="paraBirimi" value={contractData.paraBirimi} onChange={handleContractChange} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600"><option>TL</option><option>USD</option><option>EUR</option></select></div></div><div><label className="text-xs font-medium text-gray-500">Ödeme Şekli</label><textarea name="odemeSekli" value={contractData.odemeSekli} onChange={handleContractChange} rows={2} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /></div></div></section>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><FileText size={16} /> Doküman Ayarları</h2><div className="grid grid-cols-3 gap-2"><input type="text" name="dokumanNo" value={settings21.dokumanNo} onChange={handleSettings21} className="p-2 border rounded text-sm" placeholder="No" /><input type="text" name="yayinTarihi" value={settings21.yayinTarihi} onChange={handleSettings21} className="p-2 border rounded text-sm" placeholder="Tarih" /><input type="text" name="revizyonNo" value={settings21.revizyonNo} onChange={handleSettings21} className="p-2 border rounded text-sm" placeholder="Rev" /></div></section>
    </div>
  );

  const renderEditor31 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-800 mb-4">Faaliyet dosyası kapsamında bulundurulması zorunlu olan izin ve ruhsatları buradan yönetebilirsiniz.</div>
      <div className="flex justify-between items-center border-b pb-2 mb-4"><h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: BRAND_GREEN }}><Award size={16} /> İzin ve Ruhsat Listesi</h2><button onClick={addPermit} className="bg-green-600 text-white p-1.5 rounded hover:bg-green-700 transition"><Plus size={16}/></button></div>
      <div className="space-y-4">{permits.map((permit, index) => (<div key={permit.id} className="p-3 bg-white border rounded shadow-sm relative group"><div className="absolute top-2 right-2 flex gap-2"><span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">#{index + 1}</span><button onClick={() => removePermit(permit.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div><div className="space-y-2 mt-2"><input type="text" placeholder="Belge Adı" value={permit.belgeAdi} onChange={(e) => updatePermit(permit.id, 'belgeAdi', e.target.value)} className="w-full p-2 border rounded text-sm font-semibold outline-none focus:border-green-600" /><input type="text" placeholder="Belge Numarası" value={permit.belgeNo} onChange={(e) => updatePermit(permit.id, 'belgeNo', e.target.value)} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600" /><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-gray-500 pl-1">Veriliş Tarihi</label><input type="text" placeholder="15.05.2023" value={permit.verilisTarihi} onChange={(e) => updatePermit(permit.id, 'verilisTarihi', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" /></div><div><label className="text-[10px] text-gray-500 pl-1">Geçerlilik Tarihi</label><input type="text" placeholder="15.05.2028" value={permit.gecerlilikTarihi} onChange={(e) => updatePermit(permit.id, 'gecerlilikTarihi', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" /></div></div><input type="text" placeholder="Veren Kurum" value={permit.verenKurum} onChange={(e) => updatePermit(permit.id, 'verenKurum', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" /></div></div>))}</div>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><FileText size={16} /> Doküman Ayarları</h2><div className="grid grid-cols-3 gap-2"><input type="text" name="dokumanNo" value={settings31.dokumanNo} onChange={handleSettings31} className="p-2 border rounded text-sm" placeholder="No" /><input type="text" name="yayinTarihi" value={settings31.yayinTarihi} onChange={handleSettings31} className="p-2 border rounded text-sm" placeholder="Tarih" /><input type="text" name="revizyonNo" value={settings31.revizyonNo} onChange={handleSettings31} className="p-2 border rounded text-sm" placeholder="Rev" /></div></section>
    </div>
  );

  const renderEditor32 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-800 mb-4">Sistemdeki operatörler otomatik olarak listelenmiştir.</div>
      <div className="flex justify-between items-center border-b pb-2 mb-4"><h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: BRAND_GREEN }}><Users size={16} /> Personel Listesi</h2><button onClick={addStaff} className="bg-green-600 text-white p-1.5 rounded hover:bg-green-700 transition"><Plus size={16}/></button></div>
      <div className="space-y-4">{staff.map((s, index) => (<div key={s.id} className="p-3 bg-white border rounded shadow-sm relative group"><div className="absolute top-2 right-2 flex gap-2"><span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">#{index + 1}</span><button onClick={() => removeStaff(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div><div className="space-y-2 mt-2"><input type="text" placeholder="Adı Soyadı" value={s.adSoyad} onChange={(e) => updateStaff(s.id, 'adSoyad', e.target.value)} className="w-full p-2 border rounded text-sm font-semibold outline-none focus:border-green-600" /><div><label className="text-[10px] text-gray-500 pl-1">Görevi</label><select value={s.gorev} onChange={(e) => updateStaff(s.id, 'gorev', e.target.value)} className="w-full p-2 border rounded text-sm outline-none focus:border-green-600"><option>Mesul Müdür</option><option>Biyosidal Ürün Uygulayıcı (Operatör)</option></select></div><div className="grid grid-cols-2 gap-2"><div><label className="text-[10px] text-gray-500 pl-1">Sertifika No</label><input type="text" placeholder="Örn: MM-12345" value={s.sertifikaNo} onChange={(e) => updateStaff(s.id, 'sertifikaNo', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" /></div><div><label className="text-[10px] text-gray-500 pl-1">Geçerlilik Tarihi</label><input type="text" placeholder="Örn: 20.12.2026" value={s.gecerlilikTarihi} onChange={(e) => updateStaff(s.id, 'gecerlilikTarihi', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" /></div></div></div></div>))}</div>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><FileText size={16} /> Doküman Ayarları</h2><div className="grid grid-cols-3 gap-2"><input type="text" name="dokumanNo" value={settings32.dokumanNo} onChange={handleSettings32} className="p-2 border rounded text-sm" placeholder="No" /><input type="text" name="yayinTarihi" value={settings32.yayinTarihi} onChange={handleSettings32} className="p-2 border rounded text-sm" placeholder="Tarih" /><input type="text" name="revizyonNo" value={settings32.revizyonNo} onChange={handleSettings32} className="p-2 border rounded text-sm" placeholder="Rev" /></div></section>
    </div>
  );

  const renderEditor41 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-800 mb-4">
        {selectedBranchId 
         ? "Seçilen şubenin krokisi aşağıdadır. Değişiklik yapmak için yeni bir görsel yükleyebilirsiniz."
         : "Lütfen önce bir şube seçiniz."}
      </div>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: BRAND_GREEN }}><Upload size={16} /> Kroki Görseli</h2><div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-green-500 transition-colors bg-white">{krokiImage ? (<div className="w-full"><img src={krokiImage} alt="Kroki Önizleme" className="max-h-40 mx-auto mb-2 shadow-sm border" /><button onClick={removeKrokiImage} className="text-xs text-red-500 hover:text-red-700 underline font-semibold">Görseli Kaldır</button></div>) : (<><ImageIcon size={32} className="text-gray-400 mb-2" /><label className="cursor-pointer"><span className="text-green-600 font-semibold text-sm hover:underline">Görsel Seç</span><input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className=\"hidden" /></label><p className="text-xs text-gray-400 mt-1">PNG, JPG formatında kat planı.</p></>)}</div></section>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><Map size={16} /> Lejant (İşaret Dili)</h2><div className="space-y-3">{legendItems.map(item => (<div key={item.id} className="p-2 border rounded bg-white flex flex-col gap-2"><div className="flex justify-between items-center"><span className="font-bold text-sm bg-gray-100 px-2 rounded text-gray-700">{item.kod}</span></div><input type="text" value={item.aciklama} onChange={(e) => updateLegend(item.id, 'aciklama', e.target.value)} className="w-full p-1 border rounded text-xs" /></div>))}</div><div className="text-[10px] text-gray-400 mt-2 italic">* Lejant maddeleri standarttır, açıklamalarını düzenleyebilirsiniz.</div></section>
      <section><h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}><FileText size={16} /> Doküman Ayarları</h2><div className="grid grid-cols-3 gap-2"><input type="text" name="dokumanNo" value={settings41.dokumanNo} onChange={handleSettings41} className="p-2 border rounded text-sm" placeholder="No" /><input type="text" name="yayinTarihi" value={settings41.yayinTarihi} onChange={handleSettings41} className="p-2 border rounded text-sm" placeholder="Tarih" /><input type="text" name="revizyonNo" value={settings41.revizyonNo} onChange={handleSettings41} className="p-2 border rounded text-sm" placeholder="Rev" /></div></section>
    </div>
  );

  const renderEditor42 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-800 mb-4">
        {selectedBranchId 
         ? "Bu şubedeki kayıtlı ekipmanlar listelenmiştir. Otomatik oluşturucuyu kullanarak yeni ekipmanlar ekleyebilirsiniz."
         : "Lütfen önce bir şube seçiniz."}
      </div>
      
      {/* Otomatik Oluşturucu */}
      <section className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: BRAND_GREEN }}>
          <Settings size={16} /> Otomatik Oluşturucu
        </h2>
        <div className="grid grid-cols-3 gap-2 mb-2">
           <div>
             <label className="text-[10px] text-gray-500">Kod (Örn: Kİ)</label>
             <input type="text" value={generator.prefix} onChange={(e) => setGenerator({...generator, prefix: e.target.value})} className="w-full p-2 border rounded text-sm" />
           </div>
           <div>
             <label className="text-[10px] text-gray-500">Başlangıç No</label>
             <input type="number" value={generator.start} onChange={(e) => setGenerator({...generator, start: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm" />
           </div>
            <div>
             <label className="text-[10px] text-gray-500">Bitiş No</label>
             <input type="number" value={generator.end} onChange={(e) => setGenerator({...generator, end: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm" />
           </div>
        </div>
        <div className="mb-3">
            <label className="text-[10px] text-gray-500">Tip / Açıklama</label>
            <select value={generator.type} onChange={(e) => setGenerator({...generator, type: e.target.value})} className="w-full p-2 border rounded text-sm">
                <option>Kemirgen İstasyonu</option>
                <option>Yürüyen Haşere İstasyonu</option>
                <option>Sinek Tutucu Cihaz (EFC)</option>
                <option>Feromon Tuzak</option>
            </select>
        </div>
        <button onClick={generateStations} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-semibold transition">
          Listeye Ekle
        </button>
      </section>

      {/* İstasyon Listesi */}
      <section>
        <div className="flex justify-between items-center mb-3 border-t pt-4">
           <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: BRAND_GREEN }}>
            <ClipboardList size={16} /> İstasyon Listesi ({stations.length})
           </h2>
           {stations.length > 0 && (
             <button onClick={clearStations} className="text-xs text-red-500 hover:underline">Tümünü Sil</button>
           )}
        </div>
        
        {stations.length === 0 ? (
            <div className="text-center text-gray-400 py-8 text-sm border-2 border-dashed rounded">
                {selectedBranchId ? "Bu şubede kayıtlı istasyon bulunamadı." : "İstasyonları görmek için şube seçiniz."}
            </div>
        ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {stations.map((station, index) => (
                    <div key={station.id} className="flex items-center gap-2 bg-white p-2 border rounded text-sm">
                        <span className="bg-gray-100 text-gray-600 font-mono text-xs px-2 py-1 rounded w-8 text-center">{index+1}</span>
                        <input
                          type="text"
                          value={station.no}
                          onChange={(e) => updateStation(station.id, 'no', e.target.value)}
                          className="w-20 font-bold p-1 border rounded text-center"
                          placeholder="No"
                        />
                        <select
                          value={station.type}
                          onChange={(e) => updateStation(station.id, 'type', e.target.value)}
                          className="w-40 p-1 border rounded text-xs"
                        >
                          <option value="">Tip Seçin</option>
                          <option value="Kemirgen İstasyonu">Kemirgen İstasyonu</option>
                          <option value="Yürüyen Haşere İstasyonu">Yürüyen Haşere</option>
                          <option value="Sinek Tutucu Cihaz (EFC)">Sinek Tutucu (ILT)</option>
                          <option value="Feromon Tuzak">Feromon Tuzak</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Lokasyon"
                          value={station.location}
                          onChange={(e) => updateStation(station.id, 'location', e.target.value)}
                          className="flex-1 p-1 border rounded"
                        />
                        <button onClick={() => removeStation(station.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}>
          <FileText size={16} /> Doküman Ayarları
        </h2>
        <div className="grid grid-cols-3 gap-2">
           <input type="text" name="dokumanNo" value={settings42.dokumanNo} onChange={handleSettings42} className="p-2 border rounded text-sm" placeholder="No" />
           <input type="text" name="yayinTarihi" value={settings42.yayinTarihi} onChange={handleSettings42} className="p-2 border rounded text-sm" placeholder="Tarih" />
           <input type="text" name="revizyonNo" value={settings42.revizyonNo} onChange={handleSettings42} className="p-2 border rounded text-sm" placeholder="Rev" />
        </div>
      </section>
    </div>
  );

  // EDİTÖR: 5.2
  const renderEditor52 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-800 mb-4">
        Ürün listesi veritabanındaki "pesticide" kategorisindeki ürünlerden otomatik çekilmiştir.
      </div>
      
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: BRAND_GREEN }}>
          <Beaker size={16} /> Onaylı Ürün Listesi
        </h2>
        <button onClick={addProduct} className="bg-green-600 text-white p-1.5 rounded hover:bg-green-700 transition"><Plus size={16}/></button>
      </div>

      <div className="space-y-4">
        {products.map((product, index) => (
          <div key={product.id} className="p-3 bg-white border rounded shadow-sm relative group">
             <div className="absolute top-2 right-2 flex gap-2">
               <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">#{index + 1}</span>
               <button onClick={() => removeProduct(product.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
            </div>

            <div className="space-y-2 mt-2">
              <input type="text" placeholder="Ürün Ticari Adı (Örn: K-Othrine)" value={product.urunAdi} onChange={(e) => updateProduct(product.id, 'urunAdi', e.target.value)} className="w-full p-2 border rounded text-sm font-semibold outline-none focus:border-green-600" />
              
              <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-[10px] text-gray-500 pl-1">Aktif Madde</label>
                    <input type="text" placeholder="Örn: Deltamethrin %5" value={product.aktifMadde} onChange={(e) => updateProduct(product.id, 'aktifMadde', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" />
                 </div>
                 <div>
                    <label className="text-[10px] text-gray-500 pl-1">Ruhsat No / Tarih</label>
                    <input type="text" placeholder="Örn: 2011/123" value={product.ruhsatNo} onChange={(e) => updateProduct(product.id, 'ruhsatNo', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" />
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-[10px] text-gray-500 pl-1">Hedef Haşere</label>
                    <input type="text" placeholder="Örn: Yürüyen Haşere" value={product.hedefHasere} onChange={(e) => updateProduct(product.id, 'hedefHasere', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" />
                 </div>
                 <div>
                    <label className="text-[10px] text-gray-500 pl-1">Antidotu</label>
                    <input type="text" placeholder="Örn: Semptomatik" value={product.antidot} onChange={(e) => updateProduct(product.id, 'antidot', e.target.value)} className="w-full p-2 border rounded text-xs outline-none focus:border-green-600" />
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 border-t pt-4" style={{ color: BRAND_GREEN }}>
          <FileText size={16} /> Doküman Ayarları
        </h2>
        <div className="grid grid-cols-3 gap-2">
           <input type="text" name="dokumanNo" value={settings52.dokumanNo} onChange={handleSettings52} className="p-2 border rounded text-sm" placeholder="No" />
           <input type="text" name="yayinTarihi" value={settings52.yayinTarihi} onChange={handleSettings52} className="p-2 border rounded text-sm" placeholder="Tarih" />
           <input type="text" name="revizyonNo" value={settings52.revizyonNo} onChange={handleSettings52} className="p-2 border rounded text-sm" placeholder="Rev" />
        </div>
      </section>
    </div>
  );

  // PREVIEWS
  const renderA4_12 = () => (<div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}><A4Header title="MÜŞTERİ BİLGİ FORMU" settings={settings12} /><div className="flex-grow"><p className="mb-6 text-sm">Aşağıdaki bilgiler, hizmet sözleşmesinin hazırlanması ve yasal bildirimlerin yapılabilmesi için hizmet alan firma (Müşteri) tarafından beyan edilmiştir.</p><table className="w-full border-collapse border border-black text-sm"><tbody><tr><td className="border border-black font-bold p-3 w-1/3 align-top" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>FİRMA TİCARİ ÜNVANI</td><td className=\"border border-black p-3 uppercase font-semibold">{formData12.ticariUnvan}</td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3 align-top" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>FAALİYET KONUSU</td><td className=\"border border-black p-3">{formData12.faaliyetKonusu}</td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3 align-top" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>AÇIK ADRES (MERKEZ)</td><td className=\"border border-black p-3">{formData12.adres}</td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>VERGİ DAİRESİ</td><td className=\"border border-black p-3">{formData12.vergiDairesi}</td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>VERGİ NUMARASI</td><td className=\"border border-black p-3 font-mono">{formData12.vergiNo}</td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>MERSİS NUMARASI</td><td className=\"border border-black p-3 font-mono">{formData12.mersisNo}</td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>TELEFON</td><td className=\"border border-black p-3">{formData12.telefon}</td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>E-POSTA</td><td className=\"border border-black p-3">{formData12.eposta}</td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3 align-top py-6" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>YETKİLİ KİŞİ / ÜNVAN</td><td className=\"border border-black p-3 py-6"><div className=\"font-bold">{formData12.yetkiliKisi}</div><div className=\"text-gray-600 italic">{formData12.yetkiliUnvan}</div></td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>YETKİLİ CEP TEL</td><td className=\"border border-black p-3">{formData12.yetkiliTel}</td></tr><tr><td className=\"border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>HİZMET BAŞLANGIÇ</td><td className=\"border border-black p-3">{formData12.hizmetBaslangicTarihi.split('-').reverse().join('.')}</td></tr></tbody></table><div className=\"mt-16 flex justify-between px-4"><div className=\"text-center w-1/3"><h4 className=\"font-bold mb-1">MÜŞTERİ YETKİLİSİ</h4><div className=\"text-xs mb-8">(Kaşe - İmza)</div><div className=\"border-b border-black w-full"></div><div className=\"text-xs mt-1">{formData12.yetkiliKisi}</div></div><div className=\"text-center w-1/3"><h4 className=\"font-bold mb-1">MENTOR YETKİLİSİ</h4><div className=\"text-xs mb-8">(Kaşe - İmza)</div><div className=\"border-b border-black w-full"></div><div className=\"text-xs mt-1">Operasyon Müdürü</div></div></div></div><div className=\"border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-4">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div></div>);
  const renderA4_13 = () => (<div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}><A4Header title="MÜŞTERİ ŞUBELERİNİN BİLGİLERİ" settings={settings13} /><div className="flex-grow"><div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {formData12.ticariUnvan}</div><table className="w-full border-collapse border border-black text-xs"><thead><tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}><th className="border border-black p-2 w-10 text-center">NO</th><th className="border border-black p-2 text-left">ŞUBE ADI</th><th className="border border-black p-2 text-left">ŞUBE YETKİLİSİ</th><th className="border border-black p-2 w-16 text-center">ALAN (m²)</th><th className="border border-black p-2 text-left">İLETİŞİM / ADRES</th></tr></thead><tbody>{branches.map((branch, index) => (<tr key={branch.id}><td className="border border-black p-2 text-center font-bold">{index + 1}</td><td className="border border-black p-2 font-semibold">{branch.subeAdi}</td><td className="border border-black p-2">{branch.yetkili}</td><td className="border border-black p-2 text-center">{branch.metrekare}</td><td className="border border-black p-2"><div><strong>Tel:</strong> {branch.telefon}</div><div className="italic text-[10px] mt-1">{branch.adres}</div></td></tr>))}{[...Array(Math.max(0, 15 - branches.length))].map((_, i) => (<tr key={`empty-${i}`}><td className="border border-black p-4 text-center text-gray-300">{branches.length + i + 1}</td><td className="border border-black p-4"></td><td className="border border-black p-4"></td><td className="border border-black p-4"></td><td className="border border-black p-4"></td></tr>))}</tbody></table><div className="mt-4 text-xs text-gray-600">* Yukarıda belirtilen şubelerde yapılacak olan pest kontrol hizmeti, ana sözleşmede belirtilen şartlar dahilinde gerçekleştirilecektir.</div></div><div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div></div>);
  const renderA4_21 = () => (<div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}><A4Header title="HİZMET SÖZLEŞMESİ" settings={settings21} /><div className="flex-grow text-sm leading-relaxed text-justify"><h3 className="font-bold mb-2">1. TARAFLAR</h3><p className="mb-4">Bir tarafta <strong>MENTOR ÇEVRE SAĞLIĞI HİZMETLERİ</strong> (Bundan böyle "Yüklenici\" olarak anılacaktır) ile diğer tarafta <strong>{formData12.ticariUnvan}</strong> (Bundan böyle "İşveren" olarak anılacaktır) arasında aşağıda belirtilen şartlarda anlaşmaya varılmıştır.</p><h3 className="font-bold mb-2">2. HİZMETİN KONUSU</h3><p className="mb-4">İşveren'in <strong>{formData12.adres}</strong> adresindeki tesislerinde/iş yerinde, halk sağlığını tehdit eden vektörlerle (zararlılarla) mücadele kapsamında, Sağlık Bakanlığı mevzuatına uygun olarak ilaçlama ve pest kontrol hizmetinin verilmesidir.</p><h3 className="font-bold mb-2">3. HİZMETİN KAPSAMI</h3><p className="mb-4">Bu sözleşme kapsamında aşağıdaki zararlılarla mücadele edilecektir:<ul className="list-disc pl-6 mt-1 space-y-1">{contractData.kapsam.kemirgen && <li>Kemirgenler (Rattus norvegicus, Rattus rattus, Mus musculus)</li>}{contractData.kapsam.yuruyenHasere && <li>Yürüyen Haşereler (Hamamböceği, Karınca, Örümcek vb.)</li>}{contractData.kapsam.ucanHasere && <li>Uçan Haşereler (Karasinek, Sivrisinek vb. - Larva mücadelesi dahil)</li>}{contractData.kapsam.dezenfeksiyon && <li>Dezenfeksiyon Hizmeti (Virüs ve bakterilere karşı ortam dezenfeksiyonu)</li>}</ul></p><h3 className="font-bold mb-2">4. HİZMET PERİYODU VE SÜRESİ</h3><p className="mb-4">Hizmet, <strong>{contractData.baslangicTarihi}</strong> ile <strong>{contractData.bitisTarihi}</strong> tarihleri arasında geçerlidir. Uygulama periyodu: <strong>{contractData.hizmetPeriyodu}</strong> olarak belirlenmiştir. Acil durumlarda (garanti kapsamındaki çağrılarda) Yüklenici, ekstra ücret talep etmeden 24-48 saat içinde müdahale edecektir.</p><h3 className="font-bold mb-2">5. HİZMET BEDELİ VE ÖDEME KOŞULLARI</h3><p className="mb-4">Sözleşme konusu hizmet bedeli, uygulama başına/aylık <strong>{contractData.hizmetBedeli} {contractData.paraBirimi} + KDV</strong> olarak belirlenmiştir. Ödeme, {contractData.odemeSekli}</p><h3 className="font-bold mb-2">6. TARAFLARIN YÜKÜMLÜLÜKLERİ</h3><p className="mb-2"><strong>Yüklenici:</strong> Sağlık Bakanlığı onaylı biyosidal ürünleri kullanmakla, uygulamayı sertifikalı personel ile yapmakla ve yapılan işlemi EK-1 Biyosidal Ürün Uygulama İşlem Formu ile belgelemekle yükümlüdür.</p><p className="mb-4"><strong>İşveren:</strong> Uygulama öncesi ve sonrası Yüklenici'nin belirteceği güvenlik tedbirlerine (gıda maddelerinin korunması, temizlik vb.) uymakla ve Yüklenici personeline çalışma sahasında kolaylık sağlamakla yükümlüdür.</p><div className="mt-8 border border-gray-300 p-4 bg-gray-50 text-xs"><strong>Not:</strong> Bu sözleşme iki nüsha olarak düzenlenmiş olup, taraflarca okunarak {contractData.sozlesmeTarihi.split('-').reverse().join('.')} tarihinde imza altına alınmıştır. Anlaşmazlık durumunda İstanbul Mahkemeleri yetkilidir.</div><div className="mt-12 flex justify-between px-8"><div className="text-center w-1/3"><h4 className="font-bold mb-1">İŞVEREN (MÜŞTERİ)</h4><div className="text-xs mb-8">Kaşe - İmza</div><div className="border-b border-black w-full"></div><div className="text-xs mt-1">{formData12.yetkiliKisi}</div></div><div className="text-center w-1/3"><h4 className="font-bold mb-1">YÜKLENİCİ (MENTOR)</h4><div className="text-xs mb-8">Kaşe - İmza</div><div className="border-b border-black w-full"></div><div className="text-xs mt-1">Şirket Müdürü</div></div></div></div><div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div></div>);
  const renderA4_31 = () => (<div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}><A4Header title="İZİN VE RUHSATLAR" settings={settings31} /><div className="flex-grow"><div className="mb-6 p-4 bg-gray-50 border border-gray-200 text-sm italic">Bu bölümde yer alan belgeler, firmanın yasal olarak pest kontrol hizmeti verebilmesi için gerekli olan resmi izin ve ruhsatları kapsamaktadır. İlgili belgelerin suretleri aşağıda listelenmiştir.</div><table className="w-full border-collapse border border-black text-sm"><thead><tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}><th className="border border-black p-3 text-left w-1/3">BELGE ADI</th><th className=\"border border-black p-3 text-left">BELGE NUMARASI</th><th className=\"border border-black p-3 text-center">TARİH</th><th className=\"border border-black p-3 text-left">VEREN KURUM</th></tr></thead><tbody>{permits.map(permit => (<tr key={permit.id}><td className=\"border border-black p-3 font-bold">{permit.belgeAdi}</td><td className=\"border border-black p-3 font-mono">{permit.belgeNo}</td><td className=\"border border-black p-3 text-center"><div>{permit.verilisTarihi}</div><div className=\"text-[10px] text-gray-500">(Geçerlilik: {permit.gecerlilikTarihi})</div></td><td className=\"border border-black p-3">{permit.verenKurum}</td></tr>))}{[...Array(Math.max(0, 8 - permits.length))].map((_, i) => (<tr key={`empty-${i}`}><td className=\"border border-black p-4"></td><td className=\"border border-black p-4"></td><td className=\"border border-black p-4"></td><td className=\"border border-black p-4"></td></tr>))}</tbody></table><div className=\"mt-12 text-center border-t border-b border-black py-8 bg-gray-50"><h3 className=\"font-bold text-lg mb-2 text-gray-800">EKLER</h3><p className=\"text-sm text-gray-600">Bu kapak sayfasının arkasında, yukarıda listelenen belgelerin fotokopileri/suretleri yer almaktadır.</p><div className=\"flex justify-center gap-4 mt-4"><ShieldCheck size={32} className=\"text-gray-300" /><ShieldCheck size={32} className=\"text-gray-300" /><ShieldCheck size={32} className=\"text-gray-300" /></div></div></div><div className=\"border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div></div>);
  const renderA4_32 = () => (<div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}><A4Header title="MESUL MÜDÜR VE OPERATÖR SERTİFİKALARI" settings={settings32} /><div className="flex-grow"><div className="mb-6 p-4 bg-gray-50 border border-gray-200 text-sm italic">Bu bölümde, hizmeti planlayan mesul müdür ve sahada fiilen uygulamayı yapan operatörlerin yetkinliklerini gösteren Sağlık Bakanlığı onaylı sertifikalarının suretleri yer almaktadır.</div><table className="w-full border-collapse border border-black text-sm"><thead><tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}><th className="border border-black p-3 text-left w-1/4">ADI SOYADI</th><th className=\"border border-black p-3 text-left w-1/3">GÖREVİ</th><th className=\"border border-black p-3 text-left">SERTİFİKA NO</th><th className=\"border border-black p-3 text-center">GEÇERLİLİK TARİHİ</th></tr></thead><tbody>{staff.map(s => (<tr key={s.id}><td className=\"border border-black p-3 font-bold">{s.adSoyad}</td><td className=\"border border-black p-3">{s.gorev}</td><td className=\"border border-black p-3 font-mono">{s.sertifikaNo}</td><td className=\"border border-black p-3 text-center">{s.gecerlilikTarihi}</td></tr>))}{[...Array(Math.max(0, 8 - staff.length))].map((_, i) => (<tr key={`empty-${i}`}><td className=\"border border-black p-4"></td><td className=\"border border-black p-4"></td><td className=\"border border-black p-4"></td><td className=\"border border-black p-4"></td></tr>))}</tbody></table><div className=\"mt-12 text-center border-t border-b border-black py-8 bg-gray-50"><h3 className=\"font-bold text-lg mb-2 text-gray-800">EKLER</h3><p className=\"text-sm text-gray-600">Bu kapak sayfasının arkasında, yukarıda listelenen personelin sertifika fotokopileri/suretleri yer almaktadır.</p><div className=\"flex justify-center gap-4 mt-4"><Users size={32} className=\"text-gray-300" /><Users size={32} className=\"text-gray-300" /><Users size={32} className=\"text-gray-300" /></div></div></div><div className=\"border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div></div>);
  const renderA4_41 = () => (<div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}><A4Header title="ZARARLI MÜCADELESİ EKİPMAN KROKİSİ" settings={settings41} /><div className="flex-grow flex flex-col"><div className="mb-2 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {formData12.ticariUnvan}</div><div className="flex-1 border-2 border-dashed border-gray-300 rounded flex items-center justify-center relative overflow-hidden mb-4">{krokiImage ? (<img src={krokiImage} alt="Kroki" className="max-w-full max-h-full object-contain" />) : (<div className="text-gray-300 text-center"><Map size={48} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Kroki Görseli Yüklenmedi</p></div>)}</div><div className="border border-black p-2 mt-auto"><h4 className="font-bold border-b border-black mb-2 pb-1 text-sm bg-gray-100 px-1">LEJANT / İŞARET DİLİ</h4><div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">{legendItems.map(item => (<div key={item.id} className="flex items-center gap-2"><div className="font-bold border border-black w-8 h-6 flex items-center justify-center bg-white">{item.kod}</div><span>{item.aciklama}</span></div>))}</div></div></div><div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-2">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div></div>);
  const renderA4_42 = () => (<div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}><A4Header title="EKİPMAN TAKİP VE KONTROL FORMU" settings={settings42} /><div className="flex-grow"><div className="mb-4 text-xs font-bold uppercase border-b border-gray-400 pb-1 flex justify-between"><span>Firma: {formData12.ticariUnvan}</span><span>Tarih: .........................</span></div><table className="w-full border-collapse border border-black text-xs"><thead><tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}><th className="border border-black p-1 w-12 text-center">NO</th><th className="border border-black p-1 text-left">LOKASYON</th><th className="border border-black p-1 text-center w-12">TİP</th><th className="border border-black p-1 w-16 text-center">DURUM</th><th className="border border-black p-1 w-20 text-center">AKTİVİTE</th><th className="border border-black p-1 w-16 text-center">TEMİZLİK</th><th className="border border-black p-1 text-left">UYGULAMA / AÇIKLAMA</th></tr></thead><tbody>{stations.length === 0 ? (<tr><td colSpan={7} className="p-4 text-center italic text-gray-500">Lütfen soldaki panelden istasyon listesini oluşturunuz.</td></tr>) : (stations.map((station, index) => (<tr key={station.id} className={index % 2 === 0 ? '' : 'bg-gray-50'}><td className="border border-black p-1 text-center font-bold">{station.no}</td><td className="border border-black p-1">{station.location}</td><td className="border border-black p-1 text-center">{station.type.charAt(0)}</td><td className="border border-black p-1 text-center"></td><td className="border border-black p-1 text-center"></td><td className="border border-black p-1 text-center"></td><td className="border border-black p-1"></td></tr>)))}{[...Array(Math.max(0, 25 - stations.length))].map((_, i) => (<tr key={`empty-${i}`}><td className="border border-black p-3"></td><td className="border border-black p-3"></td><td className="border border-black p-3"></td><td className="border border-black p-3"></td><td className="border border-black p-3"></td><td className="border border-black p-3"></td><td className="border border-black p-3"></td></tr>))}</tbody></table><div className="mt-4 text-[10px] border border-black p-2 bg-gray-50"><div className="font-bold mb-1">KISALTMALAR VE İŞARETLER:</div><div className="grid grid-cols-4 gap-2"><div><strong>Durum:</strong> (S) Sağlam, (K) Kırık/Hasarlı, (Y) Yok</div><div><strong>Aktivite:</strong> (Y) Yok, (T) Yem Tüketimi, (C) Canlı, (Ö) Ölü</div><div><strong>Temizlik:</strong> (U) Uygun, (UD) Uygun Değil</div><div><strong>Tip:</strong> (K) Kemirgen, (Y) Yürüyen, (I) ILT, (F) Feromon</div></div></div><div className="mt-6 flex justify-between gap-4"><div className="border border-black p-2 w-1/2 h-20"><div className=\"text-[10px] font-bold border-b border-gray-300 mb-1">KONTROL EDEN (OPERATÖR)</div></div><div className=\"border border-black p-2 w-1/2 h-20"><div className=\"text-[10px] font-bold border-b border-gray-300 mb-1">TESLİM ALAN (MÜŞTERİ YETKİLİSİ)</div></div></div></div><div className=\"border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-2">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div></div>);

  // A4 PREVIEW: 5.2
  const renderA4_52 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="ONAYLI BİYOSİDAL ÜRÜN LİSTESİ" settings={settings52} />

      {/* BODY 5.2 */}
      <div className="flex-grow">
        <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">
          Firma: {formData12.ticariUnvan}
        </div>

        <div className="mb-4 p-2 bg-gray-50 border text-xs italic">
          Bu liste, işletmede haşere mücadelesi kapsamında kullanılması planlanan ve T.C. Sağlık Bakanlığı tarafından ruhsatlandırılmış biyosidal ürünleri içerir.
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
              <th className="border border-black p-2 w-10 text-center">S.NO</th>
              <th className="border border-black p-2 text-left">ÜRÜN TİCARİ ADI</th>
              <th className="border border-black p-2 text-left">AKTİF MADDESİ</th>
              <th className="border border-black p-2 text-left">RUHSAT NO</th>
              <th className="border border-black p-2 text-left">HEDEF HAŞERE</th>
              <th className="border border-black p-2 text-left">ANTİDOTU</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={product.id}>
                <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
                <td className="border border-black p-2 font-semibold">{product.urunAdi}</td>
                <td className="border border-black p-2">{product.aktifMadde}</td>
                <td className="border border-black p-2 font-mono">{product.ruhsatNo}</td>
                <td className="border border-black p-2">{product.hedefHasere}</td>
                <td className="border border-black p-2">{product.antidot}</td>
              </tr>
            ))}
             {/* Boş satırlar */}
             {[...Array(Math.max(0, 15 - products.length))].map((_, i) => (
               <tr key={`empty-${i}`}>
                 <td className="border border-black p-4 text-center text-gray-300">{products.length + i + 1}</td>
                 <td className="border border-black p-4"></td>
                 <td className="border border-black p-4"></td>
                 <td className="border border-black p-4"></td>
                 <td className="border border-black p-4"></td>
                 <td className="border border-black p-4"></td>
               </tr>
             ))}
          </tbody>
        </table>
        
        <div className="mt-4 text-xs text-gray-600">
          * Listede belirtilen ürünlerin Malzeme Güvenlik Bilgi Formları (MSDS) ve Etiket örnekleri dosya ekinde mevcuttur.
        </div>
      </div>

       {/* FOOTER */}
       <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">
        Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.
      </div>
    </div>
  );

  // --- APP LAYOUT ---
  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100 font-sans text-gray-900 overflow-hidden">
      
      {/* SIDEBAR (Modül İçi Navigasyon) */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col print:hidden z-20 shadow-lg">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2 cursor-pointer bg-green-50" onClick={() => setActiveTab('home')}>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={20} className="text-green-700"/> Modül Menüsü</h1>
            <p className="text-[10px] text-gray-500 mt-1">Doküman ve Form Yönetimi</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'home' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}><Home size={18} /> Ana Sayfa</button>
          
          <div className={`mt-2 p-2 rounded border border-green-100 ${selectedCustomerId ? 'bg-green-50' : 'bg-gray-50'}`}>
            <div className="text-xs font-bold uppercase text-gray-500 mb-1">Seçili Müşteri</div>
            <div className="text-sm font-semibold text-gray-800 truncate">
                {customers.find(c => c.id === selectedCustomerId)?.cari_isim || 'Seçilmedi'}
            </div>
          </div>

          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Modüller</div>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('1.2')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '1.2' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Building2 size={18} /> 1.2 Müşteri Bilgileri</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('1.3')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '1.3' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Store size={18} /> 1.3 Şube Bilgileri</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('2.1')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '2.1' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><FileSignature size={18} /> 2.1 Hizmet Sözleşmesi</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('3.1')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '3.1' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Award size={18} /> 3.1 İzin ve Ruhsatlar</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('3.2')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '3.2' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Users size={18} /> 3.2 Sertifikalar</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('4.1')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '4.1' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Map size={18} /> 4.1 Ekipman Krokisi</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('4.2')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '4.2' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><ClipboardList size={18} /> 4.2 Ekipman Takip</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('5.2')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '5.2' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Beaker size={18} /> 5.2 Biyosidal Ürünler</button>
        </nav>
        <div className="p-4 border-t border-gray-100 space-y-2">
          {activeTab !== 'home' && (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving || !selectedCustomerId}
                className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isSaving ? 'Kaydediliyor...' : (selectedFileId ? 'Güncelle' : 'Kaydet')}
              </button>
              <button
                onClick={handlePrint}
                className="w-full flex justify-center items-center gap-2 bg-green-700 hover:bg-green-800 text-white py-2 px-4 rounded-lg shadow transition text-sm font-medium"
              >
                <Printer size={16} /> Yazdır (PDF)
              </button>
            </>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* SOL PANEL (Editör) */}
        {activeTab !== 'home' && (
          <div className="w-[400px] bg-white border-r border-gray-200 overflow-y-auto h-full p-6 print:hidden z-10 animate-in slide-in-from-left duration-300">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b">
              {activeTab === '1.2' && 'Müşteri Bilgileri Düzenle'}
              {activeTab === '1.3' && 'Şube Bilgileri Düzenle'}
              {activeTab === '2.1' && 'Hizmet Sözleşmesi Düzenle'}
              {activeTab === '3.1' && 'İzin ve Ruhsatları Düzenle'}
              {activeTab === '3.2' && 'Sertifikaları Düzenle'}
              {activeTab === '4.1' && 'Kroki ve Lejant Düzenle'}
              {activeTab === '4.2' && 'Takip Formu Düzenle'}
              {activeTab === '5.2' && 'Biyosidal Ürün Listesi Düzenle'}
            </h2>
            {activeTab === '1.2' && renderEditor12()}
            {activeTab === '1.3' && renderEditor13()}
            {activeTab === '2.1' && renderEditor21()}
            {activeTab === '3.1' && renderEditor31()}
            {activeTab === '3.2' && renderEditor32()}
            {activeTab === '4.1' && renderEditor41()}
            {activeTab === '4.2' && renderEditor42()}
            {activeTab === '5.2' && renderEditor52()}
          </div>
        )}

        {/* SAĞ PANEL (Önizleme) */}
        <div className="flex-1 bg-gray-500 overflow-auto flex justify-center items-start p-8 print:p-0 print:absolute print:inset-0 print:bg-white print:z-50 print:block">
           {activeTab === 'home' && renderHome()}
           {activeTab === '1.2' && renderA4_12()}
           {activeTab === '1.3' && renderA4_13()}
           {activeTab === '2.1' && renderA4_21()}
           {activeTab === '3.1' && renderA4_31()}
           {activeTab === '3.2' && renderA4_32()}
           {activeTab === '4.1' && renderA4_41()}
           {activeTab === '4.2' && renderA4_42()}
           {activeTab === '5.2' && renderA4_52()}
        </div>
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .flex-1.bg-gray-500 {
            background-color: white !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          .shadow-2xl { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}