// src/components/Layout/MobileNavMenu.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarRange, Warehouse, PlusCircle, Calendar } from 'lucide-react';

const MobileNavMenu: React.FC = () => {
  const navItems = [
    { path: '/operator', icon: <LayoutDashboard size={20} />, name: 'Panel' },
    { path: '/operator/ziyaretler', icon: <CalendarRange size={20} />, name: 'Ziyaretler' },
    { path: '/operator/depolar', icon: <Warehouse size={20} />, name: 'Depo' },
    { path: '/operator/takvim-planlama', icon: <Calendar size={20} />, name: 'Planlama' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
      <div className="flex justify-around items-center h-20 px-2"> {/* h-20 ile daha fazla yükseklik, px-2 ile kenar boşlukları */}
        {/* İlk iki menü öğesi */}
        {navItems.slice(0, 2).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                isActive ? 'text-green-600' : 'text-gray-600 hover:text-green-500'
              }`
            }
          >
            {item.icon}
            <span className="mt-1">{item.name}</span>
          </NavLink>
        ))}

        {/* Yeni Ziyaret butonu - Ortada ve daha büyük */}
        <NavLink
          to="/operator/ziyaretler/yeni"
          className="flex flex-col items-center justify-center bg-green-600 text-white rounded-full w-16 h-16 -mt-8 shadow-lg hover:bg-green-700 transition-colors"
          aria-label="Yeni Ziyaret Oluştur"
        >
          <PlusCircle size={28} />
          <span className="text-[10px] font-medium mt-1">Yeni Ziyaret</span>
        </NavLink>

        {/* Son iki menü öğesi */}
        {navItems.slice(2).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                isActive ? 'text-green-600' : 'text-gray-600 hover:text-green-500'
              }`
            }
          >
            {item.icon}
            <span className="mt-1">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavMenu;
