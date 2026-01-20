import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { 
  Loader2, 
  Play, 
  FileImage, 
  Download, 
  Trash2, 
  RefreshCw,
  CheckSquare,
  Square,
  Search,
  AlertTriangle,
  Settings
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// --- YARDIMCI FONKSİYONLAR ---
const sanitizeFileName = (text: any) => {
  if (!text) return 'Bilinmiyor';
  const str = Array.isArray(text) ? text.join('_') : String(text);
  return str
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '');
};

const BUCKET_NAME = 'documents'; 

interface PhotoItem {
  id: string;
  oldUrl: string;
  oldPath: string;
  newPath: string;
  newName: string;
  isSelected: boolean;
  status: 'pending' | 'success' | 'error';
  message?: string;
  customerName: string;
  visitDate: string;
}

const AdminPhotoMigration = () => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [downloadLog, setDownloadLog] = useState<string[]>([]);
  const [downloadMethod, setDownloadMethod] = useState<'storage' | 'signed'>('signed');

  // 1. VERİLERİ ANALİZ ET VE LİSTELE
  const fetchPhotos = async () => {
    setLoading(true);
    setPhotos([]);
    
    try {
      let allVisits: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: visits, error } = await supabase
          .from('visits')
          .select(`
            id, visit_date, report_number, visit_type,
            report_photo_url, report_photo_file_path,
            customer:customer_id (kisa_isim, cari_isim),
            branch:branch_id (sube_adi)
          `)
          .not('report_photo_url', 'is', null)
          .neq('report_photo_url', '')
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('visit_date', { ascending: false });

        if (error) throw error;

        if (visits && visits.length > 0) {
          allVisits = [...allVisits, ...visits];
          page++;
          if (visits.length < pageSize) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      setTotalCount(allVisits.length);

      const photoList: PhotoItem[] = [];

      allVisits.forEach(visit => {
        let oldPath = visit.report_photo_file_path;
        
        if (!oldPath && visit.report_photo_url) {
           if (visit.report_photo_url.includes(`/${BUCKET_NAME}/`)) {
             const parts = visit.report_photo_url.split(`/${BUCKET_NAME}/`);
             if (parts.length > 1) oldPath = parts[1];
           }
        }

        if (oldPath) {
          const dateStr = new Date(visit.visit_date).toISOString().split('T')[0];
          // @ts-ignore
          const custName = sanitizeFileName(visit.customer?.kisa_isim || visit.customer?.cari_isim || 'Musteri');
          // @ts-ignore
          const branchName = sanitizeFileName(visit.branch?.sube_adi || 'Sube');
          const reportNo = sanitizeFileName(visit.report_number || 'NoRapor');
          const visitType = sanitizeFileName(visit.visit_type || 'Genel');
          
          const extension = oldPath.split('.').pop() || 'jpg';
          
          const lastSlashIndex = oldPath.lastIndexOf('/');
          const folderPath = lastSlashIndex !== -1 ? oldPath.substring(0, lastSlashIndex) : '';
          
          const newName = `${custName}_${branchName}_${reportNo}_${visitType}_${dateStr}.${extension}`;
          const newPath = folderPath ? `${folderPath}/${newName}` : newName;

          photoList.push({
            id: visit.id,
            oldUrl: visit.report_photo_url,
            oldPath: decodeURIComponent(oldPath),
            newPath,
            newName,
            isSelected: false,
            status: 'pending',
            customerName: custName,
            visitDate: dateStr
          });
        }
      });

      setPhotos(photoList);
      toast.success(`${photoList.length} fotoğraf yüklendi.`);

    } catch (error: any) {
      toast.error('Veri çekme hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  // --- İŞLEMLER ---

  // A. YENİDEN ADLANDIRMA
  const runRename = async () => {
    const selected = photos.filter(p => p.isSelected);
    if (selected.length === 0) return toast.warning('Lütfen en az bir fotoğraf seçin.');
    if (!confirm(`${selected.length} fotoğraf yeniden adlandırılacak. Emin misiniz?`)) return;

    setProcessing(true);
    setProgress(0);
    let count = 0;

    for (const item of selected) {
      if (item.oldPath === item.newPath) {
        count++;
        continue;
      }

      try {
        const { error: moveError } = await supabase.storage.from(BUCKET_NAME).move(item.oldPath, item.newPath);
        if (moveError) throw moveError;

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(item.newPath);
        const { error: dbError } = await supabase.from('visits').update({ 
            report_photo_url: urlData.publicUrl,
            report_photo_file_path: item.newPath 
        }).eq('id', item.id);

        if (dbError) throw dbError;

        setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'success', oldPath: item.newPath, oldUrl: urlData.publicUrl } : p));

      } catch (err: any) {
        console.error(err);
        setPhotos(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error', message: err.message } : p));
      }

      count++;
      setProgress(Math.round((count / selected.length) * 100));
    }

    setProcessing(false);
    toast.success('İsimlendirme işlemi tamamlandı.');
  };

  // B. TOPLU İNDİRME - CORS SORUNU ÇÖZÜMÜ
  const runDownload = async () => {
    const selected = photos.filter(p => p.isSelected);
    if (selected.length === 0) return toast.warning('Lütfen indirilecek fotoğrafları seçin.');

    setProcessing(true);
    setProgress(0);
    setDownloadLog([]);
    
    const zip = new JSZip();
    let count = 0;
    let successCount = 0;
    const logs: string[] = [];

    const folder = zip.folder('Rapor_Fotograflari');
    if (!folder) {
      toast.error('ZIP klasörü oluşturulamadı');
      setProcessing(false);
      return;
    }

    logs.push(`Toplam ${selected.length} dosya işlenecek...`);
    logs.push(`İndirme Yöntemi: ${downloadMethod === 'signed' ? 'Signed URL (Önerilen)' : 'Storage Download'}\n`);
    setDownloadLog([...logs]);

    for (const item of selected) {
      try {
        logs.push(`[${count + 1}/${selected.length}] İşleniyor: ${item.newName}`);
        setDownloadLog([...logs]);

        let blobData: Blob | null = null;

        if (downloadMethod === 'signed') {
          // YÖNTEM: Signed URL (CORS Bypass)
          try {
            // 1 saatlik geçerli signed URL al
            const { data: signedUrlData, error: signedError } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(item.oldPath, 3600);

            if (signedError) throw signedError;

            if (signedUrlData?.signedUrl) {
              logs.push(`  → Signed URL alındı`);
              
              // Signed URL ile dosyayı indir
              const response = await fetch(signedUrlData.signedUrl);
              
              if (response.ok) {
                blobData = await response.blob();
                
                if (blobData.size > 0) {
                  logs.push(`  ✓ İndirildi (${(blobData.size / 1024).toFixed(2)} KB)`);
                } else {
                  throw new Error('Blob boş');
                }
              } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
            } else {
              throw new Error('Signed URL alınamadı');
            }
          } catch (signedError: any) {
            logs.push(`  ✗ Signed URL hatası: ${signedError.message}`);
          }
        } else {
          // YÖNTEM: Storage Download (Eski)
          try {
            const { data, error } = await supabase.storage
              .from(BUCKET_NAME)
              .download(item.oldPath);
            
            if (!error && data && data.size > 0) {
              blobData = data;
              logs.push(`  ✓ Storage'dan indirildi (${(data.size / 1024).toFixed(2)} KB)`);
            } else {
              throw new Error(error?.message || 'Veri boş');
            }
          } catch (storageError: any) {
            logs.push(`  ✗ Storage hatası: ${storageError.message}`);
            
            // Fallback: Public URL
            try {
              logs.push(`  → Public URL deneniyor...`);
              const response = await fetch(item.oldUrl);
              
              if (response.ok) {
                blobData = await response.blob();
                if (blobData.size > 0) {
                  logs.push(`  ✓ URL'den indirildi (${(blobData.size / 1024).toFixed(2)} KB)`);
                } else {
                  throw new Error('Blob boş');
                }
              } else {
                throw new Error(`HTTP ${response.status}`);
              }
            } catch (fetchError: any) {
              logs.push(`  ✗ URL hatası: ${fetchError.message}`);
            }
          }
        }

        // ZIP'e ekle
        if (blobData && blobData.size > 0) {
          folder.file(item.newName, blobData, { binary: true });
          successCount++;
          logs.push(`  ✓ ZIP'e eklendi\n`);
        } else {
          const errorLog = `Dosya indirilemedi
Path: ${item.oldPath}
URL: ${item.oldUrl}
Müşteri: ${item.customerName}
Tarih: ${item.visitDate}`;
          
          folder.file(`HATA_${item.newName}.txt`, errorLog);
          logs.push(`  ! Hata dosyası oluşturuldu\n`);
        }

      } catch (err: any) {
        logs.push(`  ✗ Genel hata: ${err.message}\n`);
        console.error(`Hata (${item.newName}):`, err);
      }
      
      count++;
      setProgress(Math.round((count / selected.length) * 100));
      setDownloadLog([...logs]);
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      if (successCount > 0) {
        logs.push(`\n📦 ZIP oluşturuluyor... (${successCount} dosya)`);
        setDownloadLog([...logs]);
        
        const content = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        
        const sizeMB = (content.size / 1024 / 1024).toFixed(2);
        logs.push(`✓ ZIP hazır: ${sizeMB} MB`);
        setDownloadLog([...logs]);
        
        const fileName = `Rapor_Fotograflari_${new Date().toISOString().slice(0,10)}.zip`;
        saveAs(content, fileName);
        
        toast.success(`${successCount} dosya başarıyla ziplendi! (${sizeMB} MB)`);
      } else {
        toast.error("Hiçbir dosya indirilemedi. Log'u kontrol edin.");
      }
    } catch (zipError: any) {
      logs.push(`\n✗ ZIP HATASI: ${zipError.message}`);
      setDownloadLog([...logs]);
      toast.error("ZIP oluşturma hatası: " + zipError.message);
    } finally {
      setProcessing(false);
    }
  };

  // C. TOPLU SİLME
  const runDelete = async () => {
    const selected = photos.filter(p => p.isSelected);
    if (selected.length === 0) return toast.warning('Silinecek fotoğrafları seçin.');
    if (!confirm(`DİKKAT: ${selected.length} adet fotoğraf KALICI OLARAK SİLİNECEK. Geri alınamaz! Onaylıyor musunuz?`)) return;

    setProcessing(true);
    setProgress(0);

    const pathsToDelete = selected.map(p => p.oldPath);
    const idsToUpdate = selected.map(p => p.id);

    try {
      const chunkSize = 100;
      for (let i = 0; i < pathsToDelete.length; i += chunkSize) {
          const chunk = pathsToDelete.slice(i, i + chunkSize);
          await supabase.storage.from(BUCKET_NAME).remove(chunk);
      }

      const { error: dbError } = await supabase
        .from('visits')
        .update({ report_photo_url: null, report_photo_file_path: null })
        .in('id', idsToUpdate);

      if (dbError) throw dbError;

      setPhotos(prev => prev.filter(p => !idsToUpdate.includes(p.id)));
      toast.success('Seçili fotoğraflar başarıyla silindi.');

    } catch (err: any) {
      toast.error('Silme işlemi başarısız: ' + err.message);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  // --- SEÇİM ---
  const toggleSelectAll = () => {
    const allSelected = filteredPhotos.every(p => p.isSelected);
    const idsToToggle = new Set(filteredPhotos.map(p => p.id));
    
    setPhotos(prev => prev.map(p => 
      idsToToggle.has(p.id) ? { ...p, isSelected: !allSelected } : p
    ));
  };

  const toggleSelect = (id: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? ({ ...p, isSelected: !p.isSelected }) : p));
  };

  const filteredPhotos = photos.filter(p => 
    p.newName.toLowerCase().includes(filter.toLowerCase()) || 
    p.customerName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileImage className="text-purple-600"/>
            Fotoğraf Yönetim Merkezi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Toplam {totalCount} kayıt tarandı. ({photos.length} fotoğraflı kayıt)
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPhotos} disabled={processing} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-300">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
          </button>
        </div>
      </div>

      {/* ARAÇ ÇUBUĞU */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4">
        {/* Üst Satır */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 text-gray-600 font-medium hover:text-gray-900">
              {filteredPhotos.length > 0 && filteredPhotos.every(p => p.isSelected) ? <CheckSquare className="w-5 h-5 text-purple-600"/> : <Square className="w-5 h-5"/>}
              Tümünü Seç ({photos.filter(p => p.isSelected).length})
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4"/>
            <input 
              type="text" 
              placeholder="Ara..." 
              className="w-full pl-9 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Alt Satır - Butonlar ve Ayarlar */}
        <div className="flex flex-wrap gap-4 items-center justify-between border-t pt-4">
          <div className="flex items-center gap-3 bg-blue-50 px-3 py-2 rounded-lg">
            <Settings className="w-4 h-4 text-blue-600"/>
            <span className="text-xs font-medium text-gray-700">İndirme Yöntemi:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="download-method" 
                checked={downloadMethod === 'signed'}
                onChange={() => setDownloadMethod('signed')}
                className="text-blue-600"
              />
              <span className="text-xs font-medium">Signed URL (Önerilen)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="download-method" 
                checked={downloadMethod === 'storage'}
                onChange={() => setDownloadMethod('storage')}
                className="text-blue-600"
              />
              <span className="text-xs font-medium">Storage API</span>
            </label>
          </div>

          <div className="flex gap-2 flex-1 md:flex-initial justify-end">
            <button 
              onClick={runRename} 
              disabled={processing}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              <Play size={16}/> İsimleri Düzelt
            </button>
            <button 
              onClick={runDownload} 
              disabled={processing}
              className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              <Download size={16}/> İndir (ZIP)
            </button>
            <button 
              onClick={runDelete} 
              disabled={processing}
              className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
            >
              <Trash2 size={16}/> Sil
            </button>
          </div>
        </div>
      </div>

      {/* İLERLEME */}
      {processing && (
        <div className="mb-6 bg-white p-4 rounded-xl border border-blue-100 shadow-sm animate-in fade-in">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-bold text-blue-700 flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> İşleniyor...</span>
            <span className="text-sm font-bold text-blue-700">%{progress}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {/* İNDİRME LOG */}
      {downloadLog.length > 0 && (
        <div className="mb-6 bg-gray-900 text-green-400 p-4 rounded-xl shadow-lg max-h-96 overflow-y-auto font-mono text-xs">
          {downloadLog.map((log, idx) => (
            <div key={idx} className="mb-1 whitespace-pre-wrap">{log}</div>
          ))}
        </div>
      )}

      {/* TABLO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">Önizleme</th>
                <th className="px-4 py-3">Müşteri / Şube</th>
                <th className="px-4 py-3">Mevcut Dosya Adı</th>
                <th className="px-4 py-3">Olması Gereken</th>
                <th className="px-4 py-3 text-center">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPhotos.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Fotoğraf bulunamadı.</td></tr>
              ) : (
                filteredPhotos.map((photo) => (
                  <tr key={photo.id} className={`hover:bg-gray-50 transition-colors ${photo.isSelected ? 'bg-purple-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(photo.id)} className="text-purple-600">
                        {photo.isSelected ? <CheckSquare className="w-5 h-5"/> : <Square className="w-5 h-5 text-gray-300"/>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <a href={photo.oldUrl} target="_blank" rel="noreferrer" className="block w-12 h-12 rounded bg-gray-100 overflow-hidden border border-gray-200 hover:scale-150 transition-transform origin-left">
                        <img src={photo.oldUrl} alt="Img" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://placehold.co/50x50?text=?')}/>
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{photo.customerName}</div>
                      <div className="text-xs text-gray-500">{photo.visitDate}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-gray-500 text-xs font-mono" title={photo.oldPath}>
                      {photo.oldPath}
                    </td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <div className={`text-xs font-mono break-all ${photo.oldPath !== photo.newPath ? 'text-green-600 font-bold bg-green-50 px-2 py-1 rounded' : 'text-gray-400'}`}>
                        {photo.newName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {photo.status === 'success' && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Tamam</span>}
                      {photo.status === 'error' && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold" title={photo.message}>Hata</span>}
                      {photo.status === 'pending' && <span className="text-gray-300">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPhotoMigration;