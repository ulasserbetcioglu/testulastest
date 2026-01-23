import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Presentation, Plus, Edit, Trash2, Save, ArrowLeft, ArrowRight, 
  Maximize, Minimize, Upload, Check, X, Award, FileText, Image as ImageIcon, 
  Settings
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
  
  // Varsayılan Şirket Ayarları
  const [defaultCompanySettings, setDefaultCompanySettings] = useState<{name: string, logo: string | null}>({ name: '', logo: null });

  // Editör State
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'general' | 'slide'>('slide');
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

      // 3. Şirket Ayarlarını Çek (Otomatik Doldurma İçin)
      const { data: settings } = await supabase.from('company_settings').select('company_name, logo_url').single();
      if (settings) {
          setDefaultCompanySettings({
              name: settings.company_name || '',
              logo: settings.logo_url || null
          });
      }

      // 4. Sunumları Çek
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

  const createNewPresentation = (template: Template) => {
    // Şirket bilgilerini ayarlardan otomatik al
    const newPresentation: Presentation = {
      id: '', 
      name: template.name,
      slides: JSON.parse(JSON.stringify(template.slides)), // Derin kopya (Referans sorununu çözer)
      company_name: defaultCompanySettings.name,
      company_logo: defaultCompanySettings.logo,
      footer_text: `${defaultCompanySettings.name} Eğitim Hizmetleri © ${new Date().getFullYear()}`,
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
    const currentContent = updatedSlides[currentSlideIndex].content;

    updatedSlides[currentSlideIndex] = {
      ...updatedSlides[currentSlideIndex],
      content: {
        ...currentContent,
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
            // Görseli Base64 olarak kaydet ve state'i güncelle
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

  // --- SLAYT RENDER (KÜÇÜLTÜLMÜŞ FONTLAR & DÜZELTİLMİŞ GÖRSELLER) ---
  const renderSlide = (slide: Slide) => {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 bg-white relative overflow-hidden select-none">
        {/* Logo */}
        {currentPresentation?.company_logo && (
          <img src={currentPresentation.company_logo} className="absolute top-4 right-4 h-10 object-contain opacity-90" alt="Logo" />
        )}
        
        {/* Title Slide */}
        {slide.type === 'title' && (
          <div className="animate-in fade-in zoom-in duration-500 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-4 leading-tight">
                {slide.content.title}
            </h1>
            <div className="h-1 w-16 bg-green-500 mx-auto mb-4"></div>
            <h2 className="text-xl text-gray-600 font-medium">
                {slide.content.subtitle}
            </h2>
            {/* Başlık Slaydında Görsel Varsa Göster */}
            {slide.content.imageUrl && (
                <div className="mt-6 flex justify-center">
                    <img src={slide.content.imageUrl} className="rounded shadow-md object-contain max-h-[250px]" alt="Title Visual" />
                </div>
            )}
          </div>
        )}
        
        {/* Content Slide */}
        {slide.type === 'content' && (
          <div className="text-left w-full max-w-5xl h-full flex flex-col pt-2">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">
                {slide.content.title}
            </h2>
            <div className="flex gap-6 h-full items-start">
                <ul className="space-y-2 flex-1 overflow-y-auto pr-2">
                    {slide.content.bullets?.map((bullet: string, idx: number) => (
                        <li key={idx} className="text-base text-gray-700 flex items-start">
                        <span className="text-green-600 mr-2 mt-1.5 text-xs">●</span> 
                        <span>{bullet}</span>
                        </li>
                    ))}
                </ul>
                {/* Opsiyonel Görsel Alanı - Content Slide */}
                {slide.content.imageUrl && (
                    <div className="w-1/3 flex items-start justify-center">
                        <img src={slide.content.imageUrl} className="rounded-lg shadow border object-contain max-h-[350px] w-full" alt="Content Visual" />
                    </div>
                )}
            </div>
          </div>
        )}

        {/* Two Column Slide */}
        {slide.type === 'two-column' && (
            <div className="text-left w-full max-w-6xl h-full flex flex-col pt-2">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">
                    {slide.content.title}
                </h2>
                <div className="grid grid-cols-2 gap-8 h-full">
                    <div>
                        <h3 className="text-lg font-bold text-green-700 mb-3">{slide.content.leftTitle}</h3>
                        <ul className="space-y-1.5">
                            {slide.content.leftContent?.map((item, idx) => (
                                <li key={idx} className="text-sm text-gray-600 flex items-start">
                                    <Check size={14} className="text-green-500 mr-2 mt-0.5"/> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-blue-700 mb-3">{slide.content.rightTitle}</h3>
                         <ul className="space-y-1.5">
                            {slide.content.rightContent?.map((item, idx) => (
                                <li key={idx} className="text-sm text-gray-600 flex items-start">
                                    <Check size={14} className="text-blue-500 mr-2 mt-0.5"/> {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                 {/* Opsiyonel Görsel - İki sütun altında */}
                 {slide.content.imageUrl && (
                    <div className="mt-4 flex justify-center h-1/3">
                         <img src={slide.content.imageUrl} className="rounded shadow object-contain h-full" alt="Column Visual" />
                    </div>
                )}
            </div>
        )}

        {/* Image Slide */}
        {slide.type === 'image' && (
             <div className="w-full h-full flex flex-col items-center justify-center">
                 {slide.content.title && <h2 className="text-2xl font-bold mb-4 text-gray-800">{slide.content.title}</h2>}
                 {slide.content.imageUrl ? (
                     <img src={slide.content.imageUrl} className="max-h-[65%] max-w-full object-contain shadow-xl rounded border border-gray-200" alt="Slide" />
                 ) : (
                     <div className="h-64 w-full max-w-lg flex items-center justify-center bg-gray-100 rounded border-2 border-dashed border-gray-300 text-gray-400">
                         Görsel Seçilmedi
                     </div>
                 )}
                 {slide.content.caption && <p className="mt-3 text-gray-500 italic text-sm">{slide.content.caption}</p>}
             </div>
        )}

        {/* Thank You Slide */}
        {slide.type === 'thank-you' && (
             <div className="flex flex-col items-center justify-center h-full">
                 <Award className="w-16 h-16 text-yellow-500 mb-4 animate-bounce" />
                 <h1 className="text-3xl font-bold text-gray-900 mb-2">{slide.content.title}</h1>
                 <h2 className="text-lg text-gray-500">{slide.content.subtitle}</h2>
                 
                 <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100 min-w-[300px]">
                     <p className="font-bold text-gray-800">{currentPresentation?.company_name}</p>
                     <p className="text-xs text-gray-500">Eğitim Birimi</p>
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
                <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center relative">
                    {p.company_logo ? (
                        <img src={p.company_logo} className="h-full w-full object-cover opacity-20" alt="bg" />
                    ) : (
                        <Presentation className="text-white w-12 h-12 opacity-50" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-lg px-4 text-center">{p.name}</span>
                    </div>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-3 flex justify-between">
                    <span>{p.company_name || 'Genel'}</span>
                    <span>{new Date(p.created_at || '').toLocaleDateString('tr-TR')}</span>
                  </p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setCurrentPresentation(p); setActiveView('preview'); setCurrentSlideIndex(0); }}
                      className="flex-1 bg-green-600 text-white py-1.5 rounded text-xs font-medium hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <Presentation size={14} /> Sun
                    </button>
                    <button 
                      onClick={() => { setCurrentPresentation(p); setActiveView('editor'); setActiveTab('slide'); }}
                      className="flex-1 bg-gray-100 text-gray-700 py-1.5 rounded text-xs font-medium hover:bg-gray-200 flex items-center justify-center gap-1"
                    >
                      <Edit size={14} /> Düzenle
                    </button>
                    <button 
                      onClick={() => deletePresentation(p.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <button onClick={() => { if(templates[0]) createNewPresentation(templates[0]) }} className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center h-full min-h-[200px] hover:border-green-500 hover:bg-green-50 transition-all group">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-green-100 mb-2">
                    <Plus className="text-gray-400 group-hover:text-green-600" />
                </div>
                <span className="text-gray-500 text-sm font-medium group-hover:text-green-700">Yeni Sunum Oluştur</span>
            </button>
          </div>
        </>
      )}

      {/* 2. EDİTÖR GÖRÜNÜMÜ */}
      {activeView === 'editor' && currentPresentation && (
        <div className="max-w-[1600px] mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setActiveView('list')} className="flex items-center text-gray-600 hover:text-gray-900 text-sm">
                <ArrowLeft className="mr-1" size={16} /> Listeye Dön
            </button>
            <div className="flex gap-2">
                <button onClick={savePresentation} className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 flex items-center gap-1 text-sm">
                    <Save size={16} /> Kaydet
                </button>
                <button onClick={() => setActiveView('preview')} className="bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 flex items-center gap-1 text-sm">
                    <Presentation size={16} /> Önizle / Sun
                </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 h-[80vh]">
            
            {/* SOL PANEL: AYARLAR ve SLAYT LİSTESİ */}
            <div className="col-span-3 bg-white rounded-lg shadow-sm border flex flex-col overflow-hidden">
                {/* Tablar */}
                <div className="flex border-b">
                    <button 
                        onClick={() => setActiveTab('slide')}
                        className={`flex-1 py-2 text-xs font-medium ${activeTab === 'slide' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Edit size={14} className="inline mr-1" /> Slayt Düzenle
                    </button>
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-2 text-xs font-medium ${activeTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Settings size={14} className="inline mr-1" /> Genel Ayarlar
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {/* SLAYT DÜZENLEME TABI */}
                    {activeTab === 'slide' && currentPresentation.slides[currentSlideIndex] && (
                        <div className="space-y-3">
                            <div className="bg-blue-50 p-2 rounded text-[10px] text-blue-700 mb-2 border border-blue-100 flex justify-between">
                                <span><strong>{currentSlideIndex + 1}. Slayt</strong> ({currentPresentation.slides[currentSlideIndex].type})</span>
                            </div>

                            {/* Başlık Düzenleme */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Slayt Başlığı</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
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
                                        className="w-full border rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
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
                                        rows={8}
                                        className="w-full border rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                                        value={currentPresentation.slides[currentSlideIndex].content.bullets?.join('\n') || ''}
                                        onChange={(e) => updateSlideContent('bullets', e.target.value.split('\n'))}
                                    />
                                </div>
                            )}

                            {/* Görsel Yükleme (Tüm slayt tipleri için açtık) */}
                            <div className="border-t pt-3 mt-2">
                                <label className="block text-xs font-bold text-gray-600 mb-2">Slayt Görseli</label>
                                <div className="flex items-center gap-2">
                                    <label className="flex-1 bg-white border border-dashed border-gray-300 rounded p-1.5 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-center text-gray-500 transition-colors">
                                        <ImageIcon size={14} className="mr-2"/> Seç/Değiştir
                                        <input type="file" className="hidden" onChange={handleSlideImageUpload} accept="image/*" />
                                    </label>
                                    {currentPresentation.slides[currentSlideIndex].content.imageUrl && (
                                        <button 
                                            onClick={() => updateSlideContent('imageUrl', '')}
                                            className="text-red-500 p-1.5 hover:bg-red-50 rounded border border-red-100"
                                            title="Görseli Kaldır"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                {currentPresentation.slides[currentSlideIndex].content.imageUrl && (
                                    <div className="mt-2 text-[10px] text-green-600 flex items-center">
                                        <Check size={10} className="mr-1"/> Görsel Yüklendi
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                    {/* GENEL AYARLAR TABI */}
                    {activeTab === 'general' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Sunum Adı</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded p-1.5 text-xs"
                                    value={currentPresentation.name}
                                    onChange={(e) => setCurrentPresentation({...currentPresentation, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Firma Adı (Slaytlarda)</label>
                                <input 
                                    type="text" 
                                    className="w-full border rounded p-1.5 text-xs"
                                    value={currentPresentation.company_name}
                                    onChange={(e) => setCurrentPresentation({...currentPresentation, company_name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Firma Logosu</label>
                                <div className="flex items-center gap-2">
                                    <label className="flex-1 bg-white border rounded p-1.5 text-xs cursor-pointer hover:bg-gray-50 flex items-center justify-center text-gray-500">
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
                                    className="w-full border rounded p-1.5 text-xs bg-white"
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
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2 px-2">Slayt Sıralaması</h4>
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
            <div className="col-span-9 bg-gray-200 rounded-lg flex flex-col justify-center p-8 shadow-inner border border-gray-300 relative">
                <div className="aspect-video bg-white rounded shadow-2xl overflow-hidden relative w-full h-full max-h-[80vh]">
                    {currentPresentation.slides[currentSlideIndex] && renderSlide(currentPresentation.slides[currentSlideIndex])}
                    
                    <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur p-2 text-center text-[10px] text-gray-400 border-t">
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
            <div className="h-14 bg-gray-900 flex items-center justify-between px-6 text-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActiveView('list')} className="hover:text-gray-300 text-sm">Çıkış</button>
                    <span className="text-gray-500">|</span>
                    <button onClick={toggleFullscreen} className="hover:text-gray-300" title="Tam Ekran"><Maximize size={18}/></button>
                </div>

                <div className="flex items-center gap-6">
                    <button onClick={prevSlide} disabled={currentSlideIndex===0} className="disabled:opacity-30 hover:scale-110 transition-transform"><ArrowLeft size={24}/></button>
                    <span className="font-mono text-sm">{currentSlideIndex + 1}</span>
                    <button onClick={nextSlide} disabled={currentSlideIndex === currentPresentation.slides.length - 1} className="disabled:opacity-30 hover:scale-110 transition-transform"><ArrowRight size={24}/></button>
                </div>

                <div>
                    {/* Son Slaytta Sertifika Butonu */}
                    {currentSlideIndex === currentPresentation.slides.length - 1 && (
                        <button 
                            onClick={() => setShowCertModal(true)}
                            className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-sm font-bold hover:bg-yellow-400 flex items-center gap-2 animate-pulse"
                        >
                            <Award size={16} /> Sertifika
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- SERTİFİKA MODALI --- */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <Award className="text-yellow-500" /> Sertifika Kaydı Oluştur
                    </h2>
                    <button onClick={() => setShowCertModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
                </div>
                
                <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs mb-4">
                    <p>Girilen her isim için sertifika kaydı otomatik oluşturulacaktır.</p>
                </div>

                <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                          <label className="block font-medium text-gray-700 mb-1">Eğitmen Adı</label>
                          <input type="text" value={trainerName} onChange={e => setTrainerName(e.target.value)} className="w-full border rounded p-1.5" placeholder="Ad Soyad" />
                      </div>
                      <div>
                          <label className="block font-medium text-gray-700 mb-1">Ünvan</label>
                          <input type="text" value={trainerTitle} onChange={e => setTrainerTitle(e.target.value)} className="w-full border rounded p-1.5" placeholder="Örn: Ziraat Müh." />
                      </div>
                    </div>
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Tarih</label>
                        <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} className="w-full border rounded p-1.5" />
                    </div>
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">
                            Katılımcı Listesi
                        </label>
                        <textarea 
                            value={participants} 
                            onChange={e => setParticipants(e.target.value)}
                            rows={5}
                            className="w-full border rounded p-1.5 font-mono text-xs"
                            placeholder="Ali Veli&#10;Ayşe Fatma"
                        />
                        <p className="text-[10px] text-right text-gray-400 mt-1">{participants.split('\n').filter(x => x.trim()).length} Kişi</p>
                    </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={() => setShowCertModal(false)} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded border border-gray-300 text-sm">İptal</button>
                    <button 
                        onClick={createCertificatesInDB}
                        disabled={isGeneratingCert}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2 text-sm"
                    >
                        {isGeneratingCert ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default TrainingPresentationPage;