import React from 'react';
import DocumentList from '../components/Documents/DocumentList';
import BranchIpmView from '../components/Ipm/BranchIpmView';

const CustomerDocuments: React.FC = () => {
  const localSession = localStorage.getItem('local_session');
  let customerId: string | undefined;
  if (localSession) {
    try {
      const session = JSON.parse(localSession);
      if (session.type === 'customer') customerId = session.id;
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">DOKUMANLAR</h1>
      </div>

      {customerId && (
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <h2 className="px-6 py-3 text-lg font-medium">IPM Sozlesmesi</h2>
          </div>
          <div className="p-6">
            <BranchIpmView customerId={customerId} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <h2 className="px-6 py-3 text-lg font-medium">Genel Dokumanlar</h2>
        </div>
        <div className="p-6">
          <DocumentList entityType="public" />
        </div>
      </div>
    </div>
  );
};

export default CustomerDocuments;
