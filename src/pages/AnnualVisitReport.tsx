import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Search, AlertCircle, RefreshCw, Package, CheckSquare, Square, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// --- TİP TANIMLARI ---
interface ReportRow {
  musteri_no: string;
  sube_id: string;
  cari_isim: string;
  sube_adi: string;
  branch_uuid: string;
  months: {
    [key: number]: {
      // Ziyaret Verileri
      visitCount: number;
      hasVisit: boolean;
      visitDetails: string[];
      visitIds: string[]; 
      visitCheckedCount: number; // is_checked (Takvim onayı) sayısı
      
      // Malzeme Verileri
      hasMaterial: boolean;
      materialDetails: string[];
      materialBreakdown: Record<string, number>;
      totalMaterialCount: number;
      materialSaleIds: string[]; 
      materialInvoicedCount: number; // is_invoiced (Fatura) sayısı
    };
  };
}

interface VisitData {
  id: string;
  branch_id: string;
  visit_date: string;
  status: string;
  is_checked: boolean; // TAKVİMDEKİ ONAY
  operator?: {
    name: string;
  };
  // İlişkisel veri (Tek seferde çekilecek)
  paid_material_sales?: {
    id: string;
    is_invoiced: boolean;
    paid_material_sale_items: {
      quantity: number;
      product: { name: string } | null;
    }[];
  }[];
}

