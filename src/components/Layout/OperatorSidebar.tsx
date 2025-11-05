// src/components/Layout/OperatorSidebar.tsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
    Menu, X, Warehouse, CalendarRange, ArrowRight, DollarSign, 
    AlertCircle, FilePlus, Award, Calendar, BarChart2, CheckSquare, 
    FileText, FileInput as FileInvoice, Grid, LogOut, LayoutDashboard,
    Package, MessageSquare, NotebookPen, ReceiptText, Car // Yeni ikon eklendi
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

// Menü öğeleri kategorilere ayrıldı
const menuCategories = [
  {
    title: 'Genel',
    items: [
      { name: 'Panel', path: '/operator', icon: <LayoutDashboard size={20} /> },
      { name: 'Modüller', path: '/operator/modules', icon: <Grid size={20} /> },
    ]
  },
  {
    title: 'Operasyon',
    items: [
      { name: 'Günlük Kontrol', path: '/operator/gunluk-kontrol', icon: <CheckSquare size={20} /> },
      { name: 'Ziyaretler', path: '/operator/ziyaretler', icon: <CalendarRange size={20} /> },
      { name: 'Takvim', path: '/operator/takvim', icon: <Calendar size={20} /> },
      { name: 'Takvim Planlama', path: '/operator/takvim-planlama', icon: <CalendarRange size={20} /> },
      { name: 'Haftalık KM', path: '/operator/weekly-km', icon: <Car size={20} /> }, {/* YENİ BAĞLANTI */}
    ]
  },
  {
    title: 'Stok & Malzeme',
    items: [
      { name: 'Depolar', path: '/operator/depolar', icon: <Warehouse size={20} /> },
      { name: 'Transfer', path: '/operator/depolar/transfer', icon: <ArrowRight size={20} /> },
      { name: 'Ücretli Malzemeler', path: '/operator/ucretli-malzemeler', icon: <DollarSign size={20} /> },
      { name: 'Malzeme Kullanımı', path: '/operator/malzeme-kullanimi', icon: <BarChart2 size={20} /> },
    ]
  },
  {
    title: 'Pazarlama',
    items: [
        // ✅ DEĞİŞİKLİK: Yollar, ana rota olan '/operator' ile uyumlu hale getirildi.
        { name: 'Ekipman Pazarlama', path: '/operator/ekipman-pazarlama', icon: <Package size={20} /> },
        { name: 'Hizmet Pazarlama', path: '/operator/hizmet-pazarlama', icon: <MessageSquare size={20} /> },
    ]
  },
  {
    title: 'Raporlama & Belgeler',
    items: [
      { name: 'DÖF', path: '/operator/dof', icon: <AlertCircle size={20} /> },
      { name: 'Dökümanlar', path: '/operator/dokumanlar', icon: <FilePlus size={20} /> },
      { name: 'Sertifikalar', path: '/operator/sertifikalar', icon: <Award size={20} /> },
      { name: 'Teklifler', path: '/operator/teklifler', icon: <FileText size={20} /> },
      { name: 'Faaliyet Rapor Takip', path: '/operator/faaliyet-rapor-takip', icon: <FileText size={20} /> },
      { name: 'Hızlı Notlar', path: '/operator/hizli-notlar', icon: <NotebookPen size={20} /> },
      { name: 'Tahsilat Makbuzu', path: '/operator/tahsilat-makbuzu', icon: <ReceiptText size={20} /> } // Tahsilat Makbuzu bağlantısı
    ]
  }
];

const adminCategory = {
  title: 'Yönetim',
  items: [
    { name: 'Fatura Dışa Aktarma', path: '/operator/fatura-export', icon: <FileInvoice size={20} /> }
  ]
};

const OperatorSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setIsAdmin(user?.email === 'admin@ilaclamatik.com');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        toast.error("Çıkış yapılırken hata oluştu.");
    } else {
        navigate('/login');
    }
  };

  return (
    <>
      {/* Mobil Menü Butonu */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-30 md:hidden flex items-center justify-center h-12 w-12 rounded-full bg-green-600 text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Menüyü aç/kapat"
      >
        <div className="space-y-1.5">
            <span className={`block w-6 h-0.5 bg-white transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-white transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-white transition-transform duration-300 ease-in-out ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </div>
      </button>

      {/* Mobil için arkaplan karartma */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-20 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Kenar Çubuğu */}
      <aside
        className={`fixed top-0 left-0 z-20 h-screen bg-gradient-to-b from-green-800 to-green-900 text-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:w-64 w-72 flex flex-col`}
      >
        {/* Logo Alanı */}
        <div className="p-4 flex items-center justify-center h-20 border-b border-green-700/50 shrink-0">
          <img 
            src="https://i.imgur.com/PajSpus.png" 
            alt="İlaçlamatik Logo" 
            className="h-12 cursor-pointer" 
            onClick={() => navigate('/operator')}
            />
        </div>

        {/* Menü Alanı (Kaydırılabilir) */}
        <nav className="flex-grow overflow-y-auto h-0"> {/* h-0 eklendi */}
          <ul className="px-2 py-4">
            {menuCategories.map((category) => (
              <li key={category.title} className="mt-4 first:mt-0">
                <h3 className="px-3 mb-2 text-xs font-semibold text-green-400 uppercase tracking-wider">{category.title}</h3>
                <ul>
                  {category.items.map((item) => (
                    <li key={item.path} className="mb-1">
                      <NavLink
                        to={item.path}
                        end={item.path === '/operator'}
                        className={({ isActive }) =>
                          `flex items-center p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                            isActive
                              ? 'bg-green-600 text-white shadow-inner'
                              : 'text-green-100 hover:bg-green-700/50 hover:text-white'
                          }`
                        }
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            setIsOpen(false);
                          }
                        }}
                      >
                        <span className="mr-4 w-5 flex justify-center">{item.icon}</span>
                        <span>{item.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {/* Admin Kategorisi */}
            {isAdmin && (
               <li className="mt-4">
                <h3 className="px-3 mb-2 text-xs font-semibold text-red-400 uppercase tracking-wider">{adminCategory.title}</h3>
                <ul>
                  {adminCategory.items.map((item) => (
                    <li key={item.path} className="mb-1">
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                            isActive
                              ? 'bg-red-600 text-white shadow-inner'
                              : 'text-red-100 hover:bg-red-700/50 hover:text-white'
                          }`
                        }
                        onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }}
                      >
                        <span className="mr-4 w-5 flex justify-center">{item.icon}</span>
                        <span>{item.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </nav>
        
        {/* Alt Bilgi / Çıkış Alanı */}
        <div className="p-4 border-t border-green-700/50 shrink-0">
            <button
                onClick={handleLogout}
                className="w-full flex items-center p-3 rounded-lg transition-all duration-200 text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-white"
            >
                <span className="mr-4 w-5 flex justify-center"><LogOut size={20} /></span>
                <span>Çıkış Yap</span>
            </button>
        </div>
      </aside>
    </>
  );
};

export default OperatorSidebar;
