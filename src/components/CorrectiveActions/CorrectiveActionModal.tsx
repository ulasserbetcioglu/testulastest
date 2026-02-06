import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Camera, Trash2, Wand2, ChevronDown, ImagePlus, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendEmail, getRecipientEmails } from '../../lib/emailClient';
import { toast } from 'sonner';

// --- TİP TANIMLARI ---
interface CorrectiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId?: string;
  onSave: () => void;
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

interface Visit {
  id: string;
  customer: { kisa_isim: string };
  branch?: { sube_adi: string };
  visit_date: string;
}

// --- GENİŞLETİLMİŞ VE KATEGORİZE EDİLMİŞ HAZIR ŞABLON VERİLERİ ---
const EXAMPLES = {
  descriptions: [
    // KEMİRGENLER
    "⚠️ [KEMİRGEN] Depo kapı altlarında açıklık var, kemirgen girişine uygun.",
    "⚠️ [KEMİRGEN] Elektrik panoları içinde kemirgen dışkısı tespit edildi.",
    "⚠️ [KEMİRGEN] Dış hat istasyonları yerinden oynatılmış/kırılmış.",
    "⚠️ [KEMİRGEN] Asma tavan arasında yoğun gürültü ve ayak izi tespit edildi.",
    
    // YÜRÜYEN HAŞERE (Hamam Böceği, Karınca vb.)
    "🪳 [YÜRÜYEN] Üretim alanı giderlerinde yoğun hamam böceği (Amerikan) aktivitesi.",
    "🪳 [YÜRÜYEN] Mutfak tezgah altlarında ve motor kısımlarında Alman Hamam Böceği kümelenmesi.",
    "🪳 [YÜRÜYEN] Duvar çatlaklarından karınca çıkışı gözlemlendi.",
    "🪳 [YÜRÜYEN] Süpürgeliklerin deforme olması yuvalanma alanı yaratıyor.",

    // UÇKUN HAŞERE (Sinek, Sivrisinek vb.)
    "🪰 [UÇKUN] Çöp konteyner kapakları açık, yoğun sinek larvası oluşumu mevcut.",
    "🪰 [UÇKUN] Pencere sineklikleri yırtık/yerinden çıkmış, içeriye sinek giriyor.",
    "🪰 [UÇKUN] Hava perdesi çalışmıyor/kapalı, kapı açıldığında sinek girişi oluyor.",
    "🪰 [UÇKUN] EFC (Sinek tutucu) cihazlarının lambaları ömrünü tamamlamış, çekiciliği yok.",

    // AMBAR ZARARLILARI (Güve, Bit vb.)
    "📦 [AMBAR] Depodaki eski tarihli un çuvallarında un biti (Tribolium) tespit edildi.",
    "📦 [AMBAR] Hammadde raflarında güve (Ephestia) kozaları ve uçuş aktivitesi var.",
    "📦 [AMBAR] Dökülen tahıllar temizlenmemiş, feromon tuzaklarında sayı artışı var.",
    "📦 [AMBAR] Silo diplerinde nemlenme ve küflenme kaynaklı böceklenme mevcut.",

    // SÜRÜNGEN & DİĞER
    "🐍 [SÜRÜNGEN] Tesis çevresindeki uzun otlar biçilmemiş, yılan saklanma alanı oluşmuş.",
    "🐍 [SÜRÜNGEN] Bahçe duvarı diplerindeki taş yığınları akrep yuvalanmasına uygun.",
    "🐾 [DİĞER] Çatı arasına kuş/kedi girişi var, izolasyon malzemelerine zarar veriyor."
  ],
  rootCauses: [
    // YAPISAL & BAKIM
    "🛠️ Kapı altı fırçalarının/giyotinlerinin zamanla aşınması ve yenilenmemesi.",
    "🛠️ Bina duvarlarında ve zemininde zamanla oluşan çatlak ve yarıklar.",
    "🛠️ İzolasyon eksikliği ve tesisat geçiş boşluklarının kapatılmaması.",
    "🛠️ Sineklik tellerinin ve hava perdelerinin bakımının yapılmaması.",

    // HİJYEN & TEMİZLİK
    "🧹 Giderlerin periyodik temizliğinin yapılmaması ve organik madde birikimi.",
    "🧹 Üretim bantları altında gıda kalıntılarının uzun süre beklemesi.",
    "🧹 Çöp alanlarının düzenli yıkanmaması ve dezenfekte edilmemesi.",
    "🧹 Dökülen hammadde/ürünlerin anlık temizlenmemesi.",

    // DEPOLAMA & DÜZEN
    "📦 FIFO (İlk giren ilk çıkar) kuralına uyulmaması, ürünlerin SKT'sinin geçmesi.",
    "📦 İstiflerin duvara yaslanması (45cm kuralı ihlali), kontrolü engelliyor.",
    "📦 Depo içerisine dışarıdan kontrolsüz palet/koli girişi.",

    // ÇEVRESEL
    "🌳 Tesis çevresindeki yoğun bitki örtüsü ve su birikintileri.",
    "☀️ Dış aydınlatmaların bina girişlerine çok yakın olması (cezbedici etki)."
  ],
  correctiveActions: [
    // ANLIK MÜDAHALELER
    "✅ Kapı altına geçici izolasyon malzemesi (tel/köpük) uygulandı.",
    "✅ Kritik alanlara yoğun jel ve sıvı uygulama (bariyer) yapıldı.",
    "✅ İstiflerin duvardan çekilmesi sağlandı, arkası ilaçlandı.",
    "✅ Kemirgen istasyonlarına taze ve çekici yem takviyesi yapıldı.",
    "✅ EFC cihazı lambaları yenisi ile değiştirildi.",
    "✅ Gider içlerine larvasit ve sıcak su uygulaması yapıldı.",
    "✅ Canlı yakalama tuzakları (yapışkan levha) artırıldı.",
    "✅ Enfeste olmuş (böceklenmiş) ürünler karantinaya alındı/imha edildi.",
    "✅ Sürüngen uzaklaştırıcı granül uygulama yapıldı."
  ],
  preventiveActions: [
    // UZUN VADELİ ÇÖZÜMLER
    "🛡️ Kapı altlarına metal koruyuculu fırça/giyotin takılması sağlanmalı.",
    "🛡️ Tüm gider kapaklarına süzgeç takılmalı ve periyodik temizlenmeli.",
    "🛡️ Personel için 'Pest Kontrol ve Hijyen' eğitimi tekrarlanmalı.",
    "🛡️ Periyodik bina bakım planına izolasyon kontrolleri eklenmeli.",
    "🛡️ Çöp döküm saatleri ve kapak kapama disiplini için talimat asılmalı.",
    "🛡️ Depo girişlerine hızlı açılır-kapanır kapı sistemi kurulmalı.",
    "🛡️ Dış alan ot biçimi ve çevre düzenlemesi 15 günde bir yapılmalı.",
    "🛡️ Sarı renkli dış aydınlatma (sodyum buharlı) tercih edilmeli."
  ]
};

const CorrectiveActionModal: React.FC<CorrectiveActionModalProps> = ({
  isOpen,
  onClose,
  visitId,
  onSave
}) => {
  // --- STATE TANIMLARI ---
  const [visits, setVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [useVisit, setUseVisit] = useState(!!visitId);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [assignedCustomers, setAssignedCustomers] = useState<string[] | null>(null);
  const [assignedBranches, setAssignedBranches] = useState<string[] | null>(null);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    visitId: visitId || '',
    customerId: '',
    branchId: '',
    nonComplianceType: '',
    nonComplianceDescription: '',
    rootCauseAnalysis: '',
    correctiveAction: '',
    preventiveAction: '',
    responsible: '',
    dueDate: new Date().toISOString().split('T')[0],
    relatedStandard: '',
    status: 'open'
  });

  // --- EFFECTLER ---
  useEffect(() => {
    if (isOpen) checkUserRole();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && operatorId) {
      fetchCustomers();
      fetchVisits();
      if (visitId) {
        setFormData(prev => ({ ...prev, visitId }));
        setUseVisit(true);
      }
    }
  }, [isOpen, visitId, operatorId, assignedCustomers]);

  useEffect(() => {
    if (formData.customerId) {
      fetchBranches(formData.customerId);
    } else {
      setFilteredBranches([]);
    }
  }, [formData.customerId, assignedBranches]);

  // --- YARDIMCI FONKSİYONLAR ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Fotoğraf boyutu 5MB\'dan küçük olmalıdır.');
        return;
      }
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      setIsAdmin(user.email === 'admin@ilaclamatik.com');

      const { data: operatorData } = await supabase
        .from('operators')
        .select('id, assigned_customers, assigned_branches')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (operatorData) {
        setOperatorId(operatorData.id);
        setAssignedCustomers(operatorData.assigned_customers);
        setAssignedBranches(operatorData.assigned_branches);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchCustomers = async () => {
    try {
      let query = supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
      if (!isAdmin && assignedCustomers?.length) query = query.in('id', assignedCustomers);
      
      const { data } = await query;
      setCustomers(data || []);

      const { data: bData } = await supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi');
      setBranches(bData || []);
    } catch (err) { console.error(err); }
  };

  const fetchBranches = (customerId: string) => {
    const cBranches = branches.filter(b => b.customer_id === customerId);
    if (!isAdmin && assignedBranches?.length) {
      setFilteredBranches(cBranches.filter(b => assignedBranches.includes(b.id)));
    } else {
      setFilteredBranches(cBranches);
    }
  };

  const fetchVisits = async () => {
    if (!operatorId) return;
    try {
      let query = supabase.from('visits')
        .select(`id, visit_date, customer:customer_id (kisa_isim), branch:branch_id (sube_adi)`)
        .eq('operator_id', operatorId)
        .order('visit_date', { ascending: false });

      if (!isAdmin && assignedCustomers?.length) query = query.in('customer_id', assignedCustomers);
      const { data } = await query;
      setVisits(data || []);
    } catch (err) { console.error(err); }
  };

  // --- KAYIT İŞLEMİ ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu yok');

      let customer_id, branch_id;
      if (useVisit) {
        const { data } = await supabase.from('visits').select('customer_id, branch_id').eq('id', formData.visitId).single();
        if (data) { customer_id = data.customer_id; branch_id = data.branch_id; }
      } else {
        customer_id = formData.customerId;
        branch_id = formData.branchId || null;
      }

      // Fotoğraf Yükleme
      let photoUrl = null;
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `dof-photos/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, selectedImage);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName);
        photoUrl = publicUrl;
      }

      // Kayıt
      const { data, error } = await supabase.from('corrective_actions').insert([{
        visit_id: useVisit ? formData.visitId : null,
        customer_id, branch_id,
        non_compliance_type: formData.nonComplianceType,
        non_compliance_description: formData.nonComplianceDescription,
        root_cause_analysis: formData.rootCauseAnalysis,
        corrective_action: formData.correctiveAction,
        preventive_action: formData.preventiveAction,
        responsible: formData.responsible,
        due_date: formData.dueDate,
        related_standard: formData.relatedStandard,
        status: formData.status,
        created_by: user.id,
        photo_url: photoUrl
      }]).select();

      if (error) throw error;

      if (sendEmailNotification && data && data.length > 0) {
        try {
          const recipients = await getRecipientEmails(customer_id, branch_id);
          if (customEmail && customEmail.trim() && !recipients.includes(customEmail.trim())) {
            recipients.push(customEmail.trim());
          }
          for (const email of recipients) await sendEmail('dof', data[0].id, email);
          toast.success('DÖF bildirimi e-posta ile gönderildi.');
        } catch (e) { console.error("E-posta hatası", e); }
      }

      setSuccess(true);
      setTimeout(() => { onSave(); onClose(); resetForm(); }, 1500);
    } catch (err: any) {
      setError(err.message);
      toast.error('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      visitId: '', customerId: '', branchId: '',
      nonComplianceType: '', nonComplianceDescription: '',
      rootCauseAnalysis: '', correctiveAction: '', preventiveAction: '',
      responsible: '', dueDate: new Date().toISOString().split('T')[0],
      relatedStandard: '', status: 'open'
    });
    setSuccess(false); setError(null); setUseVisit(!!visitId);
    setCustomEmail('');
    handleRemoveImage();
  };

  // --- ŞABLON BUTONU RENDER ---
  const renderTemplateButton = (field: keyof typeof formData, examples: string[]) => (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => setActiveTemplate(activeTemplate === field ? null : field)}
        className="text-xs flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-1 font-medium"
      >
        <Wand2 size={12} className="mr-1" /> Hızlı Hazır Şablon Kullan
        <ChevronDown size={12} className={`ml-1 transition-transform ${activeTemplate === field ? 'rotate-180' : ''}`} />
      </button>
      
      {activeTemplate === field && (
        <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto mt-1 p-1 custom-scrollbar">
          {examples.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, [field]: ex }));
                setActiveTemplate(null);
              }}
              className="w-full text-left text-xs p-2.5 hover:bg-blue-50 rounded text-gray-700 border-b last:border-0 border-gray-100 transition-colors leading-relaxed"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={24} className="text-orange-500" />
              Düzeltici Önleyici Faaliyet
            </h2>
            <p className="text-xs text-gray-500 mt-1 pl-8">Uygunsuzluk kaydı ve aksiyon planı oluşturma</p>
          </div>
          <button onClick={() => { onClose(); resetForm(); }} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center text-sm animate-pulse">
              <AlertTriangle size={18} className="mr-2 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center text-sm">
              <CheckCircle size={18} className="mr-2 flex-shrink-0" /> Kayıt başarıyla oluşturuldu!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Seçim Tipi */}
            <div className="bg-blue-50/50 p-3 rounded-lg flex gap-4 text-sm border border-blue-100">
              <label className="flex items-center cursor-pointer hover:text-blue-700">
                <input type="radio" checked={useVisit} onChange={() => setUseVisit(true)} className="mr-2 text-blue-600 focus:ring-blue-500" />
                <span className="font-medium">Ziyaret Üzerinden</span>
              </label>
              <label className="flex items-center cursor-pointer hover:text-blue-700">
                <input type="radio" checked={!useVisit} onChange={() => setUseVisit(false)} className="mr-2 text-blue-600 focus:ring-blue-500" />
                <span className="font-medium">Müşteri/Şube Seçerek</span>
              </label>
            </div>

            {/* Müşteri/Ziyaret Seçimi */}
            {useVisit ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ziyaret Seçimi</label>
                <select
                  value={formData.visitId}
                  onChange={(e) => setFormData({ ...formData, visitId: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Lütfen Ziyaret Seçiniz</option>
                  {visits.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.customer.kisa_isim} - {v.branch?.sube_adi || 'Merkez'} ({new Date(v.visit_date).toLocaleDateString('tr-TR')})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Müşteri</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value, branchId: '' })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Şube</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                    disabled={!formData.customerId}
                  >
                    <option value="">Tümü / Merkez</option>
                    {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Uygunsuzluk Tipi - GÜNCELLENDİ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Uygunsuzluk Tipi / Kategori</label>
              <select
                value={formData.nonComplianceType}
                onChange={(e) => setFormData({ ...formData, nonComplianceType: e.target.value })}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Kategori Seçiniz</option>
                <optgroup label="Zararlı Türleri">
                  <option value="kemirgen">🐭 Kemirgen Aktivitesi</option>
                  <option value="yuruyen">🪳 Yürüyen Haşere</option>
                  <option value="uckun">🪰 Uçkun Haşere</option>
                  <option value="ambar">📦 Ambar Zararlısı</option>
                  <option value="surungen">🐍 Sürüngen</option>
                </optgroup>
                <optgroup label="Diğer Nedenler">
                  <option value="yapisal">🏗️ Yapısal / İzolasyon</option>
                  <option value="hijyen">🧹 Hijyen / Temizlik</option>
                  <option value="depolama">📦 Depolama / İstifleme</option>
                  <option value="dis_alan">🌳 Dış Alan / Çevre</option>
                </optgroup>
              </select>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Kanıt Fotoğrafı</label>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              {!imagePreview ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center h-28 border border-gray-300 rounded-lg bg-white hover:border-green-500 hover:text-green-600 transition-all shadow-sm cursor-pointer"
                  >
                    <Camera className="w-7 h-7 mb-1.5 text-gray-400" />
                    <span className="text-sm font-medium">Kamera</span>
                    <span className="text-xs text-gray-400 mt-0.5">Fotoğraf Çek</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center h-28 border border-gray-300 rounded-lg bg-white hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm cursor-pointer"
                  >
                    <ImagePlus className="w-7 h-7 mb-1.5 text-gray-400" />
                    <span className="text-sm font-medium">Galeri</span>
                    <span className="text-xs text-gray-400 mt-0.5">Dosya Seç</span>
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-48 bg-black rounded-lg overflow-hidden border border-gray-200 shadow-md">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg transition-transform hover:scale-110"
                    title="Fotoğrafı Sil"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 text-center truncate">
                    {selectedImage?.name}
                  </div>
                </div>
              )}
            </div>

            {/* Text Area Grupları */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Uygunsuzluk Tanımı</label>
                <textarea
                  value={formData.nonComplianceDescription}
                  onChange={(e) => setFormData({ ...formData, nonComplianceDescription: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tespit edilen durumu detaylı açıklayınız..."
                  required
                />
                {renderTemplateButton('nonComplianceDescription', EXAMPLES.descriptions)}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Kök Neden Analizi</label>
                <textarea
                  value={formData.rootCauseAnalysis}
                  onChange={(e) => setFormData({ ...formData, rootCauseAnalysis: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[60px]"
                  placeholder="Bu sorun neden kaynaklandı?"
                  required
                />
                {renderTemplateButton('rootCauseAnalysis', EXAMPLES.rootCauses)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Düzeltici Faaliyet (Anlık)</label>
                  <textarea
                    value={formData.correctiveAction}
                    onChange={(e) => setFormData({ ...formData, correctiveAction: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px]"
                    placeholder="Şu an ne yapıldı?"
                    required
                  />
                  {renderTemplateButton('correctiveAction', EXAMPLES.correctiveActions)}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Önleyici Faaliyet (Kalıcı)</label>
                  <textarea
                    value={formData.preventiveAction}
                    onChange={(e) => setFormData({ ...formData, preventiveAction: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm min-h-[80px]"
                    placeholder="Tekrar etmemesi için ne yapılmalı?"
                    required
                  />
                  {renderTemplateButton('preventiveAction', EXAMPLES.preventiveActions)}
                </div>
              </div>
            </div>

            {/* Alt Bilgiler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Sorumlu Kişi</label>
                <input
                  type="text"
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  placeholder="İsim Soyad"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Termin Tarihi</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">İlgili Standart</label>
                <select
                  value={formData.relatedStandard}
                  onChange={(e) => setFormData({ ...formData, relatedStandard: e.target.value })}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  required
                >
                  <option value="">Seçiniz</option>
                  <option value="haccp">HACCP</option>
                  <option value="brc">BRCGS</option>
                  <option value="aib">AIB</option>
                  <option value="iso22000">ISO 22000</option>
                  <option value="ifs">IFS</option>
                  <option value="yum">YUM! Brands</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmailNotification}
                  onChange={(e) => setSendEmailNotification(e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="sendEmail" className="ml-2 text-sm text-gray-700 cursor-pointer select-none">
                  Kaydı müşteriye <b>e-posta</b> ile bildir
                </label>
              </div>
              {sendEmailNotification && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                    <Mail size={12} /> Ek E-posta Adresi (Opsiyonel)
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="ornek@firma.com"
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Müşteri e-postasına ek olarak bu adrese de gönderilir</p>
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50/80 rounded-b-xl flex justify-end gap-3 backdrop-blur-sm">
          <button
            onClick={() => { onClose(); resetForm(); }}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-white hover:shadow-sm transition-all text-sm font-medium"
            disabled={loading}
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-bold flex items-center shadow-md hover:shadow-lg transform active:scale-95"
            disabled={loading || (useVisit && !formData.visitId) || (!useVisit && !formData.customerId)}
          >
            {loading ? <><span className="animate-spin mr-2">⏳</span> Kaydediliyor...</> : 'DÖF Kaydını Tamamla'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CorrectiveActionModal;