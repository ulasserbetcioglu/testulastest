import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../Auth/AuthProvider';

const getPageTitle = (pathname: string): string => {
  switch (pathname) {
    case '/operator':
      return 'Operatör Paneli';
    case '/operator/uygulamalar':
      return 'Uygulamalarım';
    case '/operator/takvim':
      return 'Takvim';
    case '/operator/dokumanlar':
      return 'Dökümanlar';
    default:
      return '';
  }
};

const OperatorHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, session } = useAuth();
  const title = getPageTitle(location.pathname);
  const userEmail = session?.user?.email;

  return (
    <header className="bg-white shadow-sm h-16 flex items-center px-4 md:px-6">
      <div className="flex-1 flex justify-between items-center">
        <div className="flex items-center">
          <img 
            src="https://i.imgur.com/PajSpus.png" 
            alt="İlaçlamatik Logo" 
            className="h-10 mr-3 cursor-pointer" 
            onClick={() => navigate('/operator')}
          />
          <h1 className="text-xl md:text-2xl font-semibold text-gray-800">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-4">
            <span className="hidden md:block text-sm text-gray-700">{userEmail}</span>
            <button
              onClick={() => signOut()}
              className="flex items-center space-x-1 text-gray-600 hover:text-red-600"
            >
              <LogOut size={20} />
              <span className="hidden md:inline">Çıkış Yap</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default OperatorHeader;