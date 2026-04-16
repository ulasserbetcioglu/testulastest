import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { 
  Camera, Image as ImageIcon, Search, Plus, Trash2, 
  User, Building2, Phone, Mail, Globe, MapPin, 
  FileText, Loader2, X, CheckCircle2, ChevronRight, Filter, 
  ArrowLeft, RefreshCw, Brain
} from 'lucide-react';
import { toast } from 'sonner';

// --- TYPES ---
interface CustomerLead {
  id: string;
  created_at: string;
  operator_id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
  photo_url: string;
  photo_path: string;
  operator?: {
    full_name: string;
  };
}

// --- HELPERS (Copied from VisitDetails for consistency) ---
const resizeImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context error')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        } else {
          reject(new Error('Blob creation error'));
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load error')); };
    img.src = url;
  });
};

const CustomerLeads: React.FC = () => {
  // State
  const [leads, setLeads] = useState<CustomerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedLead, setSelectedLead] = useState<CustomerLead | null>(null);
  
  // New Lead State
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    notes: ''
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Auth/Role State
  const [userRole, setUserRole] = useState<'admin' | 'operator' | null>(null);
  const [currentOperatorId, setCurrentOperatorId] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuthAndRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchLeads();
    }
  }, [userRole]);

  const checkAuthAndRole = async () => {
    try {
      // First check local session for operator
      const localSession = localAuth.getSession();
      if (localSession && localSession.type === 'operator') {
        setUserRole('operator');
        setCurrentOperatorId(localSession.id);
        return;
      }

      // If no local session, check Supabase auth for admin
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'admin@ilaclamatik.com') {
        setUserRole('admin');
        return;
      } else if (user) {
        // Might be an operator logged in via standard Supabase auth
        const { data: operatorData } = await supabase
          .from('operators')
          .select('id')
          .eq('auth_id', user.id)
          .maybeSingle();
        
        if (operatorData) {
          setUserRole('operator');
          setCurrentOperatorId(operatorData.id);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('customer_leads')
        .select('*, operator:operator_id(name)')
        .order('created_at', { ascending: false });

      if (userRole === 'operator' && currentOperatorId) {
        query = query.eq('operator_id', currentOperatorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      toast.error('Kayıtlar yüklenirken hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannedImage(URL.createObjectURL(file));
      setView('new');
      setIsAnalyzing(true);
      
      // Optimize image before sending to Gemini - Higher resolution for better OCR
      const optimizedFile = await resizeImage(file, 1600, 1600, 0.9);
      
      // Convert to base64 for Gemini
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Content = (reader.result as string).split(',')[1];
        await analyzeBusinessCard(base64Content);
      };
      reader.readAsDataURL(optimizedFile);
      
    } catch (err: any) {
      toast.error('Resim işlenirken hata: ' + err.message);
      setIsAnalyzing(false);
    }
  };

  const analyzeBusinessCard = async (base64Image: string) => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Gemini API Key bulunamadı (.env kontrol edin)');

      const prompt = `
        Aşağıdaki kartvizit fotoğrafını bir veri giriş uzmanı olarak analiz et.
        
        TEMEL GÖREV: Fotoğraftaki tüm yazıları oku ve kurumsal bir rehber formatında ayıkla.
        
        AYIKLANACAK ALANLAR:
        1. "company_name": Kurum/Şirket adı (Logonun yanındaki büyük metni esas al).
        2. "contact_person": Kişinin tam adı ve soyadı.
        3. "phone": Sadece rakamlardan oluşan temizlenmiş telefon numarası (örn: 05xx...).
        4. "email": Geçerli e-posta adresi.
        5. "website": Şirket web sitesi (www... veya http...).
        6. "address": Açık adres bilgisi.

        LÜTFEN SADECE JSON FORMATINDA CEVAP VER. Başka açıklama ekleme.
        Eğer bir veri bulunamazsa o alanı boş bırak ("").
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 2048,
            response_mime_type: "application/json"
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        })
      });

      if (response.status === 429) {
        throw new Error('API İstek Sınırı Aşıldı. Lütfen bir süre bekleyip tekrar deneyin.');
      }

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textResponse) {
        try {
          const extracted = JSON.parse(textResponse);
          setFormData(prev => ({ ...prev, ...extracted }));
          toast.success('AI Analizi tamamlandı.');
        } catch (parseErr) {
          console.error('JSON Parse error:', textResponse);
          throw new Error('AI yanıtı işlenemedi.');
        }
      } else {
        const finishReason = result.candidates?.[0]?.finishReason;
        throw new Error(finishReason === 'SAFETY' ? 'Güvenlik filtresi nedeniyle analiz yapılamadı.' : 'Kartvizit okunamadı.');
      }
    } catch (err: any) {
      console.error('AI error:', err);
      toast.error('AI Hatası: ' + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveLead = async () => {
    if (!currentOperatorId && userRole === 'operator') {
      toast.error('Operatör kimliği bulunamadı.');
      return;
    }

    setIsSaving(true);
    try {
      let photoUrl = '';
      let photoPath = '';

      // Upload image if captured
      if (scannedImage && cameraInputRef.current?.files?.[0]) {
        const file = cameraInputRef.current.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        photoPath = `leads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('lead-photos')
          .upload(photoPath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('lead-photos')
          .getPublicUrl(photoPath);
        
        photoUrl = publicUrl;
      }

      const { error } = await supabase
        .from('customer_leads')
        .insert([{
          ...formData,
          operator_id: currentOperatorId,
          photo_url: photoUrl,
          photo_path: photoPath
        }]);

      if (error) throw error;

      toast.success('Müşteri kaydı başarıyla oluşturuldu.');
      setView('list');
      fetchLeads();
      // Reset form
      setFormData({ company_name: '', contact_person: '', phone: '', email: '', website: '', address: '', notes: '' });
      setScannedImage(null);
    } catch (err: any) {
      toast.error('Kayıt sırasında hata: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone?.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-30 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== 'list' && (
              <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="text-purple-600 hidden sm:block" />
              Müşteri Kayıtları
            </h1>
          </div>
          {view === 'list' && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchLeads()} 
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Yenile"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button 
                onClick={() => setView('new')}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md active:scale-95 transition-all"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Yeni Kayıt</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Şirket, isim veya telefon ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Kayıtlar yükleniyor...</p>
              </div>
            ) : filteredLeads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLeads.map(lead => (
                  <div 
                    key={lead.id}
                    onClick={() => { setSelectedLead(lead); setView('detail'); }}
                    className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div className="flex gap-4">
                      {lead.photo_url ? (
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-100 shadow-inner">
                          <img src={lead.photo_url} alt="Kartvizit" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                          <Building2 size={32} className="text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-gray-900 truncate">{lead.company_name || 'İsimsiz Şirket'}</h3>
                          <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-0.5">{lead.contact_person}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                          {lead.phone && (
                            <span className="text-[11px] font-medium text-blue-600 flex items-center gap-1">
                              <Phone size={10} /> {lead.phone}
                            </span>
                          )}
                          {lead.email && (
                            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                              <Mail size={10} /> {lead.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {userRole === 'admin' && lead.operator && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <span>Ekleyen: {lead.operator.name}</span>
                        <span>{new Date(lead.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <User size={40} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Henüz kayıt yok</h3>
                <p className="text-gray-500 text-sm max-w-xs mb-8">Yeni bir kartvizit tarayarak ilk müşteri kaydınızı oluşturun.</p>
                <button 
                  onClick={() => setView('new')}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition-all flex items-center gap-2"
                >
                  <Camera size={20} /> Kayda Başla
                </button>
              </div>
            )}
          </div>
        )}

        {/* NEW LEAD VIEW (SCAN & FORM) */}
        {view === 'new' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Scan Area */}
            {!scannedImage ? (
              <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-blue-200 shadow-inner flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600 animate-pulse">
                  <Camera size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Kartvizit Tara</h3>
                <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
                  Kartviziti düz bir zemine koyun ve net bir fotoğrafını çekin. Bilgileri AI ile otomatik dolduracağız.
                </p>
                
                <div className="flex flex-col w-full gap-3 max-w-sm">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    ref={cameraInputRef}
                    onChange={handleImageCapture}
                  />
                  <button 
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                  >
                    <Camera size={24} /> Şimdi Çek
                  </button>

                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleImageCapture}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-white text-gray-700 py-3 rounded-2xl font-semibold border border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"
                  >
                    <ImageIcon size={20} /> Galeriden Seç
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Preview & Analysis Box */}
                <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="flex gap-4 items-center">
                    <div className="w-24 h-24 sm:w-32 sm:h-20 rounded-xl overflow-hidden border shadow-sm shrink-0">
                      <img src={scannedImage} alt="Scanned" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      {isAnalyzing ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-purple-600 font-bold animate-pulse">
                            <Brain size={20} />
                            <span className="text-sm">Yapay Zeka Okuyor...</span>
                          </div>
                          <div className="h-1.5 w-full bg-purple-100 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-600 animate-progress"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-green-600 font-bold">
                            <CheckCircle2 size={18} />
                            <span className="text-sm">Analiz Tamamlandı</span>
                          </div>
                          <p className="text-[11px] text-gray-400">Lütfen aşağıdaki bilgileri kontrol edip eksikleri tamamlayın.</p>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setScannedImage(null)}
                      className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* FIELDS FORM */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <Building2 size={12} /> Şirket Adı
                      </label>
                      <input 
                        type="text" 
                        value={formData.company_name}
                        onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                        placeholder="..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <User size={12} /> İlgili Kişi
                      </label>
                      <input 
                        type="text" 
                        value={formData.contact_person}
                        onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                        placeholder="..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <Phone size={12} /> Telefon
                      </label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                        placeholder="..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <Mail size={12} /> E-posta
                      </label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                        placeholder="..."
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <Globe size={12} /> Web Sitesi
                      </label>
                      <input 
                        type="text" 
                        value={formData.website}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                        placeholder="..."
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <MapPin size={12} /> Adres
                      </label>
                      <textarea 
                        rows={2}
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium resize-none text-sm" 
                        placeholder="..."
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1 flex items-center gap-1.5">
                        <FileText size={12} /> Notlar
                      </label>
                      <textarea 
                        rows={2}
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium resize-none text-sm" 
                        placeholder="..."
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => setView('list')}
                      disabled={isSaving}
                      className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all border border-transparent"
                    >
                      Vazgeç
                    </button>
                    <button 
                      onClick={handleSaveLead}
                      disabled={isSaving || isAnalyzing}
                      className="flex-[2] bg-green-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-green-700 shadow-xl shadow-green-200 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <Loader2 size={24} className="animate-spin" />
                          <span>Kaydediliyor...</span>
                        </div>
                      ) : (
                        <>Kaydet ve Bitir</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DETAIL VIEW */}
        {view === 'detail' && selectedLead && (
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Lead Photo Header */}
            <div className="h-64 sm:h-80 bg-gray-900 relative">
              {selectedLead.photo_url ? (
                <img src={selectedLead.photo_url} alt="Kartvizit" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <Building2 size={100} />
                </div>
              )}
              <div className="absolute top-4 left-4 right-4 flex justify-between">
                <button onClick={() => setView('list')} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all">
                  <ArrowLeft size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedLead.company_name || 'İsimsiz Şirket'}</h2>
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mt-1">
                    <User size={16} />
                    {selectedLead.contact_person || 'İsimsiz Kişi'}
                  </div>
                </div>
                {userRole === 'admin' && (
                  <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Operatör</p>
                    <p className="text-sm font-bold text-blue-700">{selectedLead.operator?.name}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-blue-500 shrink-0">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Telefon</p>
                      <a href={`tel:${selectedLead.phone}`} className="text-gray-900 font-bold hover:text-blue-600 transition-colors">
                        {selectedLead.phone || 'Girilmedi'}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-emerald-500 shrink-0">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">E-posta</p>
                      <a href={`mailto:${selectedLead.email}`} className="text-gray-900 font-bold hover:text-emerald-600 transition-colors">
                        {selectedLead.email || 'Girilmedi'}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-purple-500 shrink-0">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Web Sitesi</p>
                      <a href={selectedLead.website?.includes('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noreferrer" className="text-gray-900 font-bold hover:text-purple-600 transition-colors">
                        {selectedLead.website || 'Girilmedi'}
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-red-500 shrink-0">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Adres</p>
                      <p className="text-gray-900 font-bold leading-relaxed">{selectedLead.address || 'Girilmedi'}</p>
                    </div>
                  </div>
                </div>

                {selectedLead.notes && (
                  <div className="col-span-full bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notlar</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedLead.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-8 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400 font-medium italic">
                <span>Kayıt Tarihi: {new Date(selectedLead.created_at).toLocaleString('tr-TR')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CustomerLeads;
