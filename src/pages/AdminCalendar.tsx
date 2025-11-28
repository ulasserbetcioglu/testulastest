import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { 
  Download, FileImage, FileText, ChevronLeft, ChevronRight, X, Loader2, 
  User, Building, Calendar as CalendarIcon, Tag, MapPin, ClipboardX, 
  CheckSquare, DollarSign, TrendingUp, Users, MessageSquare, Info, 
  CheckCircle, AlertCircle, Camera, Bug, Activity, Megaphone, Package 
} from 'lucide-react';
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface Visit {
  id: string;
  customer_id: string;
  branch_id: string | null;
  customer: { kisa_isim: string } | null;
  branch: { sube_adi: string; latitude?: number; longitude?: number; } | null;
  operator: { name: string; id: string } | null;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  visit_type: string | string[];
  is_checked: boolean;
  
  // Detay alanları
  rapor_no?: string;
  aciklama?: string; 
  musteri_aciklamasi?: string;
  yonetici_notu?: string;
  yogunluk?: string; 
  pest_types?: string[];
  image_url?: string;

  total_visit_revenue?: number;
  material_sales_revenue?: number;
  service_per_visit_revenue?: number;
  
  paid_material_sales?: Array<{
    id: string;
    total_amount: number;
    customer_id: string;
    branch_id: string | null;
    paid_material_sale_items?: Array<{
      quantity: number;
      unit_price?: number;
      paid_products?: {
        id: string;
        name: string;
        unit_type?: string;
      };
    }>;
  }>;
}

interface Operator {
  id: string;
  name: string;
  auth_id?: string;
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
  customer?: {
    kisa_isim: string;
  } | null;
  latitude?: number;
  longitude?: number;
}

interface MaterialDisplayItem {
  material_name: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  total_price: number;
}

interface MaterialBreakdownItem {
  total_quantity: number;
  unit_type?: string;
  total_item_amount: number;
}

interface BranchMaterialSummary {
  branch_id: string;
  branch_name: string;
  total_sales_amount: number;
  total_visits_with_sales: number;
  materials_breakdown: {
    [materialName: string]: MaterialBreakdownItem;
  };
}

interface CustomerMaterialSummary {
  customer_id: string;
  customer_name: string;
  total_sales_amount: number;
  total_visits_with_sales: number;
  materials_breakdown: {
    [materialName: string]: MaterialBreakdownItem;
  };
  branches_summary: Map<string, BranchMaterialSummary>;
}

interface CustomerPricing {
  id: string;
  customer_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
}

interface BranchPricing {
  id: string;
  branch_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
}

interface OperatorRevenueSummary {
  operator_id: string;
  operator_name: string;
  total_monthly_revenue: number;
  daily_revenue_breakdown: Map<string, { total_daily_revenue: number; visit_count: number }>;
}

interface AggregatedRevenueItem {
  id: string;
  name: string;
  material: number;
  service: number;
  total: number;
  visits: number;
}

// --- YARDIMCI BİLEŞENLER ---

