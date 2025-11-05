import React, { useState } from 'react';
import { X, Upload, File, FileText, FileImage, FilePlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  entityType: 'customer' | 'branch' | 'operator' | 'general';
  entityId?: string;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  entityType,
  entityId
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('quality');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('Dosya boyutu 10MB\'dan küçük olmalıdır');
        return;
      }
      
      // Check file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Sadece PDF, JPEG, PNG, JPG ve DOC/DOCX dosyaları yüklenebilir');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Auto-fill title if empty
      if (!title) {
        setTitle(selectedFile.name.split('.')[0]);
      }
    }
  };

  const getFileIcon = (fileType: string | undefined) => {
    if (!fileType) return <File />;
    
    if (fileType.includes('pdf')) {
      return <FileText className="text-red-500" />;
    } else if (fileType.includes('image')) {
      return <FileImage className="text-blue-500" />;
    } else if (fileType.includes('word')) {
      return <FileText className="text-blue-700" />;
    } else {
      return <File className="text-gray-500" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Lütfen bir dosya seçin');
      return;
    }
    
    if (!title) {
      setError('Lütfen bir başlık girin');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `documents/${entityType}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      // 3. Save document metadata to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          title,
          description,
          file_path: filePath,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          document_type: documentType,
          entity_type: entityType,
          entity_id: entityId || null,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);
        
      if (dbError) throw dbError;
      
      toast.success('Döküman başarıyla yüklendi');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error uploading document:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Döküman Yükle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Döküman Türü
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="quality">Kalite Dökümanı</option>
                <option value="workplace">İş Yeri Dökümanı</option>
                <option value="biocidal">Biyosidal Ürün Ruhsatı</option>
                <option value="msds">MSDS (Güvenlik Bilgi Formu)</option>
                <option value="other">Diğer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Başlık
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dosya
              </label>
              {file ? (
                <div className="flex items-center p-3 bg-gray-50 rounded border">
                  {getFileIcon(file.type)}
                  <div className="ml-3 flex-1 truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
                      >
                        <span>Dosya seçin</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                      </label>
                      <p className="pl-1">veya sürükleyip bırakın</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, JPEG, PNG, DOC, DOCX (max. 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={loading || !file}
            >
              {loading ? 'Yükleniyor...' : 'Yükle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;