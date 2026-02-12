// src/pages/ReportImageModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Supabase client'ı import edin
import { toast } from 'sonner';

interface ReportImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string; // ✅ DEĞİŞTİRİLDİ: imageUrl yerine filePath
  title?: string;
}

const ReportImageModal: React.FC<ReportImageModalProps> = ({ isOpen, onClose, filePath, title }) => { // ✅ DEĞİŞTİRİLDİ: imageUrl yerine filePath
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !filePath) { // ✅ DEĞİŞTİRİLDİ: imageUrl yerine filePath
      setObjectUrl(null);
      setLoadingImage(false);
      return;
    }

    const fetchAndDisplayImage = async () => { // ✅ DEĞİŞTİRİLDİ: async yapıldı
      setLoadingImage(true);
      setError(null);
      try {
        // ✅ YENİ: Signed URL oluşturma
        const { data, error: signedUrlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 3600); // 1 saat geçerli signed URL

        if (signedUrlError) throw signedUrlError;
        if (!data || !data.signedUrl) throw new Error("Signed URL alınamadı.");

        setObjectUrl(data.signedUrl);
      } catch (err: any) {
        console.error("Görsel yüklenemedi:", err);
        setError("Görsel yüklenemedi: " + err.message);
      } finally {
        setLoadingImage(false);
      }
    };

    fetchAndDisplayImage();

    // Clean up the object URL when the component unmounts or filePath changes
    return () => {
      // No need to revokeObjectURL for signed URLs
    };
  }, [isOpen, filePath]); // ✅ DEĞİŞTİRİLDİ: imageUrl yerine filePath

  const handleDownload = async () => {
    if (!objectUrl) {
      toast.error("Görsel indirilmeye hazır değil.");
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = objectUrl; // Use the object URL for download
      link.download = `${title ? title.replace(/[^a-zA-Z0-9]/g, '_') : 'rapor_fotografi'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("İndirme başlatıldı!");
    } catch (err: any) {
      toast.error("Görsel indirilirken hata oluştu.");
      console.error("Download error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800">{title || "Rapor Fotoğrafı"}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50" title="İndir" disabled={loadingImage || !objectUrl}>
              <Download size={24} />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100">
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto p-4 flex items-center justify-center">
          {loadingImage ? (
            <div className="text-center text-gray-500">Yükleniyor...</div>
          ) : error ? (
            <div className="text-center text-red-500">{error}</div>
          ) : objectUrl ? (
            <img src={objectUrl} alt={title || "Rapor Fotoğrafı"} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-center text-gray-500">Görsel bulunamadı.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportImageModal;
