import React from 'react';

const AdminNotifications: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">BİLDİRİM GÖNDER</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Bildirim gönderme özelliği kaldırılmıştır.</p>
      </div>
    </div>
  );
};

export default AdminNotifications;