const AnnualVisitReport = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportRow[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const fetchReportData = async () => {
    setLoading(true);
    setErrorMsg(null);
    setProgress('Veriler hazırlanıyor...');
    
    try {
      // 1. Şubeleri Çek
      const { data: branches, error: branchError } = await supabase
        .from('branches')
        .select(`
          id,
          sube_adi,
          customer_id,
          customer:customer_id (
            id,
            musteri_no,
            kisa_isim,
            cari_isim
          )
        `);

      if (branchError) throw new Error(`Şubeler çekilemedi: ${branchError.message}`);

      // 2. Ziyaretleri ve Malzemeleri TEK SORGUDA Çek (Performans ve Veri Bütünlüğü İçin)
      setProgress('Ziyaretler ve malzeme verileri çekiliyor...');
      const startDate = `${year}-01-01T00:00:00`;
      const endDate = `${year}-12-31T23:59:59`;
      
      let allVisits: VisitData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        // visits tablosundan is_checked, paid_material_sales tablosundan is_invoiced çekiyoruz
        const { data: visitsChunk, error: visitError } = await supabase
          .from('visits')
          .select(`
            id, 
            branch_id, 
            visit_date, 
            status,
            is_checked, 
            operator:operator_id ( name ),
            paid_material_sales (
                id,
                is_invoiced,
                paid_material_sale_items (
                    quantity,
                    product:product_id ( name )
                )
            )
          `)
          .gte('visit_date', startDate)
          .lte('visit_date', endDate)
          .neq('status', 'cancelled')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (visitError) throw new Error(`Veri çekilemedi: ${visitError.message}`);

        if (visitsChunk && visitsChunk.length > 0) {
          // Tip dönüşümü (Supabase dönüşü ile VisitData arayüzü eşleşmesi)
          const typedChunk = visitsChunk as unknown as VisitData[];
          allVisits = [...allVisits, ...typedChunk];
          
          if (visitsChunk.length < pageSize) {
            hasMore = false;
          } else {
            page++;
            setProgress(`${allVisits.length} işlem analiz edildi...`);
          }
        } else {
          hasMore = false;
        }
      }

      // 3. Veriyi İşle ve Tabloyu Oluştur
      setProgress('Rapor oluşturuluyor...');
      
      const processedData: ReportRow[] = (branches || []).map((branch: any) => {
        const customer = branch.customer;
        const subeIdShort = branch.id && branch.id.includes('-') ? branch.id.split('-')[0] : branch.id?.substring(0, 8);

        const row: ReportRow = {
          musteri_no: customer?.musteri_no || '-',
          sube_id: subeIdShort || '-', 
          cari_isim: customer?.kisa_isim || customer?.cari_isim || 'İsimsiz Cari',
          sube_adi: branch.sube_adi || 'İsimsiz Şube',
          branch_uuid: branch.id,
          months: {}
        };

        // Ayları başlat
        for (let i = 0; i < 12; i++) {
          row.months[i] = { 
            visitCount: 0, 
            hasVisit: false, 
            visitDetails: [],
            visitIds: [],
            visitCheckedCount: 0,
            
            hasMaterial: false,
            materialDetails: [],
            materialBreakdown: {},
            totalMaterialCount: 0,
            materialSaleIds: [],
            materialInvoicedCount: 0
          };
        }

        // Ziyaretleri ve içindeki malzemeleri dağıt
        allVisits.forEach((visit) => {
          if (visit.branch_id === branch.id) {
            const visitDate = new Date(visit.visit_date);
            const monthIndex = visitDate.getMonth();
            
            if (row.months[monthIndex]) {
              const mData = row.months[monthIndex];
              
              // --- ZİYARET VERİLERİ ---
              mData.visitCount += 1;
              mData.hasVisit = true;
              mData.visitIds.push(visit.id);
              
              // Takvimdeki "Kontrol Edildi" (is_checked) durumu
              if (visit.is_checked) mData.visitCheckedCount += 1; 
              
              const dateStr = visitDate.toLocaleDateString('tr-TR');
              const operatorName = visit.operator?.name ? ` - ${visit.operator.name}` : '';
              const statusStr = visit.status === 'completed' ? 'Tamamlandı' : 'Planlandı';
              const checkStr = visit.is_checked ? ' [ONAYLI]' : '';
              
              mData.visitDetails.push(`${dateStr} (${statusStr})${operatorName}${checkStr}`);
              
              // --- MALZEME VERİLERİ ---
              if (visit.paid_material_sales && visit.paid_material_sales.length > 0) {
                mData.hasMaterial = true;
                
                visit.paid_material_sales.forEach(sale => {
                    mData.materialSaleIds.push(sale.id);
                    // Fatura kesildi durumu (is_invoiced)
                    if (sale.is_invoiced) mData.materialInvoicedCount += 1;

                    // Malzeme detayları (Tooltip için)
                    const itemStrs: string[] = [];
                    sale.paid_material_sale_items.forEach(item => {
                        const pName = item.product?.name || 'Ürün';
                        itemStrs.push(`${pName} (${item.quantity})`);
                        
                        // Toplamlar
                        const currentQty = mData.materialBreakdown[pName] || 0;
                        mData.materialBreakdown[pName] = currentQty + item.quantity;
                        mData.totalMaterialCount += item.quantity;
                    });
                    
                    if (itemStrs.length > 0) {
                        mData.materialDetails.push(`${dateStr}: ${itemStrs.join(', ')}`);
                    }
                });
              }
            }
          }
        });

        return row;
      });

      processedData.sort((a, b) => a.cari_isim.localeCompare(b.cari_isim));
      setData(processedData);

    } catch (error: any) {
      console.error('Rapor hatası:', error);
      setErrorMsg(error.message || 'Bilinmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [year]);

  // --- DURUM GÜNCELLEME (TOPLU) ---
  const toggleStatus = async (
      rowIdx: number, 
      monthIdx: number, 
      type: 'visit' | 'material', 
      ids: string[], 
      targetStatus: boolean
    ) => {
    
    if (ids.length === 0) return;
    setUpdating(true);

    try {
        let table = '';
        let field = '';

        if (type === 'visit') {
            table = 'visits';
            field = 'is_checked'; // Ziyaret tablosundaki 'is_checked' alanını güncelle
        } else {
            table = 'paid_material_sales';
            field = 'is_invoiced'; // Satış tablosundaki 'is_invoiced' alanını güncelle
        }
        
        // 1. Veritabanını Güncelle
        const { error } = await supabase
            .from(table)
            .update({ [field]: targetStatus })
            .in('id', ids);

        if (error) throw error;

        // 2. Arayüzü Güncelle (Optimistic Update - Hızlı tepki için)
        const newData = [...data];
        const mData = newData[rowIdx].months[monthIdx];
        
        if (type === 'visit') {
            mData.visitCheckedCount = targetStatus ? mData.visitCount : 0;
        } else {
            mData.materialInvoicedCount = targetStatus ? mData.materialSaleIds.length : 0; 
        }
        
        setData(newData);
        const actionText = type === 'visit' ? (targetStatus ? 'onaylandı' : 'onayı kaldırıldı') : (targetStatus ? 'faturalandı' : 'iptal edildi');
        toast.success(`${ids.length} kayıt ${actionText}.`);

    } catch (err: any) {
        toast.error("Güncelleme başarısız: " + err.message);
    } finally {
        setUpdating(false);
    }
  };

  const generateMaterialSummary = (mData: ReportRow['months'][0]) => {
     if (!mData.hasMaterial) return '';
     let text = 'ZİYARET DETAYLARI:\n' + mData.materialDetails.join('\n');
     text += '\n\n----------------\nÜRÜN BAZLI TOPLAM:\n';
     Object.entries(mData.materialBreakdown).forEach(([name, qty]) => {
       text += `${name}: ${qty}\n`;
     });
     text += `----------------\nGENEL TOPLAM: ${mData.totalMaterialCount} Adet`;
     return text;
  };

  const exportToExcel = () => {
    const exportData = data.map(row => {
      const flatRow: any = {
        'Müşteri No': row.musteri_no,
        'Şube No': row.sube_id,
        'Cari Ad': row.cari_isim,
        'Şube Adı': row.sube_adi,
      };

      months.forEach((month, index) => {
        const mData = row.months[index];
        // Ziyaret tamamen onaylı mı?
        const isVisitFullyChecked = mData.visitCount > 0 && mData.visitCount === mData.visitCheckedCount;
        // Malzeme tamamen faturalı mı?
        const isMatFullyInvoiced = mData.hasMaterial && mData.materialSaleIds.length === mData.materialInvoicedCount;

        flatRow[`${month} (Ziyaret Sayısı)`] = mData.visitCount;
        flatRow[`${month} (Ziyaret Onay)`] = isVisitFullyChecked ? 'EVET' : (mData.visitCheckedCount > 0 ? 'KISMEN' : 'HAYIR');
        
        flatRow[`${month} (Malzeme)`] = mData.hasMaterial ? `Var (${mData.totalMaterialCount})` : '-';
        flatRow[`${month} (Malzeme Fatura)`] = isMatFullyInvoiced ? 'EVET' : (mData.materialInvoicedCount > 0 ? 'KISMEN' : 'HAYIR');
      });

      return flatRow;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${year} Yıllık Rapor`);
    XLSX.writeFile(wb, `Yillik_Rapor_Detayli_${year}.xlsx`);
  };

  const filteredData = data.filter(row => 
    row.cari_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.musteri_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yıllık Ziyaret ve Fatura Takibi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {year} yılı analiz tablosu. <strong>Ziyaret kutucuğu "is_checked" (Takvim Onayı)</strong>, Malzeme kutucuğu <strong>"is_invoiced" (Fatura)</strong> alanlarını kontrol eder.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
             <input
               type="text"
               placeholder="Müşteri, Şube Ara..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
             />
          </div>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={fetchReportData}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            title="Verileri Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-700">
          <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold">Veri Çekme Hatası</h3>
            <p className="text-sm mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-200 flex flex-col h-[calc(100vh-200px)]">
        <div className="overflow-auto flex-1">
          <table className="min-w-max text-sm text-left border-collapse">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="py-3 px-4 border-r w-[120px] min-w-[120px] sticky left-0 bg-gray-50 z-30">Müşteri No</th>
                <th className="py-3 px-4 border-r w-[200px] min-w-[200px] sticky left-[120px] bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Cari / Şube</th>
                {months.map((month) => (
                  <th key={month} colSpan={2} className="py-2 px-2 border-r text-center min-w-[120px] bg-blue-50/30">
                    {month}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 bg-gray-50 z-30 border-r border-b"></th>
                <th className="sticky left-[120px] bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-b"></th>
                {months.map((_, idx) => (
                  <React.Fragment key={idx}>
                    <th className="py-1 px-1 border-r border-b text-[10px] text-center text-gray-500 bg-gray-50 font-normal">Ziyaret</th>
                    <th className="py-1 px-1 border-r border-b text-[10px] text-center text-gray-500 bg-gray-50 font-normal">Malz.</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && data.length === 0 ? (
                <tr>
                  <td colSpan={26} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="w-8 h-8 animate-spin mb-2 text-blue-500" />
                      <span className="mt-2 text-sm font-medium">{progress || 'Veriler yükleniyor...'}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={26} className="py-12 text-center text-gray-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIdx) => (
                  <tr key={`${row.musteri_no}-${row.sube_id}-${rowIdx}`} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-2 px-4 border-r font-medium text-gray-900 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-b">
                      {row.musteri_no}
                    </td>
                    <td className="py-2 px-4 border-r text-gray-600 sticky left-[120px] bg-white group-hover:bg-blue-50/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b">
                      <div className="font-medium text-gray-900 truncate max-w-[180px]" title={row.cari_isim}>{row.cari_isim}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[180px]" title={row.sube_adi}>{row.sube_adi}</div>
                    </td>

                    {months.map((_, mIdx) => {
                      const mData = row.months[mIdx];
                      
                      // Ziyaret Onay Durumu: Hepsi (is_checked) true mu?
                      const isVisitFullyChecked = mData.visitCount > 0 && mData.visitCount === mData.visitCheckedCount;
                      
                      // Malzeme Fatura Durumu: Hepsi (is_invoiced) true mu?
                      const isMatFullyInvoiced = mData.hasMaterial && mData.materialSaleIds.length > 0 && mData.materialSaleIds.length === mData.materialInvoicedCount;

                      return (
                        <React.Fragment key={mIdx}>
                          {/* Ziyaret Sütunu (is_checked) */}
                          <td 
                            className={`py-2 px-1 border-r border-b text-center align-middle transition-colors ${mData.hasVisit ? (isVisitFullyChecked ? 'bg-green-100' : 'bg-green-50') : ''}`}
                          >
                            {mData.hasVisit ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="text-xs font-bold text-green-700 cursor-help" title={mData.visitDetails.join('\n')}>{mData.visitCount}</span>
                                <button 
                                    onClick={() => toggleStatus(rowIdx, mIdx, 'visit', mData.visitIds, !isVisitFullyChecked)}
                                    disabled={updating}
                                    className="text-gray-400 hover:text-green-600 focus:outline-none disabled:opacity-50"
                                    title={isVisitFullyChecked ? "Onayı Kaldır (Takvimden de kalkar)" : "Tümünü Onayla (Takvimde de onaylanır)"}
                                >
                                    {isVisitFullyChecked ? <CheckSquare size={14} className="text-green-600"/> : <Square size={14} />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-200 text-xs">-</span>
                            )}
                          </td>
                          
                          {/* Malzeme Sütunu (is_invoiced) */}
                          <td 
                            className={`py-2 px-1 border-r border-b text-center align-middle transition-colors ${mData.hasMaterial ? (isMatFullyInvoiced ? 'bg-orange-100' : 'bg-orange-50') : ''}`}
                          >
                             {mData.hasMaterial ? (
                               <div className="flex flex-col items-center justify-center gap-1">
                                 <span className="text-[10px] font-bold text-orange-700 cursor-help" title={generateMaterialSummary(mData)}>
                                   {mData.totalMaterialCount}
                                 </span>
                                 <button 
                                    onClick={() => toggleStatus(rowIdx, mIdx, 'material', mData.materialSaleIds, !isMatFullyInvoiced)}
                                    disabled={updating}
                                    className="text-gray-400 hover:text-orange-600 focus:outline-none disabled:opacity-50"
                                    title={isMatFullyInvoiced ? "Faturayı İptal Et" : "Fatura Kesildi Olarak İşaretle"}
                                >
                                    {isMatFullyInvoiced ? <CheckSquare size={14} className="text-orange-600"/> : <Square size={14} />}
                                </button>
                               </div>
                             ) : (
                               <span className="text-gray-200 text-xs">-</span>
                             )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-3 bg-gray-50 border-t text-xs text-gray-500 flex justify-between items-center">
          <div className="flex gap-4">
             <div className="flex items-center gap-1"><Info size={14}/> <span>Sol kutucuk (Ziyaret) takvimdeki onay kutusunu kontrol eder. Sağ kutucuk (Malzeme) fatura durumunu kontrol eder.</span></div>
          </div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-50 border border-green-200 rounded-sm"></div> Ziyaret Bekliyor</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded-sm"></div> Ziyaret Onaylı</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-50 border border-orange-200 rounded-sm"></div> Malzeme Bekliyor</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded-sm"></div> Malzeme Faturalandı</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnualVisitReport;