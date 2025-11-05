import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../Auth/AuthProvider';
import { LogOut, Menu, X, Home, Calendar, FileText, FilePlus, Award, Package, TrendingUp, Grid } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const BranchLayout: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [branchName, setBranchName] = useState('');

  useEffect(() => {
    fetchBranchInfo();
  }, []);

  const fetchBranchInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('branches')
        .select('sube_adi')
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;
      setBranchName(data.sube_adi);
    } catch (error) {
      console.error('Error fetching branch info:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/branch', icon: <Home size={20} />, name: 'Ana Sayfa' },
    { path: '/branch/modules', icon: <Grid size={20} />, name: 'Modüller' },
    { path: '/branch/takvim', icon: <Calendar size={20} />, name: 'Takvim' },
    { path: '/branch/dokumanlar', icon: <FilePlus size={20} />, name: 'Dökümanlar' },
    { path: '/branch/sertifikalar', icon: <Award size={20} />, name: 'Sertifikalar' },
    { path: '/branch/malzemeler', icon: <Package size={20} />, name: 'Malzemeler' },
    { path: '/branch/trend-analizi', icon: <TrendingUp size={20} />, name: 'Trend Analizi' },
    { path: '/branch/teklifler', icon: <FileText size={20} />, name: 'Teklifler' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-4 flex items-center">
              <img 
                src="https://i.imgur.com/PajSpus.png" 
                alt="İlaçlamatik Logo" 
                className="h-10 mr-3 cursor-pointer" 
                onClick={() => navigate('/branch')}
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-800">Şube Paneli</h1>
                {branchName && <p className="text-sm text-gray-600">{branchName}</p>}
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
          className={`${
            isSidebarOpen ? 'w-64' : 'w-0'
          } transition-all duration-300 bg-white shadow-sm fixed h-full z-10`}
        >
          <nav className="mt-4 px-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/branch'}
                    className={({ isActive }) =>
                      `flex items-center px-4 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-green-50 text-green-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-6 ${isSidebarOpen ? 'md:ml-64' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default BranchLayout;