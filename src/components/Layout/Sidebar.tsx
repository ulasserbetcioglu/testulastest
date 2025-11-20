// src/components/Layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Menu, X, Warehouse, CalendarRange, ArrowRight, DollarSign,
    AlertCircle, FilePlus, Award, Calendar, BarChart2, CheckSquare,
    FileText, FileInput as FileInvoice, Grid, LogOut, LayoutDashboard,
    Users, Settings, UserCog, Route, Building, Home, CalendarClock, MapPin,
    ChevronsLeft, ChevronsRight, Mail, Package, MessageSquare, MailCheck, BarChart3, TrendingUp, PlusCircle, NotebookPen,
    Wallet, ReceiptText, Image as ImageIcon, Clock as ClockIcon, Car, Bug // Yeni ikon eklendi
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

// Menü öğeleri mantıksal kategorilere ayrıldı.
const menuCategories = [
  {
    title: 'Yönetim',
    items: [
      { name: 'Panel', path: '/', icon: <Home size={20} /> },
      { name: 'Modüller', path: '/modules', icon: <Grid size={20} /> },
      { name: 'Ayarlar', path: '/ayarlar', icon: <Settings size={20} /> },
      { name: 'Hızlı Notlar', path: '/hizli-notlar', icon: <NotebookPen size={20} /> }, // NEW: Admin Quick Notes Link
    ]
  },
  {
    title: 'Müşteri & Operasyon',
    items: [
      { name: 'Müşteriler', path: '/musteriler', icon: <Users size={20} /> },
      { name: 'Şubeler', path: '/subeler', icon: <Building size={20} /> },
      { name: 'Şube Fiyatlandırma', path: '/sube-fiyatlandirma', icon: <Building size={20} /> },
      { name: 'Ziyaretler', path: '/ziyaretler', icon: <CalendarRange size={20} /> },
      { name: 'Aylık Ziyaret Planı', path: '/admin/monthly-visit-schedule', icon: <CalendarClock size={20} /> },
      { name: 'Teklifler', path: '/teklifler', icon: <FileText size={20} /> },
    ]
  },
  {
    title: 'Operatör Yönetimi',
    items: [
      { name: 'Operatörler', path: '/operatorler', icon: <UserCog size={20} /> },
      { name: 'Operatör Mesafeleri', path: '/operator-mesafeleri', icon: <Route size={20} /> },
      { name: 'Operatör Performans', path: '/operator-performans', icon: <BarChart3 size={20} /> },
      { name: 'Mesai Çizelgeleri', path: '/admin/mesai-cizelgeleri', icon: <ClockIcon size={20} /> }, // NEW: Mesai Çizelgeleri
      { name: 'İzin Yönetimi', path: '/admin/operator-leaves', icon: <Calendar size={20} /> }, /* YENİ BAĞLANTI */
      { name: 'Araç Yönetimi', path: '/admin/vehicles', icon: <Car size={20} /> }, /* YENİ BAĞLANTI */
    ]
  },
  {
    title: 'Planlama',
    items: [
      { name: 'Takvim', path: '/takvim', icon: <Calendar size={20} /> },
      { name: 'Takvim Planlama', path: '/takvim-planlama', icon: <CalendarRange size={20} /> },
      { name: 'Şube Lokasyon Giriş', path: '/sube-lokasyon', icon: <MapPin size={20} /> },
    ]
  },
  {
    title: 'Finans & Raporlama',
    items: [
      { name: 'Gelir Yönetimi', path: '/gelir-yonetimi', icon: <DollarSign size={20} /> },
      { name: 'Ücretli Malzemeler', path: '/ucretli-malzemeler', icon: <DollarSign size={20} /> },
      { name: 'Cari Satış Raporu', path: '/cari-satis-raporu', icon: <BarChart2 size={20} /> },
      // YENİ EKLENEN BAĞLANTI
      { name: 'Yıllık Kar/Zarar', path: '/yillik-kar-zarar', icon: <TrendingUp size={20} /> },
      { name: 'Karlılık Analizi', path: '/karlilik-analizi', icon: <DollarSign size={20} /> },
      { name: 'Faaliyet Raporu Takip', path: '/faaliyet-rapor-takip', icon: <FileText size={20} /> },
      { name: 'Pestisit Kullanım Raporu', path: '/pestisit-raporu', icon: <Bug size={20} /> },
      { name: 'Faturasız Müşteriler', path: '/faturasiz-musteriler', icon: <Wallet size={20} /> }, // YENİ EKLENEN BAĞLANTI
      { name: 'Tahsilat Makbuzları', path: '/admin/tahsilat-makbuzlari', icon: <ReceiptText size={20} /> }, // YENİ EKLENEN BAĞLANTI
      { name: 'Ziyaret Raporları', path: '/admin/ziyaret-raporlari', icon: <ImageIcon size={20} /> }, // NEW: Ziyaret Raporları
    ]
  },
  {
    title: 'Pazarlama & İletişim',
    items: [
      { name: 'Aylık Takvim Gönder', path: '/aylik-takvim-eposta', icon: <Mail size={20} /> },
      { name: 'Ekipman Pazarlama', path: '/ekipman-pazarlama', icon: <Package size={20} /> },
      { name: 'Hizmet Pazarlama', path: '/hizmet-pazarlama', icon: <MessageSquare size={20} /> },
      { name: 'Gönderilen E-postalar', path: '/gonderilen-epostalar', icon: <MailCheck size={20} /> },
    ]
  },
  {
    title: 'Sistem & Tanımlar',
    items: [
      { name: 'Depolar', path: '/depolar', icon: <Warehouse size={20} /> },
      { name: 'Ekipman Yönetimi', path: '/ekipman-yonetimi', icon: <Package size={20} /> },
      { name: 'Sertifikalar', path: '/sertifikalar', icon: <Award size={20} /> },
      { name: 'Dökümanlar', path: '/dokumanlar', icon: <FileText size={20} /> },
      { name: 'Tanımlamalar', path: '/tanimlamalar', icon: <Settings size={20} /> },
    ]
  }
];

const adminCategory = {
  title: 'Yönetimsel Araçlar',
  items: [
    { name: 'Fatura Dışa Aktarma', path: '/fatura-export', icon: <FileInvoice size={20} /> },
    { name: 'Toplu Ziyaret Aktar', path: '/bulk-visit-import', icon: <PlusCircle size={20} /> } // NEW LINK
  ]
};

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const [isOpen, setIsOpen] = useState(false); // Sadece mobil menü için
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } = {} } = await supabase.auth.getUser(); // Destructure with default empty object
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
        className={`fixed top-0 left-0 z-20 h-screen bg-gradient-to-b from-green-800 to-green-900 text-white shadow-2xl transition-all duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-72`}
      >
        {/* Logo Alanı */}
        <div className="p-4 flex items-center justify-center h-20 border-b border-green-700/50 shrink-0">
          <img 
            src="https://i.imgur.com/PajSpus.png" 
            alt="İlaçlamatik Logo" 
            className={`cursor-pointer transition-all duration-300 ${isCollapsed ? 'h-8' : 'h-12'}`}
            onClick={() => navigate('/')}
            />
        </div>

        {/* Menü Alanı (Kaydırılabilir) */}
        <nav className="flex-grow overflow-y-auto overflow-x-hidden">
          <ul className="px-2 py-4">
            {menuCategories.map((category) => (
              <li key={category.title} className="mt-4 first:mt-0">
                <h3 className={`px-3 mb-2 text-xs font-semibold text-green-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
                  <span className={isCollapsed ? 'hidden' : 'block'}>{category.title}</span>
                </h3>
                <ul>
                  {category.items.map((item) => (
                    <li key={item.path} className="mb-1">
                      <NavLink
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                          `flex items-center p-3 rounded-lg transition-all duration-200 text-sm font-medium ${
                            isActive
                              ? 'bg-green-600 text-white shadow-inner'
                              : 'text-green-100 hover:bg-green-700/50 hover:text-white'
                          } ${isCollapsed ? 'justify-center' : ''}`
                        }
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            setIsOpen(false);
                          }
                        }}
                      >
                        <span className={`w-5 flex justify-center ${isCollapsed ? '' : 'mr-4'}`}>{item.icon}</span>
                        <span className={isCollapsed ? 'hidden' : 'block'}>{item.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {isAdmin && (
               <li className="mt-4">
                <h3 className={`px-3 mb-2 text-xs font-semibold text-red-400 uppercase tracking-wider ${isCollapsed ? 'text-center' : ''}`}>
                    <span className={isCollapsed ? 'hidden' : 'block'}>{adminCategory.title}</span>
                </h3>
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
                        <span className={`w-5 flex justify-center ${isCollapsed ? '' : 'mr-4'}`}>{item.icon}</span>
                        <span className={isCollapsed ? 'hidden' : 'block'}>{item.name}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </nav>
        
        <div className="p-4 border-t border-green-700/50 shrink-0">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full hidden md:flex items-center p-3 rounded-lg transition-all duration-200 text-sm font-medium text-green-300 hover:bg-green-700/50 hover:text-white mb-2"
            >
                <span className={`w-5 flex justify-center ${isCollapsed ? '' : 'mr-4'}`}>
                    {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                </span>
                <span className={isCollapsed ? 'hidden' : 'block'}>Menüyü Daralt</span>
            </button>

            <button
                onClick={handleLogout}
                className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
            >
                <span className="mr-4 w-5 flex justify-center"><LogOut size={20} /></span>
                <span className={isCollapsed ? 'hidden' : 'block'}>Çıkış Yap</span>
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
