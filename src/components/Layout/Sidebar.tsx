import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, Warehouse, CalendarRange, DollarSign,
  Calendar, BarChart2, CheckSquare, Award,
  FileText, FileInput as FileInvoice, Grid, LogOut,
  Users, Settings, UserCog, Route, Building, Home, CalendarClock, MapPin,
  ChevronsLeft, ChevronsRight, ChevronRight, ChevronDown,
  Mail, Package, MessageSquare, MailCheck, 
  BarChart3, TrendingUp, PlusCircle, NotebookPen, Wallet, ReceiptText, 
  Image as ImageIcon, Clock as ClockIcon, Car, Bug
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// --- MENÜ YAPISI ---
const menuCategories = [
  {
    title: 'ANA MENÜ',
    items: [
      { name: 'Panel', path: '/admin', icon: <Home size={18} /> },
      { name: 'Modüller', path: '/modules', icon: <Grid size={18} /> },
      { name: 'Hızlı Notlar', path: '/hizli-notlar', icon: <NotebookPen size={18} /> },
    ]
  },
  {
    title: 'MÜŞTERİ & SATIŞ',
    items: [
      { name: 'Müşteriler', path: '/musteriler', icon: <Users size={18} /> },
      { name: 'Şubeler', path: '/subeler', icon: <Building size={18} /> },
      { name: 'Şube Fiyat', path: '/sube-fiyatlandirma', icon: <DollarSign size={18} /> },
      { name: 'Teklifler', path: '/teklifler', icon: <FileText size={18} /> },
    ]
  },
  {
    title: 'SAHA & ZİYARET',
    items: [
      { name: 'Ziyaretler', path: '/ziyaretler', icon: <CalendarRange size={18} /> },
      { name: 'Takvim', path: '/takvim', icon: <Calendar size={18} /> },
      { name: 'Planlama', path: '/takvim-planlama', icon: <CalendarRange size={18} /> },
      { name: 'Aylık Plan', path: '/admin/monthly-visit-schedule', icon: <CalendarClock size={18} /> },
      { name: 'Veri Girişi', path: '/admin/visit-data-entry', icon: <CheckSquare size={18} /> },
      { name: 'Lokasyonlar', path: '/sube-lokasyon', icon: <MapPin size={18} /> },
      { name: 'Raporlar', path: '/admin/ziyaret-raporlari', icon: <ImageIcon size={18} /> },
    ]
  },
  {
    title: 'PERSONEL & ARAÇ',
    items: [
      { name: 'Operatörler', path: '/operatorler', icon: <UserCog size={18} /> },
      { name: 'Performans', path: '/operator-performans', icon: <BarChart3 size={18} /> },
      { name: 'Mesafeler', path: '/operator-mesafeleri', icon: <Route size={18} /> },
      { name: 'Mesai', path: '/admin/mesai-cizelgeleri', icon: <ClockIcon size={18} /> },
      { name: 'İzinler', path: '/admin/operator-leaves', icon: <Calendar size={18} /> },
      { name: 'Araçlar', path: '/admin/vehicles', icon: <Car size={18} /> },    
    ]
  },
  {
    title: 'FİNANS',
    items: [
      { name: 'Gelirler', path: '/gelir-yonetimi', icon: <DollarSign size={18} /> },
      { name: 'Ücretli Malz.', path: '/ucretli-malzemeler', icon: <DollarSign size={18} /> },
      { name: 'Faturasızlar', path: '/faturasiz-musteriler', icon: <Wallet size={18} /> },
      { name: 'Tahsilatlar', path: '/admin/tahsilat-makbuzlari', icon: <ReceiptText size={18} /> },
    ]
  },
  {
    title: 'RAPORLAMA',
    items: [
      { name: 'Cari Satış', path: '/cari-satis-raporu', icon: <BarChart2 size={18} /> },
      { name: 'Kar/Zarar', path: '/yillik-kar-zarar', icon: <TrendingUp size={18} /> },
      { name: 'Karlılık', path: '/karlilik-analizi', icon: <DollarSign size={18} /> },
      { name: 'Trendler', path: '/trend-analizi', icon: <TrendingUp size={18} /> },
      { name: 'Faaliyet Rap.', path: '/faaliyet-rapor-takip', icon: <FileText size={18} /> },
      { name: 'Pestisit', path: '/pestisit-raporu', icon: <Bug size={18} /> },
      { name: 'Faaliyet Dos.', path: '/mentor-module', icon: <FileText size={18} /> },
      { name: 'Modül Rap.', path: '/admin/modul-raporlari', icon: <Grid size={18} /> },
    ]
  },
  {
    title: 'PAZARLAMA',
    items: [
      { name: 'Takvim Gönder', path: '/aylik-takvim-eposta', icon: <Mail size={18} /> },
      { name: 'Ekipman Paz.', path: '/ekipman-pazarlama', icon: <Package size={18} /> },
      { name: 'Hizmet Paz.', path: '/hizmet-pazarlama', icon: <MessageSquare size={18} /> },
      { name: 'E-postalar', path: '/gonderilen-epostalar', icon: <MailCheck size={18} /> },
    ]
  },
  {
    title: 'AYARLAR',
    items: [
      { name: 'Depolar', path: '/depolar', icon: <Warehouse size={18} /> },
      { name: 'Ekipmanlar', path: '/ekipman-yonetimi', icon: <Package size={18} /> },
      { name: 'Sertifikalar', path: '/sertifikalar', icon: <Award size={18} /> },
      { name: 'Dökümanlar', path: '/dokumanlar', icon: <FileText size={18} /> },
      { name: 'Tanımlar', path: '/tanimlamalar', icon: <Settings size={18} /> },
      { name: 'Genel Ayar', path: '/ayarlar', icon: <Settings size={18} /> },
    ]
  }
];

