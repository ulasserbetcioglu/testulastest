import React from 'react';

const Notifications: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">BİLDİRİMLER</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">Bildirim özelliği kaldırılmıştır.</p>
      </div>
    </div>
  );
};

export default Notifications;