import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Building, Calendar, CheckCircle2, 
  Search, Loader2,
  MapPin, CalendarClock, ChevronLeft, ChevronRight,
  Phone, MousePointer2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Customer {
  id: string;
  kisa_isim: string;
  is_active: boolean;
  phone?: string;
  adres?: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
  sube_telefonu?: string;
  customer?: {
    kisa_isim: string;
  };
}

interface Visit {
  id: string;
  customer_id: string;
  branch_id: string | null;
  status: string;
  visit_date: string;
}

interface Schedule {
  id: string;
  customer_id: string;
  branch_id: string | null;
  planned_count: number;
  month: number;
  year: number;
}

const IncompleteVisits: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unvisited' | 'incomplete'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const monthSelect = currentDate.getMonth() + 1;
      const yearSelect = currentDate.getFullYear();
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const [cData, bData, vData, sData] = await Promise.all([
        supabase.from('customers').select('*').eq('is_active', true).order('kisa_isim'),
        supabase.from('branches').select('*, customer:customer_id(kisa_isim)').order('sube_adi'),
        supabase.from('visits')
          .select('id, customer_id, branch_id, status, visit_date')
          .gte('visit_date', start.toISOString())
          .lte('visit_date', end.toISOString())
          .eq('status', 'completed'),
        supabase.from('monthly_visit_schedules')
          .select('*')
          .eq('month', monthSelect)
          .or(`year.eq.${yearSelect},year.is.null`)
      ]);

      if (cData.error) throw cData.error;
      if (bData.error) throw bData.error;
      if (vData.error) throw vData.error;
      if (sData.error) throw sData.error;

      setCustomers(cData.data || []);
      setBranches(bData.data || []);
      setVisits(vData.data || []);
      setSchedules(sData.data || []);
    } catch (err: any) {
      toast.error('Veriler yüklenirken hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const incompleteData = useMemo(() => {
    const results: any[] = [];

    // Map visits to counts
    const visitCounts = new Map<string, number>();
    visits.forEach(v => {
      const key = v.branch_id ? `branch:${v.branch_id}` : `customer:${v.customer_id}`;
      visitCounts.set(key, (visitCounts.get(key) || 0) + 1);
    });

    // Map schedules to counts
    const scheduleMap = new Map<string, number>();
    schedules.forEach(s => {
      const key = s.branch_id ? `branch:${s.branch_id}` : `customer:${s.customer_id}`;
      scheduleMap.set(key, s.planned_count || 1); 
    });

    // Process Branches
    branches.forEach(branch => {
      const key = `branch:${branch.id}`;
      const planned = scheduleMap.get(key) || 1;
      const completed = visitCounts.get(key) || 0;

      if (completed < planned) {
        results.push({
          id: branch.id,
          type: 'branch',
          name: branch.sube_adi,
          parentName: branch.customer?.kisa_isim,
          planned,
          completed,
          percentage: Math.round((completed / planned) * 100),
          customerId: branch.customer_id,
          phone: branch.sube_telefonu || customers.find(c => c.id === branch.customer_id)?.phone
        });
      }
    });

    // Process Customers (only those without branches or direct visits)
    customers.forEach(customer => {
      const hasBranches = branches.some(b => b.customer_id === customer.id);
      if (!hasBranches) {
        const key = `customer:${customer.id}`;
        const planned = scheduleMap.get(key) || 1;
        const completed = visitCounts.get(key) || 0;

        if (completed < planned) {
          results.push({
            id: customer.id,
            type: 'customer',
            name: customer.kisa_isim,
            parentName: 'Genel',
            planned,
            completed,
            percentage: Math.round((completed / planned) * 100),
            customerId: customer.id,
            phone: customer.phone
          });
        }
      }
    });

    return results
      .filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.parentName && item.parentName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .filter(item => {
        if (filterType === 'unvisited') return item.completed === 0;
        if (filterType === 'incomplete') return item.completed > 0;
        return true;
      })
      .sort((a, b) => a.percentage - b.percentage);
  }, [customers, branches, visits, schedules, searchTerm, filterType]);

  const totalRemainingVisits = useMemo(() => {
    let total = 0;
    incompleteData.forEach(i => {
      total += (i.planned - i.completed);
    });
    return total;
  }, [incompleteData]);

  if (loading && customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Veriler analiz ediliyor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <CalendarClock className="text-blue-600 w-9 h-9" />
            Eksik Ziyaret Takibi
          </h1>
          
          {/* Tarih Navigasyonu */}
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-50 rounded-xl text-gray-500 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 min-w-[140px] text-center">
              <span className="text-sm font-bold text-gray-700 capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: tr })}
              </span>
            </div>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-50 rounded-xl text-gray-500 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-[10px] uppercase font-black bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors ml-2"
            >
              Bugün
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 h-fit">
           <div className="flex flex-col items-center px-4 border-r border-gray-100">
              <span className="text-2xl font-bold text-orange-600">{incompleteData.length}</span>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Eksik Birim</span>
           </div>
           <div className="flex flex-col items-center px-4">
              <span className="text-2xl font-bold text-blue-600">
                {totalRemainingVisits}
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Kalan Ziyaret</span>
           </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Müşteri veya şube adı ile ara..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
           <button 
             onClick={() => setFilterType('all')}
             className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${filterType === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
           >
             Tümü
           </button>
           <button 
             onClick={() => setFilterType('unvisited')}
             className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${filterType === 'unvisited' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
           >
             Hiç Gidilmeyenler
           </button>
           <button 
             onClick={() => setFilterType('incomplete')}
             className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${filterType === 'incomplete' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
           >
             Eksik Kalanlar
           </button>
        </div>
      </div>

      {/* List / Table Section */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
        {incompleteData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Birim Detayları</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">İletişim</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Ziyaret Durumu</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incompleteData.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="group hover:bg-blue-50/30 transition-all duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${item.type === 'customer' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                          {item.type === 'customer' ? <Users size={20} /> : <Building size={20} />}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight">{item.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                            <MapPin size={12} /> {item.parentName}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-8 py-6">
                      {item.phone ? (
                        <a href={`tel:${item.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors">
                          <Phone size={14} className="text-gray-400" />
                          {item.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300 italic">Telefon yok</span>
                      )}
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="flex justify-between items-end mb-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-gray-900 tracking-tighter">{item.completed}</span>
                            <span className="text-xs font-bold text-gray-300">/ {item.planned} seans</span>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase ${item.completed === 0 ? 'bg-red-50 text-red-500 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                            %{item.percentage}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50 shadow-inner">
                          <div 
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${item.completed === 0 ? 'bg-red-400' : 'bg-gradient-to-r from-orange-400 to-orange-500 shadow-sm'}`} 
                            style={{ width: `${item.percentage}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/musteriler/${item.customerId}`)}
                          className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl hover:bg-black transition-all hover:scale-[1.02] active:scale-95"
                        >
                          Detaylar
                          <ChevronRight size={14} />
                        </button>
                        <button 
                          onClick={() => navigate('/ziyaretler/yeni', { state: { customerId: item.customerId, branchId: item.type === 'branch' ? item.id : null } })}
                          className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all hover:rotate-12"
                          title="Hızlı Ziyaret Oluştur"
                        >
                          <Calendar size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Harika!</h2>
            <p className="text-gray-500 mt-2 max-w-sm text-sm">
              {format(currentDate, 'MMMM yyyy', { locale: tr })} dönemi için bekleyen eksik ziyaret bulunmuyor.
            </p>
            {(searchTerm || filterType !== 'all') && (
              <button 
                onClick={() => { setSearchTerm(''); setFilterType('all'); }}
                className="mt-6 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
              >
                Filtreleri Sıfırla
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Meta */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-[11px] text-gray-400 font-bold uppercase tracking-widest px-4">
         <div className="flex items-center gap-2">
            <MousePointer2 size={12} className="text-blue-500" />
            Satırlara tıklayarak detaylara hızlıca gidebilirsiniz
         </div>
         <div className="mt-2 sm:mt-0 italic">
            Son Güncelleme: {format(new Date(), 'HH:mm:ss')}
         </div>
      </div>
    </div>
  );
};

export default IncompleteVisits;
