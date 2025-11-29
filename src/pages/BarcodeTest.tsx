import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Scan, QrCode, Search, Save, CheckCircle, 
  AlertTriangle, MapPin, Box, Plus, History, X 
} from 'lucide-react';
import { toast } from 'sonner';

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

  // YENİ KAYIT FORMU STATE
  const [newEqData, setNewEqData] = useState({
    name: '',
    type: 'Kemirgen İstasyonu',
    location: ''
  });

  // --- FONKSİYONLAR ---

  // 1. Barkod Tarama / Arama Simülasyonu
  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;

    setLoading(true);
    setScannedData(null);
    
    // Simüle edilmiş "bip" sesi efekti eklenebilir :)
    // Geçmişe ekle
    if (!recentScans.includes(barcodeInput)) {
      setRecentScans(prev => [barcodeInput, ...prev].slice(0, 5));
    }

    try {
      // Veritabanında bu barkodu ara
      const { data, error } = await supabase
        .from('branch_equipment')
        .select('*')
        .eq('equipment_code', barcodeInput)
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
        // Formu sıfırla ama ismi otomatik öneri yap (Örn: İstasyon X)
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

  // 2. Yeni Ekipman Kaydetme (Pairing)
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
          equipment_code: barcodeInput, // Barkodu eşleştiriyoruz
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
      setView('found'); // Kayıttan sonra direkt buldu ekranına geç

    } catch (err: any) {
      toast.error('Kayıt hatası: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Kontrol Yapma (Simülasyon)
  const handleCheck = () => {
    toast.success(`${scannedData?.name} kontrol edildi ve sisteme işlendi.`);
    // Burada normalde 'visits' veya 'equipment_checks' tablosuna insert atılır.
    resetScanner();
  };

  const resetScanner = () => {
    setBarcodeInput('');
    setScannedData(null);
    setView('idle');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans flex justify-center items-start">
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        
        {/* HEADER */}
        <div className="bg-gray-900 p-6 text-white text-center relative">
          <QrCode className="mx-auto mb-2 opacity-80" size={32} />
          <h1 className="text-xl font-bold tracking-tight">Saha Operasyon Terminali</h1>
          <p className="text-xs text-gray-400 mt-1">Barkod / QR Test Modülü v1.0</p>
          
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
          
          {/* EKRAN 1: TARAMA (INPUT) */}
          {view === 'idle' && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-100">
                  <Scan size={32} />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Barkodu Okutun</h2>
                <p className="text-sm text-gray-500">
                  Ekipman üzerindeki barkodu okutun veya manuel olarak aşağıya girin.
                </p>
              </div>

              <form onSubmit={handleScan} className="relative">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Örn: EQ-12345"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-lg font-mono focus:border-blue-500 focus:ring-0 outline-none transition-all placeholder:text-gray-300"
                  autoFocus
                />
                <Scan className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                
                <button 
                  type="submit"
                  disabled={loading || !barcodeInput}
                  className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-200"
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
                        onClick={() => setBarcodeInput(code)}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 font-mono"
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
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">{scannedData.status}</span>
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
                  <h3 className="font-bold text-orange-800">Yeni Ekipman Algılandı</h3>
                  <p className="text-xs text-orange-600">Bu barkod henüz sisteme kayıtlı değil.</p>
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

              <button 
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition flex items-center justify-center gap-2"
              >
                {loading ? 'Kaydediliyor...' : 'Eşleştir ve Kaydet'} <Save size={18} />
              </button>
            </div>
          )}

        </div>
        
        {/* FOOTER */}
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t">
          Simülasyon Modu • Gerçek veritabanı bağlantısı aktif.
        </div>
      </div>
    </div>
  );
};

export default BarcodeTest;