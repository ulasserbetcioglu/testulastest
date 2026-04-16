import React, { useState } from 'react';
import { Brain, X, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Slide } from '../../services/presentationService';

interface Props {
  onClose: () => void;
  onGenerate: (slides: Slide[]) => void;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const PresentationAiModal: React.FC<Props> = ({ onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSlides = async () => {
    if (!prompt.trim()) {
      toast.error('Lütfen bir konu veya açıklama girin.');
      return;
    }

    if (!GEMINI_API_KEY) {
      toast.error('Gemini API Key bulunamadı.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const systemPrompt = `
        Sen bir profesyonel eğitim sunumu hazırlayıcısısın. 
        Kullanıcının verdiği konuya göre 5-8 slaytlık profesyonel bir sunum taslağı oluşturmalısın.
        
        Slayt tipleri şunlar olabilir: 
        1. 'title': Başlık slaydı (title, subtitle içerir)
        2. 'content': İçerik slaydı (title, bullets içerir)
        3. 'two-column': İki sütunlu slayt (title, leftTitle, leftContent, rightTitle, rightContent içerir)
        4. 'thank-you': Teşekkür slaydı (title, subtitle içerir)
        
        Yanıtını SADECE geçerli bir JSON formatında (dizi olarak) ver. 
        JSON yapısı örneği:
        [
          { "type": "title", "content": { "title": "Giriş", "subtitle": "Alt Başlık" } },
          { "type": "content", "content": { "title": "Önemli Maddeler", "bullets": ["Madde 1", "Madde 2"] } },
          { "type": "two-column", "content": { "title": "Karşılaştırma", "leftTitle": "A", "leftContent": ["1"], "rightTitle": "B", "rightContent": ["2"] } },
          { "type": "thank-you", "content": { "title": "Teşekkürler", "subtitle": "Soru?" } }
        ]
        
        ÖNEMLİ: bullets, leftContent ve rightContent dizi (string[]) olmalıdır.
        JSON dışında hiçbir metin (açıklama, merhaba vs.) yazma. Sadece köşeli parantezle başlayan JSON dizisini döndür.
      `;

      const userMessage = `Konu: ${prompt}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ text: systemPrompt + "\n\n" + userMessage }] 
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API isteği başarısız oldu: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        console.error('AI Response Data:', data);
        throw new Error('AI geçerli bir yanıt üretemedi.');
      }

      // JSON'u daha güvenli bir şekilde ayıkla (Metin içindeki ilk '[' ve son ']' arasını al)
      let jsonStr = text.trim();
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
      } else {
          // Eğer bracketlar bulunamazsa, markdown temizliği yapıp dene
          jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      let generatedSlides;
      try {
          generatedSlides = JSON.parse(jsonStr);
      } catch (parseError) {
          console.error('JSON Parse Hatası:', jsonStr);
          throw new Error('Üretilen içerik geçerli bir formatta değil.');
      }

      if (Array.isArray(generatedSlides)) {
        const slidesWithIds = generatedSlides.map((s: any) => ({
          ...s,
          id: uuidv4()
        }));
        onGenerate(slidesWithIds);
        toast.success('Sunum başarıyla oluşturuldu!');
        onClose();
      } else {
        throw new Error('Geçersiz format üretildi.');
      }

    } catch (err: any) {
      console.error('AI Generation Error:', err);
      setError('Sunum oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      toast.error('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Sparkles className="text-purple-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI ile Sunum Hazırla</h2>
              <p className="text-xs text-gray-500">Konuyu söyleyin, slaytları biz hazırlayalım.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sunum Konusu veya Detaylı Açıklama</label>
            <textarea
              className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm focus:border-purple-500 focus:ring-0 outline-none transition-all min-h-[150px] resize-none"
              placeholder="Örn: Restoran mutfaklarında haşere kontrolü ve hijyen kuralları eğitimi..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg flex items-start gap-2 text-xs">
              <AlertCircle size={14} className="mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 text-blue-700 p-4 rounded-xl text-xs flex items-start gap-3">
            <Brain size={18} className="shrink-0" />
            <p className="leading-relaxed">
              <strong>Nasıl Çalışır?</strong> Girdiğiniz konuya göre AI; başlık, temel kategoriler, uygulama süreçleri ve özet içeren profesyonel bir slayt dizisi oluşturur. Oluşan sunumu daha sonra editörden düzenleyebilirsiniz.
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition-colors"
            disabled={loading}
          >
            İptal
          </button>
          <button
            onClick={generateSlides}
            disabled={loading || !prompt.trim()}
            className="px-8 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 shadow-lg shadow-purple-200 flex items-center gap-2 transition-all transform active:scale-95"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Hazırlanıyor...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Sunumu Oluştur
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PresentationAiModal;