const adminCategory = {
  title: 'ADMİN',
  items: [
    { name: 'Fatura Export', path: '/fatura-export', icon: <FileInvoice size={18} /> },
    { name: 'Toplu Ziyaret', path: '/bulk-visit-import', icon: <PlusCircle size={18} /> }
  ]
};

interface SidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (isCollapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed = false, setIsCollapsed = () => {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Tüm kategorileri varsayılan olarak açık tutmak için hepsini state'e ekliyoruz
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set([...menuCategories.map(c => c.title), adminCategory.title])
  );

  useEffect(() => {
    const checkAdminStatus = async () => {
      // Admin kontrolü (Production için gerçek mantık eklenmeli)
      setIsAdmin(true); 
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
        className="fixed top-3 left-3 z-50 md:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-white text-gray-700 shadow-md border border-gray-200"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobil Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 text-gray-700 transition-all duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0 
          ${isCollapsed ? 'md:w-16' : 'md:w-64'} w-64 shadow-xl`}
      >

        {/* MENÜ LİSTESİ */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 custom-scrollbar">
          {menuCategories.map((category) => {
            const isExpanded = expandedCategories.has(category.title);
            
            return (
              <div key={category.title} className="mb-3">
                {/* Kategori Başlığı (Compact) */}
                {!isCollapsed ? (
                  <button
                    onClick={() => toggleCategory(category.title)}
                    className="w-full flex items-center justify-between px-2 py-1 mb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
                  >
                    <span>{category.title}</span>
                    <ChevronDown 
                      size={12} 
                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                  </button>
                ) : (
                  <div className="h-px bg-gray-200 mx-2 my-2" />
                )}

                {/* Alt Menüler (Accordion) */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  (isExpanded || isCollapsed) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <ul className="space-y-0.5">
                    {category.items.map((item) => (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.path === '/admin'}
                          onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }}
                          className={({ isActive }) => `
                            flex items-center px-2 py-2 rounded-md transition-all duration-200 group
                            ${isActive 
                              ? 'bg-blue-50 text-blue-700 font-medium' 
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }
                            ${isCollapsed ? 'justify-center' : ''}
                          `}
                          title={isCollapsed ? item.name : ''}
                        >
                          <span className={`shrink-0 ${!isCollapsed && 'mr-3'} ${isCollapsed ? '' : 'text-gray-500 group-hover:text-gray-700'}`}>
                            {/* Aktifse ikon rengi mavi olsun, değilse gri */}
                            {React.cloneElement(item.icon as React.ReactElement, { 
                              className: location.pathname === item.path ? 'text-blue-600' : '' 
                            })}
                          </span>
                          {!isCollapsed && (
                            <span className="truncate text-sm">{item.name}</span>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}

          {/* Admin Bölümü */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              {!isCollapsed && (
                <div className="px-2 mb-2 text-[11px] font-bold text-red-400 uppercase tracking-wider">
                  Yönetici
                </div>
              )}
              <ul className="space-y-0.5">
                {adminCategory.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => `
                        flex items-center px-2 py-2 rounded-md transition-all duration-200 group
                        ${isActive 
                          ? 'bg-red-50 text-red-700 font-medium' 
                          : 'text-gray-600 hover:bg-red-50 hover:text-red-700'
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

        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50/50">
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between'}`}>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-md text-gray-500 hover:bg-white hover:shadow-sm hover:text-gray-700 transition-all hidden md:block"
              title={isCollapsed ? 'Genişlet' : 'Daralt'}
            >
              {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center gap-2 p-2 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all ${isCollapsed ? 'w-full justify-center' : ''}`}
              title="Çıkış"
            >
              <LogOut size={18} />
              {!isCollapsed && <span className="text-sm font-medium">Çıkış</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;