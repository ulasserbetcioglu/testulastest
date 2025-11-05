import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout: React.FC = () => {
  // ✅ YENİ: Sidebar'ın durumunu (daraltılmış/genişletilmiş) yöneten state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ✅ DEĞİŞİKLİK: Sidebar'a durumu ve durumu değiştirecek fonksiyon props olarak geçiliyor */}
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      
      {/* ✅ DEĞİŞİKLİK: Ana içerik alanının sol boşluğu (margin-left) sidebar'ın durumuna göre dinamik olarak değişiyor */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
