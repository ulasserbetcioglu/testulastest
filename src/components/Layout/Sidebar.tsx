// src/components/Layout/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    Menu, X, Warehouse, CalendarRange, ArrowRight, DollarSign,
    AlertCircle, FilePlus, Award, Calendar, BarChart2, CheckSquare,
    FileText, FileInput as FileInvoice, Grid, LogOut, LayoutDashboard,
    Users, Settings, UserCog, Route, Building, Home, CalendarClock, MapPin,
    ChevronsLeft, ChevronsRight, Mail, Package, MessageSquare, MailCheck, 
    BarChart3, TrendingUp, PlusCircle, NotebookPen, Wallet, ReceiptText, 
    Image as ImageIcon, Clock as ClockIcon, Car, Bug
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

// Menü yapısı - Daha mantıklı kategorize edildi
const menuCategories = [
  {
    title: 'Ana Menü',
    color: 'blue',
    items: [
      { name: 'Panel', path: '/', icon: <Home size={20} /> },
      { name: 'Modüller', path: '/modules', icon: <Grid size={20} /> },
      { name: 'Hızlı Notlar', path: '/hizli-notlar', icon: <NotebookPen size={20} /> },
    ]
  },
  {
    title: 'Müşteri İşlemleri',
    color: 'green',
    items: [
      { name: 'Müşteriler', path: '/musteriler', icon: <Users size={20} /> },
      { name: 'Şubeler', path: '/subeler', icon: <Building size={20} /> },
      { name: 'Şube Fiyatlandırma', path: '/sube-fiyatlandirma', icon: <DollarSign size={20} /> },
      { name: 'Teklifler', path: '/teklifler', icon: <FileText size={20} /> },
    ]
  },
  {
    title: 'Ziyaret Yönetimi',
    color: 'purple',
    items: [
      { name: 'Ziyaretler', path: '/ziyaretler', icon: <CalendarRange size={20} /> },
      { name: 'Takvim', path: '/takvim', icon: <Calendar size={20} /> },
      { name: 'Takvim Planlama', path: '/takvim-planlama', icon: <CalendarRange size={20} /> },
      { name: 'Aylık Ziyaret Planı', path: '/admin/monthly-visit-schedule', icon: <CalendarClock size={20} /> },
      { name: 'Şube Lokasyon', path: '/sube-lokasyon', icon: <MapPin size={20} /> },
      { name: 'Ziyaret Raporları', path: '/admin/ziyaret-raporlari', icon: <ImageIcon size={20} /> },
    ]
  },
  {
    title: 'Operatör Yönetimi',
    color: 'orange',
    items: [
      { name: 'Operatörler', path: '/operatorler', icon: <UserCog size={20} /> },
      { name: 'Performans', path: '/operator-performans', icon: <BarChart3 size={20} /> },
      { name: 'Mesafeler', path: '/operator-mesafeleri', icon: <Route size={20} /> },
      { name: 'Mesai Çizelgeleri', path: '/admin/mesai-cizelgeleri', icon: <ClockIcon size={20} /> },
      { name: 'İzin Yönetimi', path: '/admin/operator-leaves', icon: <Calendar size={20} /> },
      { name: 'Araç Yönetimi', path: '/admin/vehicles', icon: <Car size={20} /> },
    ]
  },
  {
    title: 'Finans',
    color: 'yellow',
    items: [
      { name: 'Gelir Yönetimi', path: '/gelir-yonetimi', icon: <DollarSign size={20} /> },
      { name: 'Ücretli Malzemeler', path: '/ucretli-malzemeler', icon: <DollarSign size={20} /> },
      { name: 'Faturasız Müşteriler', path: '/faturasiz-musteriler', icon: <Wallet size={20} /> },
      { name: 'Tahsilat Makbuzları', path: '/admin/tahsilat-makbuzlari', icon: <ReceiptText size={20} /> },
    ]
  },
  {
    title: 'Raporlama & Analiz',
    color: 'indigo',
    items: [
      { name: 'Cari Satış Raporu', path: '/cari-satis-raporu', icon: <BarChart2 size={20} /> },
      { name: 'Yıllık Kar/Zarar', path: '/yillik-kar-zarar', icon: <TrendingUp size={20} /> },
      { name: 'Karlılık Analizi', path: '/karlilik-analizi', icon: <DollarSign size={20} /> },
      { name: 'Trend Analizi', path: '/trend-analizi', icon: <TrendingUp size={20} /> },
      { name: 'Faaliyet Raporu', path: '/faaliyet-rapor-takip', icon: <FileText size={20} /> },
      { name: 'Pestisit Kullanım', path: '/pestisit-raporu', icon: <Bug size={20} /> },
    ]
  },
  {
    title: 'Pazarlama',
    color: 'pink',
    items: [
      { name: 'Takvim Gönder', path: '/aylik-takvim-eposta', icon: <Mail size={20} /> },
      { name: 'Ekipman Pazarlama', path: '/ekipman-pazarlama', icon: <Package size={20} /> },
      { name: 'Hizmet Pazarlama', path: '/hizmet-pazarlama', icon: <MessageSquare size={20} /> },
      { name: 'Gönderilen E-postalar', path: '/gonderilen-epostalar', icon: <MailCheck size={20} /> },
    ]
  },
  {
    title: 'Sistem Yönetimi',
    color: 'gray',
    items: [
      { name: 'Depolar', path: '/depolar', icon: <Warehouse size={20} /> },
      { name: 'Ekipman Yönetimi', path: '/ekipman-yonetimi', icon: <Package size={20} /> },
      { name: 'Sertifikalar', path: '/sertifikalar', icon: <Award size={20} /> },
      { name: 'Dökümanlar', path: '/dokumanlar', icon: <FileText size={20} /> },
      { name: 'Tanımlamalar', path: '/tanimlamalar', icon: <Settings size={20} /> },
      { name: 'Ayarlar', path: '/ayarlar', icon: <Settings size={20} /> },
    ]
  }
];

// Admin özel menüsü
const adminCategory = {
  title: 'Admin Araçları',
  color: 'red',
  items: [
    { name: 'Fatura Dışa Aktarma', path: '/fatura-export', icon: <FileInvoice size={20} /> },
    { name: 'Toplu Ziyaret Aktar', path: '/bulk-visit-import', icon: <PlusCircle size={20} /> }
  ]
};

// Renk paletleri
const colorClasses = {
  blue: { text: 'text-blue-400', hover: 'hover:bg-blue-700/30', active: 'bg-blue-600' },
  green: { text: 'text-green-400', hover: 'hover:bg-green-700/30', active: 'bg-green-600' },
  purple: { text: 'text-purple-400', hover: 'hover:bg-purple-700/30', active: 'bg-purple-600' },
  orange: { text: 'text-orange-400', hover: 'hover:bg-orange-700/30', active: 'bg-orange-600' },
  yellow: { text: 'text-yellow-400', hover: 'hover:bg-yellow-700/30', active: 'bg-yellow-600' },
  indigo: { text: 'text-indigo-400', hover: 'hover:bg-indigo-700/30', active: 'bg-indigo-600' },
  pink: { text: 'text-pink-400', hover: 'hover:bg-pink-700/30', active: 'bg-pink-600' },
  gray: { text: 'text-gray-400', hover: 'hover:bg-gray-700/30', active: 'bg-gray-600' },
  red: { text: 'text-red-400', hover: 'hover:bg-red-700/30', active: 'bg-red-600' },
};

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Ana Menü']));
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { data: { user } = {} } = await supabase.auth.getUser();
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

  const toggleCategory = (title: string) => {
    if (isCollapsed) return; // Daraltılmış modda kategori açma/kapama çalışmaz
    
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
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
            {menuCategories.map((category) => {
              const isExpanded = expandedCategories.has(category.title);
              const colors = colorClasses[category.color as keyof typeof colorClasses];
              
              return (
                <li key={category.title} className="mb-3">
                  {/* Kategori Başlığı */}
                  <button
                    onClick={() => toggleCategory(category.title)}
                    className={`w-full px-3 py-2 mb-1 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
                      isCollapsed ? 'text-center justify-center' : 'text-left'
                    } ${colors.text} ${colors.hover} flex items-center`}
                  >
                    {isCollapsed ? (
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'currentColor' }}></span>
                    ) : (
                      <>
                        <span className="flex-1">{category.title}</span>
                        <span className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          ›
                        </span>
                      </>
                    )}
                  </button>
                  
                  {/* Kategori İçeriği */}
                  <ul className={`space-y-1 overflow-hidden transition-all duration-300 ${
                    isExpanded || isCollapsed ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    {category.items.map((item) => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.path === '/'}
                          className={({ isActive }) =>
                            `flex items-center p-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                              isActive
                                ? `${colors.active} text-white shadow-inner`
                                : `text-green-100 ${colors.hover} hover:text-white`
                            } ${isCollapsed ? 'justify-center' : ''}`
                          }
                          onClick={() => {
                            if (window.innerWidth < 768) {
                              setIsOpen(false);
                            }
                          }}
                          title={isCollapsed ? item.name : ''}
                        >
                          <span className={`w-5 flex justify-center shrink-0 ${isCollapsed ? '' : 'mr-3'}`}>
                            {item.icon}
                          </span>
                          <span className={`truncate ${isCollapsed ? 'hidden' : 'block'}`}>
                            {item.name}
                          </span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            
            {/* Admin Kategorisi */}
            {isAdmin && (
              <li className="mb-3 pt-3 border-t border-green-700/50">
                <button
                  onClick={() => toggleCategory(adminCategory.title)}
                  className={`w-full px-3 py-2 mb-1 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
                    isCollapsed ? 'text-center justify-center' : 'text-left'
                  } ${colorClasses.red.text} ${colorClasses.red.hover} flex items-center`}
                >
                  {isCollapsed ? (
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  ) : (
                    <>
                      <span className="flex-1">{adminCategory.title}</span>
                      <span className={`transition-transform duration-200 ${
                        expandedCategories.has(adminCategory.title) ? 'rotate-90' : ''
                      }`}>
                        ›
                      </span>
                    </>
                  )}
                </button>
                
                <ul className={`space-y-1 overflow-hidden transition-all duration-300 ${
                  expandedCategories.has(adminCategory.title) || isCollapsed ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  {adminCategory.items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center p-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                            isActive
                              ? 'bg-red-600 text-white shadow-inner'
                              : 'text-red-100 hover:bg-red-700/30 hover:text-white'
                          } ${isCollapsed ? 'justify-center' : ''}`
                        }
                        onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }}
                        title={isCollapsed ? item.name : ''}
                      >
                        <span className={`w-5 flex justify-center shrink-0 ${isCollapsed ? '' : 'mr-3'}`}>
                          {item.icon}
                        </span>
                        <span className={`truncate ${isCollapsed ? 'hidden' : 'block'}`}>
                          {item.name}
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </ul>
        </nav>
        
        {/* Alt Butonlar */}
        <div className="p-4 border-t border-green-700/50 shrink-0 space-y-2">
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`w-full hidden md:flex items-center p-3 rounded-lg transition-all duration-200 text-sm font-medium text-green-300 hover:bg-green-700/50 hover:text-white ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={isCollapsed ? (isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt') : ''}
            >
                <span className={`w-5 flex justify-center shrink-0 ${isCollapsed ? '' : 'mr-3'}`}>
                    {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
                </span>
                <span className={isCollapsed ? 'hidden' : 'block'}>Menüyü Daralt</span>
            </button>

            <button
                onClick={handleLogout}
                className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-white ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={isCollapsed ? 'Çıkış Yap' : ''}
            >
                <span className={`w-5 flex justify-center shrink-0 ${isCollapsed ? '' : 'mr-3'}`}>
                  <LogOut size={20} />
                </span>
                <span className={isCollapsed ? 'hidden' : 'block'}>Çıkış Yap</span>
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;