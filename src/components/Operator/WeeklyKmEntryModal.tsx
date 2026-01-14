// src/components/Operator/WeeklyKmEntryModal.tsx
import React from 'react';
import { X, Loader2 } from 'lucide-react';
import OperatorWeeklyKmForm from '../../pages/OperatorWeeklyKmForm'; // Form bileşenini import edin

interface WeeklyKmEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Form başarıyla gönderildiğinde çağrılacak
  isMandatory: boolean; // Formun zorunlu olup olmadığını belirtir
  operatorId: string; // Operatör ID'si
}

const WeeklyKmEntryModal: React.FC<WeeklyKmEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isMandatory,
  operatorId,
}) => {
  if (!isOpen) return null;

  const handleFormSuccess = () => {
    onSuccess(); // Üst bileşene bildir
    onClose(); // Modalı kapat
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold">Haftalık KM Girişi</h2>
          {!isMandatory && ( // Zorunlu değilse kapatma butonu göster
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          )}
        </div>

        <div className="p-6">
          {isMandatory && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4 mb-4">
              <p className="font-bold">Zorunlu Giriş!</p>
              <p className="text-sm">Bu haftalık KM girişi zorunludur. Lütfen formu doldurunuz.</p>
            </div>
          )}
          <OperatorWeeklyKmForm
            operatorId={operatorId}
            onSuccess={handleFormSuccess}
            // isFormRequired prop'unu burada kullanmıyoruz, modal kendisi yönetiyor
          />
        </div>
      </div>
    </div>
  );
};

export default WeeklyKmEntryModal;