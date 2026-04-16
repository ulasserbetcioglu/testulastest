import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarRange, Warehouse, PlusCircle, Calendar } from 'lucide-react';

const navItems = [
  { path: '/operator', icon: LayoutDashboard, name: 'Panel', end: true },
  { path: '/operator/ziyaretler', icon: CalendarRange, name: 'Ziyaretler', end: false },
  { path: '/operator/depolar', icon: Warehouse, name: 'Depo', end: false },
  { path: '/operator/takvim-planlama', icon: Calendar, name: 'Planlama', end: false },
];

const MobileNavMenu: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 safe-area-bottom">
      <div className="grid grid-cols-5 items-end h-16 px-1">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-green-600' : 'text-gray-500'
                }`
              }
            >
              <Icon size={20} />
              <span className="mt-0.5 leading-tight">{item.name}</span>
            </NavLink>
          );
        })}

        <NavLink
          to="/operator/ziyaretler/yeni"
          className="flex flex-col items-center justify-center -mt-4"
        >
          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shadow-lg active:bg-green-700 transition-colors">
            <PlusCircle size={24} className="text-white" />
          </div>
          <span className="text-[9px] font-medium text-green-700 mt-0.5">Yeni</span>
        </NavLink>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-green-600' : 'text-gray-500'
                }`
              }
            >
              <Icon size={20} />
              <span className="mt-0.5 leading-tight">{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavMenu;
