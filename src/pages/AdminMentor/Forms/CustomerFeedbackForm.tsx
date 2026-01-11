import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Save, Frown, Meh, Smile } from 'lucide-react';

const CustomerFeedbackForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Navigasyon parametrelerini güvenli şekilde alalım
  const { customerName, branchName } = location.state || { customerName: '', branchName: '' };

  const [contactPerson, setContactPerson] = useState('');
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [satisfaction, setSatisfaction] = useState<number | null>(null); // 1: Kötü, 2: Orta, 3: İyi
  const [type, setType] = useState<'complaint' | 'suggestion' | 'satisfaction'>('complaint');

  const handleSave = () => {
    if (!contactPerson || !details || !satisfaction) {
      alert("Eksik Bilgi: Lütfen kişi adı, detay ve memnuniyet durumunu giriniz.");
      return;
    }
    
    // API Kayıt işlemi burada yapılır
    alert("Geri Bildirim Kaydedildi: Müşteri görüşü başarıyla sisteme işlendi.");
    navigate(-1); // Geri dön
  };

  const renderSatisfactionIcon = (level: number) => {
    const isActive = satisfaction === level;
    
    let Icon = Meh;
    let activeBg = '';
    let inactiveColor = 'text-slate-400';
    let activeColor = 'text-white';
    
    if (level === 1) {
      Icon = Frown;
      activeBg = 'bg-red-500';
      if (!isActive) inactiveColor = 'text-red-500';
    } else if (level === 2) {
      Icon = Meh;
      activeBg = 'bg-amber-500';
      if (!isActive) inactiveColor = 'text-amber-500';
    } else {
      Icon = Smile;
      activeBg = 'bg-green-500';
      if (!isActive) inactiveColor = 'text-green-500';
    }

    return (
      <button 
        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all flex-1 ${isActive ? activeBg : 'bg-slate-50 border-slate-200'}`} 
        onClick={() => setSatisfaction(level)}
      >
        <Icon size={32} className={isActive ? activeColor : inactiveColor} />
        <span className={`mt-2 text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-500'}`}>
          {level === 1 ? 'Memnun Değil' : level === 2 ? 'Kısmen' : 'Memnun'}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Müşteri Görüş Formu</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-20">
        
        {/* Bildirim Tipi */}
        <div className="flex bg-slate-200 p-1 rounded-xl mb-6">
          {[
            { key: 'complaint', label: 'Şikayet' },
            { key: 'suggestion', label: 'Öneri' },
            { key: 'satisfaction', label: 'Memnuniyet' }
          ].map((item) => (
            <button 
              key={item.key}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                type === item.key 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              } ${
                type === item.key && item.key === 'complaint' ? 'text-red-600' : ''
              }`}
              onClick={() => setType(item.key as any)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Görüşü Bildiren Kişi */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Görüşü Bildiren Yetkili</label>
          <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <User size={18} className="text-slate-400" />
            <input 
              type="text"
              className="w-full p-3 outline-none text-slate-900 placeholder:text-slate-400 bg-transparent" 
              placeholder="Ad Soyad" 
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </div>
        </div>

        {/* Konu Başlığı */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Konu Başlığı</label>
          <input 
            type="text"
            className="w-full p-3 bg-white border border-slate-300 rounded-xl outline-none text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
            placeholder="Örn: Geçen hafta yapılan uygulama hk." 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>

        {/* Memnuniyet Düzeyi */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Genel Memnuniyet Durumu</label>
          <div className="flex gap-3">
            {renderSatisfactionIcon(1)}
            {renderSatisfactionIcon(2)}
            {renderSatisfactionIcon(3)}
          </div>
        </div>

        {/* Açıklama */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Detaylı Açıklama</label>
          <textarea 
            className="w-full p-3 min-h-[120px] bg-white border border-slate-300 rounded-xl outline-none text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y transition-all" 
            placeholder="Müşterinin ilettiği mesajı detaylıca yazınız..." 
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        {/* Kaydet Butonu */}
        <button 
          onClick={handleSave}
          className="w-full flex items-center justify-center p-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
        >
          <Save size={20} className="mr-2" />
          Formu Kaydet
        </button>

      </div>
    </div>
  );
};

export default CustomerFeedbackForm;