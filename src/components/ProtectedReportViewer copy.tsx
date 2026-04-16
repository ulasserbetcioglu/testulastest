// src/components/ProtectedReportViewer.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { KeyRound, Loader2, Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  file_url: string;
  access_password: string; // Şifre alanı
  file_type: string;
  file_path: string; // ✅ EKLENDİ: Dosya yolu
}

const ProtectedReportViewer: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<Document | null>(null);

  // ✅ YENİ STATE'LER
  const [signedFileUrl, setSignedFileUrl] = useState<string | null>(null);
  const [isFetchingFile, setIsFetchingFile] = useState(false);

  useEffect(() => {
    if (!documentId) {
      setError("Belge ID'si bulunamadı.");
      setLoading(false);
      return;
    }

    // Belgeyi ve şifresini çek
    const fetchDocument = async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('documents')
          .select('id, title, file_url, access_password, file_type, file_path') // ✅ GÜNCELLENDİ: file_path çekildi
          .eq('id', documentId)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') { // No rows found
            setError("Belge bulunamadı.");
          } else {
            setError(`Belge çekilirken hata: ${fetchError.message}`);
          }
          return;
        }
        setDocument(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  // ✅ YENİ FONKSİYON: İmzalı URL'yi çek
  const fetchSignedFileUrl = async (filePath: string) => {
    setIsFetchingFile(true);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 360); // 360 saniye (6 dakika) geçerli olacak

      if (error) throw error;
      setSignedFileUrl(data.signedUrl);
    } catch (err: any) {
      setError(`Dosya yüklenirken hata: ${err.message}`);
      toast.error("Dosya yüklenirken bir hata oluştu.");
    } finally {
      setIsFetchingFile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("Lütfen şifreyi girin.");
      return;
    }
    if (!document) {
      toast.error("Belge bilgisi yüklenemedi.");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      // Şifreyi karşılaştır
      if (document.access_password === password) {
        setIsAuthenticated(true);
        toast.success("Şifre doğru, belge yükleniyor.");
        // ✅ GÜNCELLENDİ: Şifre doğruysa imzalı URL'yi çek
        if (document.file_path) {
          fetchSignedFileUrl(document.file_path);
        }
      } else {
        toast.error("Yanlış şifre. Lütfen tekrar deneyin.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = () => {
    // ✅ GÜNCELLENDİ: İndirme için imzalı URL'yi kullan
    if (!signedFileUrl) {
      toast.error("Görsel indirilmeye hazır değil.");
      return;
    }
    try {
      const link = document.createElement('a');
      link.href = signedFileUrl;
      link.download = document?.title || 'rapor_fotografi'; // document null olabilir
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("İndirme başlatıldı!");
    } catch (err: any) {
      toast.error("Görsel indirilirken hata oluştu.");
      console.error("Download error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span className="ml-3 text-lg text-gray-700">Yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-red-600 text-lg p-4 bg-red-100 rounded-lg shadow-md">
          <p>Hata: {error}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-600 text-lg p-4 bg-gray-100 rounded-lg shadow-md">
          <p>Belge bulunamadı veya erişilemiyor.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <KeyRound className="h-16 w-16 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Rapor Görüntüleyici
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Bu rapora erişmek için lütfen şifreyi girin.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handlePasswordSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Şifre (7 Haneli)
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    maxLength={7}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isVerifying ? 'Doğrulanıyor...' : 'Görüntüle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Belge görüntülendiğinde
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{document.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            disabled={isFetchingFile || !signedFileUrl} // ✅ GÜNCELLENDİ: İmzalı URL yoksa veya çekiliyorsa devre dışı bırak
          >
            {isFetchingFile ? <Loader2 className="animate-spin mr-2" /> : <Download size={20} />} İndir
          </button>
          <button
            onClick={() => setIsAuthenticated(false)} // Şifre ekranına geri dön
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            <X size={20} /> Kapat
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        {isFetchingFile ? ( // ✅ GÜNCELLENDİ: Dosya çekilirken yükleme göstergesi
          <div className="flex items-center justify-center h-[70vh]">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <span className="ml-3 text-lg text-gray-700">Dosya yükleniyor...</span>
          </div>
        ) : signedFileUrl ? ( // ✅ GÜNCELLENDİ: İmzalı URL varsa içeriği göster
          document.file_type.includes('image') ? (
            <img src={signedFileUrl} alt={document.title} className="max-w-full h-auto mx-auto" />
          ) : document.file_type.includes('pdf') ? (
            <iframe src={signedFileUrl} className="w-full h-[70vh] border-0" title={document.title} />
          ) : (
            <div className="text-center py-10">
              <p className="text-lg text-gray-600">Bu dosya türü doğrudan görüntülenemiyor.</p>
              <p className="text-sm text-gray-500">Lütfen indirme butonunu kullanarak dosyayı bilgisayarınıza kaydedin.</p>
            </div>
          )
        ) : ( // İmzalı URL yoksa hata mesajı
          <div className="text-center py-10">
            <p className="text-lg text-red-600">Dosya yüklenemedi veya erişim hatası oluştu.</p>
            <p className="text-sm text-gray-500">Lütfen daha sonra tekrar deneyin veya yöneticiyle iletişime geçin.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProtectedReportViewer;
