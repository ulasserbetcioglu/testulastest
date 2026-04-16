import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Search, AlertCircle, RefreshCw, CheckSquare, Square, Info, ArrowUp, ArrowDown, Send, Check, Trash2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// --- TİP TANIMLARI ---
interface ReportRow {
  musteri_no: string;
  sube_id: string;
  cari_isim: string;
  sube_adi: string;
  branch_uuid: string;
  customer_uuid: string;
  parasut_service_id?: string;
  parasut_service_name?: string;
  months: {
    [key: number]: {
      // Ziyaret Verileri
      visitCount: number;
      hasVisit: boolean;
      visitDetails: string[];
      visitIds: string[];
      visitCheckedCount: number; // is_checked (Takvim onayı) sayısı
      visitCompletedCount: number; // status === 'completed' sayısı

      // Malzeme Verileri
      hasMaterial: boolean;
      materialDetails: string[];
      materialBreakdown: Record<string, number>;
      totalMaterialCount: number;
      materialSaleIds: string[];
      materialInvoicedCount: number; // is_invoiced (Fatura) sayısı

      // Paraşüt Durumları (v2.19)
      parasutInvoicedCount: number; // parasut_invoices tablosundaki kayıt sayısı
      hasMonthlyInvoice: boolean;
      hasMaterialInvoice: boolean;
      reportNumbers: string[];
      visitDates: string[];
      hasWithholding?: boolean; // NEW
    };
  };
}

interface VisitData {
  id: string;
  branch_id: string;
  customer_id?: string; // Müşteri bazlı eşleştirme için eklendi
  visit_date: string;
  status: string;
  is_checked: boolean; // TAKVİMDEKİ ONAY
  report_number: string;
  operator?: {
    name: string;
  };
  // İlişkisel veri
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
  const [hideCompleted, setHideCompleted] = useState(false);
  const [selectedRowUuids, setSelectedRowUuids] = useState<Set<string>>(new Set());
  const [bulkMonthModal, setBulkMonthModal] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'visit' | 'material'>('material');

  // v2.19: Paraşüt Aktarım State
  const [transferModal, setTransferModal] = useState<{
    show: boolean;
    type: 'visit' | 'material';
    rowIdx: number;
    monthIdx: number;
    visitId?: string;
    branchId?: string;
    withholding?: boolean;
    includeBalance?: boolean;
    includeIban?: boolean;
    items: any[];
    bulkSourceIds?: string[];
    bulkDetails?: string;
  }>({ show: false, type: 'visit', rowIdx: -1, monthIdx: -1, includeBalance: false, includeIban: false, items: [], bulkSourceIds: [], bulkDetails: '' });

  const [transferring, setTransferring] = useState(false);

