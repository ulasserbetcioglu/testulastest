import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../Auth/AuthProvider';
import {
  LogOut,
  Menu,
  X,
  Home,
  Calendar,
  FileText,
  AlertCircle,
  FilePlus,
  Award,
  Package,
  TrendingUp,
  Bug,
  Building,
  FolderOpen,
  Bell,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { localAuth } from '../../lib/localAuth';

const CustomerLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    fetchCustomerInfo();
    // Mobile check
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/customer', icon: <Home size={20} />, name: 'Ana Sayfa' },
    { path: '/customer/subeler', icon: <Building size={20} />, name: 'Şubelerim' },
    { path: '/customer/ziyaretler', icon: <FileText size={20} />, name: 'Ziyaretler' },
    { path: '/customer/takvim', icon: <Calendar size={20} />, name: 'Takvim' },
    { path: '/customer/dof', icon: <AlertCircle size={20} />, name: 'DÖF Takip' },
    { path: '/customer/faaliyet-dosyasi', icon: <FolderOpen size={20} />, name: 'Faaliyet Dosyası' },
    { path: '/customer/dokumanlar', icon: <FilePlus size={20} />, name: 'Dökümanlar' },
    { path: '/customer/sertifikalar', icon: <Award size={20} />, name: 'Sertifikalar' },
    { path: '/customer/malzemeler', icon: <Package size={20} />, name: 'Malzemeler' },
    { path: '/customer/pestisit-raporu', icon: <Bug size={20} />, name: 'Pestisit Raporu' },
    { path: '/customer/trend-analizi', icon: <TrendingUp size={20} />, name: 'Trend Analizi' },
    { path: '/customer/teklifler', icon: <FileText size={20} />, name: 'Teklifler' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 text-gray-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col shadow-xl`}
      >
        {/* Logo Section */}
        <div className="relative z-10 flex items-center h-20 px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src="https://i.imgur.com/PajSpus.png"
              alt="İlaçlamatik"
              className="h-12 w-auto object-contain"
            />
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="ml-auto lg:hidden text-gray-500 hover:text-gray-800"
          >
            <X size={24} />
          </button>
        </div>

        {/* User Profile */}
        <div className="relative z-10 p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-green-600 flex items-center justify-center text-white font-bold shrink-0 shadow-md">
              {customerName ? customerName.substring(0, 2).toUpperCase() : 'CU'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-800 whitespace-nowrap truncate">{customerName || 'Müşteri'}</p>
              <p className="text-xs text-green-600 font-medium">Müşteri Paneli</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="relative z-10 flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/customer'}
                onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                    ? 'bg-green-50 text-green-700 font-bold shadow-sm ring-1 ring-green-100'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`
                }
              >
                <span className="relative z-10 shrink-0">
                  {/* Clone element to change color based on active state if needed, or just rely on CSS inheritance */}
                  {React.cloneElement(item.icon as React.ReactElement, {
                    className: "transition-colors duration-200"
                  })}
                </span>
                <span className="ml-3 text-sm font-medium whitespace-nowrap relative z-10">
                  {item.name}
                </span>
                {/* Active Indicator */}
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-green-500 rounded-r-full transition-all duration-300 ${location.pathname === item.path ? 'opacity-100' : 'opacity-0'}`} />
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="relative z-10 p-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-3 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="ml-3 text-sm font-medium whitespace-nowrap">
              Çıkış Yap
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 hidden sm:block">
              {navItems.find(i => i.path === location.pathname)?.name || 'Panel'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center bg-gray-50 border border-gray-200 rounded-full px-4 py-2 w-64 focus-within:ring-2 focus-within:ring-green-500 transition-all">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Ara..."
                className="bg-transparent border-none focus:outline-none text-sm ml-2 w-full text-gray-600 placeholder-gray-400"
              />
            </div>
            <button className="relative p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;