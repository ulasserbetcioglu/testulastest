import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Search, AlertCircle, RefreshCw, Package } from 'lucide-react';
import * as XLSX from 'xlsx';

// --- TİP TANIMLARI ---
interface ReportRow {
  musteri_no: string;
  sube_id: string;
  cari_isim: string;
  sube_adi: string;
  months: {
    [key: number]: {
      visitCount: number;
      hasVisit: boolean;
      visitDetails: string[]; // Ziyaret detayları (Tarih - Durum - Personel)
      hasMaterial: boolean;
      materialDetails: string[]; // Ziyaret bazlı malzeme detayları (Tarih: Ürün A(1), Ürün B(2))
      materialBreakdown: Record<string, number>; // O ayın toplam ürün kırılımı { "Ürün A": 5, "Ürün B": 2 }
      totalMaterialCount: number; // O ayki genel toplam adet
    };
  };
}

interface VisitData {
  id: string;
  branch_id: string;
  visit_date: string;
  status: string;
  operator?: {
    name: string;
  };
}

// Malzeme verilerini yapısal tutmak için
interface SoldItem {
  name: string;
  qty: number;
}

const AnnualVisitReport = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportRow[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const fetchReportData = async () => {
    setLoading(true);
    setErrorMsg(null);
    setProgress('Şubeler yükleniyor...');
    
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

      // 2. Seçilen Yıl İçin Ziyaretleri Çek
      setProgress('Ziyaretler çekiliyor...');
      const startDate = `${year}-01-01T00:00:00`;
      const endDate = `${year}-12-31T23:59:59`;
      
      let allVisits: VisitData[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: visitsChunk, error: visitError } = await supabase
          .from('visits')
          .select(`
            id, 
            branch_id, 
            visit_date, 
            status,
            operator:operator_id ( name )
          `)
          .gte('visit_date', startDate)
          .lte('visit_date', endDate)
          .neq('status', 'cancelled')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (visitError) throw new Error(`Ziyaretler çekilemedi: ${visitError.message}`);

        if (visitsChunk && visitsChunk.length > 0) {
          allVisits = [...allVisits, ...visitsChunk];
          if (visitsChunk.length < pageSize) {
            hasMore = false;
          } else {
            page++;
            setProgress(`${allVisits.length} ziyaret çekildi...`);
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`Toplam ${allVisits.length} ziyaret çekildi.`);

      // 3. Malzeme Satışlarını Kontrol Et
      setProgress('Malzeme satışları detaylarıyla kontrol ediliyor...');
      
      // visit_id -> [ {name: 'Ürün A', qty: 2}, ... ]
      let salesDataMap: Record<string, SoldItem[]> = {}; 

      if (allVisits.length > 0) {
        const visitIds = allVisits.map(v => v.id);
        const chunkSize = 500; 
        
        for (let i = 0; i < visitIds.length; i += chunkSize) {
            const chunk = visitIds.slice(i, i + chunkSize);
            
            const { data: sales, error: salesError } = await supabase
              .from('paid_material_sales')
              .select(`
                visit_id,
                items:paid_material_sale_items (
                  quantity,
                  product:product_id ( name )
                )
              `)
              .in('visit_id', chunk);

            if (salesError) {
                console.error('Malzeme satış hatası:', salesError);
            } else if (sales) {
                sales.forEach((sale: any) => {
                    const items: SoldItem[] = [];
                    
                    if (sale.items && Array.isArray(sale.items)) {
                        sale.items.forEach((item: any) => {
                            const productName = item.product?.name || 'Bilinmeyen Ürün';
                            const qty = item.quantity || 0;
                            items.push({ name: productName, qty });
                        });
                    }
                    
                    if (items.length > 0) {
                        salesDataMap[sale.visit_id] = items;
                    }
                });
            }
            
            setProgress(`Malzeme kontrolü: %${Math.round((i / visitIds.length) * 100)}`);
        }
      }

      // 4. Veriyi İşle
      setProgress('Tablo oluşturuluyor...');
      const processedData: ReportRow[] = (branches || []).map((branch: any) => {
        const customer = branch.customer;
        const subeIdShort = branch.id && branch.id.includes('-') ? branch.id.split('-')[0] : branch.id?.substring(0, 8);

        const row: ReportRow = {
          musteri_no: customer?.musteri_no || '-',
          sube_id: subeIdShort || '-', 
          cari_isim: customer?.kisa_isim || customer?.cari_isim || 'İsimsiz Cari',
          sube_adi: branch.sube_adi || 'İsimsiz Şube',
          months: {}
        };

        // Ayları başlat
        for (let i = 0; i < 12; i++) {
          row.months[i] = { 
            visitCount: 0, 
            hasVisit: false, 
            visitDetails: [],
            hasMaterial: false,
            materialDetails: [],
            materialBreakdown: {},
            totalMaterialCount: 0
          };
        }

        allVisits.forEach((visit: VisitData) => {
          if (visit.branch_id === branch.id) {
            const visitDate = new Date(visit.visit_date);
            const monthIndex = visitDate.getMonth();
            
            if (row.months[monthIndex]) {
              // --- Ziyaret İşlemleri ---
              row.months[monthIndex].visitCount += 1;
              row.months[monthIndex].hasVisit = true;
              
              const dateStr = visitDate.toLocaleDateString('tr-TR');
              const operatorName = visit.operator?.name ? ` - ${visit.operator.name}` : '';
              const statusStr = visit.status === 'completed' ? 'Tamamlandı' : 'Planlandı';
              
              row.months[monthIndex].visitDetails.push(`${dateStr} (${statusStr})${operatorName}`);
              
              // --- Malzeme İşlemleri ---
              if (salesDataMap[visit.id]) {
                const items = salesDataMap[visit.id];
                row.months[monthIndex].hasMaterial = true;
                
                // 1. Ziyaret detayına ekle (Tooltip'in üst kısmı için)
                // "15.05.2025: Ürün A(1), Ürün B(2)"
                const itemStrs = items.map(it => `${it.name} (${it.qty})`).join(', ');
                row.months[monthIndex].materialDetails.push(`${dateStr}: ${itemStrs}`);
                
                // 2. Ay toplamlarına ekle (Breakdown için)
                items.forEach(it => {
                   const currentQty = row.months[monthIndex].materialBreakdown[it.name] || 0;
                   row.months[monthIndex].materialBreakdown[it.name] = currentQty + it.qty;
                   row.months[monthIndex].totalMaterialCount += it.qty;
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

  // --- Yardımcı Fonksiyon: Tooltip ve Excel metni oluşturucu ---
  const generateMaterialSummary = (mData: ReportRow['months'][0]) => {
     if (!mData.hasMaterial) return '';

     // 1. Ziyaret Bazlı Liste
     let text = 'ZİYARET DETAYLARI:\n' + mData.materialDetails.join('\n');
     
     // 2. Toplam Kırılım
     text += '\n\n----------------\nÜRÜN BAZLI TOPLAM:\n';
     Object.entries(mData.materialBreakdown).forEach(([name, qty]) => {
        text += `${name}: ${qty}\n`;
     });
     
     // 3. Genel Toplam
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
        flatRow[`${month} (Ziyaret Sayısı)`] = mData.visitCount;
        flatRow[`${month} (Ziyaret Detay)`] = mData.visitDetails.join('\n');
        
        flatRow[`${month} (Malzeme)`] = mData.hasMaterial ? `Var (${mData.totalMaterialCount})` : '-';
        flatRow[`${month} (Malzeme Detay)`] = generateMaterialSummary(mData);
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
          <h1 className="text-2xl font-bold text-gray-900">Yıllık Ziyaret ve Malzeme Raporu</h1>
          <p className="text-sm text-gray-500 mt-1">
            {year} yılı detaylı analiz tablosu. Hücrelerin üzerine gelerek detayları görebilirsiniz.
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
                  <th key={month} colSpan={2} className="py-2 px-2 border-r text-center min-w-[100px] bg-blue-50/30">
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
                filteredData.map((row, idx) => (
                  <tr key={`${row.musteri_no}-${row.sube_id}-${idx}`} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="py-2 px-4 border-r font-medium text-gray-900 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-b">
                      {row.musteri_no}
                    </td>
                    <td className="py-2 px-4 border-r text-gray-600 sticky left-[120px] bg-white group-hover:bg-blue-50/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b">
                      <div className="font-medium text-gray-900 truncate max-w-[180px]" title={row.cari_isim}>{row.cari_isim}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[180px]" title={row.sube_adi}>{row.sube_adi}</div>
                    </td>

                    {months.map((_, mIdx) => {
                      const monthData = row.months[mIdx];
                      
                      return (
                        <React.Fragment key={mIdx}>
                          {/* Ziyaret Sütunu */}
                          <td 
                            className={`py-2 px-1 border-r border-b text-center cursor-help transition-colors ${monthData.hasVisit ? 'bg-green-50 hover:bg-green-100' : ''}`}
                            title={monthData.visitDetails.length > 0 ? `Ziyaretler:\n${monthData.visitDetails.join('\n')}` : ''}
                          >
                            {monthData.hasVisit ? (
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-xs font-bold text-green-700">{monthData.visitCount}</span>
                                <div className="w-3 h-3 bg-green-500 rounded-sm mt-0.5"></div>
                              </div>
                            ) : (
                              <span className="text-gray-200 text-xs">-</span>
                            )}
                          </td>
                          
                          {/* Malzeme Sütunu */}
                          <td 
                            className={`py-2 px-1 border-r border-b text-center cursor-help transition-colors ${monthData.hasMaterial ? 'bg-orange-50 hover:bg-orange-100' : ''}`}
                            title={generateMaterialSummary(monthData)}
                          >
                             {monthData.hasMaterial ? (
                               <div className="flex flex-col items-center justify-center">
                                 <Package className="w-4 h-4 text-orange-500" />
                                 <span className="text-[10px] font-bold text-orange-700 mt-0.5">
                                   {monthData.totalMaterialCount}
                                 </span>
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
          <span>Toplam <strong>{filteredData.length}</strong> şube listeleniyor.</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div> Ziyaret Var</span>
            <span className="flex items-center gap-1"><Package className="w-3 h-3 text-orange-500" /> Malzeme Satışı Var</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnualVisitReport;
