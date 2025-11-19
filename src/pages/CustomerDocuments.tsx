import React from 'react';
import DocumentList from '../components/Documents/DocumentList';

const CustomerDocuments: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">DÖKÜMANLAR</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <h2 className="px-6 py-3 text-lg font-medium">Genel Dökümanlar</h2>
        </div>

        <div className="p-6">
          <DocumentList entityType="public" />
        </div>
      </div>
    </div>
  );
};

export default CustomerDocuments;
