import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import DocumentList from '../Documents/DocumentList';
import DocumentUploadModal from '../Documents/DocumentUploadModal';

interface CustomerDocumentsProps {
  customerId: string;
}

const CustomerDocuments: React.FC<CustomerDocumentsProps> = ({ customerId }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Dökümanlar</h2>
        {isAdmin && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Döküman Ekle
          </button>
        )}
      </div>

      <DocumentList 
        entityType="customer" 
        entityId={customerId} 
        showFilters={false}
      />

      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSave={() => {}}
        entityType="customer"
        entityId={customerId}
      />
    </div>
  );
};

export default CustomerDocuments;