import React, { useState } from 'react';
import { FileText, Users } from 'lucide-react';
import DocumentList from '../components/Documents/DocumentList';

const OperatorDocuments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'internal' | 'public'>('internal');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">DÖKÜMANLAR</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('internal')}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === 'internal'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="inline-block mr-2 h-5 w-5" />
              Firma ve Operatörler İçin
            </button>
            <button
              onClick={() => setActiveTab('public')}
              className={`flex-1 px-6 py-3 text-sm font-medium ${
                activeTab === 'public'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="inline-block mr-2 h-5 w-5" />
              Herkes İçin
            </button>
          </nav>
        </div>

        <div className="p-6">
          <DocumentList entityType={activeTab} />
        </div>
      </div>
    </div>
  );
};

export default OperatorDocuments;
