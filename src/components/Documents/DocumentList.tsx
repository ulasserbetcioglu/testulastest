import React, { useState, useEffect } from 'react';
import { Download, Trash2, Eye, Search, Filter, FileText, FileImage, File, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface Document {
  id: string;
  title: string;
  description: string;
  file_path: string;
  file_url: string;
  file_type: string;
  file_size: number;
  document_type: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  created_by: string;
  creator?: {
    email: string;
  };
}

interface DocumentListProps {
  entityType: 'customer' | 'branch' | 'operator' | 'general';
  entityId?: string;
  showFilters?: boolean;
}

const DocumentList: React.FC<DocumentListProps> = ({
  entityType,
  entityId,
  showFilters = true
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchDocuments();
  }, [entityType, entityId]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Use a simpler query without trying to join with users table
      let query = supabase
        .from('documents')
        .select('*')
        .eq('entity_type', entityType);
        
      if (entityId) {
        query = query.eq('entity_id', entityId);
      } else if (entityType !== 'general') {
        query = query.is('entity_id', null);
      }
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      // Get user emails in a separate query if needed
      if (data && data.length > 0) {
        const userIds = data.map(doc => doc.created_by).filter(Boolean);
        
        if (userIds.length > 0) {
          const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
          
          if (!userError && userData) {
            const userMap = new Map();
            userData.users.forEach(user => {
              userMap.set(user.id, { email: user.email });
            });
            
            // Add creator info to documents
            data.forEach(doc => {
              if (doc.created_by && userMap.has(doc.created_by)) {
                doc.creator = userMap.get(doc.created_by);
              }
            });
          }
        }
      }
      
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    if (!isAdmin) {
      toast.error('Sadece admin kullanıcısı döküman silebilir');
      return;
    }
    
    if (!confirm('Bu dökümanı silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      // First delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);
        
      if (storageError) throw storageError;
      
      // Then delete the record from the database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
        
      if (dbError) throw dbError;
      
      toast.success('Döküman başarıyla silindi');
      fetchDocuments();
    } catch (err: any) {
      toast.error('Döküman silinirken bir hata oluştu');
      console.error('Error deleting document:', err);
    }
  };

  const handlePreview = (document: Document) => {
    setPreviewDocument(document);
    setShowPreview(true);
  };

  const handleDownload = async (document: Document) => {
    try {
      // For direct download, we can use the public URL
      const a = document.createElement('a');
      a.href = document.file_url;
      a.download = document.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('Döküman indiriliyor');
    } catch (err: any) {
      toast.error('Döküman indirilirken bir hata oluştu');
      console.error('Error downloading document:', err);
    }
  };

  const getDocumentTypeText = (type: string) => {
    switch (type) {
      case 'quality':
        return 'Kalite Dökümanı';
      case 'workplace':
        return 'İş Yeri Dökümanı';
      case 'biocidal':
        return 'Biyosidal Ürün Ruhsatı';
      case 'msds':
        return 'MSDS';
      default:
        return 'Diğer';
    }
  };

  const getFileIcon = (fileType: string) => {
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || doc.document_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Döküman Adı veya Açıklama"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full md:w-48 border rounded p-2"
            >
              <option value="">Tüm Döküman Türleri</option>
              <option value="quality">Kalite Dökümanları</option>
              <option value="workplace">İş Yeri Dökümanları</option>
              <option value="biocidal">Biyosidal Ürün Ruhsatları</option>
              <option value="msds">MSDS</option>
              <option value="other">Diğer</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Yükleniyor...
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-red-500">
          Hata: {error}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Henüz döküman bulunmuyor
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Döküman
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tür
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boyut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Yükleyen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getFileIcon(doc.file_type)}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{doc.title}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{doc.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {getDocumentTypeText(doc.document_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.creator?.email || 'Bilinmiyor'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handlePreview(doc)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Önizle"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="text-green-600 hover:text-green-900"
                          title="İndir"
                        >
                          <Download size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(doc.id, doc.file_path)}
                            className="text-red-600 hover:text-red-900"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showPreview && previewDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">{previewDocument.title}</h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewDocument(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {previewDocument.file_type.includes('image') ? (
                <img 
                  src={previewDocument.file_url} 
                  alt={previewDocument.title} 
                  className="max-w-full h-auto mx-auto"
                />
              ) : previewDocument.file_type.includes('pdf') ? (
                <iframe 
                  src={previewDocument.file_url} 
                  className="w-full h-[70vh]" 
                  title={previewDocument.title}
                />
              ) : (
                <div className="text-center p-8">
                  <FileText size={64} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Bu dosya türü önizleme için desteklenmiyor</p>
                  <p className="text-gray-500 mt-2">Dosyayı görüntülemek için indirmeniz gerekiyor</p>
                  <button
                    onClick={() => handleDownload(previewDocument)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 inline-flex items-center"
                  >
                    <Download size={16} className="mr-2" />
                    İndir
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Açıklama</h4>
                  <p className="text-sm">{previewDocument.description || 'Açıklama yok'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Detaylar</h4>
                  <p className="text-sm">Tür: {getDocumentTypeText(previewDocument.document_type)}</p>
                  <p className="text-sm">Boyut: {formatFileSize(previewDocument.file_size)}</p>
                  <p className="text-sm">Yüklenme Tarihi: {new Date(previewDocument.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentList;