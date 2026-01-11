import React, { useState, useRef, useEffect } from 'react';
import { 
  Printer, Building2, MapPin, Phone, Mail, User, 
  FileText, Plus, Trash2, Home, Layout, Store, ChevronRight,
  FileSignature, CheckSquare, Calendar, DollarSign, Award, ShieldCheck,
  Users, Map, Upload, Image as ImageIcon, ClipboardList, Settings, Beaker,
  BookOpen, Package, AlertTriangle, Filter
} from 'lucide-react';

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

interface ApplicationRecord {
  id: number;
  uygulama_tarihi: string;
  baslangic_saati: string;
  bitis_saati: string;
  hava_durumu: string;
  sicaklik: string;
  nem: string;
  uygulanan_alan: string;
  hedef_hasere: string;
  kullanilan_urun: string;
  uygulama_metodu: string;
  dozaj: string;
  operatör: string;
  müşteri_yetkilisi: string;
  müşteri_imza: boolean;
  operatör_imza: boolean;
}

interface UsageCard {
  id: number;
  urun_adi: string;
  baslangic_stok: number;
  kullanim_kayitlari: Array<{
    tarih: string;
    kullanilan_miktar: number;
    kalan_stok: number;
    aciklama: string;
  }>;
}

interface DocumentEntry {
  id: number;
  baslik: string;
  aciklama: string;
  durum: 'mevcut' | 'eksik' | 'beklemede';
  sayfa_no?: string;
  son_guncelleme?: string;
}

interface WasteRecord {
  id: number;
  atik_turu: string;
  miktar: string;
  imha_tarihi: string;
  imha_firması: string;
  belge_no: string;
  sorumlu_personel: string;
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

  // MEVCUT STATE'LER
  const [formData12, setFormData12] = useState<FormData12>({
    ticariUnvan: 'ÖRNEK GIDA TURİZM İNŞ. SAN. VE TİC. LTD. ŞTİ.',
    faaliyetKonusu: 'Gıda Üretim ve Satış',
    vergiDairesi: 'Zincirlikuyu V.D.',
    vergiNo: '1234567890',
    mersisNo: '0123456789000015',
    adres: 'Organize Sanayi Bölgesi, 1. Cadde, No: 5, Başakşehir / İSTANBUL',
    telefon: '0212 555 00 00',
    faks: '0212 555 00 01',
    eposta: 'info@ornekfirma.com',
    webSitesi: 'www.ornekfirma.com',
    yetkiliKisi: 'Ahmet YILMAZ',
    yetkiliUnvan: 'İşletme Müdürü',
    yetkiliTel: '0532 555 11 22',
    hizmetBaslangicTarihi: new Date().toISOString().split('T')[0]
  });

  const [settings12, setSettings12] = useState<SettingsBase>({ dokumanNo: '1.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [settings13, setSettings13] = useState<SettingsBase>({ dokumanNo: '1.3', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [contractData, setContractData] = useState<ContractData>({
    sozlesmeTarihi: new Date().toISOString().split('T')[0],
    sozlesmeNo: '2024-001',
    hizmetPeriyodu: 'Ayda 1 Kez (Periyodik)',
    hizmetBedeli: '5.000',
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

  const [permits, setPermits] = useState<Permit[]>([]);
  const [settings31, setSettings31] = useState<SettingsBase>({ dokumanNo: '3.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [settings32, setSettings32] = useState<SettingsBase>({ dokumanNo: '3.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

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

  const [products, setProducts] = useState<Product[]>([]);
  const [settings52, setSettings52] = useState<SettingsBase>({ dokumanNo: '5.2', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // YENİ STATE'LER
  const [documentContents, setDocumentContents] = useState<DocumentEntry[]>([]);
  const [settings11, setSettings11] = useState<SettingsBase>({ dokumanNo: '1.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [applicationRecords, setApplicationRecords] = useState<ApplicationRecord[]>([]);
  const [currentApplication, setCurrentApplication] = useState<ApplicationRecord>({
    id: Date.now(),
    uygulama_tarihi: new Date().toISOString().split('T')[0],
    baslangic_saati: '09:00',
    bitis_saati: '10:00',
    hava_durumu: 'Açık',
    sicaklik: '22°C',
    nem: '%45',
    uygulanan_alan: '',
    hedef_hasere: 'Kemirgen',
    kullanilan_urun: '',
    uygulama_metodu: 'Jel Yem',
    dozaj: '',
    operatör: '',
    müşteri_yetkilisi: '',
    müşteri_imza: false,
    operatör_imza: false
  });
  const [settings51, setSettings51] = useState<SettingsBase>({ dokumanNo: '5.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [usageCards, setUsageCards] = useState<UsageCard[]>([]);
  const [settings53, setSettings53] = useState<SettingsBase>({ dokumanNo: '5.3', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [settings61, setSettings61] = useState<SettingsBase>({ dokumanNo: '6.1', revizyonNo: '00', yayinTarihi: '01.01.2024' });

  // --- VERİ ÇEKME İŞLEMLERİ ---
  useEffect(() => {
    fetchCustomers();
    fetchSystemProducts();
    fetchOperators();
    initializeDocumentContents();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetails(selectedCustomerId);
      fetchCustomerBranches(selectedCustomerId);
      setSelectedBranchId('');
      setStations([]);
      setKrokiImage(null);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (selectedBranchId) {
      fetchBranchStations(selectedBranchId);
    } else {
      setStations([]);
    }
  }, [selectedBranchId]);

  const initializeDocumentContents = () => {
    const defaultContents: DocumentEntry[] = [
      { id: 1, baslik: '1.1. Faaliyet Dosyası İçeriği', aciklama: 'Dosyanın "İçindekiler" kısmıdır. Denetçinin aradığı belgeyi hızlıca bulmasını sağlayan liste.', durum: 'mevcut', sayfa_no: '1' },
      { id: 2, baslik: '1.2. Müşteri Bilgileri', aciklama: 'Hizmeti alan firmanın resmi ticari ünvanı, vergi bilgileri ve iletişim bilgilerinin bulunduğu form.', durum: 'mevcut', sayfa_no: '2' },
      { id: 3, baslik: '1.3. Müşteri Şubelerinin Bilgileri', aciklama: 'Zincir işletmelerin şube bilgileri, yetkili kişiler ve özel konum bilgileri.', durum: 'mevcut', sayfa_no: '3' },
      { id: 4, baslik: '2.1. Hizmet Sözleşmesi', aciklama: 'Yüklenici ile müşteri arasında imzalanmış resmi hukuki belge.', durum: 'mevcut', sayfa_no: '4' },
      { id: 5, baslik: '3.1. İzin ve Ruhsatları', aciklama: 'Sağlık Bakanlığı\'ndan alınan "Biyosidal Ürün Uygulama İzin Belgesi" ve diğer izinler.', durum: 'mevcut', sayfa_no: '5' },
      { id: 6, baslik: '3.2. Mesul Müdür ve Operatör Sertifikaları', aciklama: 'Yetkili personelin diploma ve sertifikalarının suretleri.', durum: 'mevcut', sayfa_no: '6' },
      { id: 7, baslik: '4.1. Zararlı Mücadelesi Ekipman Krokisi', aciklama: 'İstasyonların yerleşim planını gösteren numaralandırılmış harita.', durum: 'mevcut', sayfa_no: '7' },
      { id: 8, baslik: '4.2. Ekipman Takip Formları', aciklama: 'İstasyonların kontrol edildiğini gösteren kontrol çizelgeleri.', durum: 'mevcut', sayfa_no: '8' },
      { id: 9, baslik: '5.1. EK-1 Biyosidal Ürün Uygulama İşlem Formu', aciklama: 'Her ilaçlama sonrası doldurulması zorunlu resmi form.', durum: 'mevcut', sayfa_no: '9' },
      { id: 10, baslik: '5.2. Onaylı Biyosidal Ürün Listesi', aciklama: 'İşletmede kullanılması planlanan tüm ilaçların toplu listesi.', durum: 'mevcut', sayfa_no: '10' },
      { id: 11, baslik: '5.3. Biyosidal Ürün Kullanım Kartı', aciklama: 'Stok takibi ve kümülatif kullanım miktarı takip kartı.', durum: 'beklemede', sayfa_no: '11' },
      { id: 12, baslik: '5.4. Biyosidal Ürün Ruhsatları, MSDS ve Etiket Bilgileri', aciklama: 'İlaçların ruhsat belgesi, güvenlik bilgi formu ve etiket fotokopileri.', durum: 'eksik', sayfa_no: '12' },
      { id: 13, baslik: '6.1. Atık İmha Belgesi', aciklama: 'Boş ambalajların lisanslı firmalara teslim edildiğini kanıtlayan belgeler.', durum: 'eksik', sayfa_no: '13' }
    ];
    setDocumentContents(defaultContents);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setTimeout(() => {
      setCustomers([
        { id: '1', cari_isim: 'ABC Gıda Market Zinciri' },
        { id: '2', cari_isim: 'XYZ Restaurant' },
        { id: '3', cari_isim: 'DEF Otel İşletmeleri' }
      ]);
      setLoading(false);
    }, 1000);
  };

  const fetchSystemProducts = async () => {
    const mappedProducts: Product[] = [
      { id: 1, urunAdi: 'K-Othrine SC 25', aktifMadde: 'Deltamethrin %2.5', ruhsatNo: '2011/BYS/123', hedefHasere: 'Yürüyen Haşere', antidot: 'Semptomatik Tedavi' },
      { id: 2, urunAdi: 'Racumin Paste', aktifMadde: 'Coumatetralyl %0.375', ruhsatNo: '2010/BYS/456', hedefHasere: 'Kemirgen', antidot: 'Vitamin K1' }
    ];
    setProducts(mappedProducts);
  };

  const fetchOperators = async () => {
    const mappedStaff: Staff[] = [
      { id: 1, adSoyad: 'Ahmet Yılmaz', gorev: 'Mesul Müdür', sertifikaNo: 'MM-12345', gecerlilikTarihi: '15.06.2026' },
      { id: 2, adSoyad: 'Mehmet Demir', gorev: 'Biyosidal Ürün Uygulayıcı', sertifikaNo: 'BUU-67890', gecerlilikTarihi: '20.12.2025' }
    ];
    setStaff(mappedStaff);
  };

  const fetchCustomerDetails = async (id: string) => {
    setFormData12({
      ticariUnvan: 'ABC GIDA MARKET ZİNCİRİ A.Ş.',
      faaliyetKonusu: 'Perakende Gıda Satış',
      vergiDairesi: 'Beşiktaş',
      vergiNo: '1234567890',
      mersisNo: '0123456789012345',
      adres: 'Levent Mahallesi, Büyükdere Cad. No:123 Şişli/İSTANBUL',
      telefon: '0212 123 45 67',
      faks: '0212 123 45 68',
      eposta: 'info@abcgida.com',
      webSitesi: 'www.abcgida.com',
      yetkiliKisi: 'Ali Veli',
      yetkiliUnvan: 'Genel Müdür',
      yetkiliTel: '0532 123 45 67',
      hizmetBaslangicTarihi: '2024-01-15'
    });
  };

  const fetchCustomerBranches = async (customerId: string) => {
    const data = [
      { id: '1', sube_adi: 'Levent Şubesi', yetkili_kisi: 'Fatma Demir', adres: 'Levent Mah. 1. Sok. No:5', telefon: '0212 111 22 33' },
      { id: '2', sube_adi: 'Etiler Şubesi', yetkili_kisi: 'Can Yılmaz', adres: 'Etiler Mah. 2. Cad. No:15', telefon: '0212 444 55 66' }
    ];
    setCustomerBranches(data);

    const mappedBranches: Branch[] = data.map((b: any) => ({
      id: b.id,
      subeAdi: b.sube_adi,
      yetkili: b.yetkili_kisi,
      metrekare: '250',
      adres: b.adres,
      telefon: b.telefon
    }));
    setBranches(mappedBranches);
  };

  const fetchBranchStations = async (branchId: string) => {
    const data = [
      { id: '1', kod: 'Kİ-01', lokasyon: 'Giriş Kapısı', tur: 'Kemirgen İstasyonu' },
      { id: '2', kod: 'Kİ-02', lokasyon: 'Depo', tur: 'Kemirgen İstasyonu' },
      { id: '3', kod: 'Yİ-01', lokasyon: 'Mutfak', tur: 'Yürüyen Haşere İstasyonu' }
    ];

    const mappedStations: Station[] = data.map((s: any) => ({
      id: s.id,
      no: s.kod,
      location: s.lokasyon,
      type: s.tur
    }));
    setStations(mappedStations);
  };

  // --- HANDLERS ---
  const handleChange12 = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { 
    const { name, value } = e.target; 
    setFormData12(prev => ({ ...prev, [name]: value })); 
  };

  const handleSettings12 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings12(prev => ({ ...prev, [name]: value })); 
  };
  
  const addBranch = () => { 
    setBranches([...branches, { id: Date.now(), subeAdi: 'Yeni Şube', yetkili: '', metrekare: '', adres: '', telefon: '' }]); 
  };

  const updateBranch = (id: number | string, field: keyof Branch, value: string) => { 
    setBranches(branches.map(b => b.id === id ? { ...b, [field]: value } : b)); 
  };

  const removeBranch = (id: number | string) => { 
    setBranches(branches.filter(b => b.id !== id)); 
  };

  const handleSettings13 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings13(prev => ({ ...prev, [name]: value })); 
  };
  
  const handleContractChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { 
    const { name, value } = e.target; 
    setContractData(prev => ({ ...prev, [name]: value })); 
  };

  const handleKapsamChange = (key: string) => { 
    setContractData(prev => ({ ...prev, kapsam: { ...prev.kapsam, [key]: !prev.kapsam[key] } })); 
  };

  const handleSettings21 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings21(prev => ({ ...prev, [name]: value })); 
  };
  
  const addPermit = () => { 
    setPermits([...permits, { id: Date.now(), belgeAdi: 'Yeni Belge', belgeNo: '', verilisTarihi: '', gecerlilikTarihi: '', verenKurum: '' }]); 
  };

  const updatePermit = (id: number, field: keyof Permit, value: string) => { 
    setPermits(permits.map(p => p.id === id ? { ...p, [field]: value } : p)); 
  };

  const removePermit = (id: number) => { 
    setPermits(permits.filter(p => p.id !== id)); 
  };

  const handleSettings31 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings31(prev => ({ ...prev, [name]: value })); 
  };
  
  const addStaff = () => { 
    setStaff([...staff, { id: Date.now(), adSoyad: 'Yeni Personel', gorev: 'Operatör', sertifikaNo: '', gecerlilikTarihi: '' }]); 
  };

  const updateStaff = (id: number, field: keyof Staff, value: string) => { 
    setStaff(staff.map(s => s.id === id ? { ...s, [field]: value } : s)); 
  };

  const removeStaff = (id: number) => { 
    setStaff(staff.filter(s => s.id !== id)); 
  };

  const handleSettings32 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings32(prev => ({ ...prev, [name]: value })); 
  };
  
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

  const handleSettings41 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings41(prev => ({ ...prev, [name]: value })); 
  };

  const updateLegend = (id: number, field: keyof LegendItem, value: string) => { 
    setLegendItems(legendItems.map(item => item.id === id ? { ...item, [field]: value } : item)); 
  };
  
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

  const updateStation = (id: number, field: keyof Station, value: string) => { 
    setStations(stations.map(s => s.id === id ? { ...s, [field]: value } : s)); 
  };

  const removeStation = (id: number) => { 
    setStations(stations.filter(s => s.id !== id)); 
  };

  const clearStations = () => { 
    if(window.confirm('Tüm listeyi silmek istediğinize emin misiniz?')) { 
      setStations([]); 
    } 
  };

  const handleSettings42 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings42(prev => ({ ...prev, [name]: value })); 
  };

  const addProduct = () => { 
    setProducts([...products, { id: Date.now(), urunAdi: 'Yeni Ürün', aktifMadde: '', ruhsatNo: '', hedefHasere: '', antidot: '' }]); 
  };

  const updateProduct = (id: number | string, field: keyof Product, value: string) => { 
    setProducts(products.map(p => p.id === id ? { ...p, [field]: value } : p)); 
  };

  const removeProduct = (id: number | string) => { 
    setProducts(products.filter(p => p.id !== id)); 
  };

  const handleSettings52 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings52(prev => ({ ...prev, [name]: value })); 
  };

  // YENİ HANDLERS
  const updateDocumentEntry = (id: number, field: keyof DocumentEntry, value: string) => {
    setDocumentContents(documentContents.map(doc => doc.id === id ? { ...doc, [field]: value } : doc));
  };

  const addDocumentEntry = () => {
    const newEntry: DocumentEntry = {
      id: Date.now(),
      baslik: 'Yeni Doküman',
      aciklama: '',
      durum: 'beklemede',
      sayfa_no: '',
      son_guncelleme: new Date().toLocaleDateString('tr-TR')
    };
    setDocumentContents([...documentContents, newEntry]);
  };

  const removeDocumentEntry = (id: number) => {
    setDocumentContents(documentContents.filter(doc => doc.id !== id));
  };

  const handleSettings11 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings11(prev => ({ ...prev, [name]: value })); 
  };

  const handleApplicationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setCurrentApplication(prev => ({ ...prev, [name]: checked }));
    } else {
      setCurrentApplication(prev => ({ ...prev, [name]: value }));
    }
  };

  const saveApplicationRecord = () => {
    setApplicationRecords([...applicationRecords, { ...currentApplication, id: Date.now() }]);
    setCurrentApplication({
      id: Date.now(),
      uygulama_tarihi: new Date().toISOString().split('T')[0],
      baslangic_saati: '09:00',
      bitis_saati: '10:00',
      hava_durumu: 'Açık',
      sicaklik: '22°C',
      nem: '%45',
      uygulanan_alan: '',
      hedef_hasere: 'Kemirgen',
      kullanilan_urun: '',
      uygulama_metodu: 'Jel Yem',
      dozaj: '',
      operatör: '',
      müşteri_yetkilisi: '',
      müşteri_imza: false,
      operatör_imza: false
    });
  };

  const handleSettings51 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings51(prev => ({ ...prev, [name]: value })); 
  };

  const addUsageCard = () => {
    const newCard: UsageCard = {
      id: Date.now(),
      urun_adi: 'Yeni Ürün',
      baslangic_stok: 0,
      kullanim_kayitlari: []
    };
    setUsageCards([...usageCards, newCard]);
  };

  const removeUsageCard = (id: number) => {
    setUsageCards(usageCards.filter(card => card.id !== id));
  };

  const handleSettings53 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings53(prev => ({ ...prev, [name]: value })); 
  };

  const addWasteRecord = () => {
    const newRecord: WasteRecord = {
      id: Date.now(),
      atik_turu: '',
      miktar: '',
      imha_tarihi: new Date().toISOString().split('T')[0],
      imha_firması: '',
      belge_no: '',
      sorumlu_personel: ''
    };
    setWasteRecords([...wasteRecords, newRecord]);
  };

  const updateWasteRecord = (id: number, field: keyof WasteRecord, value: string) => {
    setWasteRecords(wasteRecords.map(record => record.id === id ? { ...record, [field]: value } : record));
  };

  const removeWasteRecord = (id: number) => {
    setWasteRecords(wasteRecords.filter(record => record.id !== id));
  };

  const handleSettings61 = (e: React.ChangeEvent<HTMLInputElement>) => { 
    const { name, value } = e.target; 
    setSettings61(prev => ({ ...prev, [name]: value })); 
  };

  const handlePrint = () => { window.print(); };

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

  // --- A4 PREVIEW RENDERLARI ---

  // 1.1 A4
  const renderA4_11 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="FAALİYET DOSYASI İÇERİĞİ" settings={settings11} />
      <div className="flex-grow">
        <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">Müşteri: {formData12.ticariUnvan}</div>
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-sm"><strong>ZARARLI MÜCADELESİ FAALİYET DOSYASI - İÇİNDEKİLER</strong></div>
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
              <th className="border border-black p-2 w-12 text-center">NO</th>
              <th className="border border-black p-2 text-left">EVRAK ADI</th>
              <th className="border border-black p-2 text-left">EVRAK AÇIKLAMALARI</th>
              <th className="border border-black p-2 w-20 text-center">DURUM</th>
            </tr>
          </thead>
          <tbody>
            {documentContents.map((doc, index) => (
              <tr key={doc.id}>
                <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
                <td className="border border-black p-2 font-semibold">{doc.baslik}</td>
                <td className="border border-black p-2 text-xs">{doc.aciklama}</td>
                <td className="border border-black p-2 text-center">
                  <span className={`inline-block w-3 h-3 rounded-full ${doc.durum === 'mevcut' ? 'bg-green-500' : doc.durum === 'beklemede' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
    </div>
  );

  // 1.2 A4
  const renderA4_12 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="MÜŞTERİ BİLGİ FORMU" settings={settings12} />
      <div className="flex-grow">
        <p className="mb-6 text-sm">Aşağıdaki bilgiler, hizmet sözleşmesinin hazırlanması ve yasal bildirimlerin yapılabilmesi için hizmet alan firma (Müşteri) tarafından beyan edilmiştir.</p>
        <table className="w-full border-collapse border border-black text-sm">
          <tbody>
            <tr><td className="border border-black font-bold p-3 w-1/3 align-top" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>FİRMA TİCARİ ÜNVANI</td><td className="border border-black p-3 uppercase font-semibold">{formData12.ticariUnvan}</td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3 align-top" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>FAALİYET KONUSU</td><td className="border border-black p-3">{formData12.faaliyetKonusu}</td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3 align-top" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>AÇIK ADRES (MERKEZ)</td><td className="border border-black p-3">{formData12.adres}</td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>VERGİ DAİRESİ</td><td className="border border-black p-3">{formData12.vergiDairesi}</td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>VERGİ NUMARASI</td><td className="border border-black p-3 font-mono">{formData12.vergiNo}</td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>MERSİS NUMARASI</td><td className="border border-black p-3 font-mono">{formData12.mersisNo}</td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>TELEFON</td><td className="border border-black p-3">{formData12.telefon}</td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>E-POSTA</td><td className="border border-black p-3">{formData12.eposta}</td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3 align-top py-6" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>YETKİLİ KİŞİ / ÜNVAN</td><td className="border border-black p-3 py-6"><div className="font-bold">{formData12.yetkiliKisi}</div><div className="text-gray-600 italic">{formData12.yetkiliUnvan}</div></td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>YETKİLİ CEP TEL</td><td className="border border-black p-3">{formData12.yetkiliTel}</td></tr>
            <tr><td className="border border-black font-bold p-3 w-1/3" style={{ backgroundColor: BRAND_LIGHT_GREEN }}>HİZMET BAŞLANGIÇ</td><td className="border border-black p-3">{formData12.hizmetBaslangicTarihi.split('-').reverse().join('.')}</td></tr>
          </tbody>
        </table>
        <div className="mt-16 flex justify-between px-4">
          <div className="text-center w-1/3">
            <h4 className="font-bold mb-1">MÜŞTERİ YETKİLİSİ</h4>
            <div className="text-xs mb-8">(Kaşe - İmza)</div>
            <div className="border-b border-black w-full"></div>
            <div className="text-xs mt-1">{formData12.yetkiliKisi}</div>
          </div>
          <div className="text-center w-1/3">
            <h4 className="font-bold mb-1">MENTOR YETKİLİSİ</h4>
            <div className="text-xs mb-8">(Kaşe - İmza)</div>
            <div className="border-b border-black w-full"></div>
            <div className="text-xs mt-1">Operasyon Müdürü</div>
          </div>
        </div>
      </div>
      <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-4">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
    </div>
  );

  // 1.3 A4
  const renderA4_13 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="MÜŞTERİ ŞUBELERİNİN BİLGİLERİ" settings={settings13} />
      <div className="flex-grow">
        <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {formData12.ticariUnvan}</div>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
              <th className="border border-black p-2 w-10 text-center">NO</th>
              <th className="border border-black p-2 text-left">ŞUBE ADI</th>
              <th className="border border-black p-2 text-left">ŞUBE YETKİLİSİ</th>
              <th className="border border-black p-2 w-16 text-center">ALAN (m²)</th>
              <th className="border border-black p-2 text-left">İLETİŞİM / ADRES</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch, index) => (
              <tr key={branch.id}>
                <td className="border border-black p-2 text-center font-bold">{index + 1}</td>
                <td className="border border-black p-2 font-semibold">{branch.subeAdi}</td>
                <td className="border border-black p-2">{branch.yetkili}</td>
                <td className="border border-black p-2 text-center">{branch.metrekare}</td>
                <td className="border border-black p-2"><div><strong>Tel:</strong> {branch.telefon}</div><div className="italic text-[10px] mt-1">{branch.adres}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 text-xs text-gray-600">* Yukarıda belirtilen şubelerde yapılacak olan pest kontrol hizmeti, ana sözleşmede belirtilen şartlar dahilinde gerçekleştirilecektir.</div>
      </div>
      <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
    </div>
  );

  // 2.1 A4
  const renderA4_21 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="HİZMET SÖZLEŞMESİ" settings={settings21} />
      <div className="flex-grow text-sm leading-relaxed text-justify">
        <h3 className="font-bold mb-2">1. TARAFLAR</h3>
        <p className="mb-4">Bir tarafta <strong>MENTOR ÇEVRE SAĞLIĞI HİZMETLERİ</strong> (Bundan böyle "Yüklenici" olarak anılacaktır) ile diğer tarafta <strong>{formData12.ticariUnvan}</strong> (Bundan böyle "İşveren" olarak anılacaktır) arasında aşağıda belirtilen şartlarda anlaşmaya varılmıştır.</p>
        <h3 className="font-bold mb-2">2. HİZMETİN KONUSU</h3>
        <p className="mb-4">İşveren'in <strong>{formData12.adres}</strong> adresindeki tesislerinde/iş yerinde, halk sağlığını tehdit eden vektörlerle (zararlılarla) mücadele kapsamında, Sağlık Bakanlığı mevzuatına uygun olarak ilaçlama ve pest kontrol hizmetinin verilmesidir.</p>
        <h3 className="font-bold mb-2">3. HİZMETİN KAPSAMI</h3>
        <p className="mb-4">Bu sözleşme kapsamında aşağıdaki zararlılarla mücadele edilecektir:
          <ul className="list-disc pl-6 mt-1 space-y-1">
            {contractData.kapsam.kemirgen && <li>Kemirgenler (Rattus norvegicus, Rattus rattus, Mus musculus)</li>}
            {contractData.kapsam.yuruyenHasere && <li>Yürüyen Haşereler (Hamamböceği, Karınca, Örümcek vb.)</li>}
            {contractData.kapsam.ucanHasere && <li>Uçan Haşereler (Karasinek, Sivrisinek vb. - Larva mücadelesi dahil)</li>}
            {contractData.kapsam.dezenfeksiyon && <li>Dezenfeksiyon Hizmeti (Virüs ve bakterilere karşı ortam dezenfeksiyonu)</li>}
          </ul>
        </p>
        <h3 className="font-bold mb-2">4. HİZMET PERİYODU VE SÜRESİ</h3>
        <p className="mb-4">Hizmet, <strong>{contractData.baslangicTarihi}</strong> ile <strong>{contractData.bitisTarihi}</strong> tarihleri arasında geçerlidir. Uygulama periyodu: <strong>{contractData.hizmetPeriyodu}</strong> olarak belirlenmiştir. Acil durumlarda (garanti kapsamındaki çağrılarda) Yüklenici, ekstra ücret talep etmeden 24-48 saat içinde müdahale edecektir.</p>
        <h3 className="font-bold mb-2">5. HİZMET BEDELİ VE ÖDEME KOŞULLARI</h3>
        <p className="mb-4">Sözleşme konusu hizmet bedeli, uygulama başına/aylık <strong>{contractData.hizmetBedeli} {contractData.paraBirimi} + KDV</strong> olarak belirlenmiştir. Ödeme, {contractData.odemeSekli}</p>
        <h3 className="font-bold mb-2">6. TARAFLARIN YÜKÜMLÜLÜKLERİ</h3>
        <p className="mb-2"><strong>Yüklenici:</strong> Sağlık Bakanlığı onaylı biyosidal ürünleri kullanmakla, uygulamayı sertifikalı personel ile yapmakla ve yapılan işlemi EK-1 Biyosidal Ürün Uygulama İşlem Formu ile belgelemekle yükümlüdür.</p>
        <p className="mb-4"><strong>İşveren:</strong> Uygulama öncesi ve sonrası Yüklenici'nin belirteceği güvenlik tedbirlerine (gıda maddelerinin korunması, temizlik vb.) uymakla ve Yüklenici personeline çalışma sahasında kolaylık sağlamakla yükümlüdür.</p>
        <div className="mt-8 border border-gray-300 p-4 bg-gray-50 text-xs"><strong>Not:</strong> Bu sözleşme iki nüsha olarak düzenlenmiş olup, taraflarca okunarak {contractData.sozlesmeTarihi.split('-').reverse().join('.')} tarihinde imza altına alınmıştır. Anlaşmazlık durumunda İstanbul Mahkemeleri yetkilidir.</div>
        <div className="mt-12 flex justify-between px-8">
          <div className="text-center w-1/3">
            <h4 className="font-bold mb-1">İŞVEREN (MÜŞTERİ)</h4>
            <div className="text-xs mb-8">Kaşe - İmza</div>
            <div className="border-b border-black w-full"></div>
            <div className="text-xs mt-1">{formData12.yetkiliKisi}</div>
          </div>
          <div className="text-center w-1/3">
            <h4 className="font-bold mb-1">YÜKLENİCİ (MENTOR)</h4>
            <div className="text-xs mb-8">Kaşe - İmza</div>
            <div className="border-b border-black w-full"></div>
            <div className="text-xs mt-1">Şirket Müdürü</div>
          </div>
        </div>
      </div>
      <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
    </div>
  );

  // 3.1 A4
  const renderA4_31 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="İZİN VE RUHSATLAR" settings={settings31} />
      <div className="flex-grow">
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 text-sm italic">Bu bölümde yer alan belgeler, firmanın yasal olarak pest kontrol hizmeti verebilmesi için gerekli olan resmi izin ve ruhsatları kapsamaktadır. İlgili belgelerin suretleri aşağıda listelenmiştir.</div>
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
              <th className="border border-black p-3 text-left w-1/3">BELGE ADI</th>
              <th className="border border-black p-3 text-left">BELGE NUMARASI</th>
              <th className="border border-black p-3 text-center">TARİH</th>
              <th className="border border-black p-3 text-left">VEREN KURUM</th>
            </tr>
          </thead>
          <tbody>
            {permits.map(permit => (
              <tr key={permit.id}>
                <td className="border border-black p-3 font-bold">{permit.belgeAdi}</td>
                <td className="border border-black p-3 font-mono">{permit.belgeNo}</td>
                <td className="border border-black p-3 text-center"><div>{permit.verilisTarihi}</div><div className="text-[10px] text-gray-500">(Geçerlilik: {permit.gecerlilikTarihi})</div></td>
                <td className="border border-black p-3">{permit.verenKurum}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-12 text-center border-t border-b border-black py-8 bg-gray-50">
          <h3 className="font-bold text-lg mb-2 text-gray-800">EKLER</h3>
          <p className="text-sm text-gray-600">Bu kapak sayfasının arkasında, yukarıda listelenen belgelerin fotokopileri/suretleri yer almaktadır.</p>
          <div className="flex justify-center gap-4 mt-4"><ShieldCheck size={32} className="text-gray-300" /><ShieldCheck size={32} className="text-gray-300" /><ShieldCheck size={32} className="text-gray-300" /></div>
        </div>
      </div>
      <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
    </div>
  );

  // 3.2 A4
  const renderA4_32 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="MESUL MÜDÜR VE OPERATÖR SERTİFİKALARI" settings={settings32} />
      <div className="flex-grow">
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 text-sm italic">Bu bölümde, hizmeti planlayan mesul müdür ve sahada fiilen uygulamayı yapan operatörlerin yetkinliklerini gösteren Sağlık Bakanlığı onaylı sertifikalarının suretleri yer almaktadır.</div>
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
              <th className="border border-black p-3 text-left w-1/4">ADI SOYADI</th>
              <th className="border border-black p-3 text-left w-1/3">GÖREVİ</th>
              <th className="border border-black p-3 text-left">SERTİFİKA NO</th>
              <th className="border border-black p-3 text-center">GEÇERLİLİK TARİHİ</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(s => (
              <tr key={s.id}>
                <td className="border border-black p-3 font-bold">{s.adSoyad}</td>
                <td className="border border-black p-3">{s.gorev}</td>
                <td className="border border-black p-3 font-mono">{s.sertifikaNo}</td>
                <td className="border border-black p-3 text-center">{s.gecerlilikTarihi}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-12 text-center border-t border-b border-black py-8 bg-gray-50">
          <h3 className="font-bold text-lg mb-2 text-gray-800">EKLER</h3>
          <p className="text-sm text-gray-600">Bu kapak sayfasının arkasında, yukarıda listelenen personelin sertifika fotokopileri/suretleri yer almaktadır.</p>
          <div className="flex justify-center gap-4 mt-4"><Users size={32} className="text-gray-300" /><Users size={32} className="text-gray-300" /><Users size={32} className="text-gray-300" /></div>
        </div>
      </div>
      <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
    </div>
  );

  // 4.1 A4
  const renderA4_41 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="ZARARLI MÜCADELESİ EKİPMAN KROKİSİ" settings={settings41} />
      <div className="flex-grow flex flex-col">
        <div className="mb-2 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {formData12.ticariUnvan}</div>
        <div className="flex-1 border-2 border-dashed border-gray-300 rounded flex items-center justify-center relative overflow-hidden mb-4">
          {krokiImage ? (<img src={krokiImage} alt="Kroki" className="max-w-full max-h-full object-contain" />) : (<div className="text-gray-300 text-center"><Map size={48} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Kroki Görseli Yüklenmedi</p></div>)}
        </div>
        <div className="border border-black p-2 mt-auto">
          <h4 className="font-bold border-b border-black mb-2 pb-1 text-sm bg-gray-100 px-1">LEJANT / İŞARET DİLİ</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {legendItems.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="font-bold border border-black w-8 h-6 flex items-center justify-center bg-white">{item.kod}</div>
                <span>{item.aciklama}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-2">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
    </div>
  );

  // 4.2 A4
  const renderA4_42 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="EKİPMAN TAKİP VE KONTROL FORMU" settings={settings42} />
      <div className="flex-grow">
        <div className="mb-4 text-xs font-bold uppercase border-b border-gray-400 pb-1 flex justify-between"><span>Firma: {formData12.ticariUnvan}</span><span>Tarih: .........................</span></div>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr style={{ backgroundColor: BRAND_LIGHT_GREEN }}>
              <th className="border border-black p-1 w-12 text-center">NO</th>
              <th className="border border-black p-1 text-left">LOKASYON</th>
              <th className="border border-black p-1 text-center w-12">TİP</th>
              <th className="border border-black p-1 w-16 text-center">DURUM</th>
              <th className="border border-black p-1 w-20 text-center">AKTİVİTE</th>
              <th className="border border-black p-1 w-16 text-center">TEMİZLİK</th>
              <th className="border border-black p-1 text-left">UYGULAMA / AÇIKLAMA</th>
            </tr>
          </thead>
          <tbody>
            {stations.length === 0 ? (
              <tr><td colSpan={7} className="p-4 text-center italic text-gray-500">Lütfen soldaki panelden istasyon listesini oluşturunuz.</td></tr>
            ) : (
              stations.map((station, index) => (
                <tr key={station.id} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                  <td className="border border-black p-1 text-center font-bold">{station.no}</td>
                  <td className="border border-black p-1">{station.location}</td>
                  <td className="border border-black p-1 text-center">{station.type.charAt(0)}</td>
                  <td className="border border-black p-1 text-center"></td>
                  <td className="border border-black p-1 text-center"></td>
                  <td className="border border-black p-1 text-center"></td>
                  <td className="border border-black p-1"></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="mt-4 text-[10px] border border-black p-2 bg-gray-50">
          <div className="font-bold mb-1">KISALTMALAR VE İŞARETLER:</div>
          <div className="grid grid-cols-4 gap-2">
            <div><strong>Durum:</strong> (S) Sağlam, (K) Kırık/Hasarlı, (Y) Yok</div>
            <div><strong>Aktivite:</strong> (Y) Yok, (T) Yem Tüketimi, (C) Canlı, (Ö) Ölü</div>
            <div><strong>Temizlik:</strong> (U) Uygun, (UD) Uygun Değil</div>
            <div><strong>Tip:</strong> (K) Kemirgen, (Y) Yürüyen, (I) ILT, (F) Feromon</div>
          </div>
        </div>
        <div className="mt-6 flex justify-between gap-4">
          <div className="border border-black p-2 w-1/2 h-20"><div className="text-[10px] font-bold border-b border-gray-300 mb-1">KONTROL EDEN (OPERATÖR)</div></div>
          <div className="border border-black p-2 w-1/2 h-20"><div className="text-[10px] font-bold border-b border-gray-300 mb-1">TESLİM ALAN (MÜŞTERİ YETKİLİSİ)</div></div>
        </div>
      </div>
      <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-2">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
    </div>
  );

  // 5.2 A4
  const renderA4_52 = () => (
    <div className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] text-black box-border flex flex-col relative" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <A4Header title="ONAYLI BİYOSİDAL ÜRÜN LİSTESİ" settings={settings52} />
      <div className="flex-grow">
        <div className="mb-4 text-sm font-bold uppercase border-b border-gray-400 pb-1">Firma: {formData12.ticariUnvan}</div>
        <div className="mb-4 p-2 bg-gray-50 border text-xs italic">Bu liste, işletmede haşere mücadelesi kapsamında kullanılması planlanan ve T.C. Sağlık Bakanlığı tarafından ruhsatlandırılmış biyosidal ürünleri içerir.</div>
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
          </tbody>
        </table>
        <div className="mt-4 text-xs text-gray-600">* Listede belirtilen ürünlerin Malzeme Güvenlik Bilgi Formları (MSDS) ve Etiket örnekleri dosya ekinde mevcuttur.</div>
      </div>
      <div className="border-t-2 border-black pt-2 text-center text-xs text-gray-500 mt-auto">Bu form, MENTOR Çevre Sağlığı Hizmetleri kalite yönetim sisteminin bir parçasıdır. İzinsiz çoğaltılamaz.</div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-100 font-sans text-gray-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col print:hidden z-20 shadow-lg">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('home')}>
          <img src={LOGO_URL} alt="Mentor Logo" className="h-10" />
          <div><h1 className="font-bold text-gray-800">MENTOR</h1><p className="text-[10px] italic font-bold" style={{ color: BRAND_GREEN }}>Leave pest to us.</p></div>
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
          
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('1.1')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '1.1' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><BookOpen size={18} /> 1.1 Faaliyet Dosyası İçeriği</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('1.2')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '1.2' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Building2 size={18} /> 1.2 Müşteri Bilgileri</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('1.3')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '1.3' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Store size={18} /> 1.3 Şube Bilgileri</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('2.1')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '2.1' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><FileSignature size={18} /> 2.1 Hizmet Sözleşmesi</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('3.1')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '3.1' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Award size={18} /> 3.1 İzin ve Ruhsatlar</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('3.2')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '3.2' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Users size={18} /> 3.2 Sertifikalar</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('4.1')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '4.1' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Map size={18} /> 4.1 Ekipman Krokisi</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('4.2')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '4.2' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><ClipboardList size={18} /> 4.2 Ekipman Takip</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('5.1')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '5.1' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><FileText size={18} /> 5.1 EK-1 İşlem Formu</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('5.2')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '5.2' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Beaker size={18} /> 5.2 Biyosidal Ürünler</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('5.3')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '5.3' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><Package size={18} /> 5.3 Kullanım Kartı</button>
          <button disabled={!selectedCustomerId} onClick={() => setActiveTab('6.1')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === '6.1' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'}`}><AlertTriangle size={18} /> 6.1 Atık İmha Belgesi</button>
        </nav>
        <div className="p-4 border-t border-gray-100">{activeTab !== 'home' && (<button onClick={handlePrint} className="w-full flex justify-center items-center gap-2 bg-green-700 hover:bg-green-800 text-white py-2 px-4 rounded-lg shadow transition text-sm font-medium"><Printer size={16} /> Yazdır (PDF)</button>)}</div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* SOL PANEL (Editör) */}
        {activeTab !== 'home' && (
          <div className="w-[400px] bg-white border-r border-gray-200 overflow-y-auto h-full p-6 print:hidden z-10 animate-in slide-in-from-left duration-300">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-4 border-b">
              {activeTab === '1.1' && 'Faaliyet Dosyası İçeriği Düzenle'}
              {activeTab === '1.2' && 'Müşteri Bilgileri Düzenle'}
              {activeTab === '1.3' && 'Şube Bilgileri Düzenle'}
              {activeTab === '2.1' && 'Hizmet Sözleşmesi Düzenle'}
              {activeTab === '3.1' && 'İzin ve Ruhsatları Düzenle'}
              {activeTab === '3.2' && 'Sertifikaları Düzenle'}
              {activeTab === '4.1' && 'Kroki ve Lejant Düzenle'}
              {activeTab === '4.2' && 'Takip Formu Düzenle'}
              {activeTab === '5.1' && 'EK-1 İşlem Formu Düzenle'}
              {activeTab === '5.2' && 'Biyosidal Ürün Listesi Düzenle'}
              {activeTab === '5.3' && 'Kullanım Kartı Düzenle'}
              {activeTab === '6.1' && 'Atık İmha Belgesi Düzenle'}
            </h2>
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
           {activeTab === 'home' && renderHome()}
           {activeTab === '1.1' && renderA4_11()}
           {activeTab === '1.2' && renderA4_12()}
           {activeTab === '1.3' && renderA4_13()}
           {activeTab === '2.1' && renderA4_21()}
           {activeTab === '3.1' && renderA4_31()}
           {activeTab === '3.2' && renderA4_32()}
           {activeTab === '4.1' && renderA4_41()}
           {activeTab === '4.2' && renderA4_42()}
           {activeTab === '5.1' && renderA4_51()}
           {activeTab === '5.2' && renderA4_52()}
           {activeTab === '5.3' && renderA4_53()}
           {activeTab === '6.1' && renderA4_61()}
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
