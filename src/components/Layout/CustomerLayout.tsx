import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
// import { useAuth } from '../Auth/AuthProvider'; // <-- ÖNİZLEME İÇİN YORUMA ALINDI
import { LogOut, Menu, X, Home, Calendar, FileText, AlertCircle, FilePlus, Award, Package, TrendingUp, Bug } from 'lucide-react'; // <-- YENİ: Bug ikonu eklendi
// import { supabase } from '../../lib/supabase'; // <-- ÖNİZLEME İÇİN YORUMA ALINDI
// import { localAuth } from '../../lib/localAuth'; // <-- ÖNİZLEME İÇİN YORUMA ALINDI

// --- ÖNİZLEME HATA DÜZELTMESİ ---
// Bu bileşenin bağımlı olduğu dış dosyalar (AuthProvider, supabase, localAuth)
// bu önizleme ortamında bulunmadığı için derleme hatası alıyorsunuz.
// Kodun bu önizlemede çalışabilmesi için bu bağımlılıkları
// taklit eden (mock'layan) sahte objeler oluşturalım.
// Kodu kendi projenize kopyalarken bu bloğu silebilirsiniz.

const useAuthMock = () => ({
  signOut: async () => {
    console.log("Mock SignOut Çağrıldı");
  }
});

const supabaseMock = {
  auth: {
    getUser: async () => ({
      data: { user: { id: 'mock-user-id-123' } },
      error: null
    })
  },
  from: (tableName: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: string) => ({
        single: async () => {
          if (tableName === 'customers' && column === 'auth_id') {
            return {
              data: { kisa_isim: 'Mock Müşteri Adı' },
              error: null
            };
          }
          return { data: null, error: new Error('Mock Supabase Hatası') };
        }
      })
    })
  })
};

// HATA DÜZELTMESİ: 'supabaseMock' olan hatalı isim 'localAuthMock' olarak düzeltildi.
const localAuthMock = {
  getSession: () => {
    // localSession'ı test etmek için null olmayan bir değer de döndürebilirsiniz
    // return { type: 'customer', name: 'Lokal Müşteri Adı' };
    return null; // supabase.auth.getUser() yolunu tetikle
  }
};
// --- HATA DÜZELTMESİ SONU ---


// ÖNİZLEME İÇİN MOCK'LARI AKTİF ET:
// Bu satırlar, "Duplicate declaration" hatasını çözmek için eklendi.
// Kodu kendi projenize kopyalarken:
// 1. BU 3 SATIRI SİLİN.
// 2. Dosyanın en üstündeki 3 'import' satırının yorumunu KALDIRIN.
const useAuth = useAuthMock;
const supabase = supabaseMock as any; // Mock'u 'any' olarak cast et
const localAuth = localAuthMock;