  // YENİ: Sıralama State'i
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const fetchReportData = async () => {
    setLoading(true);
    setErrorMsg(null);
    setProgress('Veriler hazırlanıyor...');

    try {
      // 1. Müşterileri ve Şubeleri Çek (SAYFALANDIRMA EKLENDİ)
      setProgress('Müşteriler çekiliyor...');
      let allCustomers: any[] = [];
      let custPage = 0;
      const custPageSize = 1000;
      let custHasMore = true;

      while (custHasMore) {
        const { data: custChunk, error: custError } = await supabase
          .from('customers')
          .select(`
            id,
            musteri_no,
            kisa_isim,
            cari_isim,
            has_withholding,
            parasut_service_id,
            parasut_service_name,
            branches (
              id,
              sube_adi
            )
          `)
          .range(custPage * custPageSize, (custPage + 1) * custPageSize - 1);

        if (custError) throw new Error(`Müşteriler çekilemedi: ${custError.message}`);

        if (custChunk && custChunk.length > 0) {
          allCustomers = [...allCustomers, ...custChunk];
          if (custChunk.length < custPageSize) {
            custHasMore = false;
          } else {
            custPage++;
          }
        } else {
          custHasMore = false;
        }
      }

      // 2. Ziyaretleri ve Malzemeleri TEK SORGUDA Çek
      setProgress('Ziyaretler ve malzeme verileri çekiliyor...');
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
            customer_id,
            visit_date, 
            status,
            is_checked,
            report_number,
            operator:operator_id ( name ),
            paid_material_sales (
                id,
                is_invoiced,
                paid_material_sale_items (
                    quantity,
                    unit_price,
                    product:product_id ( name, parasut_id )
                )
            )
          `)
          .gte('visit_date', startDate)
          .lte('visit_date', endDate)
          .neq('status', 'cancelled')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (visitError) throw new Error(`Veri çekilemedi: ${visitError.message}`);

        if (visitsChunk && visitsChunk.length > 0) {
          const typedChunk = visitsChunk as unknown as (VisitData & { customer_id: string })[];
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

      // 2.5 Paraşüt Faturalarını Çek (Mükerrerlik için)
      setProgress('Paraşüt faturaları kontrol ediliyor...');
      const { data: parasutInvoices, error: pError } = await supabase
        .from('parasut_invoices')
        .select('id, source_id, source_type');

      if (pError) console.error('Paraşüt faturaları çekilemedi:', pError);
      const pInvoiceMap = new Set(Array.isArray(parasutInvoices) ? parasutInvoices.map(pi => pi.source_id) : []);

      // 3. Veriyi İşle ve Tabloyu Oluştur
      setProgress('Rapor oluşturuluyor...');

      const processedData: ReportRow[] = [];

      allCustomers.forEach((customer: any) => {
        const branches = customer.branches || [];
        const customerDisplayName = customer.kisa_isim || customer.cari_isim || 'İsimsiz Cari';

        // Eğer müşterinin hiç şubesi yoksa, sanal bir satır ekle
        if (branches.length === 0) {
          const row: ReportRow = {
            musteri_no: customer.musteri_no || '-',
            sube_id: '-',
            cari_isim: customerDisplayName,
            sube_adi: customerDisplayName, // Şube yoksa şube adı olarak cari ismini göster
            branch_uuid: `virtual-${customer.id}`, // Benzersiz olması için virtual prefix
            customer_uuid: customer.id,
            parasut_service_id: customer.parasut_service_id,
            parasut_service_name: customer.parasut_service_name,
            months: {}
          };

          for (let i = 0; i < 12; i++) {
            row.months[i] = {
              visitCount: 0,
              hasVisit: false,
              visitDetails: [],
              visitIds: [],
              reportNumbers: [],
              visitCheckedCount: 0,
              visitCompletedCount: 0,
              hasMaterial: false,
              materialDetails: [],
              materialBreakdown: {},
              totalMaterialCount: 0,
              materialSaleIds: [],
              materialInvoicedCount: 0,
              parasutInvoicedCount: 0,
              hasMonthlyInvoice: false,
              hasMaterialInvoice: false,
              visitDates: []
            };
          }

          // Ziyaretleri bu sanal satıra bağla (customer_id üzerinden)
          allVisits.forEach((visit: any) => {
            if (visit.customer_id === customer.id && !visit.branch_id) {
              const visitDate = new Date(visit.visit_date);
              const monthIndex = visitDate.getMonth();

              if (row.months[monthIndex]) {
                const mData = row.months[monthIndex];
                mData.visitCount += 1;
                mData.hasVisit = true;
                mData.visitIds.push(visit.id);
                const dateStr = visitDate.toLocaleDateString('tr-TR');
                if (visit.report_number) mData.reportNumbers.push(visit.report_number);
                mData.visitDates.push(dateStr);
                if (visit.is_checked) mData.visitCheckedCount += 1;
                if (visit.status === 'completed') mData.visitCompletedCount += 1;
                if (pInvoiceMap.has(visit.id)) {
                  mData.hasMonthlyInvoice = true;
                  mData.parasutInvoicedCount += 1;
                }

                const operatorName = visit.operator?.name ? ` - ${visit.operator.name}` : '';
                const statusStr = visit.status === 'completed' ? 'Tamamlandı' : 'Planlandı';
                const checkStr = visit.is_checked ? ' [ONAYLI]' : '';
                const rNumStr = visit.report_number ? ` (No: ${visit.report_number})` : '';
                mData.visitDetails.push(`${dateStr}${rNumStr} (${statusStr})${operatorName}${checkStr}`);

                if (visit.paid_material_sales && visit.paid_material_sales.length > 0) {
                  mData.hasMaterial = true;
                  visit.paid_material_sales.forEach((sale: any) => {
                    mData.materialSaleIds.push(sale.id);
                    if (sale.is_invoiced) mData.materialInvoicedCount += 1;
                    if (pInvoiceMap.has(sale.id)) {
                      mData.hasMaterialInvoice = true;
                      mData.parasutInvoicedCount += 1;
                    }
                    sale.paid_material_sale_items.forEach((item: any) => {
                      const pName = item.product?.name || 'Ürün';
                      const currentQty = mData.materialBreakdown[pName] || 0;
                      mData.materialBreakdown[pName] = currentQty + item.quantity;
                      mData.totalMaterialCount += item.quantity;
                      mData.materialDetails.push(`${dateStr}: ${pName} (${item.quantity})`);
                    });
                  });
                }
              }
            }
          });

          processedData.push(row);
        } else {
          // Şubesi olan müşteriler için her şubeye bir satır
          branches.forEach((branch: any) => {
            const subeIdShort = branch.id && branch.id.includes('-') ? branch.id.split('-')[0] : branch.id?.substring(0, 8);

            const row: ReportRow = {
              musteri_no: customer.musteri_no || '-',
              sube_id: subeIdShort || '-',
              cari_isim: customerDisplayName,
              sube_adi: branch.sube_adi || 'İsimsiz Şube',
              branch_uuid: branch.id,
              customer_uuid: customer.id,
              parasut_service_id: customer.parasut_service_id,
              parasut_service_name: customer.parasut_service_name,
              months: {}
            };

            // Ayları başlat
            for (let i = 0; i < 12; i++) {
              row.months[i] = {
                visitCount: 0,
                hasVisit: false,
                visitDetails: [],
                visitIds: [],
                reportNumbers: [],
                visitCheckedCount: 0,
                visitCompletedCount: 0,
                hasMaterial: false,
                materialDetails: [],
                materialBreakdown: {},
                totalMaterialCount: 0,
                materialSaleIds: [],
                materialInvoicedCount: 0,
                parasutInvoicedCount: 0,
                hasMonthlyInvoice: false,
                hasMaterialInvoice: false,
                visitDates: [],
                hasWithholding: !!customer.has_withholding
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
                  const dateStr = visitDate.toLocaleDateString('tr-TR');
                  if (visit.report_number) mData.reportNumbers.push(visit.report_number);
                  mData.visitDates.push(dateStr);

                  if (visit.is_checked) mData.visitCheckedCount += 1;
                  if (visit.status === 'completed') mData.visitCompletedCount += 1;
                  if (pInvoiceMap.has(visit.id)) {
                    mData.hasMonthlyInvoice = true;
                    mData.parasutInvoicedCount += 1;
                  }

                  const operatorName = visit.operator?.name ? ` - ${visit.operator.name}` : '';
                  const statusStr = visit.status === 'completed' ? 'Tamamlandı' : 'Planlandı';
                  const checkStr = visit.is_checked ? ' [ONAYLI]' : '';
                  const rNumStr = visit.report_number ? ` (No: ${visit.report_number})` : '';

                  mData.visitDetails.push(`${dateStr}${rNumStr} (${statusStr})${operatorName}${checkStr}`);

                  // --- MALZEME VERİLERİ ---
                  if (visit.paid_material_sales && visit.paid_material_sales.length > 0) {
                    mData.hasMaterial = true;

                    visit.paid_material_sales.forEach(sale => {
                      mData.materialSaleIds.push(sale.id);
                      if (sale.is_invoiced) mData.materialInvoicedCount += 1;
                      if (pInvoiceMap.has(sale.id)) {
                        mData.hasMaterialInvoice = true;
                      }

                      const itemStrs: string[] = [];
                      sale.paid_material_sale_items.forEach(item => {
                        const pName = item.product?.name || 'Ürün';
                        itemStrs.push(`${pName} (${item.quantity})`);

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
            processedData.push(row);
          });
        }
      });

      // Varsayılan sıralama (Alfabetik)
      processedData.sort((a, b) => a.cari_isim.localeCompare(b.cari_isim, 'tr'));
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

  // --- TOPLU GÜNCELLEME ---
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
        field = 'is_checked';
      } else {
        table = 'paid_material_sales';
        field = 'is_invoiced';
      }

      const { error } = await supabase
        .from(table)
        .update({ [field]: targetStatus })
        .in('id', ids);

      if (error) throw error;

      // Optimistic Update
      // Not: Burada data state'i sıralı olabilir, filteredData üzerinden değil orijinal data üzerinden güncelleme yapmalıyız.
      // Ancak sıralama yapıldığı için indexler karışabilir. En doğrusu veriyi id ile bulup güncellemektir ama
      // performans için basitlik adına sayfayı yeniletmeden ilgili state'i güncelliyoruz.
      // Şimdilik filteredData kullanmadığımız için doğrudan data'yı güncelleyebiliriz ama
      // sıralama değişirse rowIdx yanlış olabilir. Bu yüzden rowIdx'i filteredData'dan almamalıyız.
      // Bu örnekte UI'da gösterilen veri 'sortedAndFilteredData' olduğu için, tıklanan satırın verisini
      // bulmak için branch_uuid kullanmak daha güvenli olurdu ama kod karmaşıklığını artırmamak için
      // basit yoldan fetchReportData() çağırabiliriz veya risk alıp güncelleyebiliriz.
      // En temiz çözüm yeniden fetch etmektir ama yavaş olur.
      // Aşağıdaki yöntem, render edilen veri ile state verisi aynı sırada olduğu sürece çalışır.

      // Güvenli Yöntem: UI güncellemesi yerine veriyi yeniden çekmek (Data integrity için)
      // VEYA: Aşağıdaki gibi manuel state update (Hızlı tepki için)

      // Hangi satır olduğunu bulmak için rowIdx kullanmak yerine branch_uuid ile bulalım.
      // Ancak fonksiyon şu an rowIdx alıyor. Render kısmında doğru index gönderdiğimizden emin olmalıyız.
      // sortedAndFilteredData içinde dönüyoruz, dolayısıyla rowIdx sortedData'nın indexi.

      // Bu karmaşıklığı çözmek için: Sadece toggle işlemi bitince bir toast mesajı gösterip veriyi arkada yenileyelim mi?
      // Hayır, kullanıcı anlık tepki ister.

      // Çözüm: branch_uuid kullanarak orijinal data içinde bulup güncelle.
      const targetBranchId = sortedAndFilteredData[rowIdx].branch_uuid;

      const newData = data.map(row => {
        if (row.branch_uuid === targetBranchId) {
          const newMonths = { ...row.months };
          const mData = { ...newMonths[monthIdx] };

          if (type === 'visit') {
            mData.visitCheckedCount = targetStatus ? mData.visitCount : 0;
          } else {
            mData.materialInvoicedCount = targetStatus ? mData.materialSaleIds.length : 0;
          }
          newMonths[monthIdx] = mData;
          return { ...row, months: newMonths };
        }
        return row;
      });

      setData(newData);

      const actionText = type === 'visit' ? (targetStatus ? 'onaylandı' : 'onayı kaldırıldı') : (targetStatus ? 'faturalandı' : 'iptal edildi');
      toast.success(`${ids.length} kayıt ${actionText}.`);

    } catch (err: any) {
      toast.error("Güncelleme başarısız: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // --- PARAŞÜT AKTARIMI (v2.20) ---
  const calculateIssueDate = (targetYear: number, monthIdx: number) => {
    const now = new Date();
    const lastDayOfMonth = new Date(targetYear, monthIdx + 1, 0);

    if (now > lastDayOfMonth) {
      const y = lastDayOfMonth.getFullYear();
      const m = String(lastDayOfMonth.getMonth() + 1).padStart(2, '0');
      const d = String(lastDayOfMonth.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } else {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  };

  const prepareTransferItems = async (type: 'visit' | 'material', rowIdx: number, mIdx: number) => {
    const row = sortedAndFilteredData[rowIdx];
    const mData = row.months[mIdx];
    const billToCustomerId = row.customer_uuid;

    setTransferring(true);
    try {
      // 1. Müşteriye özel ürün fiyatlarını çek
      const { data: customPrices } = await supabase
        .from('customer_product_prices')
        .select('product_id, price')
        .eq('customer_id', billToCustomerId);

      const customPriceMap: Record<string, number> = {};
      if (customPrices) {
        customPrices.forEach(cp => {
          customPriceMap[cp.product_id] = cp.price;
        });
      }

      const consolidatedItems: any[] = [];

      if (type === 'visit') {
        // A. Hizmet Kalemi
        let serviceAmount = 0;
        const sBranchId = row.branch_uuid.startsWith('virtual-') ? null : row.branch_uuid;

        if (sBranchId) {
          const { data: p } = await supabase.from('branch_pricing').select('monthly_price, per_visit_price').eq('branch_id', sBranchId).maybeSingle();
          if (p) {
            if (p.per_visit_price > 0) serviceAmount = p.per_visit_price * mData.visitCompletedCount;
            else if (p.monthly_price > 0) serviceAmount = p.monthly_price;
          }
        }

        if (serviceAmount === 0 && billToCustomerId) {
          const { data: p } = await supabase.from('customer_pricing').select('monthly_price, per_visit_price').eq('customer_id', billToCustomerId).maybeSingle();
          if (p) {
            if (p.per_visit_price > 0) serviceAmount = p.per_visit_price * mData.visitCompletedCount;
            else if (p.monthly_price > 0) serviceAmount = p.monthly_price;
          }
        }

        if (serviceAmount > 0) {
          const sName = row.parasut_service_name || `Hizmet: ${row.sube_adi}`;
          const sPid = row.parasut_service_id || '1030118145';

          consolidatedItems.push({
            id: 'service-' + rowIdx + '-' + mIdx,
            name: sName,
            unit_price: serviceAmount,
            quantity: 1,
            parasut_product_id: sPid,
            vat_rate: 20
          });
        }
      } else {
        // B. Malzeme Kalemleri
        const { data: sales } = await supabase
          .from('paid_material_sales')
          .select(`
                id,
                paid_material_sale_items (
                    product_id,
                    quantity,
                    unit_price,
                    product:product_id ( name, parasut_id, vat_rate )
                )
            `)
          .in('id', mData.materialSaleIds);

        if (sales) {
          const matMap: Record<string, any> = {};
          sales.forEach(sale => {
            (sale.paid_material_sale_items || []).forEach((item: any) => {
              const pId = item.product?.parasut_id || 'manual';
              const vRate = item.product?.vat_rate ?? 20;
              const specialPrice = customPriceMap[item.product_id];
              const uPrice = (specialPrice !== undefined && specialPrice !== null) ? specialPrice : (item.unit_price || 0);
              const key = `${pId}-${uPrice}-${vRate}`;

              if (matMap[key]) {
                matMap[key].quantity += item.quantity;
              } else {
                matMap[key] = {
                  id: 'material-' + key,
                  name: `${item.product?.name || 'Ürün'} (${row.sube_adi})`,
                  unit_price: uPrice,
                  quantity: item.quantity,
                  parasut_product_id: pId !== 'manual' ? pId : null,
                  vat_rate: vRate
                };
              }
            });
          });
          consolidatedItems.push(...Object.values(matMap));
        }
      }

      if (consolidatedItems.length === 0) {
        toast.error('Fatura edilecek kalem bulunamadı.');
        return;
      }

      setTransferModal({
        show: true,
        type,
        rowIdx,
        monthIdx: mIdx,
        visitId: mData.visitIds[0] || undefined,
        branchId: row.branch_uuid,
        withholding: !!mData.hasWithholding,
        includeBalance: false,
        includeIban: false,
        items: consolidatedItems
      });

    } catch (err: any) {
      toast.error('Hazırlık hatası: ' + err.message);
    } finally {
      setTransferring(false);
    }
  };

  const handleParasutTransfer = async () => {
    if (transferModal.rowIdx === -1 || transferModal.items.length === 0) {
      toast.error('Fatura edilecek kalem bulunamadı.');
      return;
    }

    const row = sortedAndFilteredData[transferModal.rowIdx];
    const mData = row.months[transferModal.monthIdx];
    const visitId = transferModal.visitId || mData.visitIds[0];
    const branchId = row.branch_uuid.startsWith('virtual-') ? null : row.branch_uuid;
    const customerId = row.branch_uuid.startsWith('virtual-') ? row.branch_uuid.replace('virtual-', '') : null;
    const hasWithholding = transferModal.withholding;

    setTransferring(true);
    try {
      // 2. Paraşüt ID Belirleme (Ana Müşteri Bilgileri)
      let pContactId: string | null = null;
      let billToCustomerId = customerId || row.customer_uuid;

      // Önce ana müşterinin Paraşüt ID'sini al
      if (billToCustomerId) {
        const { data: cData } = await supabase.from('customers').select('parasut_id').eq('id', billToCustomerId).maybeSingle();
        pContactId = cData?.parasut_id;
      }

      // Eğer hala yoksa ve şube bazlı ise şubeye bak
      if (!pContactId && branchId) {
        const { data: bData } = await supabase.from('branches').select('parasut_id, customer_id').eq('id', branchId).maybeSingle();
        pContactId = bData?.parasut_id;
        if (!pContactId && bData?.customer_id) {
          const { data: cData } = await supabase.from('customers').select('parasut_id').eq('id', bData.customer_id).maybeSingle();
          pContactId = cData?.parasut_id;
        }
      }

      if (!pContactId) {
        toast.error('Paraşüt Müşteri Kartı Bulunamadı!');
        return;
      }

      const monthStr = months[transferModal.monthIdx];

      // Ziyaret ve Rapor Detaylarını hazırla
      const uniqueDates = Array.from(new Set(mData.visitDates || []));
      const uniqueReports = Array.from(new Set(mData.reportNumbers || []));
      const detailStr = uniqueDates.length > 0
        ? `\nZiyaret Detayları: (${uniqueDates.join(', ')}) - Rapor No: ${uniqueReports.join(', ') || '-'}`
        : '';

      const isService = transferModal.type === 'visit';
      const typeLabel = isService ? 'İlaçlama Hizmet' : 'Malzeme Satış';

      const isBulk = transferModal.bulkSourceIds && transferModal.bulkSourceIds.length > 0;
      const bulkTitle = transferModal.type === 'visit' ? 'TOPLU HİZMET BEDELİ' : 'TOPLU MALZEME SATIŞI';
      const bulkNoteHeader = transferModal.type === 'visit' ? 'TOPLU HİZMET BEDELİ' : 'TOPLU MALZEME SATIŞ BEDELİ';

      let finalTitle = isBulk ? `${bulkTitle} - ${monthStr} ${year}` : `${row.sube_adi} - ${monthStr} ${year}`;
      let finalNote = isBulk
        ? `${bulkNoteHeader} - ${monthStr} ${year}\n\nDETAYLI ŞUBE LİSTESİ:\n${transferModal.bulkDetails || ''}\n`
        : `${row.sube_adi} - ${typeLabel} Bedeli - ${monthStr} ${year}${detailStr}\n`;

      if (transferModal.includeBalance) {
        const { data: balance } = await supabase.from('client_balances').select('balance').eq('client_id', row.customer_uuid).maybeSingle();
        if (balance) finalNote += `\nGüncel Bakiyeniz: ${balance.balance.toLocaleString('tr-TR')} TL`;
      }

      if (transferModal.includeIban) {
        finalNote += `\n\nIBAN: TR66 0006 2000 0370 0006 2027 89\nBanka: Garanti BBVA`;
      }

      const issueDate = calculateIssueDate(year, transferModal.monthIdx);

      const { data: invData, error: invError } = await supabase.functions.invoke('parasut-automation', {
        body: {
          contact_id: String(pContactId),
          description: finalTitle,
          note: finalNote,
          notes: finalNote,
          bank_account_id: '1000353860',
          date: issueDate,
          issue_date: issueDate,
          has_withholding: hasWithholding,
          items: transferModal.items,
          source_id: visitId || (transferModal.bulkSourceIds?.[0]) || 'bulk-manual',
          source_type: transferModal.type === 'visit' ? 'monthly_plan' : 'material_sale'
        }
      });

      if (invError) throw invError;

      // Yerel Kayıtlar (Mükerrerlikten kaçınmak için Edge fonksiyonunun attığı ilk kaydı hariç tutuyoruz)
      const primarySourceId = visitId || (transferModal.bulkSourceIds?.[0]) || 'bulk-manual';
      const secondarySourceIds = (transferModal.bulkSourceIds && transferModal.bulkSourceIds.length > 0
        ? transferModal.bulkSourceIds
        : [visitId]).filter(id => id && id !== primarySourceId);

      if (secondarySourceIds.length > 0) {
        const invoiceRecords = secondarySourceIds.map(id => ({
          source_id: id,
          source_type: transferModal.type === 'visit' ? 'monthly_plan' : 'material_sale',
          parasut_id: Number(invData?.parasut_id || 0),
          total_amount: transferModal.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
        }));

        const { error: localRecordError } = await supabase.from('parasut_invoices').insert(invoiceRecords);
        if (localRecordError) console.error('Secondary records error:', localRecordError);
      }

      toast.success("Paraşüt'e başarıyla aktarıldı.");
      setTransferModal(prev => ({ ...prev, show: false }));
      setSelectedRowUuids(new Set()); // İşlem tamamlanınca seçimi temizle
      fetchReportData(); // Verileri yenile (Check iconlarını görmek için)
      setTimeout(fetchReportData, 1000);

    } catch (err: any) {
      toast.error('Aktarım hatası: ' + err.message);
    } finally {
      setTransferring(false);
    }
  };

  const updateItemPrice = (itemId: string, newPrice: number) => {
    setTransferModal(prev => ({
      ...prev,
      items: prev.items.map(item => item.id === itemId ? { ...item, unit_price: newPrice } : item)
    }));
  };

  const removeItem = (itemId: string) => {
    setTransferModal(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const prepareBulkMaterialTransfer = async (mIdx: number) => {
    const selectedRows = sortedAndFilteredData.filter(r => selectedRowUuids.has(r.branch_uuid));
    if (selectedRows.length === 0) return;

    // İlk satırın carisini baz alıyoruz (Paraşüt aktarımı tek cariye yapılır)
    const firstRow = selectedRows[0];
    const billToCustomerId = firstRow.customer_uuid;

    // Tüm seçili şubelerin malzeme satış ID'lerini ve detaylarını topla
    const allSaleIds: string[] = [];
    const detailLines: string[] = [];

    selectedRows.forEach(row => {
      const mData = row.months[mIdx];
      if (mData && mData.materialSaleIds && mData.materialSaleIds.length > 0) {
        allSaleIds.push(...mData.materialSaleIds);
        const rNums = Array.from(new Set(mData.reportNumbers || [])).filter(n => n);
        const rStr = rNums.length > 0 ? ` (Rapor: ${rNums.join(', ')})` : '';

        // Şubeye özel malzeme özetini hazırla
        const matSummaryParts: string[] = [];
        if (mData.materialBreakdown) {
          Object.entries(mData.materialBreakdown).forEach(([name, qty]) => {
            matSummaryParts.push(`${name}: ${qty}`);
          });
        }
        const matSummaryStr = matSummaryParts.length > 0 ? ` - [${matSummaryParts.join(', ')}]` : '';

        detailLines.push(`• ${row.sube_adi}${rStr}${matSummaryStr}`);
      }
    });

    if (allSaleIds.length === 0) {
      toast.error('Seçilen şubelerde bu ay için faturalanacak malzeme bulunamadı.');
      return;
    }

    setTransferring(true);
    try {
      // Müşteriye özel fiyatlar
      const { data: customPrices } = await supabase
        .from('customer_product_prices')
        .select('product_id, price')
        .eq('customer_id', billToCustomerId);

      const customPriceMap: Record<string, number> = {};
      if (customPrices) {
        customPrices.forEach(cp => customPriceMap[cp.product_id] = cp.price);
      }

      // Malzemeleri çek
      const { data: sales, error: salesErr } = await supabase
        .from('paid_material_sales')
        .select(`
          id,
          paid_material_sale_items (
            product_id,
            quantity,
            unit_price,
            product:product_id ( name, parasut_id, vat_rate )
          )
        `)
        .in('id', allSaleIds);

      if (salesErr) throw salesErr;

      const matMap: Record<string, any> = {};
      sales?.forEach(sale => {
        (sale.paid_material_sale_items || []).forEach((item: any) => {
          const pId = item.product?.parasut_id || 'manual';
          const vRate = item.product?.vat_rate ?? 20;
          const specialPrice = customPriceMap[item.product_id];
          const uPrice = (specialPrice !== undefined && specialPrice !== null) ? specialPrice : (item.unit_price || 0);
          const key = `${pId}-${uPrice}-${vRate}`;

          if (matMap[key]) {
            matMap[key].quantity += item.quantity;
          } else {
            matMap[key] = {
              id: 'bulk-' + key,
              name: `${item.product?.name || 'Ürün'} (Toplu)`,
              unit_price: uPrice,
              quantity: item.quantity,
              parasut_product_id: pId !== 'manual' ? pId : null,
              vat_rate: vRate
            };
          }
        });
      });

      const consolidatedItems = Object.values(matMap);
      if (consolidatedItems.length === 0) {
        toast.error('Fatura edilecek geçerli bir kalem bulunamadı.');
        return;
      }

      setTransferModal({
        show: true,
        type: 'material',
        rowIdx: sortedAndFilteredData.findIndex(r => r.branch_uuid === firstRow.branch_uuid),
        monthIdx: mIdx,
        visitId: undefined, // Toplu işlemde tek bir ziyaret ID'si yok
        branchId: firstRow.branch_uuid,
        withholding: !!firstRow.months[mIdx]?.hasWithholding,
        includeBalance: false,
        includeIban: false,
        items: consolidatedItems,
        bulkSourceIds: allSaleIds,
        bulkDetails: detailLines.join('\n')
      });

    } catch (err: any) {
      toast.error('Toplu hazırlık hatası: ' + err.message);
    } finally {
      setTransferring(false);
    }
  };

  const prepareBulkServiceTransfer = async (mIdx: number) => {
    const selectedRows = sortedAndFilteredData.filter(r => selectedRowUuids.has(r.branch_uuid));
    if (selectedRows.length === 0) return;

    const firstRow = selectedRows[0];
    const billToCustomerId = firstRow.customer_uuid;

    setTransferring(true);
    try {
      const consolidatedItems: any[] = [];
      const detailLines: string[] = [];
      const allVisitIds: string[] = [];

      for (const row of selectedRows) {
        const mData = row.months[mIdx];
        if (!mData || mData.visitCount === 0) continue;

        let serviceAmount = 0;
        const sBranchId = row.branch_uuid.startsWith('virtual-') ? null : row.branch_uuid;

        // 1. Şubeye özel fiyat
        if (sBranchId) {
          const { data: p } = await supabase.from('branch_pricing').select('monthly_price, per_visit_price').eq('branch_id', sBranchId).maybeSingle();
          if (p) {
            if (p.per_visit_price > 0) serviceAmount = p.per_visit_price * mData.visitCompletedCount;
            else if (p.monthly_price > 0) serviceAmount = p.monthly_price;
          }
        }

        // 2. Ana müşteri fiyatı (Şubede yoksa)
        if (serviceAmount === 0 && billToCustomerId) {
          const { data: p } = await supabase.from('customer_pricing').select('monthly_price, per_visit_price').eq('customer_id', billToCustomerId).maybeSingle();
          if (p) {
            if (p.per_visit_price > 0) serviceAmount = p.per_visit_price * mData.visitCompletedCount;
            else if (p.monthly_price > 0) serviceAmount = p.monthly_price;
          }
        }

        if (serviceAmount > 0) {
          const sName = row.parasut_service_name || `Hizmet: ${row.sube_adi}`;
          const sPid = row.parasut_service_id || '1030118145';

          consolidatedItems.push({
            id: 'bulk-service-' + row.branch_uuid,
            name: sName,
            unit_price: serviceAmount,
            quantity: 1,
            parasut_product_id: sPid,
            vat_rate: 20
          });

          const rNums = Array.from(new Set(mData.reportNumbers || [])).filter(n => n);
          const rStr = rNums.length > 0 ? ` (Rapor: ${rNums.join(', ')})` : '';
          detailLines.push(`• ${row.sube_adi}${rStr} - ${serviceAmount.toLocaleString('tr-TR')} TL`);
          if (mData.visitIds) allVisitIds.push(...mData.visitIds);
        }
      }

      if (consolidatedItems.length === 0) {
        toast.error('Seçilen şubelerde bu ay için faturalanacak hizmet bedeli bulunamadı.');
        return;
      }

      setTransferModal({
        show: true,
        type: 'visit',
        rowIdx: sortedAndFilteredData.findIndex(r => r.branch_uuid === firstRow.branch_uuid),
        monthIdx: mIdx,
        visitId: allVisitIds[0],
        branchId: firstRow.branch_uuid,
        withholding: !!firstRow.months[mIdx]?.hasWithholding,
        includeBalance: false,
        includeIban: false,
        items: consolidatedItems,
        bulkSourceIds: allVisitIds,
        bulkDetails: detailLines.join('\n')
      });

    } catch (err: any) {
      toast.error('Toplu hizmet hazırlık hatası: ' + err.message);
    } finally {
      setTransferring(false);
    }
  };

  const generateMaterialSummary = (mData: any) => {
    if (!mData || !mData.hasMaterial || !Array.isArray(mData.materialDetails)) return '';
    let text = 'MALZEME DETAYLARI:\n' + mData.materialDetails.join('\n');
    text += '\n\n----------------\nÜRÜN BAZLI TOPLAM:\n';
    if (mData.materialBreakdown) {
      Object.entries(mData.materialBreakdown).forEach(([name, qty]) => {
        text += `${name}: ${qty}\n`;
      });
    }
    text += `----------------\nGENEL TOPLAM: ${mData.totalMaterialCount || 0} Adet`;
    return text;
  };

  const exportToExcel = () => {
    const exportData = sortedAndFilteredData.map(row => {
      const flatRow: any = {
        'Müşteri No': row.musteri_no,
        'Şube No': row.sube_id,
        'Cari Ad': row.cari_isim,
        'Şube Adı': row.sube_adi,
      };

      months.forEach((month, index) => {
        const mData = row.months[index];
        const isVisitFullyChecked = mData.visitCount > 0 && mData.visitCount === mData.visitCheckedCount;
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

  // YENİ: SIRALAMA VE FİLTRELEME MANTIĞI
  const handleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const sortedAndFilteredData = React.useMemo(() => {
    // 1. Filtrele
    let result = data.filter(row =>
      row.cari_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.musteri_no.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. Sırala
    result.sort((a, b) => {
      // Cari Adı + Şube Adı birleştirerek sıralama yapıyoruz ki şubeler de kendi içinde sıralı olsun
      const nameA = `${a.cari_isim} ${a.sube_adi}`;
      const nameB = `${b.cari_isim} ${b.sube_adi}`;

      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB, 'tr');
      } else {
        return nameB.localeCompare(nameA, 'tr');
      }
    });

    // 3. Ziyaret Tamamlanma Filtresi
    if (hideCompleted) {
      result = result.filter(row => {
        // Bir satırı gizlemek için o satırdaki TÜM "Tamamlanmış" (completed) ziyaretlerin "Onaylanmış" (checked) olması yeterlidir.
        // Planlanan (sarı) ziyaretler gizleme işlemine engel değildir.
        const allCompletedAreChecked = Object.values(row.months).every(mData => {
          // Eğer o ayda hiç tamamlanmış ziyaret yoksa (ya da sadece planlanan varsa), o ay "temiz" sayılır.
          if (mData.visitCompletedCount === 0) return true;
          // Eğer tamamlanmış ziyaret varsa, sayıları onaylanmış sayısına eşit olmalı.
          return mData.visitCompletedCount === mData.visitCheckedCount;
        });
        return !allCompletedAreChecked;
      });
    }

    return result;
  }, [data, searchTerm, sortOrder, hideCompleted]);

  const toggleSelectRow = (uuid: string) => {
    setSelectedRowUuids(prev => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRowUuids.size === sortedAndFilteredData.length) {
      setSelectedRowUuids(new Set());
    } else {
      setSelectedRowUuids(new Set(sortedAndFilteredData.map(r => r.branch_uuid)));
    }
  };

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

          <button
            onClick={() => setHideCompleted(!hideCompleted)}
            className={`flex items-center px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${hideCompleted
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            title={hideCompleted ? "Tümünü Göster" : "Sadece Bekleyenleri Göster"}
          >
            {hideCompleted ? <CheckSquare size={16} className="mr-2" /> : <Square size={16} className="mr-2" />}
            Tamamlananları Gizle
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
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b sticky top-0 z-20 shadow-sm text-xs">
              <tr>
                <th className="py-3 px-2 border-r w-[40px] min-w-[40px] sticky left-0 bg-gray-50 z-30 text-center">
                  <button onClick={toggleSelectAll} className="p-1 hover:bg-gray-200 rounded transition-colors">
                    {selectedRowUuids.size === sortedAndFilteredData.length && sortedAndFilteredData.length > 0 ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-400" />}
                  </button>
                </th>
                <th className="py-3 px-4 border-r w-[120px] min-w-[120px] sticky left-[40px] bg-gray-50 z-30">Müşteri No</th>
                {/* YENİ: SIRALAMA ÖZELLİĞİ EKLENDİ */}
                <th
                  className="py-3 px-4 border-r w-[200px] min-w-[200px] sticky left-[160px] bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={handleSort}
                  title="Sıralamak için tıklayın"
                >
                  <div className="flex items-center justify-between">
                    <span>Cari / Şube</span>
                    {sortOrder === 'asc' ? <ArrowUp size={14} className="text-gray-500" /> : <ArrowDown size={14} className="text-gray-500" />}
                  </div>
                </th>
                {months.map((month) => (
                  <th key={month} colSpan={2} className="py-2 px-2 border-r text-center min-w-[120px] bg-blue-50/30">
                    {month}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 bg-gray-50 z-30 border-r border-b"></th>
                <th className="sticky left-[40px] bg-gray-50 z-30 border-r border-b"></th>
                <th className="sticky left-[160px] bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-b"></th>
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
              ) : sortedAndFilteredData.length === 0 ? (
                <tr>
                  <td colSpan={26} className="py-12 text-center text-gray-500">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                sortedAndFilteredData.map((row, rowIdx) => (
                  <tr key={`${row.musteri_no}-${row.sube_id}-${row.branch_uuid}`} className={`hover:bg-blue-50/30 transition-colors group ${selectedRowUuids.has(row.branch_uuid) ? 'bg-blue-50' : ''}`}>
                    <td className={`py-2 px-2 border-r sticky left-0 z-10 border-b text-center transition-colors ${selectedRowUuids.has(row.branch_uuid) ? 'bg-blue-50' : 'bg-white group-hover:bg-blue-50/30'}`}>
                      <button onClick={() => toggleSelectRow(row.branch_uuid)} className="p-1 hover:bg-gray-200 rounded transition-colors">
                        {selectedRowUuids.has(row.branch_uuid) ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-gray-300" />}
                      </button>
                    </td>
                    <td className={`py-2 px-4 border-r font-medium text-gray-900 sticky left-[40px] z-10 border-b transition-colors ${selectedRowUuids.has(row.branch_uuid) ? 'bg-blue-50' : 'bg-white group-hover:bg-blue-50/30'}`}>
                      {row.musteri_no}
                    </td>
                    <td className={`py-2 px-4 border-r text-gray-600 sticky left-[160px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-b transition-colors ${selectedRowUuids.has(row.branch_uuid) ? 'bg-blue-50' : 'bg-white group-hover:bg-blue-50/30'}`}>
                      <div className="font-medium text-gray-900 truncate max-w-[180px]" title={row.cari_isim}>{row.cari_isim}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[180px]" title={row.sube_adi}>{row.sube_adi}</div>
                    </td>

                    {months.map((_, mIdx) => {
                      const mData = row.months[mIdx];

                      // Ziyaret Durumları
                      const isVisitFullyChecked = mData.visitCount > 0 && mData.visitCount === mData.visitCheckedCount;
                      const isVisitFullyCompleted = mData.visitCount > 0 && mData.visitCount === mData.visitCompletedCount;

                      // Malzeme Fatura Durumu
                      const isMatFullyInvoiced = mData.hasMaterial && mData.materialSaleIds.length > 0 && mData.materialSaleIds.length === mData.materialInvoicedCount;

                      return (
                        <React.Fragment key={mIdx}>
                          {/* Ziyaret Sütunu (is_checked & Paraşüt) */}
                          <td
                            className={`py-2 px-1 border-r border-b text-center align-middle transition-colors ${mData.hasVisit
                              ? (isVisitFullyCompleted
                                ? (isVisitFullyChecked ? 'bg-green-200' : 'bg-green-100')
                                : 'bg-yellow-100')
                              : ''
                              }`}
                          >
                            {mData.hasVisit ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className={`text-xs font-bold cursor-help ${isVisitFullyCompleted ? 'text-green-700' : 'text-yellow-700'}`} title={mData.visitDetails.join('\n')}>{mData.visitCount}</span>
                                <div className="flex items-center gap-1">
                                  {isVisitFullyCompleted && (
                                    <button
                                      onClick={() => toggleStatus(rowIdx, mIdx, 'visit', mData.visitIds, !isVisitFullyChecked)}
                                      disabled={updating}
                                      className="text-gray-400 hover:text-green-600 focus:outline-none disabled:opacity-50"
                                      title={isVisitFullyChecked ? "Onayı Kaldır (Takvimden de kalkar)" : "Tümünü Onayla (Takvimde de onaylanır)"}
                                    >
                                      {isVisitFullyChecked ? <CheckSquare size={14} className="text-green-600" /> : <Square size={14} />}
                                    </button>
                                  )}
                                  {/* PARAŞÜT AKTARIM BUTONU (2. CHECKBOX) */}
                                  <button
                                    onClick={() => prepareTransferItems('visit', rowIdx, mIdx)}
                                    disabled={transferring}
                                    className={`p-1 rounded transition-colors ${mData.hasMonthlyInvoice ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-blue-600'}`}
                                    title={mData.hasMonthlyInvoice ? "Paraşüt'e Aktarıldı" : "Paraşüt'e Fatura Olarak Aktar"}
                                  >
                                    {mData.hasMonthlyInvoice ? <Check size={14} /> : <Send size={14} />}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-200 text-xs">-</span>
                            )}
                          </td>

                          {/* Malzeme Sütunu (is_invoiced & Paraşüt) */}
                          <td
                            className={`py-2 px-1 border-r border-b text-center align-middle transition-colors ${mData.hasMaterial ? (isMatFullyInvoiced ? 'bg-orange-100' : 'bg-orange-50') : ''}`}
                          >
                            {mData.hasMaterial ? (
                              <div className="flex flex-col items-center justify-center gap-1">
                                <span className="text-[10px] font-bold text-orange-700 cursor-help" title={generateMaterialSummary(mData)}>
                                  {mData.totalMaterialCount}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => prepareTransferItems('material', rowIdx, mIdx)}
                                    disabled={transferring}
                                    className={`p-1 rounded transition-colors ${mData.hasMaterialInvoice ? 'text-green-600 bg-green-50' : 'text-gray-300 hover:text-orange-600'}`}
                                    title={mData.hasMaterialInvoice ? "Paraşüt'e Aktarıldı" : "Malzemeleri Paraşüt'e Aktar"}
                                  >
                                    {mData.hasMaterialInvoice ? <Check size={14} /> : <Send size={14} />}
                                  </button>
                                </div>
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
            <div className="flex items-center gap-1"><Info size={14} /> <span>Sol kutucuk (Ziyaret) takvimdeki onay kutusunu kontrol eder. Sağ kutucuk (Malzeme) fatura durumunu kontrol eder.</span></div>
          </div>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-100 border border-yellow-200 rounded-sm"></div> Planlanan Ziyaret</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded-sm"></div> Tamamlanan (Onaysız)</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-200 border border-green-400 rounded-sm"></div> Tamamlanan (Onaylı)</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-50 border border-orange-200 rounded-sm"></div> Malzeme Bekliyor</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded-sm"></div> Malzeme Faturalandı</span>
          </div>
        </div>
      </div>

      {/* v2.19.1: Paraşüt Aktarım Modalı (Gelişmiş) */}
      {transferModal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 space-y-6 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-4 text-blue-600">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Send className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Paraşüt Aktarımı</h3>
                  <p className="text-sm text-gray-500">Fatura kalemlerini kontrol edin ve düzenleyin</p>
                </div>
              </div>
              <button
                onClick={() => setTransferModal(prev => ({ ...prev, show: false }))}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                disabled={transferring}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Cari / Şube:</span>
                <span className="font-bold text-gray-900">{sortedAndFilteredData[transferModal.rowIdx]?.cari_isim} / {sortedAndFilteredData[transferModal.rowIdx]?.sube_adi}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 font-medium">Hedef Takvim Ayı:</span>
                <span className="font-bold text-gray-900">{months[transferModal.monthIdx]} {year}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
                <div className="text-sm font-bold text-blue-900 flex justify-between items-center mb-4">
                  <span className="flex items-center gap-2"><Download size={16} /> Fatura Kalemleri</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider">{transferModal.items.length} KALEM</span>
                </div>

                <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {transferModal.items.map((item, idx) => (
                    <div key={item.id || idx} className="bg-white p-3 rounded-xl border border-blue-200 flex items-center justify-between gap-4 hover:border-blue-400 transition-colors shadow-sm group">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate pr-2" title={item.name}>{item.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium tracking-tight whitespace-nowrap">MİKTAR: {item.quantity}</span>
                          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium tracking-tight whitespace-nowrap">KDV: %{item.vat_rate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Birim Fiyat (TL)</label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                            className="w-24 px-2 py-1 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-right font-black text-blue-700 bg-gray-50 group-hover:bg-white transition-colors"
                          />
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Kalemi Çıkart"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {transferModal.items.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm italic bg-white/50 rounded-2xl border border-dashed border-blue-200">
                      Kalem listesi boş. Lütfen en az bir kalem ekleyin.
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-blue-200 flex justify-between items-center">
                  <div className="text-xs text-blue-600 font-bold uppercase tracking-widest">TOPLAM TUTAR (KDV HARİÇ)</div>
                  <div className="text-xl font-black text-blue-900">
                    {transferModal.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTransferModal(prev => ({ ...prev, withholding: !prev.withholding }))}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${transferModal.withholding ? 'bg-blue-600 border-blue-700 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <div className="text-left">
                    <span className="block font-bold text-xs">Tevkifatlı (9/10)</span>
                    <span className={`text-[9px] ${transferModal.withholding ? 'text-blue-100' : 'text-gray-400'}`}>Tevkifat kodu: 613</span>
                  </div>
                  {transferModal.withholding ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>

                <button
                  onClick={() => setTransferModal(prev => ({ ...prev, includeBalance: !prev.includeBalance }))}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${transferModal.includeBalance ? 'bg-orange-500 border-orange-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <div className="text-left">
                    <span className="block font-bold text-xs">Bakiye Bildirimi</span>
                    <span className={`text-[9px] ${transferModal.includeBalance ? 'text-orange-100' : 'text-gray-400'}`}>Notlara bakiye eklenir</span>
                  </div>
                  {transferModal.includeBalance ? <CheckSquare size={20} /> : <Square size={20} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => handleParasutTransfer()}
                disabled={transferring || transferModal.items.length === 0}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden"
              >
                {transferring ? (
                  <>
                    <RefreshCw className="w-6 h-6 animate-spin" />
                    <span>AKTARILIYOR...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6" />
                    <span>ONAYLA VE AKTARIMI BAŞLAT</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setTransferModal(prev => ({ ...prev, show: false }))}
                className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors text-sm tracking-wide"
                disabled={transferring}
              >
                VAZGEÇ VE KAPAT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YENİ: TOPLU İŞLEM ÇUBUĞU */}
      {selectedRowUuids.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-gray-800 flex items-center gap-6 backdrop-blur-xl bg-opacity-90">
            <div className="flex items-center gap-3 border-r border-gray-700 pr-6">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-900/20">
                {selectedRowUuids.size}
              </div>
              <div>
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Şube Seçildi</div>
                <div className="text-sm font-bold text-white">Toplu İşlemler</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBulkActionType('visit');
                  setBulkMonthModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20 active:scale-95"
              >
                <RefreshCw size={18} />
                Toplu Hizmet Faturası
              </button>

              <button
                onClick={() => {
                  setBulkActionType('material');
                  setBulkMonthModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-900/20 active:scale-95"
              >
                <Download size={18} />
                Toplu Malzeme Faturası
              </button>

              <button
                onClick={() => setSelectedRowUuids(new Set())}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-sm transition-all active:scale-95"
              >
                <X size={18} />
                Seçimi Temizle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YENİ: TOPLU AY SEÇİM MODALI */}
      {bulkMonthModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Toplu Fatura Dönemi</h3>
                <p className="text-xs text-gray-500 font-medium">Hangi aya ait malzemeler faturalandırılsın?</p>
              </div>
              <button onClick={() => setBulkMonthModal(false)} className="p-2 hover:bg-white rounded-full text-gray-400 transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-3 gap-3">
              {months.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => {
                    setBulkMonthModal(false);
                    if (bulkActionType === 'visit') prepareBulkServiceTransfer(idx);
                    else prepareBulkMaterialTransfer(idx);
                  }}
                  className="py-4 px-2 rounded-2xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all flex flex-col items-center gap-1 group"
                >
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-blue-400 uppercase tracking-tighter">{idx + 1}. AY</span>
                  <span className="text-sm font-bold">{m}</span>
                </button>
              ))}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed text-center">
                Seçilen tüm şubelerin bu aydaki {bulkActionType === 'visit' ? 'hizmet bedelleri' : 'faturalanmamış malzemeleri'} <br /> tek bir taslakta toplanacak.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualVisitReport;