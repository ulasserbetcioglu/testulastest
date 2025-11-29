import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Scan, QrCode, Search, Save, CheckCircle, 
  AlertTriangle, MapPin, Box, History, X, Camera, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// TİPLER
interface Equipment {
  id: string;
  equipment_code: string;
  name: string;
  type: string;
  location: string;
  status: string;
  created_at: string;
}

const BarcodeTest: React.FC = () => {
  // STATE'LER
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannedData, setScannedData] = useState<Equipment | null>(null);
  const [view, setView] = useState<'idle' | 'found' | 'register'>('idle');
  const [recentScans, setRecentScans] = useState<string[]>([]);
  
  // KAMERA STATE
  const [showCamera, setShowCamera] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // YENİ KAYIT FORMU STATE
  const [newEqData, setNewEqData] = useState({
    name: '',
    type: 'Kemirgen İstasyonu',
    location: ''
  });

  // --- KAMERA YÖNETİMİ (Html5Qrcode - Pro Mode) ---
  useEffect(() => {
    let isMounted = true;

    if (showCamera) {
      setCameraLoading(true);
      
      const startScanner = async () => {
        // DOM elementinin hazır olması için kısa bir bekleme
        await new Promise(r => setTimeout(r, 300));
        
        if (!document.getElementById("reader")) {
          console.error("Reader element not found");
          if(isMounted) {
             setCameraLoading(false);
             setShowCamera(false);
          }
          return;
        }

        // Önceki scanner varsa temizle
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
          } catch (e) {
            // Hata yok sayılabilir
          }
        }

        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        try {
          await html5QrCode.start(
            { facingMode: "environment" }, // Arka kamera öncelikli
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
              formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128 ]
            },
            (decodedText) => {
              if (isMounted) handleScanSuccess(decodedText);
            },
            () => {} // Hata callback'i (Sessiz mod)
          );
        } catch (err) {
          console.error("Kamera başlatma hatası:", err);
          if (isMounted) {
            toast.error("Kamera başlatılamadı. İzinleri kontrol edin.");
            setShowCamera(false);
          }
        } finally {
          if (isMounted) setCameraLoading(false);
        }
      };

      startScanner();
    }

    // CLEANUP
    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(err => console.warn("Scanner stop error", err));
      }
    };
  }, [showCamera]);

  const handleScanSuccess = async (decodedText: string) => {
    // Okuma başarılı olduğunda kamerayı durdur
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) { console.error(e); }
    }
    
    setShowCamera(false);
    setBarcodeInput(decodedText);
    toast.success('Barkod Okundu!');
    handleSearchProcess(decodedText);
  };

  // --- FONKSİYONLAR ---

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchProcess(barcodeInput);
  };

  const handleSearchProcess = async (code: string) => {
    if (!code.trim()) return;

    setLoading(true);
    setScannedData(null);
    
    if (!recentScans.includes(code)) {
      setRecentScans(prev => [code, ...prev].slice(0, 5));
    }

    try {
      const { data, error } = await supabase
        .from('branch_equipment')
        .select('*')
        .eq('equipment_code', code)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setScannedData(data);
        setView('found');
        toast.success('Ekipman bulundu!');
      } else {
        setView('register');
        setNewEqData({
          name: '',
          type: 'Kemirgen İstasyonu',
          location: ''
        });
        toast.info('Ekipman sisteme kayıtlı değil.');
      }
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!newEqData.name || !newEqData.location) {
      toast.warning('İsim ve konum zorunludur.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('branch_equipment')
        .insert([{
          equipment_code: barcodeInput,
          name: newEqData.name,
          type: newEqData.type,
          location: newEqData.location,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Eşleştirme Başarılı!');
      setScannedData(data);
      setView('found');

    } catch (err: any) {
      toast.error('Kayıt hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = () => {
    toast.success(`${scannedData?.name} kontrol edildi.`);
    resetScanner();
  };

  const resetScanner = () => {
    setBarcodeInput('');
    setScannedData(null);
    setView('idle');
    setShowCamera(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex justify-center items-start">
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        
        {/* HEADER */}
        <div className="bg-gray-900 p-6 text-white text-center relative">
          <QrCode className="mx-auto mb-2 opacity-80" size={32} />
          <h1 className="text-xl font-bold tracking-tight">Saha Operasyon Terminali</h1>
          <p className="text-xs text-gray-400 mt-1">Barkod / QR Test Modülü v2.1</p>
          
          {view !== 'idle' && (
            <button 
              onClick={resetScanner} 
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* BODY */}
        <div className="p-6">
          
          {/* EKRAN 1: TARAMA */}
          {view === 'idle' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              
              {/* KAMERA ALANI */}
              {showCamera ? (
                <div className="relative bg-black rounded-xl overflow-hidden shadow-inner border-2 border-blue-500 min-h-[250px] flex items-center justify-center">
                  <div id="reader" className="w-full h-full"></div>
                  
                  {cameraLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 text-white">
                      <Loader2 className="animate-spin mb-2" size={32} />
                      <span className="text-sm">Kamera Başlatılıyor...</span>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowCamera(false)}
                    className="absolute top-2 right-2 bg-red-600/80 text-white p-2 rounded-full hover:bg-red-700 z-30 backdrop-blur-sm"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-4 left-0 w-full text-center z-10 pointer-events-none">
                    <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                      Kodu kare içine hizalayın
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="w-full py-8 border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-xl flex flex-col items-center justify-center gap-3 text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-all group active:scale-95"
                  >
                    <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform text-blue-500">
                      <Camera size={32} />
                    </div>
                    <div>
                      <span className="font-bold text-lg block text-gray-800">Kamerayı Başlat</span>
                      <span className="text-xs text-gray-500">QR veya Barkod Tara</span>
                    </div>
                  </button>
                  
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold tracking-wider">veya manuel gir</span>
                    <div className="flex-grow border-t border-gray-200"></div>
                  </div>
                </div>
              )}

              {/* MANUEL GİRİŞ */}
              <form onSubmit={handleManualScan} className="relative">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="KOD: EQ-12345"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-lg font-mono focus:border-blue-500 focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                  autoFocus={!showCamera}
                />
                <Scan className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                
                <button 
                  type="submit"
                  disabled={loading || !barcodeInput}
                  className="mt-4 w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-900 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                >
                  {loading ? 'Sorgulanıyor...' : 'Sorgula'} <Search size={18} />
                </button>
              </form>

              {/* Son Taramalar */}
              {recentScans.length > 0 && (
                <div className="pt-6 border-t border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1">
                    <History size={12}/> Son İşlemler
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {recentScans.map((code, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => { setBarcodeInput(code); handleSearchProcess(code); }}
                        className="text-xs px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 font-mono transition-colors shadow-sm"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EKRAN 2: BULUNDU */}
          {view === 'found' && scannedData && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-800">Ekipman Doğrulandı</h3>
                  <p className="text-xs text-emerald-600">Veritabanı eşleşmesi başarılı.</p>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">EKİPMAN KODU</span>
                    <p className="font-mono text-xl font-bold text-gray-800">{scannedData.equipment_code}</p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600 capitalize border border-gray-200">{scannedData.status}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-dashed border-gray-200">
                  <div>
                    <div className="flex items-center gap-1 text-gray-400 mb-1">
                      <Box size={14} /> <span className="text-xs font-semibold uppercase">Tip</span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{scannedData.type}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-400 mb-1">
                      <MapPin size={14} /> <span className="text-xs font-semibold uppercase">Konum</span>
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{scannedData.location}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                   <div className="flex items-center gap-1 text-gray-400 mb-1">
                      <CheckCircle size={14} /> <span className="text-xs font-semibold uppercase">İsim / Etiket</span>
                    </div>
                    <p className="font-medium text-gray-900">{scannedData.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={resetScanner}
                  className="py-3 rounded-xl border border-gray-300 font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  Vazgeç
                </button>
                <button 
                  onClick={handleCheck}
                  className="py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Kontrol Et
                </button>
              </div>
            </div>
          )}

          {/* EKRAN 3: KAYIT (PAIRING) */}
          {view === 'register' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-amber-800">Eşleşme Bulunamadı</h3>
                  <p className="text-xs text-amber-600">Bu barkod boşta. Şimdi tanımlayabilirsiniz.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Bağlanacak Barkod</label>
                  <div className="font-mono text-lg font-bold text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                    {barcodeInput}
                    <QrCode size={18} className="text-gray-400"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ekipman Tipi</label>
                  <select 
                    value={newEqData.type}
                    onChange={(e) => setNewEqData({...newEqData, type: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="Kemirgen İstasyonu">Kemirgen İstasyonu</option>
                    <option value="Yürüyen Haşere Monitörü">Yürüyen Haşere Monitörü</option>
                    <option value="EFC (Sinek Cihazı)">EFC (Sinek Cihazı)</option>
                    <option value="Feromon Tuzağı">Feromon Tuzağı</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">İsim / No</label>
                    <input
                      type="text"
                      placeholder="Örn: 04"
                      value={newEqData.name}
                      onChange={(e) => setNewEqData({...newEqData, name: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
                    <input
                      type="text"
                      placeholder="Örn: Mutfak"
                      value={newEqData.location}
                      onChange={(e) => setNewEqData({...newEqData, location: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={resetScanner}
                  className="py-3 rounded-xl border border-gray-300 font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  İptal
                </button>
                <button 
                  onClick={handleRegister}
                  disabled={loading}
                  className="py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18} /> Kaydet</>}
                </button>
              </div>
            </div>
          )}

        </div>
        
        {/* FOOTER */}
        <div className="bg-gray-50 p-4 text-center text-[10px] text-gray-400 border-t uppercase tracking-wider">
          v2.1 • html5-qrcode Pro Mode • HTTPS Gerekli
        </div>
      </div>
    </div>
  );
};

export default BarcodeTest;