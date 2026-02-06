import React, { useState } from 'react';
import { FileText, Users } from 'lucide-react';
import DocumentList from '../components/Documents/DocumentList';

const OperatorDocuments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'internal' | 'public'>('internal');

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-lg md:text-2xl font-bold text-gray-800">DÖKÜMANLAR</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('internal')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 md:px-6 py-3 text-xs md:text-sm font-medium transition-colors ${
                activeTab === 'internal'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Firma ve Operatörler İçin</span>
              <span className="sm:hidden">Firma/Operatör</span>
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 md:px-6 py-3 text-xs md:text-sm font-medium transition-colors ${
                activeTab === 'public'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Herkes İçin</span>
            </button>
          </nav>
        </div>

        <div className="p-3 md:p-6">
          <DocumentList entityType={activeTab} />
        </div>
      </div>
    </div>
  );
};

export default OperatorDocuments;
