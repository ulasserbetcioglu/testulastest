import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Presentation, Plus, Edit, Trash2, Save, ArrowLeft, ArrowRight, 
  Maximize, Minimize, Upload, Check, X, Award, FileText, Image as ImageIcon, 
  Type, List, Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchTemplates, Template } from '../services/presentationService';
import { toast } from 'sonner';

// --- TİP TANIMLARI ---
interface SlideContent {
  title?: string;
  subtitle?: string;
  bullets?: string[];
  imageUrl?: string;
  caption?: string;
  leftTitle?: string;
  leftContent?: string[];
  rightTitle?: string;
  rightContent?: string[];
}

interface Slide {
  id: string;
  type: 'title' | 'content' | 'two-column' | 'image' | 'thank-you';
  content: SlideContent;
}

interface Presentation {
  id: string;
  name: string;
  slides: Slide[];
  company_name: string;
  company_logo: string | null;
  footer_text: string;
  customer_id?: string;
  created_at?: string;
}

interface Customer {
  id: string;
  kisa_isim: string;
}

const TrainingPresentationPage = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Editör State
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'general' | 'slide'>('slide'); // Sol panel tabları
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Sertifika State
  const [showCertModal, setShowCertModal] = useState(false);
  const [participants, setParticipants] = useState('');
  const [trainerName, setTrainerName] = useState('');
  const [trainerTitle, setTrainerTitle] = useState('Eğitmen'); 
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);

  const [loading, setLoading] = useState(true);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  // --- VERİ YÜKLEME ---
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // 1. Şablonları yükle
      const loadedTemplates = await fetchTemplates();
      setTemplates(loadedTemplates);

      // 2. Müşterileri yükle
      const { data: customerData } = await supabase.from('customers').select('id, kisa_isim');
      setCustomers(customerData || []);

      // 3. Sunumları Çek
      fetchPresentations();

    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      toast.error('Veriler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPresentations = async () => {
    const { data, error } = await supabase
      .from('training_presentations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Sunumlar çekilemedi:', error);
    } else {
      setPresentations(data || []);
    }
  };

  // --- CRUD İŞLEMLERİ ---

  const createNewPresentation = async (template: Template) => {
    // Şirket ayarlarını çek
    let defaultCompanyName = '';
    let defaultLogo = null;
    
    const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').single();
    if (settings) {
        defaultCompanyName = settings.company_name;
        defaultLogo = settings.logo_url;
    }

    const newPresentation: Presentation = {
      id: '', 
      name: template.name,
      slides: JSON.parse(JSON.stringify(template.slides)), // Deep copy
      company_name: defaultCompanyName,
      company_logo: defaultLogo,
      footer_text: `${defaultCompanyName} Eğitim Hizmetleri © ${new Date().getFullYear()}`,
    };
    
    setCurrentPresentation(newPresentation);
    setCurrentSlideIndex(0);
    setActiveView('editor');
    setActiveTab('slide');
  };

  const savePresentation = async () => {
    if (!currentPresentation) return;

    try {
      const payload = {
        name: currentPresentation.name,
        slides: currentPresentation.slides,
        company_name: currentPresentation.company_name,
        company_logo: currentPresentation.company_logo,
        footer_text: currentPresentation.footer_text,
        customer_id: currentPresentation.customer_id || null
      };

      let error;
      if (currentPresentation.id) {
        const { error: updateError } = await supabase
          .from('training_presentations')
          .update(payload)
          .eq('id', currentPresentation.id);
        error = updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('training_presentations')
          .insert(payload)
          .select()
          .single();
        
        if (data) setCurrentPresentation({ ...currentPresentation, id: data.id });
        error = insertError;
      }

      if (error) throw error;

      toast.success('Sunum başarıyla kaydedildi!');
      fetchPresentations();
    } catch (err: any) {
      toast.error('Kaydetme hatası: ' + err.message);
    }
  };

  const deletePresentation = async (id: string) => {
    if (!window.confirm('Bu sunumu silmek istediğinizden emin misiniz?')) return;
    
    const { error } = await supabase.from('training_presentations').delete().eq('id', id);
    if (error) {
      toast.error('Silinemedi.');
    } else {
      toast.success('Sunum silindi.');
      fetchPresentations();
    }
  };

  // --- SLAYT DÜZENLEME FONKSİYONLARI ---

  const updateSlideContent = (key: keyof SlideContent, value: any) => {
    if (!currentPresentation) return;
    
    const updatedSlides = [...currentPresentation.slides];
    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      content: {
        ...updatedSlides[currentSlideIndex].content,
        [key]: value
      }
    };

    setCurrentPresentation({ ...currentPresentation, slides: updatedSlides });
  };

  const handleSlideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          updateSlideContent('imageUrl', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompanyLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && currentPresentation) {
          setCurrentPresentation({
            ...currentPresentation,
            company_logo: event.target.result as string
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SERTİFİKA VERİTABANI KAYDI ---
  const createCertificatesInDB = async () => {
    if (!participants.trim()) return toast.error('Katılımcı listesi boş olamaz.');
    if (!trainerName) return toast.error('Eğitmen adı giriniz.');
    if (!currentPresentation?.customer_id) return toast.error('Bu sunum bir müşteriye atanmamış. Lütfen düzenleme modundan müşteri seçin.');

    setIsGeneratingCert(true);
    const names = participants.split('\n').filter(n => n.trim() !== '');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const records = names.map((name) => ({
        customer_id: currentPresentation.customer_id,
        certificate_number: `CERT-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 1000)}`, 
        participant_name: name.trim(),
        training_date: trainingDate,
        training_title: currentPresentation.name, 
        instructor_name: trainerName,
        instructor_title: trainerTitle,
        created_by: user?.id
      }));

      const { error } = await supabase.from('certificates').insert(records);

      if (error) throw error;

      toast.success(`${names.length} adet sertifika kaydı başarıyla oluşturuldu!`);
      setShowCertModal(false);
      
      if(window.confirm("Sertifikalar oluşturuldu. Sertifikalar sayfasına gitmek ister misiniz?")) {
          navigate('/sertifikalar');
      }

    } catch (error: any) {
      console.error(error);
      toast.error('Sertifikalar veritabanına kaydedilirken hata oluştu: ' + error.message);
    } finally {
      setIsGeneratingCert(false);
    }
  };

  // --- SLAYT RENDER (GÜNCELLENMİŞ FONT BOYUTLARI) ---
  const renderSlide = (slide: Slide) => {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 md:p-16 bg-white relative overflow-hidden select-none">
        {/* Logo */}
        {currentPresentation?.company_logo && (
          <img src={currentPresentation.company_logo} className="absolute top-6 right-6 h-10 md:h-14 object-contain opacity-90" alt="Logo" />
        )}
        
        {/* Title Slide */}
        {slide.type === 'title' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-800 mb-6 leading-tight max-w-4xl mx-auto">
                {slide.content.title}
            </h1>
            <div className="h-1 w-24 bg-green-500 mx-auto mb-6"></div>
            <h2 className="text-xl md:text-2xl text-gray-600 font-medium max-w-3xl mx-auto">
                {slide.content.subtitle}
            </h2>
          </div>
        )}
        
        {/* Content Slide */}
        {slide.type === 'content' && (
          <div className="text-left w-full max-w-5xl h-full flex flex-col pt-4">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 border-b-2 border-gray-100 pb-3">
                {slide.content.title}
            </h2>
            <div className="flex gap-8 h-full">
                <ul className="space-y-3 flex-1 overflow-y-auto pr-2">
                {slide.content.bullets?.map((bullet: string, idx: number) => (
                    <li key={idx} className="text-lg md:text-xl text-gray-700 flex items-start">
                    <span className="text-green-600 mr-3 mt-1.5 text-sm">●</span> 
                    <span>{bullet}</span>
                    </li>
                ))}
                </ul>
                {/* Opsiyonel Görsel Alanı */}
                {slide.content.imageUrl && (
                    <div className="w-1/3 flex items-center justify-center">
                        <img src={slide.content.imageUrl} className="rounded-lg shadow-lg object-cover max-h-[400px]" alt="Content" />
                    </div>
                )}
            </div>
          </div>
        )}

        {/* Two Column Slide */}
        {slide.type === 'two-column' && (
            <div className="text-left w-full max-w-6xl h-full flex flex-col pt-4">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8 border-b-2 border-gray-100 pb-3">
                    {slide.content.title}
                </h2>
                <div className="grid grid-cols-2 gap-12 h-full">
                    <div>
                        <h3 className="text-xl font-bold text-green-700 mb-4">{slide.content.leftTitle}</h3>
                        <ul className="space-y-2">
                            {slide.content.leftContent?.map((item, idx) => (
                                <li key={idx} className="text-base md:text-lg text-gray-600 flex items-start">
                                    <Check size={16} className="text-green-500 mr-2 mt-1.5"/> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-blue-700 mb-4">{slide.content.rightTitle}</h3>
                         <ul className="space-y-2">
                            {slide.content.rightContent?.map((item, idx) => (
                                <li key={idx} className="text-base md:text-lg text-gray-600 flex items-start">
                                    <Check size={16} className="text-blue-500 mr-2 mt-1.5"/> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        )}

        {/* Image Slide */}
        {slide.type === 'image' && (
             <div className="w-full h-full flex flex-col items-center justify-center">
                 {slide.content.title && <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">{slide.content.title}</h2>}
                 {slide.content.imageUrl ? (
                     <img src={slide.content.imageUrl} className="max-h-[70%] max-w-[90%] object-contain shadow-2xl rounded-lg border border-gray-200" alt="Slide" />
                 ) : (
                     <div className="h-64 w-full flex items-center justify-center bg-gray-100 rounded border-2 border-dashed border-gray-300 text-gray-400">
                         Görsel Yok
                     </div>
                 )}
                 {slide.content.caption && <p className="mt-4 text-gray-500 italic text-lg">{slide.content.caption}</p>}
             </div>
        )}

        {/* Thank You Slide */}
        {slide.type === 'thank-you' && (
             <div className="flex flex-col items-center justify-center h-full">
                 <Award className="w-24 h-24 text-yellow-500 mb-6 animate-bounce" />
                 <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">{slide.content.title}</h1>
                 <h2 className="text-xl md:text-2xl text-gray-500">{slide.content.subtitle}</h2>
                 
                 <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-100">
                     <p className="font-bold text-gray-800 text-lg">{currentPresentation?.company_name}</p>
                     <p className="text-sm text-gray-500">Eğitim Birimi</p>
                 </div>
             </div>
        )}
      </div>
    );
  };

  // --- KONTROLLER ---
  const nextSlide = () => {
    if (!currentPresentation) return;
    if (currentSlideIndex < currentPresentation.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      fullscreenRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gray-50">
      
      {/* 1. LİSTE GÖRÜNÜMÜ */}
      {activeView === 'list' && (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Presentation size={32} className="text-green-600"/> Eğitim & Sunum Modülü
            </h1>
            <div className="flex gap-2">
               {templates.slice(0,2).map(t => (
                   <button key={t.id} onClick={() => createNewPresentation(t)} className="bg-white border border-gray-300 px-3 py-2 rounded hover:bg-gray-50 text-sm">
                       + {t.name}
                   </button>
               ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {presentations.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden group">
                <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                    {p.company_logo ? (
                        <img src={p.company_logo} className="h-16 object-contain bg-white p-2 rounded" alt="logo" />
                    ) : (
                        <Presentation className="text-white w-12 h-12 opacity-50" />
                    )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">{p.name}</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    {p.company_name || 'Şirket Belirtilmemiş'} • {new Date(p.created_at || '').toLocaleDateString('tr-TR')}
                  </p>
                  
                  <div className="flex gap-2 mt-4">
                    <button 
                      onClick={() => { setCurrentPresentation(p); setActiveView('preview'); setCurrentSlideIndex(0); }}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <Presentation size={16} /> Sun
                    </button>
                    <button 
                      onClick={() => { setCurrentPresentation(p); setActiveView('editor'); }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-1"
                    >
                      <Edit size={16} /> Düzenle
                    </button>
                    <button 
                      onClick={() => deletePresentation(p.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <button onClick={() => { if(templates[0]) createNewPresentation(templates[0]) }} className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center h-full min-h-[250px] hover:border-green-500 hover:bg-green-50 transition-all group">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-green-100 mb-3">
                    <Plus className="text-gray-400 group-hover:text-green-600" />
                </div>
                <span className="text-gray-500 font-medium group-hover:text-green-700">Yeni Sunum Oluştur</span>
            </button>
          </div>
        </>
      )}

      {/* 2. EDİTÖR GÖRÜNÜMÜ */}
      {activeView === 'editor' && currentPresentation && (
        <div className="max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setActiveView('list')} className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="mr-2" size={20} /> Listeye Dön
            </button>
            <div className="flex gap-3">
                <button onClick={savePresentation} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Save size={18} /> Kaydet
                </button>
                <button onClick={() => setActiveView('preview')} className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                    <Presentation size={18} /> Önizle / Sun
                </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 h-[85vh]">
            
            {/* SOL PANEL: AYARLAR ve SLAYT LİSTESİ */}
            <div className="col-span-3 bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden">
                {/* Tablar */}
                <div className="flex border-b">
                    <button 
                        onClick={() => setActiveTab('slide')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'slide' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Edit size={16} className="inline mr-1" /> Slayt Düzenle
                    </button>
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-3 text-sm font-medium ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Settings size={16} className="inline mr-1" /> Genel Ayarlar
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {/* SLAYT DÜZENLEME TABI */}
                    {activeTab === 'slide' && currentPresentation.slides[currentSlideIndex] && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 mb-2 border border-blue-100">
                                Şu an <strong>{currentSlideIndex + 1}. Slayt</strong> düzenleniyor.
                            </div>

                            {/* Başlık Düzenleme */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Slayt Başlığı</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={currentPresentation.slides[currentSlideIndex].content.title || ''}
                                    onChange={(e) => updateSlideContent('title', e.target.value)}
                                />
                            </div>

                            {/* Alt Başlık (Varsa) */}
                            {(currentPresentation.slides[currentSlideIndex].type === 'title' || currentPresentation.slides[currentSlideIndex].type === 'thank-you') && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Alt Başlık</label>
                                    <input 
                                        type="text" 
                                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={currentPresentation.slides[currentSlideIndex].content.subtitle || ''}
                                        onChange={(e) => updateSlideContent('subtitle', e.target.value)}
                                    />
                                </div>
                            )}

                            {/* İçerik Maddeleri (Content Slayt İçin) */}
                            {currentPresentation.slides[currentSlideIndex].type === 'content' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Maddeler (Her satır yeni madde)</label>
                                    <textarea 
                                        rows={6}
                                        className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        value={currentPresentation.slides[currentSlideIndex].content.bullets?.join('\n') || ''}
                                        onChange={(e) => updateSlideContent('bullets', e.target.value.split('\n'))}
                                    />
                                </div>
                            )}

                            {/* Görsel Yükleme */}
                            <div className="border-t pt-3">
                                <label className="block text-xs font-bold text-gray-600 mb-2">Slayt Görseli</label>
                                <div className="flex items-center gap-2">
                                    <label className="flex-1 bg-white border border-dashed border-gray-300 rounded p-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-colors">
                                        <ImageIcon size={14} className="mr-2"/> Görsel Seç/Değiştir
                                        <input type="file" className="hidden" onChange={handleSlideImageUpload} accept="image/*" />
                                    </label>
                                    {currentPresentation.slides[currentSlideIndex].content.imageUrl && (
                                        <button 
                                            onClick={() => updateSlideContent('imageUrl', '')}
                                            className="text-red-500 p-2 hover:bg-red-50 rounded"
                                            title="Görseli Kaldır"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {/* GENEL AYARLAR TABI */}
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Sunum Adı</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded p-2 text-sm"
                                    value={currentPresentation.name}
                                    onChange={(e) => setCurrentPresentation({...currentPresentation, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Firma Adı (Slaytlarda)</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded p-2 text-sm"
                                    value={currentPresentation.company_name}
                                    onChange={(e) => setCurrentPresentation({...currentPresentation, company_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Firma Logosu</label>
                                <div className="flex items-center gap-2">
                                    <label className="flex-1 bg-white border rounded p-2 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-center text-gray-500">
                                        <Upload size={14} className="mr-2"/> Logo Değiştir
                                        <input type="file" className="hidden" onChange={handleCompanyLogoUpload} accept="image/*" />
                                    </label>
                                    {currentPresentation.company_logo && (
                                        <img src={currentPresentation.company_logo} className="h-8 w-8 object-contain border rounded bg-white" />
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Müşteri Ata</label>
                                <select 
                                    className="w-full border rounded p-2 text-sm bg-white"
                                    value={currentPresentation.customer_id || ''}
                                    onChange={(e) => setCurrentPresentation({...currentPresentation, customer_id: e.target.value})}
                                >
                                    <option value="">Seçiniz...</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.kisa_isim}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Slayt Listesi (Alt Kısım) */}
                <div className="border-t bg-gray-50 flex-1 overflow-y-auto p-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">Slayt Sıralaması</h4>
                    <div className="space-y-1">
                        {currentPresentation.slides.map((slide, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => { setCurrentSlideIndex(idx); setActiveTab('slide'); }}
                                className={`p-2 rounded cursor-pointer border flex items-center gap-2 transition-colors text-xs ${
                                    currentSlideIndex === idx ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-200' : 'hover:bg-white border-transparent'
                                }`}
                            >
                                <span className="font-bold text-gray-400 w-4">{idx + 1}.</span>
                                <span className="truncate flex-1">{slide.content.title || 'Başlıksız'}</span>
                                {slide.content.imageUrl && <ImageIcon size={12} className="text-gray-400"/>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ORTA PANEL: CANLI ÖNİZLEME */}
            <div className="col-span-9 bg-gray-100 rounded-xl flex flex-col justify-center p-8 shadow-inner border relative">
                <div className="aspect-video bg-white rounded-lg shadow-2xl overflow-hidden relative w-full h-full max-h-[80vh]">
                    {currentPresentation.slides[currentSlideIndex] && renderSlide(currentPresentation.slides[currentSlideIndex])}
                    
                    <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur p-2 text-center text-xs text-gray-400 border-t">
                        {currentPresentation.footer_text} | Slayt {currentSlideIndex + 1}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUNUM MODU */}
      {activeView === 'preview' && currentPresentation && (
        <div ref={fullscreenRef} className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Slayt */}
            <div className="flex-1 bg-white relative flex items-center justify-center">
                {currentPresentation.slides[currentSlideIndex] && renderSlide(currentPresentation.slides[currentSlideIndex])}
                
                {/* Alt Bilgi */}
                <div className="absolute bottom-0 w-full p-4 flex justify-between text-gray-500 text-sm bg-white/90 backdrop-blur-sm border-t">
                    <span>{currentPresentation.company_name}</span>
                    <span>{currentSlideIndex + 1} / {currentPresentation.slides.length}</span>
                </div>
            </div>

            {/* Kontrol Barı */}
            <div className="h-16 bg-gray-900 flex items-center justify-between px-6 text-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveView('list')} className="hover:text-gray-300 text-sm">Çıkış</button>
                    <span className="text-gray-500">|</span>
                    <button onClick={toggleFullscreen} className="hover:text-gray-300" title="Tam Ekran"><Maximize size={20}/></button>
                </div>

                <div className="flex items-center gap-6">
                    <button onClick={prevSlide} disabled={currentSlideIndex===0} className="disabled:opacity-30 hover:scale-110 transition-transform"><ArrowLeft size={32}/></button>
                    <span className="font-mono">{currentSlideIndex + 1}</span>
                    <button onClick={nextSlide} disabled={currentSlideIndex === currentPresentation.slides.length - 1} className="disabled:opacity-30 hover:scale-110 transition-transform"><ArrowRight size={32}/></button>
                </div>

                <div>
                    {/* Son Slaytta Sertifika Butonu */}
                    {currentSlideIndex === currentPresentation.slides.length - 1 && (
                        <button 
                            onClick={() => setShowCertModal(true)}
                            className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold hover:bg-yellow-400 flex items-center gap-2 animate-pulse"
                        >
                            <Award size={18} /> Sertifika İşlemleri
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- SERTİFİKA MODALI (DB KAYIT) --- */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                        <Award className="text-yellow-500" /> Sertifika Kaydı Oluştur
                    </h2>
                    <button onClick={() => setShowCertModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                
                <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm mb-4">
                    <p>Buraya girilen her isim için "Sertifikalar" modülünde otomatik bir kayıt oluşturulacaktır.</p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Eğitmen Adı</label>
                          <input type="text" value={trainerName} onChange={e => setTrainerName(e.target.value)} className="w-full border rounded p-2" placeholder="Ad Soyad" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Eğitmen Ünvanı</label>
                          <input type="text" value={trainerTitle} onChange={e => setTrainerTitle(e.target.value)} className="w-full border rounded p-2" placeholder="Örn: Ziraat Müh." />
                      </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Eğitim Tarihi</label>
                        <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} className="w-full border rounded p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Katılımcı Listesi (Her satıra bir isim)
                        </label>
                        <textarea 
                            value={participants} 
                            onChange={e => setParticipants(e.target.value)}
                            rows={6}
                            className="w-full border rounded p-2 font-mono text-sm"
                            placeholder="Ali Veli&#10;Ayşe Fatma&#10;Mehmet Demir"
                        />
                        <p className="text-xs text-right text-gray-400 mt-1">{participants.split('\n').filter(x => x.trim()).length} Kişi</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setShowCertModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">İptal</button>
                    <button 
                        onClick={createCertificatesInDB}
                        disabled={isGeneratingCert}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
                    >
                        {isGeneratingCert ? 'Kaydediliyor...' : 'Kaydet ve Oluştur'}
                        {!isGeneratingCert && <FileText size={18} />}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default TrainingPresentationPage;