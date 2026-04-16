// src/components/Operator/GoogleReviewPopup.tsx
import React from 'react';
import { X, Star } from 'lucide-react';

interface GoogleReviewPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleReviewPopup: React.FC<GoogleReviewPopupProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Google review link for SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ (PestMentor)
  const googleReviewLink = 'https://g.page/r/CT6-LeWlr9JjEBM/review';
  // Placeholder for a QR code image. You would generate this QR code from the googleReviewLink.
  // Example: You can use an online QR code generator and upload the image to a public URL.
  const qrCodeImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(googleReviewLink);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Müşteri Geri Bildirimi</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 text-center">
          <Star size={48} className="mx-auto text-yellow-500 mb-4" fill="currentColor" />
          <p className="text-lg font-semibold text-gray-800 mb-4">
            Değerli Müşterimiz,
          </p>
          <p className="text-gray-600 mb-6">
            Hizmetlerimizden memnun kaldıysanız, lütfen bize Google'da 5 yıldızlı bir değerlendirme bırakarak destek olur musunuz?
            Geri bildirimleriniz bizim için çok değerli!
          </p>

          <div className="mb-6">
            <img
              src={qrCodeImageUrl}
              alt="Google Review QR Code"
              className="mx-auto w-48 h-48 border border-gray-200 rounded-lg p-2"
            />
            <p className="text-sm text-gray-500 mt-2">
              Telefonunuzla QR kodu tarayarak doğrudan değerlendirme sayfasına gidebilirsiniz.
            </p>
          </div>

          <a
            href={googleReviewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Star size={20} className="mr-2" />
            Google'da Değerlendir
          </a>
        </div>

        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleReviewPopup;
