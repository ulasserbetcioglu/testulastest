import React, { useState, useEffect } from 'react';
import { Plus, FileText, FileImage, File as FilePdf } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DocumentList from '../components/Documents/DocumentList';
import DocumentUploadModal from '../components/Documents/DocumentUploadModal';

const Documents: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'customer' | 'branch' | 'operator'>('general');

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">DÖKÜMANLAR</h1>
        {isAdmin && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Döküman Yükle
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'general'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="inline-block mr-2 h-4 w-4" />
              Genel Dökümanlar
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'customer'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileImage className="inline-block mr-2 h-4 w-4" />
              Müşteri Dökümanları
            </button>
            <button
              onClick={() => setActiveTab('branch')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'branch'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <File className="inline-block mr-2 h-4 w-4" />
              Şube Dökümanları
            </button>
            <button
              onClick={() => setActiveTab('operator')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'operator'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="inline-block mr-2 h-4 w-4" />
              Operatör Dökümanları
            </button>
          </nav>
        </div>

        <div className="p-6">
          <DocumentList entityType={activeTab} />
        </div>
      </div>

      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSave={() => {}}
        entityType={activeTab}
      />
    </div>
  );
};

export default Documents;