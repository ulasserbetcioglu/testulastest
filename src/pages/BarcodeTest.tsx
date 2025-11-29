import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Scan, QrCode, Search, Save, CheckCircle, 
  AlertTriangle, MapPin, Box, History, X, Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { Html5QrcodeScanner } from 'html5-qrcode';

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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // YENİ KAYIT FORMU STATE
  const [newEqData, setNewEqData] = useState({
    name: '',
    type: 'Kemirgen İstasyonu',
    location: ''
  });

  // --- KAMERA YÖNETİMİ ---
  useEffect(() => {
    if (showCamera) {
      // DOM elementinin render edildiğinden emin olmak için küçük bir gecikme
      const timeoutId = setTimeout(() => {
        // Eğer zaten bir scanner varsa temizle
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }

        const scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true
          },
          /* verbose= */ false
        );
        
        scannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
            // Başarılı okuma
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Okuma hatalarını görmezden gel (Sürekli tarama yaptığı için çok hata fırlatır)
          }
        );
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
          scannerRef.current = null;
        }
      };
    } else {
      // Kamera kapatıldığında temizle
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }
  }, [showCamera]);

  const handleScanSuccess = (decodedText: string) => {
    // Kamerayı kapat ve sesi çal (opsiyonel)
    setShowCamera(false);
    setBarcodeInput(decodedText);
    toast.success('Barkod Okundu!');
    
    // İşlemi başlat
    handleSearchProcess(decodedText);
  };

  // --- FONKSİYONLAR ---

  // Manuel Form Submit
  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchProcess(barcodeInput);
  };

  // Ortak Arama Fonksiyonu
  const handleSearchProcess = async (code: string) => {
    if (!code.trim()) return;

    setLoading(true);
    setScannedData(null);
    
    // Geçmişe ekle
    if (!recentScans.includes(code)) {
      setRecentScans(prev => [code, ...prev].slice(0, 5));
    }

    try {
      // Veritabanında bu barkodu ara
      const { data, error } = await supabase
        .from('branch_equipment')
        .select('*')
        .eq('equipment_code', code)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // BULUNDU
        setScannedData(data);
        setView('found');
        toast.success('Ekipman tanımlı! Bilgiler getirildi.');
      } else {
        // BULUNAMADI -> KAYIT EKRANI
        setView('register');
        setNewEqData({
          name: '',
          type: 'Kemirgen İstasyonu',
          location: ''
        });
        toast.info('Ekipman tanınmıyor. Yeni kayıt ekranı açıldı.');
      }
    } catch (err: any) {
      toast.error('Hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Yeni Ekipman Kaydetme (Pairing)
  const handleRegister = async () => {
    if (!newEqData.name || !newEqData.location) {
      toast.warning('Lütfen isim ve konum giriniz.');
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

      toast.success('Başarıyla Eşleştirildi!');
      setScannedData(data);
      setView('found');

    } catch (err: any) {
      toast.error('Kayıt hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = () => {
    toast.success(`${scannedData?.name} kontrol edildi ve sisteme işlendi.`);
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
          <p className="text-xs text-gray-400 mt-1">Barkod / QR Test Modülü v2.0</p>
          
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
          
          {/* EKRAN 1: TARAMA (INPUT & CAMERA) */}
          {view === 'idle' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              
              {/* KAMERA ALANI */}
              {showCamera ? (
                <div className="relative bg-black rounded-xl overflow-hidden shadow-inner border-2 border-blue-500">
                  <div id="reader" className="w-full"></div>
                  <button 
                    onClick={() => setShowCamera(false)}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 z-10"
                  >
                    <X size={16} />
                  </button>
                  <p className="text-white text-center text-xs py-2 absolute bottom-0 w-full bg-black/50">Barkodu kare içine hizalayın</p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="w-full py-8 border-2 border-dashed border-blue-300 bg-blue-50 rounded-xl flex flex-col items-center justify-center gap-3 text-blue-600 hover:bg-blue-100 hover:border-blue-400 transition-all group"
                  >
                    <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <Camera size={32} />
                    </div>
                    <span className="font-bold text-lg">Kamerayı Aç ve Tara</span>
                  </button>
                  
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">veya manuel gir</span>
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
                  placeholder="Örn: EQ-12345"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-lg font-mono focus:border-blue-500 focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                  autoFocus={!showCamera}
                />
                <Scan className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                
                <button 
                  type="submit"
                  disabled={loading || !barcodeInput}
                  className="mt-4 w-full bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-900 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                >
                  {loading ? 'Aranıyor...' : 'Sorgula'} <Search size={18} />
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
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 font-mono transition-colors"
                      >
                        {code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EKRAN 2: BULUNDU (FOUND) */}
          {view === 'found' && scannedData && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full text-green-600">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-green-800">Ekipman Tanımlı</h3>
                  <p className="text-xs text-green-600">Veritabanında kayıt bulundu.</p>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-bold">Barkod ID</span>
                    <p className="font-mono text-lg font-bold text-gray-800">{scannedData.equipment_code}</p>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600 capitalize">{scannedData.status}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                  <div>
                    <div className="flex items-center gap-1 text-gray-500 mb-1">
                      <Box size={14} /> <span className="text-xs">Tip</span>
                    </div>
                    <p className="font-medium text-gray-900">{scannedData.type}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-500 mb-1">
                      <MapPin size={14} /> <span className="text-xs">Konum</span>
                    </div>
                    <p className="font-medium text-gray-900">{scannedData.location}</p>
                  </div>
                </div>
                
                <div>
                   <div className="flex items-center gap-1 text-gray-500 mb-1">
                      <CheckCircle size={14} /> <span className="text-xs">İsim</span>
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
                  className="py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} /> Kontrol Et
                </button>
              </div>
            </div>
          )}

          {/* EKRAN 3: KAYIT (REGISTER / PAIRING) */}
          {view === 'register' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-orange-800">Yeni Ekipman</h3>
                  <p className="text-xs text-orange-600">Barkod sisteme kayıtlı değil. Eşleştirme yapılıyor.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Eşleştirilecek Barkod</label>
                  <div className="font-mono text-lg font-bold text-gray-800 bg-gray-100 p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                    {barcodeInput}
                    <QrCode size={16} className="text-gray-400"/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ekipman Tipi</label>
                  <select 
                    value={newEqData.type}
                    onChange={(e) => setNewEqData({...newEqData, type: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  >
                    <option value="Kemirgen İstasyonu">Kemirgen İstasyonu</option>
                    <option value="Yürüyen Haşere Monitörü">Yürüyen Haşere Monitörü</option>
                    <option value="EFC (Sinek Cihazı)">EFC (Sinek Cihazı)</option>
                    <option value="Feromon Tuzağı">Feromon Tuzağı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ekipman Adı / No</label>
                  <input
                    type="text"
                    placeholder="Örn: İstasyon 04"
                    value={newEqData.name}
                    onChange={(e) => setNewEqData({...newEqData, name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Konum</label>
                  <input
                    type="text"
                    placeholder="Örn: Depo Arka Kapı"
                    value={newEqData.location}
                    onChange={(e) => setNewEqData({...newEqData, location: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                  />
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
                  {loading ? '...' : 'Kaydet'} <Save size={18} />
                </button>
              </div>
            </div>
          )}

        </div>
        
        {/* FOOTER */}
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t">
          Simülasyon & Gerçek Kamera Modu Aktif.
        </div>
      </div>
    </div>
  );
};

export default BarcodeTest;