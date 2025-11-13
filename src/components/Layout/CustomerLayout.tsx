import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../Auth/AuthProvider'; // Gerçek import
import { LogOut, Menu, X, Home, Calendar, FileText, AlertCircle, FilePlus, Award, Package, TrendingUp, Bug } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Gerçek import
import { localAuth } from '../../lib/localAuth'; // Gerçek import

const CustomerLayout: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/customer', icon: <Home size={20} />, name: 'Ana Sayfa' },
    { path: '/customer/ziyaretler', icon: <FileText size={20} />, name: 'Ziyaretler' },
    { path: '/customer/takvim', icon: <Calendar size={20} />, name: 'Takvim' },
    { path: '/customer/dof', icon: <AlertCircle size={20} />, name: 'DÖF' },
    { path: '/customer/dokumanlar', icon: <FilePlus size={20} />, name: 'Dökümanlar' },
    { path: '/customer/sertifikalar', icon: <Award size={20} />, name: 'Sertifikalar' },
    { path: '/customer/malzemeler', icon: <Package size={20} />, name: 'Malzemeler' },
    { path: '/customer/pestisit-raporu', icon: <Bug size={20} />, name: 'Pestisit Raporu' },
    { path: '/customer/trend-analizi', icon: <TrendingUp size={20} />, name: 'Trend Analizi' },
    { path: '/customer/teklifler', icon: <FileText size={20} />, name: 'Teklifler' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobil için karartma perdesi (backdrop/scrim) */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 md:hidden ${
          isSidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 h-16">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
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
            ${/* Mobil: fixed, z-50 */''}
            fixed top-0 left-0 z-50 h-screen w-64 bg-white shadow-lg 
            overflow-y-auto overflow-x-hidden 
            transition-all duration-300 ease-in-out
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            
            ${/* Desktop: relative, sticky */''}
            md:relative md:translate-x-0 md:z-auto
            md:h-[calc(100vh-4rem)] ${/* h-16 */''}
            md:sticky md:top-16 
            ${isSidebarOpen ? 'md:w-64' : 'md:w-0'}
          `}
        >
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
                    <span className="ml-3 whitespace-nowrap">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
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