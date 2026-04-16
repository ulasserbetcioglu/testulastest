import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Brain, RefreshCw, Download, X, MapPin, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

// --- Types ---
interface Branch {
  id: string;
  sube_adi: string;
  sehir?: string;
  latitude?: number;
  longitude?: number;
}

interface CompanySettings {
  company_name?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface Props {
  customerId: string;
  customerName: string;
  onClose: () => void;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Helper: Loads an image URL and returns a base64 data URL
const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};

const CustomerAiAnalysisModal: React.FC<Props> = ({ customerId, customerName, onClose }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({});

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchBranches(), fetchCompanySettings()]);
      setLoading(false);
    };
    init();
  }, [customerId]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from('branches')
      .select('id, sube_adi, sehir, latitude, longitude')
      .eq('customer_id', customerId);
    setBranches(data || []);
  };

  const fetchCompanySettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('company_name, logo_url, phone, email, address')
      .single();
    if (data) setCompanySettings(data);
  };

  const runAnalysis = async () => {
    if (!GEMINI_API_KEY) {
      toast.error('Gemini API Key bulunamadı.');
      return;
    }
    setAnalyzing(true);
    setAnalysis('');
    try {
      // Fetch recent visits for these branches
      const branchIds = branches.map(b => b.id);
      const { data: visits } = await supabase
        .from('visits')
        .select('visit_date, pest_types, branch_id')
        .in('branch_id', branchIds)
        .gte('visit_date', subMonths(new Date(), 12).toISOString());

      // Summarize pest activity per branch
      const branchActivity: Record<string, { pests: Record<string, number>; visitCount: number }> = {};
      visits?.forEach(v => {
        if (!branchActivity[v.branch_id]) branchActivity[v.branch_id] = { pests: {}, visitCount: 0 };
        branchActivity[v.branch_id].visitCount++;
        v.pest_types?.forEach((p: string) => {
          branchActivity[v.branch_id].pests[p] = (branchActivity[v.branch_id].pests[p] || 0) + 1;
        });
      });

      const branchSummaries = branches.map(b => {
        const act = branchActivity[b.id] || { pests: {}, visitCount: 0 };
        const topPests = Object.entries(act.pests).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p);
        return {
          sube: b.sube_adi,
          sehir: b.sehir || 'Belirtilmemiş',
          konum: b.latitude ? `${b.latitude.toFixed(4)}, ${b.longitude?.toFixed(4)}` : 'Kayıtsız',
          ziyaret_sayisi: act.visitCount,
          en_yogun_zararlilar: topPests.join(', ') || 'Tespit edilmedi'
        };
      });

      const prompt = `
        Müşteri: ${customerName}
        
        Bu müşterinin şube listesi ve son 12 aydaki haşere kontrol verilerine dayanarak kapsamlı bir risk analizi yap.
        
        ŞUBE VERİLERİ:
        ${JSON.stringify(branchSummaries, null, 2)}
        
        LÜTFEN ANALİZ ET:
        1. Her şubenin lokasyonu (koordinat ve şehir) bazında iklim ve çevresel risk faktörlerini,
        2. En çok görülen zararlı türlerini ve sebeplerine dair yorumları,
        3. Gelecek 3 ay için öngörülen risk artışı aylarını (Türkiye iklim verilerine göre),
        4. Şube bazlı öncelik sıralaması ve önerilen ziyaret sıklığı değişikliklerini,
        5. Genel müşteri için stratejik eylem planını.
        
        Yanıtı Türkçe, profesyonel ve net maddeler halinde ver (başlık: içerik formatında).
      `;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
          })
        }
      );

      if (response.status === 429) throw new Error('API isteği sınırlandırıldı. Lütfen bekleyin.');
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setAnalysis(text);
        toast.success('AI Analizi tamamlandı!');
      } else {
        throw new Error('Yanıt üretilemedi: ' + JSON.stringify(result.error || result));
      }
    } catch (err: any) {
      toast.error('Analiz hatası: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadPDF = async () => {
    if (!analysis) {
      toast.error('Önce analiz çalıştırın.');
      return;
    }
    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 18;
      const contentW = pageW - margin * 2;
      const today = format(new Date(), 'd MMMM yyyy', { locale: tr });
      const companyName = companySettings.company_name || 'İlaçlamatik';

      // Pre-load logo if available
      let logoBase64: string | null = null;
      if (companySettings.logo_url) {
        try {
          logoBase64 = await loadImageAsBase64(companySettings.logo_url);
        } catch (_) {}
      }

      // ---- Helper: Draw Page Header + Footer ----
      const drawHeaderFooter = (pageNum: number, totalPages: number) => {
        // --- Header top accent ---
        doc.setFillColor(37, 99, 235); // Blue-600
        doc.rect(0, 0, pageW, 16, 'F'); // Made thicker for logo

        // Header Company Info & Logo
        if (logoBase64) {
          try {
            // Draw logo and place name next to it
            doc.addImage(logoBase64, 'PNG', margin, 2.5, 28, 11);
            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(companyName, margin + 32, 10);
          } catch (_) {
            doc.setFontSize(10);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.text(companyName, margin, 10);
          }
        } else {
          doc.setFontSize(10);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.text(companyName, margin, 10);
        }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('AI Risk Analiz Raporu', pageW - margin, 10, { align: 'right' });

        // --- Footer ---
        doc.setFillColor(248, 250, 252); // Gray-50
        doc.rect(0, pageH - 18, pageW, 18, 'F'); // Make footer taller for extra lines
        doc.setDrawColor(229, 231, 235);
        doc.line(margin, pageH - 18, pageW - margin, pageH - 18);

        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        
        // 1st Line in Footer - Company Name and Email/Phone if address isn't long
        doc.setFont('helvetica', 'bold');
        doc.text(companyName, margin, pageH - 11);
        doc.setFont('helvetica', 'normal');

        // Contacts line
        let cx = margin;
        if (companySettings.phone) {
          doc.text(`Tel: ${companySettings.phone}`, cx, pageH - 5);
          cx += doc.getTextWidth(`Tel: ${companySettings.phone}`) + 5;
        }
        if (companySettings.email) {
          if (cx > margin) {
            doc.text('|', cx, pageH - 5);
            cx += 3;
          }
          doc.text(`E-posta: ${companySettings.email}`, cx, pageH - 5);
        }

        if (companySettings.address) {
          const adrWidthStr = `Adres: ${companySettings.address}`;
          const safeAdr = doc.splitTextToSize(adrWidthStr, pageW - margin * 2 - 40);
          doc.text(safeAdr[0], margin + doc.getTextWidth(companyName) + 6, pageH - 11); // Adress beside company name
        }

        doc.text(`Sayfa ${pageNum} / ${totalPages}`, pageW - margin, pageH - 8, { align: 'right' });
      };

      // ---- Split analysis into lines ----
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(analysis.replace(/\*\*/g, '').replace(/\*/g, '• '), contentW);
      
      // Calculate total pages
      const lineHeight = 5.5;
      const usableH = pageH - 12 - 14 - 50; // header + footer + cover section
      const linesPerFirstPage = Math.floor((usableH - 30) / lineHeight);
      const linesPerPage = Math.floor((pageH - 12 - 14 - 20) / lineHeight);
      const firstPageLines = lines.slice(0, linesPerFirstPage);
      const remainingLines = lines.slice(linesPerFirstPage);
      const extraPages = Math.ceil(remainingLines.length / linesPerPage);
      const totalPages = 1 + extraPages;

      // ---- PAGE 1 ----
      drawHeaderFooter(1, totalPages);

      // Cover section
      doc.setFillColor(239, 246, 255); // Blue-50
      doc.roundedRect(margin, 16, contentW, 38, 3, 3, 'F');

      // Cover Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138); // Blue-900
      doc.text('AI Risk Analiz Raporu', margin + 4, 28);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Müşteri: ${customerName}`, margin + 4, 34);
      doc.text(`Oluşturma Tarihi: ${today}`, margin + 4, 40);
      doc.text(`Şube Sayısı: ${branches.length}`, margin + 4, 46);
      doc.text(`Analiz: Gemini AI (Lokasyon + Tarihsel Veri)`, pageW - margin - 4, 46, { align: 'right' });

      // Branch chips row
      let chipX = margin;
      const chipY = 58;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      branches.slice(0, 8).forEach(b => {
        const chipW = doc.getTextWidth(b.sube_adi) + 6;
        doc.setFillColor(219, 234, 254); // Blue-100
        doc.setDrawColor(147, 197, 253); // Blue-300
        doc.roundedRect(chipX, chipY - 3.5, chipW, 6, 1.5, 1.5, 'FD');
        doc.setTextColor(30, 64, 175);
        doc.text(b.sube_adi, chipX + 3, chipY + 1);
        chipX += chipW + 3;
        if (chipX > pageW - margin - 30) {
          chipX = margin;
        }
      });
      if (branches.length > 8) {
        doc.setTextColor(100, 116, 139);
        doc.text(`+${branches.length - 8} daha`, chipX + 2, chipY + 1);
      }

      // Analysis content
      let cursorY = 70;
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59); // Slate-900
      doc.text('Gemini AI Analiz Sonuçları', margin, cursorY);
      cursorY += 5;
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, cursorY, margin + 80, cursorY);
      cursorY += 5;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      firstPageLines.forEach((line: string) => {
        if (line.startsWith('•') || line.match(/^\d+\./)) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
        }
        doc.text(line, margin, cursorY);
        cursorY += lineHeight;
      });

      // ---- EXTRA PAGES ----
      for (let i = 0; i < extraPages; i++) {
        doc.addPage();
        const pageNum = i + 2;
        drawHeaderFooter(pageNum, totalPages);

        let pageCursorY = 20;
        const pageLines = remainingLines.slice(i * linesPerPage, (i + 1) * linesPerPage);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);

        pageLines.forEach((line: string) => {
          if (line.startsWith('•') || line.match(/^\d+\./)) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(51, 65, 85);
          }
          doc.text(line, margin, pageCursorY);
          pageCursorY += lineHeight;
        });
      }

      const filename = `AI_Risk_Analiz_${customerName.replace(/\s/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`;
      doc.save(filename);
      toast.success('PDF raporu indirildi!');
    } catch (err: any) {
      toast.error('PDF oluşturulamadı: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <Brain className="text-purple-600" size={18} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Gemini AI Risk Analizi</h2>
              <p className="text-xs text-gray-500">{customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400 gap-3">
              <RefreshCw className="animate-spin" size={20} />
              <span className="text-sm">Şube verileri yükleniyor...</span>
            </div>
          ) : (
            <>
              {/* Branches summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin size={12} /> Analiz Kapsamındaki Şubeler ({branches.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {branches.map(b => (
                    <span key={b.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium border border-blue-100">
                      {b.sube_adi}
                      {b.latitude && <span className="w-1.5 h-1.5 bg-green-400 rounded-full" title="Konum kayıtlı" />}
                    </span>
                  ))}
                </div>
              </div>

              {/* Analysis result */}
              {analysis ? (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Brain size={12} /> AI Analiz Sonucu
                  </p>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {analysis}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center text-center">
                  <Brain className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-500">Analiz henüz çalıştırılmadı</p>
                  <p className="text-xs text-gray-400 mt-1">
                    "{customerName}" için tüm şubelerin lokasyon, iklim ve zararlı verilerini analiz et.
                  </p>
                  {branches.some(b => !b.latitude) && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                      <AlertTriangle size={12} />
                      Bazı şubelerin koordinatı eksik, bu analiz hassasiyetini etkileyebilir.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Kapat
          </button>
          <div className="flex gap-2">
            {analysis && (
              <button
                onClick={downloadPDF}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all disabled:opacity-50"
              >
                {generating ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                {generating ? 'PDF Oluşturuluyor...' : 'PDF İndir'}
              </button>
            )}
            <button
              onClick={runAnalysis}
              disabled={analyzing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-all disabled:opacity-50 shadow-md"
            >
              {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} />}
              {analyzing ? 'Analiz Ediliyor...' : analysis ? 'Yenile' : 'AI Analizi Başlat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAiAnalysisModal;