const CustomerLayout: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  // Sidebar'ın varsayılan olarak açık olması için true ile başlatıyoruz
  // Kullanıcı deneyimine göre false ile de başlatabilirsiniz.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    fetchCustomerInfo();
  }, []);

  const fetchCustomerInfo = async () => {
    try {
      const localSession = localAuth.getSession();
      if (localSession && localSession.type === 'customer') {
        setCustomerName(localSession.name);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('kisa_isim')
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;
      setCustomerName(data.kisa_isim);
    } catch (error) {
      console.error('Error fetching customer info:', error);
    }
  };

  // HATA DÜZELTMESİ: Bozuk olan 'localAuthMock' bloğu,
  // doğru 'handleSignOut' fonksiyonu ile değiştirildi.
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // HATA DÜZELTMESİ: Dosya birleştirilirken kaybolan navItems eklendi.
  const navItems = [
    { path: '/customer', icon: <Home size={20} />, name: 'Ana Sayfa' },
    { path: '/customer/ziyaretler', icon: <FileText size={20} />, name: 'Ziyaretler' },
    { path: '/customer/takvim', icon: <Calendar size={20} />, name: 'Takvim' },
    { path: '/customer/dof', icon: <AlertCircle size={20} />, name: 'DÖF' },
    { path: '/customer/dokumanlar', icon: <FilePlus size={20} />, name: 'Dökümanlar' },
    { path: '/customer/sertifikalar', icon: <Award size={20} />, name: 'Sertifikalar' },
    { path: '/customer/malzemeler', icon: <Package size={20} />, name: 'Malzemeler' },
    // YENİ RAPOR LİNKİ
    { path: '/customer/pestisit-raporu', icon: <Bug size={20} />, name: 'Pestisit Raporu' },
    { path: '/customer/trend-analizi', icon: <TrendingUp size={20} />, name: 'Trend Analizi' },
    { path: '/customer/teklifler', icon: <FileText size={20} />, name: 'Teklifler' },
  ];

  // HATA DÜZELTMESİ: Eksik olan return ifadesi ve JSX bloğu eklendi.
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobil için karartma perdesi (backdrop/scrim).
        Sadece mobilde (md:hidden) ve sidebar açıkken görünür (z-40).
        Header'ın (z-30) üstündedir.
        Tıklayınca sidebar'ı kapatır.
      */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 md:hidden ${
          isSidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Header */}
      {/* Header'ı z-30, sticky ve h-16 (64px) olarak sabitliyoruz */}
      <header className="bg-white shadow-sm sticky top-0 z-30 h-16">
        {/* py-3 kaldırıldı, h-full ile dikeyde ortalama sağlandı */}
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {/* Duruma göre ikonu değiştir (Menu veya X) */}
              {isSidebarOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
            <div className="ml-4 flex items-center">
              <img
                src="https://i.imgur.com/PajSpus.png"
                alt="İlaçlamatik Logo"
                className="h-10 mr-3 cursor-pointer"
                onClick={() => navigate('/customer')}
                onError={(e) => { 
                  // Resim yüklenemezse yer tutucu göster
                  const target = e.currentTarget as HTMLImageElement;
                  target.src = 'https://placehold.co/100x40/eeeeee/333333?text=Logo';
                  target.style.height = '40px';
                  target.style.width = '100px';
                }}
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-800">Müşteri Paneli</h1>
                {customerName && <p className="text-sm text-gray-600">{customerName}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar and Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            ${/* Mobil: fixed, z-50 (backdrop'un üstünde) */''}
            fixed top-0 left-0 z-50 h-screen w-64 bg-white shadow-lg 
            overflow-y-auto overflow-x-hidden 
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            
            ${/* Desktop: relative, sticky, header'ın (h-16) altında başlar */''}
            md:relative md:translate-x-0 md:z-auto
            md:h-[calc(100vh-4rem)] ${/* 4rem = h-16 */''}
            md:sticky md:top-16 
            ${isSidebarOpen ? 'md:w-64' : 'md:w-0'}
          `}
        >
          {/* Navigasyon içeriği. 
             Masaüstünde sticky olduğu için header'ın altında başlar,
             mobilde ise fixed olduğu için ekranın en üstünden başlar.
             Gerekirse mobil için header yüksekliği (h-16) kadar pt-16 eklenebilir.
          */}
          <nav className="mt-4 px-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/customer'}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-green-50 text-green-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                    onClick={() => {
                      // Mobilde bir linke tıklayınca menüyü kapat
                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    {item.icon}
                    {/* Yazılar, sidebar kapalıyken (w-0) görünmesin 
                      ve taşmasın diye span içine alındı.
                    */}
                    <span className="ml-3 whitespace-nowrap">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        {/* Ana içerik alanı. 
          Sidebar 'relative' olduğu için artık 'md:ml-64' gerekmiyor.
          'flex-1' genişliği otomatik ayarlayacak.
        */}
        <main
          className={`
            flex-1 p-6 transition-all duration-300
          `}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;