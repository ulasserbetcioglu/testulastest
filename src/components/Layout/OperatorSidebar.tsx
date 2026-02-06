import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  X, Warehouse, CalendarRange, ArrowRight, DollarSign,
  AlertCircle, FilePlus, Award, Calendar, BarChart2, CheckSquare,
  FileText, FileInput as FileInvoice, Grid, LogOut, LayoutDashboard,
  Package, MessageSquare, NotebookPen, ReceiptText, Car, Menu
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

const menuCategories = [
  {
    title: 'Genel',
    items: [
      { name: 'Panel', path: '/operator', icon: LayoutDashboard },
      { name: 'Modüller', path: '/operator/modules', icon: Grid },
    ]
  },
  {
    title: 'Operasyon',
    items: [
      { name: 'Günlük Kontrol', path: '/operator/gunluk-kontrol', icon: CheckSquare },
      { name: 'Ziyaretler', path: '/operator/ziyaretler', icon: CalendarRange },
      { name: 'Takvim', path: '/operator/takvim', icon: Calendar },
      { name: 'Takvim Planlama', path: '/operator/takvim-planlama', icon: CalendarRange },
      { name: 'Haftalık KM', path: '/operator/weekly-km', icon: Car },
    ]
  },
  {
    title: 'Stok & Malzeme',
    items: [
      { name: 'Depolar', path: '/operator/depolar', icon: Warehouse },
      { name: 'Transfer', path: '/operator/depolar/transfer', icon: ArrowRight },
      { name: 'Ücretli Malzemeler', path: '/operator/ucretli-malzemeler', icon: DollarSign },
      { name: 'Malzeme Kullanımı', path: '/operator/malzeme-kullanimi', icon: BarChart2 },
    ]
  },
  {
    title: 'Pazarlama',
    items: [
      { name: 'Ekipman Pazarlama', path: '/operator/ekipman-pazarlama', icon: Package },
      { name: 'Hizmet Pazarlama', path: '/operator/hizmet-pazarlama', icon: MessageSquare },
    ]
  },
  {
    title: 'Raporlama & Belgeler',
    items: [
      { name: 'DÖF', path: '/operator/dof', icon: AlertCircle },
      { name: 'Dökümanlar', path: '/operator/dokumanlar', icon: FilePlus },
      { name: 'Sertifikalar', path: '/operator/sertifikalar', icon: Award },
      { name: 'Teklifler', path: '/operator/teklifler', icon: FileText },
      { name: 'Faaliyet Rapor Takip', path: '/operator/faaliyet-rapor-takip', icon: FileText },
      { name: 'Hızlı Notlar', path: '/operator/hizli-notlar', icon: NotebookPen },
      { name: 'Tahsilat Makbuzu', path: '/operator/tahsilat-makbuzu', icon: ReceiptText },
    ]
  }
];

const adminCategory = {
  title: 'Yönetim',
  items: [
    { name: 'Fatura Dışa Aktarma', path: '/operator/fatura-export', icon: FileInvoice }
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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Çıkış yapılırken hata oluştu.");
    } else {
      navigate('/login');
    }
  };

  const closeMobile = () => {
    if (window.innerWidth < 768) setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-3 left-3 z-30 md:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-green-700 text-white shadow-md"
        aria-label="Menü"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-20 h-screen bg-white border-r border-gray-200 shadow-sm transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 w-56 flex flex-col`}
      >
        <div className="h-14 flex items-center justify-center border-b border-gray-100 shrink-0">
          <img
            src="https://i.imgur.com/PajSpus.png"
            alt="Logo"
            className="h-9 cursor-pointer"
            onClick={() => { navigate('/operator'); closeMobile(); }}
          />
        </div>

        <nav className="flex-1 overflow-y-auto h-0 py-2">
          {menuCategories.map((cat) => (
            <div key={cat.title} className="mb-1">
              <h3 className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat.title}</h3>
              {cat.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/operator'}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-green-50 text-green-700 border-l-2 border-green-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                    onClick={closeMobile}
                  >
                    <Icon size={16} />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
          {isAdmin && (
            <div className="mb-1">
              <h3 className="px-3 pt-3 pb-1 text-[10px] font-bold text-red-400 uppercase tracking-wider">{adminCategory.title}</h3>
              {adminCategory.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 mx-2 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors ${
                        isActive
                          ? 'bg-red-50 text-red-700 border-l-2 border-red-500'
                          : 'text-red-500 hover:bg-red-50 hover:text-red-700'
                      }`
                    }
                    onClick={closeMobile}
                  >
                    <Icon size={16} />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </nav>

        <div className="p-2 border-t border-gray-100 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut size={16} />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default OperatorSidebar;