const StatusInfo: React.FC<{ status: Visit['status'] }> = ({ status }) => {
  const config = {
    completed: { text: 'Tamamlandı', color: 'bg-green-500' },
    planned: { text: 'Planlandı', color: 'bg-yellow-500' },
    cancelled: { text: 'İptal Edildi', color: 'bg-orange-500' },
  }[status] || { text: 'Bilinmiyor', color: 'bg-gray-500' };
  return <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${config.color}`} title={config.text}></div>;
};

const getVisitTypeLabel = (type: string | string[] | undefined): string => {
  if (!type) return '';
  const typeId = Array.isArray(type) ? type[0] : type;
  const types: { [key: string]: string } = {
    'ilk': 'İlk Ziyaret', 'ucretli': 'Ücretli', 'acil': 'Acil Müdahale',
    'teknik': 'Teknik Servis', 'periyodik': 'Periyodik Kontrol',
    'isyeri': 'İşyeri İlaçlama', 'gozlem': 'Gözlem Ziyareti', 'son': 'Son Kontrol'
  };
  return types[typeId] || typeId.charAt(0).toUpperCase() + typeId.slice(1);
};

// --- VISIT DETAIL MODAL ---
const VisitDetailModal: React.FC<{ 
  visit: Visit | null; 
  onClose: () => void; 
  paidMaterialDetailsMap: Map<string, MaterialDisplayItem[]>; 
  monthlyMaterialUsageSummary: Map<string, CustomerMaterialSummary> 
}> = ({ visit, onClose, paidMaterialDetailsMap, monthlyMaterialUsageSummary }) => {
  
  if (!visit) return null;

  const materialsForThisVisit = paidMaterialDetailsMap.get(visit.id) || [];
  const hasPaidMaterialUsage = materialsForThisVisit.length > 0;
  
  // Aylık özet için müşteri/şube bilgilerini al
  const customerSummary = visit.customer_id ? monthlyMaterialUsageSummary.get(visit.customer_id) : undefined;
  const branchMonthlySummary = (customerSummary && visit.branch_id) ? customerSummary.branches_summary.get(visit.branch_id) : undefined;

  // Yoğunluk Göstergesi
  const DensityIndicator = ({ density }: { density: string | undefined }) => {
    let color = 'bg-gray-200';
    let text = 'Belirtilmedi';
    let width = '0%';

    const d = density?.toLowerCase() || '';
    if (d.includes('yüksek') || d === 'high' || d === 'yuksek') {
      color = 'bg-red-500'; text = 'Yüksek'; width = '100%';
    } else if (d.includes('orta') || d === 'medium') {
      color = 'bg-yellow-500'; text = 'Orta'; width = '60%';
    } else if (d.includes('düşük') || d === 'low' || d === 'dusuk') {
      color = 'bg-green-500'; text = 'Düşük'; width = '30%';
    }

    return (
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div className={`h-full ${color} transition-all duration-500`} style={{ width }}></div>
        </div>
        <span className="text-xs font-medium text-gray-600 min-w-[3rem] text-right">{text}</span>
      </div>
    );
  };

  const InfoRow = ({ icon: Icon, label, value, isLink = false, linkHref = "" }: any) => (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 p-1.5 bg-gray-100 rounded-lg shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        {isLink ? (
           <a href={linkHref} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 font-medium hover:underline break-words">{value}</a>
        ) : (
           <p className="text-sm text-gray-800 font-medium break-words">{value}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              Ziyaret Detayı
              {visit.rapor_no && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-mono border border-blue-200 ml-2">
                  #{visit.rapor_no}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-1">Sistem ID: {visit.id.substring(0, 8)}...</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* 1. Temel Bilgiler */}
          <div className="grid grid-cols-2 gap-y-5 gap-x-4">
            <InfoRow icon={User} label="Müşteri" value={visit.customer?.kisa_isim || 'N/A'} />
            <InfoRow icon={Building} label="Şube" value={visit.branch?.sube_adi || 'Genel'} />
            <InfoRow icon={User} label="Operatör" value={visit.operator?.name || 'N/A'} />
            <InfoRow icon={CalendarIcon} label="Tarih" value={format(new Date(visit.visit_date), 'dd MMMM yyyy HH:mm', { locale: tr })} />
            
            <div className="flex items-start gap-3">
               <div className="mt-0.5 p-1.5 bg-gray-100 rounded-lg shrink-0">
                  <Tag className="w-4 h-4 text-gray-600" />
               </div>
               <div>
                 <p className="text-xs text-gray-500 font-medium">Durum</p>
                 <div className="flex items-center mt-1">
                   <StatusInfo status={visit.status} /> 
                   <span className="ml-2 text-sm font-medium capitalize">
                     {visit.status === 'completed' ? 'Tamamlandı' : visit.status === 'planned' ? 'Planlandı' : 'İptal'}
                   </span>
                 </div>
               </div>
            </div>

            <InfoRow icon={FileText} label="Ziyaret Tipi" value={Array.isArray(visit.visit_type) ? visit.visit_type.map(type => getVisitTypeLabel(type)).join(', ') : getVisitTypeLabel(visit.visit_type)} />
          </div>

          <div className="h-px bg-gray-100" />

          {/* 2. Teknik Veriler */}
          <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
               <Activity className="w-4 h-4 text-indigo-500"/> Teknik Veriler
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Popülasyon Yoğunluğu</p>
                  <DensityIndicator density={visit.yogunluk} />
               </div>
               <div>
                  <p className="text-xs text-gray-500 mb-2 font-medium">Hedef Zararlılar</p>
                  {visit.pest_types && visit.pest_types.length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                        {visit.pest_types.map((pest, idx) => (
                           <span key={idx} className="px-2.5 py-0.5 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-100 flex items-center gap-1">
                              <Bug className="w-3 h-3"/> {pest}
                           </span>
                        ))}
                     </div>
                  ) : (
                     <span className="text-sm text-gray-400 italic">Belirtilmedi</span>
                  )}
               </div>
            </div>
          </div>

          {/* 3. Açıklamalar */}
          <div className="grid gap-4">
             <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"><MessageSquare className="w-4 h-4" /> Operatör Açıklaması (Dahili)</h4>
                <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200 shadow-sm leading-relaxed whitespace-pre-wrap">
                  {visit.aciklama ? visit.aciklama : <span className="text-gray-400 italic">Operatör not girmemiş.</span>}
                </div>
             </div>
             <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-800 mb-2"><Megaphone className="w-4 h-4" /> Müşteri Bilgilendirme Notu</h4>
                <div className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-blue-100 shadow-sm leading-relaxed whitespace-pre-wrap">
                  {visit.musteri_aciklamasi ? visit.musteri_aciklamasi : <span className="text-gray-400 italic">Müşteri için özel bir not girilmemiş.</span>}
                </div>
             </div>
             {visit.yonetici_notu && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                   <h4 className="flex items-center gap-2 text-sm font-semibold text-yellow-800 mb-2"><Info className="w-4 h-4" /> Yönetici Notu</h4>
                  <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-yellow-100 shadow-sm leading-relaxed whitespace-pre-wrap italic">{visit.yonetici_notu}</div>
                </div>
             )}
          </div>

          {/* 4. Rapor Fotoğrafı */}
          {visit.image_url && (
             <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3"><Camera className="w-4 h-4 text-gray-600" /> Rapor Fotoğrafı</h4>
                <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex justify-center p-4">
                   <a href={visit.image_url} target="_blank" rel="noopener noreferrer" className="block relative group cursor-zoom-in">
                      <img src={visit.image_url} alt="Ziyaret Raporu" className="max-h-72 object-contain mx-auto rounded-lg shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center rounded-lg">
                         <span className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-xs px-2 py-1 rounded">Resmi Büyüt</span>
                      </div>
                   </a>
                </div>
             </div>
          )}

          {/* 5. Konum */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
             {visit.branch?.latitude ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <a href={`https://www.google.com/maps/search/?api=1&query=${visit.branch.latitude},${visit.branch.longitude}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600 cursor-pointer font-medium">
                    Konum: {visit.branch.latitude.toFixed(4)}, {visit.branch.longitude.toFixed(4)}
                  </a>
                </div>
             ) : (
               <span className="flex items-center gap-2 text-sm text-gray-400"><MapPin className="w-4 h-4"/> Konum yok</span>
             )}
             <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Kontrol:</span>
                {visit.is_checked ? <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle className="w-4 h-4"/> Evet</span> : <span className="flex items-center gap-1 text-gray-400"><AlertCircle className="w-4 h-4"/> Hayır</span>}
             </div>
          </div>

          {/* 6. Malzeme Kullanımı (Ziyaret Bazlı) */}
          {hasPaidMaterialUsage && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                 <Package className="w-4 h-4 text-orange-500"/> Ziyarette Kullanılan Malzemeler
              </h4>
              <div className="border border-orange-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-orange-50 text-orange-800 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2">Malzeme</th>
                      <th className="px-4 py-2 text-center">Miktar</th>
                      <th className="px-4 py-2 text-right">Birim Fiyat</th>
                      <th className="px-4 py-2 text-right">Toplam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 bg-white">
                    {materialsForThisVisit.map((material, index) => (
                      <tr key={index} className="hover:bg-orange-50/30">
                        <td className="px-4 py-2 font-medium text-gray-700">{material.material_name}</td>
                        <td className="px-4 py-2 text-center text-gray-600">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-semibold">{material.quantity} {material.unit}</span>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">{material.unit_price.toFixed(2)} ₺</td>
                        <td className="px-4 py-2 text-right font-bold text-orange-700">{material.total_price.toFixed(2)} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. Finansal Özet */}
          {(visit.total_visit_revenue !== undefined || (visit.material_sales_revenue && visit.material_sales_revenue > 0)) && (
             <div className="bg-gray-800 text-white rounded-xl p-4 shadow-lg">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3 border-b border-gray-600 pb-2">Finansal Özet</h4>
                <div className="grid grid-cols-1 gap-2">
                  {visit.service_per_visit_revenue !== undefined && visit.service_per_visit_revenue > 0 && (
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Hizmet Bedeli</span>
                      <span>{visit.service_per_visit_revenue.toFixed(2)} TL</span>
                    </div>
                  )}
                  {visit.material_sales_revenue !== undefined && visit.material_sales_revenue > 0 && (
                     <div className="flex justify-between text-sm text-gray-300">
                       <span>Malzeme Satışı</span>
                       <span>{visit.material_sales_revenue.toFixed(2)} TL</span>
                     </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-white pt-2 mt-1 border-t border-gray-600">
                    <span>Toplam Ciro</span>
                    <span className="flex items-center gap-1 text-green-400"><DollarSign className="w-5 h-5" />{visit.total_visit_revenue?.toFixed(2)} TL</span>
                  </div>
                </div>
             </div>
          )}

          {/* 8. Aylık Şube Özeti */}
          {branchMonthlySummary && (
            <div className="mt-4 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50/50">
              <strong className="block text-sm text-gray-700 mb-2">
                {format(new Date(visit.visit_date), 'MMMM yyyy', { locale: tr })} Ayı Şube Genel Özeti ({branchMonthlySummary.branch_name})
              </strong>
              <div className="text-xs space-y-1 text-gray-600">
                 <p>Bu Ay Toplam Satış: <span className="font-semibold text-gray-800">{branchMonthlySummary.total_sales_amount.toFixed(2)} TL</span> <span className="text-gray-400 italic">(Sadece tamamlanan ziyaretler)</span></p>
                 <p>Malzeme Satışlı Ziyaret: <span className="font-semibold">{branchMonthlySummary.total_visits_with_sales}</span></p>
                 
                 {Object.keys(branchMonthlySummary.materials_breakdown).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="font-semibold mb-1">Bu Ay Kullanılan Toplam Malzemeler:</p>
                        <ul className="list-disc list-inside ml-2">
                            {Object.entries(branchMonthlySummary.materials_breakdown).map(([name, details]) => (
                                <li key={name}>{name}: <strong>{details.total_quantity} {details.unit_type}</strong> ({details.total_item_amount.toFixed(2)} ₺)</li>
                            ))}
                        </ul>
                    </div>
                 )}
              </div>
            </div>
          )}

        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors shadow-sm">Kapat</button>
        </div>
      </div>
    </div>
  );
};

// --- ANA BİLEŞEN ---
const AdminCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [monthlySchedules, setMonthlySchedules] = useState<any[]>([]);
  const [paidMaterialDetailsMap, setPaidMaterialDetailsMap] = useState<Map<string, MaterialDisplayItem[]>>(new Map());
  const [monthlyMaterialUsageSummary, setMonthlyMaterialUsageSummary] = useState<Map<string, CustomerMaterialSummary>>(new Map());

  const [customerPricingMap, setCustomerPricingMap] = useState<Map<string, CustomerPricing>>(new Map());
  const [branchPricingMap, setBranchPricingMap] = useState<Map<string, BranchPricing>>(new Map());
  const [operatorRevenueSummary, setOperatorRevenueSummary] = useState<Map<string, OperatorRevenueSummary>>(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [checkedStatusFilter, setCheckedStatusFilter] = useState<string>('all');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [scheduleCompletionFilter, setScheduleCompletionFilter] = useState<'incomplete' | 'complete' | 'all'>('incomplete');
  const calendarRef = useRef<HTMLDivElement>(null);

  const filteredBranches = useMemo(() => {
    if (!selectedCustomer) return branches;
    return branches.filter(branch => branch.customer_id === selectedCustomer);
  }, [branches, selectedCustomer]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const [operatorData, customerData, branchData, customerPricingData, branchPricingData, schedulesData] = await Promise.all([
          supabase.from('operators').select('id, name').order('name'),
          supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
          supabase.from('branches').select('id, sube_adi, customer_id, latitude, longitude, customer:customer_id(kisa_isim)').order('sube_adi'),
          supabase.from('customer_pricing').select('id, customer_id, monthly_price, per_visit_price'),
          supabase.from('branch_pricing').select('id, branch_id, monthly_price, per_visit_price'),
          supabase.from('monthly_visit_schedules').select(`
            *,
            customer:customer_id(kisa_isim),
            branch:branch_id(sube_adi, customer:customer_id(kisa_isim)),
            operator:operator_id(name)
          `).eq('month', currentMonth).or(`year.eq.${currentYear},year.is.null`)
        ]);
        
        if(operatorData.error) throw operatorData.error;
        if(customerData.error) throw customerData.error;
        if(branchData.error) throw branchData.error;
        if(customerPricingData.error) throw customerPricingData.error;
        if(branchPricingData.error) throw branchPricingData.error;
        if(schedulesData.error) throw schedulesData.error;

        setOperators(operatorData.data || []);
        setCustomers(customerData.data || []);
        setBranches(branchData.data || []);
        setMonthlySchedules(schedulesData.data || []);

        const cPricingMap = new Map<string, CustomerPricing>();
        (customerPricingData.data || []).forEach(cp => cPricingMap.set(cp.customer_id, cp));
        setCustomerPricingMap(cPricingMap);

        const bPricingMap = new Map<string, BranchPricing>();
        (branchPricingData.data || []).forEach(bp => bPricingMap.set(bp.branch_id, bp));
        setBranchPricingMap(bPricingMap);

      } catch (error: any) {
        toast.error("Başlangıç verileri yüklenirken bir hata oluştu: " + error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [currentDate]);

  useEffect(() => {
    setSelectedBranch('');
  }, [selectedCustomer]);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    let visitsQuery = supabase
      .from('visits')
      .select(`
        id, visit_date, status, is_checked, visit_type, 
        
        rapor_no, aciklama, musteri_aciklamasi, yogunluk, pest_types, image_url, yonetici_notu,

        customer_id, branch_id, operator_id,
        customer:customer_id(kisa_isim),
        branch:branch_id(sube_adi, latitude, longitude),
        operator:operator_id(id, name),
        paid_material_sales (
          id, total_amount, customer_id, branch_id,
          paid_material_sale_items (
            quantity, unit_price,
            paid_products:product_id (
              id, name, unit_type
            )
          )
        )
      `)
      .gte('visit_date', start.toISOString())
      .lte('visit_date', end.toISOString());

    if (selectedOperator) visitsQuery = visitsQuery.eq('operator_id', selectedOperator);
    if (selectedStatus) visitsQuery = visitsQuery.eq('status', selectedStatus);
    if (selectedCustomer) visitsQuery = visitsQuery.eq('customer_id', selectedCustomer);
    if (selectedBranch) visitsQuery = visitsQuery.eq('branch_id', selectedBranch);
    
    if (checkedStatusFilter === 'checked') {
      visitsQuery = visitsQuery.eq('is_checked', true);
    } else if (checkedStatusFilter === 'unchecked') {
      visitsQuery = visitsQuery.or('is_checked.is.false,is_checked.is.null');
    }
    
    const { data: visitsData, error: visitsError } = await visitsQuery;

    if (visitsError) {
      toast.error("Ziyaretler yüklenirken bir hata oluştu: " + visitsError.message);
      setError(visitsError.message);
      setLoading(false);
      return;
    }
    
    const customerMonthlyVisitCounts = new Map<string, number>();
    const branchMonthlyVisitCounts = new Map<string, number>();

    (visitsData || []).forEach(visit => {
      if (visit.customer_id) {
        customerMonthlyVisitCounts.set(visit.customer_id, (customerMonthlyVisitCounts.get(visit.customer_id) || 0) + 1);
      }
      if (visit.branch_id) {
        branchMonthlyVisitCounts.set(visit.branch_id, (branchMonthlyVisitCounts.get(visit.branch_id) || 0) + 1);
      }
    });

    const distributedCustomerMonthlyRevenuePerVisit = new Map<string, number>();
    customerPricingMap.forEach((pricing, customerId) => {
      if (pricing.monthly_price && pricing.monthly_price > 0) {
        const visitCount = customerMonthlyVisitCounts.get(customerId) || 0;
        if (visitCount > 0) {
          distributedCustomerMonthlyRevenuePerVisit.set(customerId, pricing.monthly_price / visitCount);
        } else {
          distributedCustomerMonthlyRevenuePerVisit.set(customerId, 0); 
        }
      }
    });

    const distributedBranchMonthlyRevenuePerVisit = new Map<string, number>();
    branchPricingMap.forEach((pricing, branchId) => {
      if (pricing.monthly_price && pricing.monthly_price > 0) {
        const visitCount = branchMonthlyVisitCounts.get(branchId) || 0;
        if (visitCount > 0) {
          distributedBranchMonthlyRevenuePerVisit.set(branchId, pricing.monthly_price / visitCount);
        } else {
          distributedBranchMonthlyRevenuePerVisit.set(branchId, 0); 
        }
      }
    });

    const visitMaterialsMap = new Map<string, MaterialDisplayItem[]>();
    const monthlySummaryMap = new Map<string, CustomerMaterialSummary>();
    const newOperatorRevenueSummary = new Map<string, OperatorRevenueSummary>();
    const processedVisits: Visit[] = []; 

    (visitsData || []).forEach(visit => {
      let materialSalesRevenue = 0;
      
      // *** KRİTİK DÜZELTME: Aylık Toplama SADECE TAMAMLANANLAR dahil edilir ***
      // Ama Ziyaret Detayında (visitMaterialsMap) o ziyarete ait ne varsa gözükmelidir.
      const isCompleted = visit.status === 'completed';

      (visit.paid_material_sales || []).forEach(sale => {
          materialSalesRevenue += sale.total_amount || 0;

          // 1. Aylık Toplamlar (Sadece Tamamlananlar)
          if (isCompleted) {
              if (!monthlySummaryMap.has(sale.customer_id)) {
                monthlySummaryMap.set(sale.customer_id, {
                  customer_id: sale.customer_id,
                  customer_name: visit.customer?.kisa_isim || 'Bilinmeyen Müşteri',
                  total_sales_amount: 0,
                  total_visits_with_sales: 0, 
                  materials_breakdown: {},
                  branches_summary: new Map()
                });
              }
              const customerSummary = monthlySummaryMap.get(sale.customer_id)!;
              customerSummary.total_sales_amount += sale.total_amount || 0;

              if (sale.branch_id) {
                if (!customerSummary.branches_summary.has(sale.branch_id)) {
                  customerSummary.branches_summary.set(sale.branch_id, {
                    branch_id: sale.branch_id,
                    branch_name: visit.branch?.sube_adi || 'Bilinmeyen Şube',
                    total_sales_amount: 0,
                    total_visits_with_sales: 0,
                    materials_breakdown: {}
                  });
                }
                const branchSummary = customerSummary.branches_summary.get(sale.branch_id)!;
                branchSummary.total_sales_amount += sale.total_amount || 0;
              }
          }

          (sale.paid_material_sale_items || []).forEach(item => {
            const product = item.paid_products;
            if (!product) return;

            // 2. Bu Ziyaretin Detayı (Her durumda ekle)
            if (!visitMaterialsMap.has(visit.id)) {
              visitMaterialsMap.set(visit.id, []);
            }
            const unitPrice = item.unit_price || 0;
            visitMaterialsMap.get(visit.id)?.push({
              material_name: product.name,
              quantity: item.quantity,
              unit: product.unit_type,
              unit_price: unitPrice,
              total_price: item.quantity * unitPrice
            });

            // 3. Aylık Kırılım (Sadece Tamamlananlar)
            if (isCompleted) {
                const itemTotalAmount = item.quantity * (item.unit_price || 0);
                const customerSummary = monthlySummaryMap.get(sale.customer_id)!; // isCompleted ise yukarıda oluştu

                if (!customerSummary.materials_breakdown[product.name]) {
                  customerSummary.materials_breakdown[product.name] = { total_quantity: 0, unit_type: product.unit_type, total_item_amount: 0 };
                }
                customerSummary.materials_breakdown[product.name].total_quantity += item.quantity;
                customerSummary.materials_breakdown[product.name].total_item_amount += itemTotalAmount;
                
                if (sale.branch_id) {
                  const branchSummary = customerSummary.branches_summary.get(sale.branch_id)!;
                  if (!branchSummary.materials_breakdown[product.name]) {
                    branchSummary.materials_breakdown[product.name] = { total_quantity: 0, unit_type: product.unit_type, total_item_amount: 0 };
                  }
                  branchSummary.materials_breakdown[product.name].total_quantity += item.quantity;
                  branchSummary.materials_breakdown[product.name].total_item_amount += itemTotalAmount;
                }
            }
          });
      });

      let servicePerVisitRevenue = 0;
      
      if (visit.branch_id && distributedBranchMonthlyRevenuePerVisit.has(visit.branch_id)) {
        servicePerVisitRevenue = distributedBranchMonthlyRevenuePerVisit.get(visit.branch_id) || 0;
      } else if (visit.customer_id && distributedCustomerMonthlyRevenuePerVisit.has(visit.customer_id)) {
        servicePerVisitRevenue = distributedCustomerMonthlyRevenuePerVisit.get(visit.customer_id) || 0;
      } else {
        if (visit.branch_id) {
          const branchPricing = branchPricingMap.get(visit.branch_id);
          if (branchPricing?.per_visit_price) {
            servicePerVisitRevenue = branchPricing.per_visit_price;
          }
        }
        if (servicePerVisitRevenue === 0 && visit.customer_id) { 
          const customerPricing = customerPricingMap.get(visit.customer_id);
          if (customerPricing?.per_visit_price) {
            servicePerVisitRevenue = customerPricing.per_visit_price;
          }
        }
      }
      
      const totalVisitRevenue = materialSalesRevenue + servicePerVisitRevenue;

      processedVisits.push({
        ...visit,
        total_visit_revenue: totalVisitRevenue,
        material_sales_revenue: materialSalesRevenue,
        service_per_visit_revenue: servicePerVisitRevenue,
      } as Visit);

      if (visit.operator?.id && visit.operator?.name) {
        const operatorId = visit.operator.id;
        const operatorName = visit.operator.name;
        const visitDate = format(new Date(visit.visit_date), 'yyyy-MM-dd');

        if (!newOperatorRevenueSummary.has(operatorId)) {
          newOperatorRevenueSummary.set(operatorId, {
            operator_id: operatorId,
            operator_name: operatorName,
            total_monthly_revenue: 0,
            daily_revenue_breakdown: new Map()
          });
        }
        const opSummary = newOperatorRevenueSummary.get(operatorId)!;
        opSummary.total_monthly_revenue += totalVisitRevenue;

        if (!opSummary.daily_revenue_breakdown.has(visitDate)) {
          opSummary.daily_revenue_breakdown.set(visitDate, { total_daily_revenue: 0, visit_count: 0 });
        }
        const dailyBreakdown = opSummary.daily_revenue_breakdown.get(visitDate)!;
        dailyBreakdown.total_daily_revenue += totalVisitRevenue;
        dailyBreakdown.visit_count += 1;
      }
    });
    
    monthlySummaryMap.forEach(customerSummary => {
        const visitsWithSales = new Set<string>();
        customerSummary.branches_summary.forEach(branchSummary => {
            const branchVisitsWithSales = new Set<string>();
            (visitsData || []).forEach(v => {
                // Sadece tamamlanan ziyaretleri say
                if (v.branch_id === branchSummary.branch_id && v.status === 'completed' && (v.paid_material_sales || []).length > 0) {
                    branchVisitsWithSales.add(v.id);
                    visitsWithSales.add(v.id);
                }
            });
            branchSummary.total_visits_with_sales = branchVisitsWithSales.size;
        });
        customerSummary.total_visits_with_sales = visitsWithSales.size;
    });

    setVisits(processedVisits);
    setPaidMaterialDetailsMap(visitMaterialsMap);
    setMonthlyMaterialUsageSummary(monthlySummaryMap);
    setOperatorRevenueSummary(newOperatorRevenueSummary);

    setLoading(false);
  }, [currentDate, selectedOperator, selectedCustomer, selectedBranch, checkedStatusFilter, selectedStatus, customerPricingMap, branchPricingMap]);


  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const handleCheckVisit = async (visitId: string, currentStatus: boolean) => {
    setVisits(prevVisits => 
      prevVisits.map(v => v.id === visitId ? { ...v, is_checked: !currentStatus } : v)
    );

    const { error } = await supabase
      .from('visits')
      .update({ is_checked: !currentStatus })
      .eq('id', visitId);

    if (error) {
      toast.error("Onay durumu güncellenemedi: " + error.message);
      setVisits(prevVisits => 
        prevVisits.map(v => v.id === visitId ? { ...v, is_checked: currentStatus } : v)
      );
    } else {
      toast.success("Ziyaret onay durumu güncellendi.");
    }
  };

  const calculateScheduleEstimatedRevenue = (schedule: any) => {
    let revenue = 0;
    const count = schedule.visits_required || 0;

    if (schedule.branch_id) {
      const bp = branchPricingMap.get(schedule.branch_id);
      if (bp) {
        if (bp.monthly_price && bp.monthly_price > 0) return bp.monthly_price;
        if (bp.per_visit_price && bp.per_visit_price > 0) return bp.per_visit_price * count;
      }
    }

    let cId = schedule.customer_id;
    if (!cId && schedule.branch_id) {
      const b = branches.find(br => br.id === schedule.branch_id);
      cId = b?.customer_id;
    }

    if (cId) {
      const cp = customerPricingMap.get(cId);
      if (cp) {
        if (cp.per_visit_price && cp.per_visit_price > 0) return cp.per_visit_price * count;
      }
    }

    return 0;
  };

  const inactiveItems = useMemo(() => {
    if (loading) return { customers: [], branches: [] };

    const visitedBranchIds = new Set(visits.map(v => v.branch_id).filter(Boolean));
    const visitedCustomerIds = new Set(visits.map(v => v.customer_id).filter(Boolean));
    
    const unvisitedBranches = branches.filter(branch => {
      const matchesCustomerFilter = !selectedCustomer || branch.customer_id === selectedCustomer;
      const matchesBranchFilter = !selectedBranch || branch.id === selectedBranch;
      return matchesCustomerFilter && matchesBranchFilter && !visitedBranchIds.has(branch.id);
    });
    
    const unvisitedCustomers = customers.filter(customer => {
      const matchesCustomerFilter = !selectedCustomer || customer.id === selectedCustomer;
      if (!matchesCustomerFilter) return false;

      const hasDirectVisit = visitedCustomerIds.has(customer.id);
      if (hasDirectVisit) return false;

      const customerBranches = branches.filter(branch => branch.customer_id === customer.id);
      const hasVisitedAnyBranch = customerBranches.some(branch => visitedBranchIds.has(branch.id));
      if (hasVisitedAnyBranch) return false;

      return true;
    });
    
    return { customers: unvisitedCustomers, branches: unvisitedBranches };
  }, [visits, customers, branches, loading, selectedCustomer, selectedBranch]);

  const daysOfWeek = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startingDayIndex = getDay(monthStart) === 0 ? 6 : getDay(monthStart) - 1;

  const statusLegend = [
    { text: 'Planlandı', color: 'bg-yellow-500' },
    { text: 'Tamamlandı', color: 'bg-green-500' },
    { text: 'İptal Edildi', color: 'bg-orange-500' },
  ];

  const monthlyRevenueSummary = useMemo(() => {
    const customerSummary = new Map<string, AggregatedRevenueItem>();
    const branchSummary = new Map<string, AggregatedRevenueItem>();

    visits.forEach(visit => {
      const customerId = visit.customer_id;
      const branchId = visit.branch_id;
      const materialRevenue = visit.material_sales_revenue || 0;
      const serviceRevenue = visit.service_per_visit_revenue || 0;
      const totalRevenue = visit.total_visit_revenue || 0;

      if (customerId) {
        if (!customerSummary.has(customerId)) {
          customerSummary.set(customerId, {
            id: customerId,
            name: visit.customer?.kisa_isim || 'Bilinmeyen Müşteri',
            material: 0,
            service: 0,
            total: 0,
            visits: 0
          });
        }
        const entry = customerSummary.get(customerId)!;
        entry.material += materialRevenue;
        entry.service += serviceRevenue;
        entry.total += totalRevenue;
        entry.visits += 1;
      }

      if (branchId) {
        if (!branchSummary.has(branchId)) {
          branchSummary.set(branchId, {
            id: branchId,
            name: visit.branch?.sube_adi || 'Bilinmeyen Şube',
            material: 0,
            service: 0,
            total: 0,
            visits: 0
          });
        }
        const entry = branchSummary.get(branchId)!;
        entry.material += materialRevenue;
        entry.service += serviceRevenue;
        entry.total += totalRevenue;
        entry.visits += 1;
      }
    });

    return {
      customer: Array.from(customerSummary.values()).sort((a, b) => b.total - a.total),
      branch: Array.from(branchSummary.values()).sort((a, b) => b.total - a.total)
    };
  }, [visits]);

  const totalMonthlyRevenue = useMemo(() => {
    return monthlyRevenueSummary.customer.reduce((sum, item) => sum + item.total, 0);
  }, [monthlyRevenueSummary]);

  if (loading && !visits.length) return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      <span className="ml-3 text-lg text-gray-700">Veriler Yükleniyor...</span>
    </div>
  );

  if (error) return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="text-red-600 text-lg p-4 bg-red-100 rounded-lg shadow-md">
        <p>Hata oluştu:</p>
        <p className="font-mono mt-2">{error}</p>
        <p className="mt-4 text-sm text-gray-700">Lütfen sayfayı yenilemeyi deneyin veya yöneticinize başvurun.</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen font-inter">
      <VisitDetailModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} paidMaterialDetailsMap={paidMaterialDetailsMap} monthlyMaterialUsageSummary={monthlyMaterialUsageSummary} />
      
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><ChevronLeft /></button>
          <h1 className="text-3xl font-bold text-gray-800 w-48 text-center">{format(currentDate, 'MMMM yyyy', { locale: tr })}</h1>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><ChevronRight /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">Bugün</button>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <div className="flex flex-col sm:flex-row gap-2">
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Tüm Müşteriler</option>
              {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.kisa_isim}</option>)}
            </select>
            <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Tüm Operatörler</option>
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500">
              <option value="">Tüm Durumlar</option>
              <option value="planned">Planlandı</option>
              <option value="completed">Tamamlandı</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)} 
              className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
              disabled={!selectedCustomer && branches.length > 50}
            >
              <option value="">Tüm Şubeler</option>
              {filteredBranches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.sube_adi} {branch.customer && `(${branch.customer.kisa_isim})`}
                </option>
              ))}
            </select>
            <select
                value={checkedStatusFilter}
                onChange={(e) => setCheckedStatusFilter(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="all">Tümü (Kontrol)</option>
                <option value="checked">Kontrol Edilenler</option>
                <option value="unchecked">Kontrol Edilmeyenler</option>
            </select>
          </div>
        </div>
      </header>
      
      <div ref={calendarRef} className="bg-white rounded-xl shadow-lg p-4">
        {loading && <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}
        <div className="grid grid-cols-7">
          {daysOfWeek.map(day => <div key={day} className="text-center font-bold text-gray-600 py-2 text-sm">{day}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-px border-t border-l border-gray-200">
          {Array.from({ length: startingDayIndex }).map((_, i) => <div key={`empty-${i}`} className="bg-gray-50 border-r border-b border-gray-200 min-h-[120px] sm:min-h-[150px]"></div>)}
          
          {monthDays.map(day => {
            const dayVisits = visits.filter(v => new Date(v.visit_date).toDateString() === day.toDateString());
            const formattedDay = format(day, 'yyyy-MM-dd');

            return (
              <div key={day.toString()} className={`relative p-2 border-r border-b border-gray-200 min-h-[120px] sm:min-h-[150px] ${isToday(day) ? 'bg-blue-50 ring-2 ring-blue-300' : 'hover:bg-gray-50'}`}>
                <time dateTime={format(day, 'yyyy-MM-dd')} className={`text-sm ${isToday(day) ? 'font-bold text-blue-700' : 'text-gray-500'}`}>{format(day, 'd')}</time>
                
                <div className="mt-1 mb-2 space-y-0.5">
                  {Array.from(operatorRevenueSummary.values()).map(opSummary => {
                    const dailyBreakdown = opSummary.daily_revenue_breakdown.get(formattedDay);
                    if (dailyBreakdown && dailyBreakdown.total_daily_revenue > 0) {
                      const operatorFirstName = opSummary.operator_name.split(' ')[0];
                      return (
                        <div key={opSummary.operator_id} className="flex items-center justify-between text-[10px] text-gray-700 bg-gray-100 px-1 py-0.5 rounded-sm">
                          <span className="font-medium">{operatorFirstName}:</span>
                          <span className="font-semibold">{dailyBreakdown.total_daily_revenue.toFixed(2)} TL</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>

                <div className="mt-1 space-y-1">
                  {dayVisits.map(visit => {
                    const materialsForThisVisitInCell = paidMaterialDetailsMap.get(visit.id) || [];
                    const hasPaidMaterialUsageInCell = materialsForThisVisitInCell.length > 0;
                    
                    const materialList = hasPaidMaterialUsageInCell ? 
                      materialsForThisVisitInCell.map(m => `${m.material_name} (${m.quantity}${m.unit ? ' ' + m.unit : ''})`).join(', ') : '';

                    return (
                      <div key={visit.id} 
                           className={`p-1.5 rounded-md text-white text-[10px] cursor-pointer flex items-start gap-1.5 transition-opacity ${visit.is_checked ? 'opacity-60' : ''}`} 
                           style={{ backgroundColor: { planned: '#f59e0b', completed: '#10b981', cancelled: '#f97316' }[visit.status] }}
                           title={`Müşteri: ${visit.customer?.kisa_isim || 'N/A'}\nŞube: ${visit.branch?.sube_adi || 'N/A'}\nOperatör: ${visit.operator?.name || 'N/A'}\nTarih: ${format(new Date(visit.visit_date), 'dd.MM.yyyy HH:mm', { locale: tr })}\nDurum: ${visit.status}\nTip: ${getVisitTypeLabel(visit.visit_type)}${hasPaidMaterialUsageInCell ? '\nKullanılan Malzemeler: ' + materialList : ''}\nToplam Ciro: ${visit.total_visit_revenue?.toFixed(2) || '0.00'} TL`} 
                      >
                        <StatusInfo status={visit.status} />
                        <div className="flex-grow overflow-hidden" onClick={() => setSelectedVisit(visit)}>
                          <span className="font-semibold truncate block">{visit.branch ? visit.branch.sube_adi : visit.customer?.kisa_isim}</span>
                          <span className="opacity-80 truncate block text-[9px]">{visit.branch ? visit.customer?.kisa_isim : visit.operator?.name}</span>
                          <span className="mt-1 inline-block px-1.5 py-0.5 bg-white/20 rounded-full text-xs leading-none">{getVisitTypeLabel(visit.visit_type)}</span>
                          {hasPaidMaterialUsageInCell && (
                            <span className="block text-white text-xs mt-0.5 opacity-90 truncate">
                              Malzeme: {materialList}
                            </span>
                          )}
                          {(visit.total_visit_revenue || 0) > 0 && (
                            <div className="flex items-center gap-1 mt-0.5 text-white text-xs opacity-90">
                              <DollarSign size={10} />
                              <span>{visit.total_visit_revenue?.toFixed(2)} TL</span>
                              {((visit.material_sales_revenue || 0) > 0 && (visit.service_per_visit_revenue || 0) > 0) && (
                                <span className="ml-1 text-[8px]">(M: {visit.material_sales_revenue?.toFixed(0)} S: {visit.service_per_visit_revenue?.toFixed(0)})</span>
                              )}
                            </div>
                          )}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={visit.is_checked} 
                          onChange={() => handleCheckVisit(visit.id, visit.is_checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="form-checkbox h-3.5 w-3.5 rounded-sm bg-white/50 border-white/50 text-green-500 focus:ring-0 cursor-pointer"
                          title="Kontrol edildi olarak işaretle"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mt-4 p-4 bg-white rounded-xl shadow-lg border border-gray-200 flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <DollarSign className="text-green-600" />
          {format(currentDate, 'MMMM yyyy', { locale: tr })} Ayı Toplam Cirosu:
        </h3>
        <span className="text-2xl font-extrabold text-green-700">
          {totalMonthlyRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
        </span>
      </div>

      <div className="mt-4 p-4 bg-white rounded-xl shadow-lg border border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-2">Durum Göstergesi</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
            {statusLegend.map(item => (
                <div key={item.text} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span>{item.text}</span>
                </div>
            ))}
        </div>
      </div>

      {monthlySchedules.length > 0 && (
        <div className="mt-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-700 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                Bu Ayın Ziyaret Planları ve Yapılmayanlar
              </h3>

              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleCompletionFilter('incomplete')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scheduleCompletionFilter === 'incomplete'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Tamamlanmayanlar
                </button>
                <button
                  onClick={() => setScheduleCompletionFilter('complete')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scheduleCompletionFilter === 'complete'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Tamamlananlar
                </button>
                <button
                  onClick={() => setScheduleCompletionFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    scheduleCompletionFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Tümü
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(
                monthlySchedules.reduce((acc: any, schedule: any) => {
                  const operatorName = schedule.operator?.name || 'Atanmamış';
                  if (!acc[operatorName]) {
                    acc[operatorName] = [];
                  }
                  acc[operatorName].push(schedule);
                  return acc;
                }, {})
              ).map(([operatorName, schedules]: [string, any]) => {
                const operatorSchedules = schedules;

                const filteredOperatorSchedules = operatorSchedules.filter((schedule: any) => {
                  const doneCount = visits.filter((v: Visit) => {
                    const matchesBranch = schedule.branch_id && v.branch_id === schedule.branch_id;
                    const matchesCustomer = schedule.customer_id && v.customer_id === schedule.customer_id;
                    return matchesBranch || matchesCustomer;
                  }).length;
                  const isComplete = doneCount >= schedule.visits_required;

                  if (scheduleCompletionFilter === 'complete') return isComplete;
                  if (scheduleCompletionFilter === 'incomplete') return !isComplete;
                  return true;
                });

                if (filteredOperatorSchedules.length === 0) return null;

                const totalRequired = filteredOperatorSchedules.reduce((sum: number, s: any) => sum + s.visits_required, 0);

                const totalEstimatedRevenue = filteredOperatorSchedules.reduce((sum: number, s: any) => sum + calculateScheduleEstimatedRevenue(s), 0);

                const completedCount = filteredOperatorSchedules.reduce((sum: number, schedule: any) => {
                  const completed = visits.filter((v: Visit) => {
                    const matchesBranch = schedule.branch_id && v.branch_id === schedule.branch_id;
                    const matchesCustomer = schedule.customer_id && v.customer_id === schedule.customer_id;
                    return matchesBranch || matchesCustomer;
                  }).length;
                  return sum + completed;
                }, 0);

                return (
                  <div key={operatorName} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-purple-600" />
                        </div>
                        <span className="font-semibold text-gray-800">{operatorName}</span>
                        
                        {totalEstimatedRevenue > 0 && (
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                            (Tahmini: {totalEstimatedRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })})
                          </span>
                        )}

                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600">
                          Toplam: <span className="font-semibold">{totalRequired}</span> ziyaret
                        </span>
                        <span className="text-sm">
                          <span className="text-green-600 font-semibold">{completedCount}</span> /
                          <span className="text-gray-600"> {totalRequired}</span>
                        </span>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${totalRequired > 0 ? Math.min((completedCount / totalRequired) * 100, 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredOperatorSchedules.map((schedule: any, idx: number) => {
                        const customerName = schedule.customer?.kisa_isim || schedule.branch?.customer?.kisa_isim;
                        const branchName = schedule.branch?.sube_adi;
                        const displayName = branchName ? `${customerName} - ${branchName}` : customerName;

                        const doneCount = visits.filter((v: Visit) => {
                          const matchesBranch = schedule.branch_id && v.branch_id === schedule.branch_id;
                          const matchesCustomer = schedule.customer_id && v.customer_id === schedule.customer_id;
                          return matchesBranch || matchesCustomer;
                        }).length;

                        const progress = schedule.visits_required > 0 ? (doneCount / schedule.visits_required) * 100 : 0;
                        const isComplete = doneCount >= schedule.visits_required;

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded border ${
                              isComplete ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-800 truncate" title={displayName}>
                              {displayName}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className={`text-xs font-semibold ${
                                isComplete ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {doneCount} / {schedule.visits_required}
                              </span>
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    isComplete ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                            </div>
                            {!isComplete && (
                              <div className="mt-1 text-xs text-red-600">
                                Kalan: {schedule.visits_required - doneCount} ziyaret
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ClipboardX className="text-gray-400"/> Bu Ay Ziyaret Planlanmamış
          </h3>

          {(() => {
            const scheduledBranchIds = new Set(monthlySchedules.filter((s: any) => s.branch_id).map((s: any) => s.branch_id));
            const scheduledCustomerIds = new Set(monthlySchedules.filter((s: any) => s.customer_id && !s.branch_id).map((s: any) => s.customer_id));

            const unplannedBranches = branches.filter(b => {
              if (selectedCustomer && b.customer_id !== selectedCustomer) return false;
              if (selectedBranch && b.id !== selectedBranch) return false;
              return !scheduledBranchIds.has(b.id);
            });

            const unplannedCustomers = customers.filter(c => {
               if (selectedCustomer && c.id !== selectedCustomer) return false;
               return !scheduledCustomerIds.has(c.id);
            });

            return (
              <>
                {unplannedBranches.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-600 mb-2">Planlanmamış Şubeler ({unplannedBranches.length})</h4>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {unplannedBranches.map(branch => (
                            <li key={branch.id} className="text-sm text-gray-600 p-2 bg-gray-100 rounded-md truncate" title={`${branch.sube_adi} (${branch.customer?.kisa_isim || 'Müşteri Yok'})`}>
                            <span className="font-medium">{branch.sube_adi}</span>
                            <span className="text-gray-400 ml-1">({branch.customer?.kisa_isim || 'N/A'})</span>
                            </li>
                        ))}
                        </ul>
                    </div>
                  </div>
                )}
                {unplannedCustomers.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-600 mb-2">Planlanmamış Müşteriler ({unplannedCustomers.length})</h4>
                    <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {unplannedCustomers.map(customer => (
                            <li key={customer.id} className="text-sm text-gray-600 p-2 bg-gray-100 rounded-md truncate" title={customer.kisa_isim}>{customer.kisa_isim}</li>
                        ))}
                        </ul>
                    </div>
                  </div>
                )}
                {unplannedBranches.length === 0 && unplannedCustomers.length === 0 && (
                  <p className="text-center text-gray-400 py-4">
                    {selectedCustomer || selectedBranch ? 'Bu filtreleme için bu ay planlanmamış şube veya kayıt bulunmuyor.' : 'Harika! Bu ay tüm aktif kayıtlar planlanmış.'}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Tag className="text-gray-400"/> Aylık Malzeme Kullanım Özeti
        </h3>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
          {Array.from(monthlyMaterialUsageSummary.values()).length > 0 ? (
            Array.from(monthlyMaterialUsageSummary.values()).map(customerSummary => (
              <div key={customerSummary.customer_id} className="border-b pb-4 last:border-b-0">
                <h4 className="text-lg font-bold text-gray-800 mb-2">{customerSummary.customer_name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <p><strong>Toplam Satış Tutarı:</strong> {customerSummary.total_sales_amount.toFixed(2)} TL</p>
                    <p><strong>Malzeme Satışı Yapılan Ziyaret Sayısı:</strong> {customerSummary.total_visits_with_sales}</p>
                    {Object.keys(customerSummary.materials_breakdown).length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold">Malzeme Dökümü:</p>
                        <ul className="list-disc list-inside ml-4">
                          {Object.entries(customerSummary.materials_breakdown).map(([materialName, details]) => (
                            <li key={materialName}>
                              {materialName}: {details.total_quantity} {details.unit_type || ''} ({details.total_item_amount.toFixed(2)} TL)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  {customerSummary.branches_summary.size > 0 && (
                    <div>
                      <p className="font-semibold">Şube Bazında Malzeme Kullanımı:</p>
                      <div className="space-y-2 mt-2">
                        {Array.from(customerSummary.branches_summary.values()).map(branchSummary => (
                          <div key={branchSummary.branch_id} className="p-2 bg-gray-50 rounded-md border border-gray-200">
                            <p className="font-medium">{branchSummary.branch_name}</p>
                            <p className="text-xs text-gray-600">Toplam Tutarı: {branchSummary.total_sales_amount.toFixed(2)} TL</p>
                            <p className="text-xs text-gray-600">Ziyaret Sayısı: {branchSummary.total_visits_with_sales}</p>
                            {Object.keys(branchSummary.materials_breakdown).length > 0 && (
                              <ul className="list-disc list-inside ml-4 text-xs">
                                {Object.entries(branchSummary.materials_breakdown).map(([materialName, details]) => (
                                  <li key={materialName}>
                                    {materialName}: {details.total_quantity} {details.unit_type || ''} ({details.total_item_amount.toFixed(2)} TL)
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-4">Bu ay için malzeme kullanım kaydı bulunmuyor.</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingUp className="text-gray-400"/> Operatör Ciro Özeti ({format(currentDate, 'MMMM yyyy', { locale: tr })})
        </h3>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
          {Array.from(operatorRevenueSummary.values()).length > 0 ? (
            Array.from(operatorRevenueSummary.values()).sort((a, b) => b.total_monthly_revenue - a.total_monthly_revenue).map(opSummary => (
              <div key={opSummary.operator_id} className="border-b pb-4 last:border-b-0">
                <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-500"/> {opSummary.operator_name}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <p className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-600"/> 
                      <strong>Toplam Aylık Ciro:</strong> {opSummary.total_monthly_revenue.toFixed(2)} TL
                    </p>
                  </div>
                  {opSummary.daily_revenue_breakdown.size > 0 && (
                    <div>
                      <p className="font-semibold">Günlük Ciro Dökümü:</p>
                      <div className="space-y-1 mt-2 max-h-48 overflow-y-auto pr-2">
                        {Array.from(opSummary.daily_revenue_breakdown.entries())
                          .sort(([date, _]) => new Date(date).getTime()) // Sort by date
                          .map(([date, details]) => (
                            <div key={date} className="p-1.5 bg-gray-50 rounded-md border border-gray-200 flex justify-between items-center">
                              <span className="font-medium text-xs">{format(new Date(date), 'dd MMMM', { locale: tr })}:</span>
                              <span className="text-xs text-gray-600">{details.total_daily_revenue.toFixed(2)} TL ({details.visit_count} ziyaret)</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 py-4">Bu ay için operatör ciro kaydı bulunmuyor.</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <DollarSign className="text-gray-400"/> Aylık Ciro Özeti ({format(currentDate, 'MMMM yyyy', { locale: tr })})
        </h3>
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
          {monthlyRevenueSummary.customer.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-600 mb-3 flex items-center gap-2"><Users size={18}/> Müşteri Bazında Ciro</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri Adı</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Malzeme Cirosu</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hizmet Cirosu</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Ciro</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ziyaret Sayısı</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyRevenueSummary.customer.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.material.toFixed(2)} TL</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.service.toFixed(2)} TL</td>
                        <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">{item.total.toFixed(2)} TL</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.visits}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">Genel Toplam</td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                        {monthlyRevenueSummary.customer.reduce((sum, item) => sum + item.material, 0).toFixed(2)} TL
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                        {monthlyRevenueSummary.customer.reduce((sum, item) => sum + item.service, 0).toFixed(2)} TL
                      </td>
                      <td className="px-4 py-3 text-sm font-extrabold text-right text-blue-600">
                        {monthlyRevenueSummary.customer.reduce((sum, item) => sum + item.total, 0).toFixed(2)} TL
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                        {monthlyRevenueSummary.customer.reduce((sum, item) => sum + item.visits, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {monthlyRevenueSummary.branch.length > 0 && (
            <div className="mt-8">
              <h4 className="font-semibold text-gray-600 mb-3 flex items-center gap-2"><Building size={18}/> Şube Bazında Ciro</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube Adı</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Malzeme Cirosu</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hizmet Cirosu</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Ciro</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ziyaret Sayısı</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyRevenueSummary.branch.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.material.toFixed(2)} TL</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.service.toFixed(2)} TL</td>
                        <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">{item.total.toFixed(2)} TL</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.visits}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">Genel Toplam</td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                        {monthlyRevenueSummary.branch.reduce((sum, item) => sum + item.material, 0).toFixed(2)} TL
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                        {monthlyRevenueSummary.branch.reduce((sum, item) => sum + item.service, 0).toFixed(2)} TL
                      </td>
                      <td className="px-4 py-3 text-sm font-extrabold text-right text-blue-600">
                        {monthlyRevenueSummary.branch.reduce((sum, item) => sum + item.total, 0).toFixed(2)} TL
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                        {monthlyRevenueSummary.branch.reduce((sum, item) => sum + item.visits, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {monthlyRevenueSummary.customer.length === 0 && monthlyRevenueSummary.branch.length === 0 && (
            <p className="text-center text-gray-400 py-4">Bu ay için ciro kaydı bulunmuyor.</p>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminCalendar;