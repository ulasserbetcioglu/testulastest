import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Menu, X, Warehouse, CalendarRange, DollarSign,
  Calendar, BarChart2, CheckSquare, Award,
  FileText, FileInput as FileInvoice, Grid, LogOut,
  Users, Settings, UserCog, Route, Building, Home, CalendarClock, MapPin,
  ChevronsLeft, ChevronsRight, ChevronRight, ChevronDown,
  Mail, Package, MessageSquare, MailCheck, 
  BarChart3, TrendingUp, PlusCircle, NotebookPen, Wallet, ReceiptText, 
  Image as ImageIcon, Clock as ClockIcon, Car, Bug, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Menü verisi (Renkler artık CSS classları yerine semantik olarak kullanılacak)
const menuCategories = [
  {
    title: 'Ana Menü',
    items: [
      { name: 'Panel', path: '/admin', icon: <Home size={20} /> },
      { name: 'Modüller', path: '/modules', icon: <Grid size={20} /> },
      { name: 'Hızlı Notlar', path: '/hizli-notlar', icon: <NotebookPen size={20} /> },
    ]
  },
  {
    title: 'Müşteri İlişkileri',
    items: [
      { name: 'Müşteriler', path: '/musteriler', icon: <Users size={20} /> },
      { name: 'Şubeler', path: '/subeler', icon: <Building size={20} /> },
      { name: 'Şube Fiyatlandırma', path: '/sube-fiyatlandirma', icon: <DollarSign size={20} /> },
      { name: 'Teklifler', path: '/teklifler', icon: <FileText size={20} /> },
    ]
  },
  {
    title: 'Saha Operasyonu',
    items: [
      { name: 'Ziyaretler', path: '/ziyaretler', icon: <CalendarRange size={20} /> },
      { name: 'Takvim', path: '/takvim', icon: <Calendar size={20} /> },
      { name: 'Takvim Planlama', path: '/takvim-planlama', icon: <CalendarRange size={20} /> },
      { name: 'Aylık Ziyaret Planı', path: '/admin/monthly-visit-schedule', icon: <CalendarClock size={20} /> },
      { name: 'Ziyaret Veri Girişi', path: '/admin/visit-data-entry', icon: <CheckSquare size={20} /> },
      { name: 'Şube Lokasyon', path: '/sube-lokasyon', icon: <MapPin size={20} /> },
      { name: 'Ziyaret Raporları', path: '/admin/ziyaret-raporlari', icon: <ImageIcon size={20} /> },
    ]
  },
  {
    title: 'Personel Yönetimi',
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
    title: 'Finansal İşlemler',
    items: [
      { name: 'Gelir Yönetimi', path: '/gelir-yonetimi', icon: <DollarSign size={20} /> },
      { name: 'Ücretli Malzemeler', path: '/ucretli-malzemeler', icon: <DollarSign size={20} /> },
      { name: 'Faturasız Müşteriler', path: '/faturasiz-musteriler', icon: <Wallet size={20} /> },
      { name: 'Tahsilat Makbuzları', path: '/admin/tahsilat-makbuzlari', icon: <ReceiptText size={20} /> },
    ]
  },
  {
    title: 'Raporlar & Analizler',
    items: [
      { name: 'Cari Satış Raporu', path: '/cari-satis-raporu', icon: <BarChart2 size={20} /> },
      { name: 'Yıllık Kar/Zarar', path: '/yillik-kar-zarar', icon: <TrendingUp size={20} /> },
      { name: 'Karlılık Analizi', path: '/karlilik-analizi', icon: <DollarSign size={20} /> },
      { name: 'Trend Analizi', path: '/trend-analizi', icon: <TrendingUp size={20} /> },
      { name: 'Faaliyet Raporu', path: '/faaliyet-rapor-takip', icon: <FileText size={20} /> },
      { name: 'Pestisit Kullanım', path: '/pestisit-raporu', icon: <Bug size={20} /> },
      { name: 'Faaliyet Dosyası', path: '/mentor-module', icon: <FileText size={20} /> },
      { name: 'Modül Raporları', path: '/admin/modul-raporlari', icon: <Grid size={20} /> },
    ]
  },
  {
    title: 'Pazarlama Araçları',
    items: [
      { name: 'Takvim Gönder', path: '/aylik-takvim-eposta', icon: <Mail size={20} /> },
      { name: 'Ekipman Pazarlama', path: '/ekipman-pazarlama', icon: <Package size={20} /> },
      { name: 'Hizmet Pazarlama', path: '/hizmet-pazarlama', icon: <MessageSquare size={20} /> },
      { name: 'Gönderilen E-postalar', path: '/gonderilen-epostalar', icon: <MailCheck size={20} /> },
    ]
  },
  {
    title: 'Ayarlar & Tanımlar',
    items: [
      { name: 'Depolar', path: '/depolar', icon: <Warehouse size={20} /> },
      { name: 'Ekipman Yönetimi', path: '/ekipman-yonetimi', icon: <Package size={20} /> },
      { name: 'Sertifikalar', path: '/sertifikalar', icon: <Award size={20} /> },
      { name: 'Dökümanlar', path: '/dokumanlar', icon: <FileText size={20} /> },
      { name: 'Tanımlamalar', path: '/tanimlamalar', icon: <Settings size={20} /> },
      { name: 'Genel Ayarlar', path: '/ayarlar', icon: <Settings size={20} /> },
    ]
  }
];

const adminCategory = {
  title: 'Yönetici Araçları',
  items: [
    { name: 'Fatura Dışa Aktar', path: '/fatura-export', icon: <FileInvoice size={20} /> },
    { name: 'Toplu Ziyaret Aktar', path: '/bulk-visit-import', icon: <PlusCircle size={20} /> }
  ]
};

interface SidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, setIsCollapsed = () => {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Başlangıçta sadece "Ana Menü" açık olsun
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Ana Menü']));
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Gerçek yetki kontrolü buraya eklenebilir
        setIsAdmin(true); 
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const toggleCategory = (title: string) => {
    if (isCollapsed) return;
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) newSet.delete(title);
      else newSet.add(title);
      return newSet;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Mobil Menü Butonu */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-40 md:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-slate-900 text-white shadow-lg border border-slate-700"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobil Arkaplan Karartma */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-screen bg-slate-900 border-r border-slate-800 text-slate-300 shadow-xl transition-all duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 
          ${isCollapsed ? 'md:w-20' : 'md:w-72'} w-72`}
      >
        {/* Logo Alanı */}
        <div className="h-20 flex items-center justify-center border-b border-slate-800 px-4 shrink-0 bg-slate-950/50">
          <div 
            className="flex items-center gap-3 cursor-pointer overflow-hidden" 
            onClick={() => navigate('/admin')}
          >
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <Bug className="text-white h-6 w-6" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <span className="font-bold text-white text-lg tracking-tight leading-none">İlaçlamatik</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-1">Yönetim Paneli</span>
              </div>
            )}
          </div>
        </div>

        {/* Menü Listesi */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1 custom-scrollbar">
          {menuCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.title);
            
            return (
              <div key={category.title} className="mb-2">
                {/* Kategori Başlığı */}
                {!isCollapsed ? (
                  <button
                    onClick={() => toggleCategory(category.title)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-all group"
                  >
                    <span>{category.title}</span>
                    <ChevronRight 
                      size={14} 
                      className={`transition-transform duration-200 text-slate-600 group-hover:text-slate-400 ${isExpanded ? 'rotate-90' : ''}`} 
                    />
                  </button>
                ) : (
                  // Kapalı modda kategori ayırıcı çizgi
                  <div className="h-px bg-slate-800 mx-4 my-4" title={category.title} />
                )}

                {/* Alt Menüler */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  (isExpanded || isCollapsed) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <ul className="space-y-1 mt-1">
                    {category.items.map((item) => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.path === '/admin'}
                          onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }}
                          className={({ isActive }) => `
                            flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                            ${isActive 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 font-medium' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }
                            ${isCollapsed ? 'justify-center' : ''}
                          `}
                          title={isCollapsed ? item.name : ''}
                        >
                          <span className={`shrink-0 transition-colors ${!isCollapsed && 'mr-3'}`}>
                            {item.icon}
                          </span>
                          {!isCollapsed && (
                            <span className="truncate text-sm">{item.name}</span>
                          )}
                          
                          {/* Kapalı modda tooltip benzeri gösterim (Opsiyonel) */}
                          {isCollapsed && (
                            <div className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                              {item.name}
                            </div>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}

          {/* Admin Menüsü */}
          {isAdmin && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              {!isCollapsed && (
                <div className="px-3 mb-2 text-xs font-bold text-red-500 uppercase tracking-wider">
                  Admin İşlemleri
                </div>
              )}
              <ul className="space-y-1">
                {adminCategory.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => `
                        flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                        ${isActive 
                          ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
                          : 'text-red-400 hover:text-white hover:bg-red-900/20'
                        }
                        ${isCollapsed ? 'justify-center' : ''}
                      `}
                      title={isCollapsed ? item.name : ''}
                    >
                      <span className={`shrink-0 ${!isCollapsed && 'mr-3'}`}>{item.icon}</span>
                      {!isCollapsed && <span className="truncate text-sm">{item.name}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Footer (Kullanıcı & Çıkış) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
            
            {/* Menü Daraltma Butonu */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden md:block"
              title={isCollapsed ? 'Genişlet' : 'Daralt'}
            >
              {isCollapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
            </button>

            {/* Çıkış Butonu */}
            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all ${isCollapsed ? 'w-full justify-center' : ''}`}
              title="Çıkış Yap"
            >
              <LogOut size={20} />
              {!isCollapsed && <span className="text-sm font-medium">Çıkış</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;