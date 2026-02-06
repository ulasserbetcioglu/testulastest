import React, { useState, useEffect, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, X, ChevronLeft, ChevronRight, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Define item types for drag and drop
const ItemTypes = {
  CUSTOMER: 'customer',
  BRANCH: 'branch',
  VISIT: 'visit'
};

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  customer_id: string;
  sube_adi: string;
  customer?: {
    kisa_isim: string;
  };
}

interface Visit {
  id: string;
  customer_id: string;
  branch_id: string | null;
  visit_date: string;
  visit_type: string;
  status: string;
  customer: {
    kisa_isim: string;
  };
  branch?: {
    sube_adi: string;
  } | null;
}

interface DraggableItemProps {
  item: Customer | Branch;
  type: 'customer' | 'branch' | 'operator';
}

interface DraggableVisitProps {
  visit: Visit;
  onDelete: (id: string) => void;
}

// Draggable customer/branch component
const DraggableItem: React.FC<DraggableItemProps> = ({ item, type }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: type === 'customer' ? ItemTypes.CUSTOMER : ItemTypes.BRANCH,
    item: { ...item, type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const displayName = type === 'customer' 
    ? (item as Customer).kisa_isim 
    : `${(item as Branch).sube_adi} ${(item as Branch).customer?.kisa_isim ? `(${(item as Branch).customer.kisa_isim})` : ''}`;

  return (
    <div
      ref={drag}
      className={`p-1 mb-1 rounded cursor-move text-xs ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${type === 'customer' ? 'bg-blue-100' : 'bg-green-100'}`}
      style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      title={displayName}
    >
      {displayName.length > 20 ? `${displayName.substring(0, 20)}...` : displayName}
    </div>
  );
};

// Draggable visit component
const DraggableVisit: React.FC<DraggableVisitProps> = ({ visit, onDelete }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.VISIT,
    item: { ...visit, type: 'visit' },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const displayName = `${visit.customer.kisa_isim}${visit.branch ? ` - ${visit.branch.sube_adi}` : ''}`;

  return (
    <div
      ref={drag}
      className={`text-xs p-1 rounded ${
        visit.status === 'completed' ? 'bg-green-500' :
        visit.status === 'cancelled' ? 'bg-red-500' :
        'bg-yellow-500'
      } text-white truncate group relative ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      title={displayName}
    >
      <div className="flex justify-between items-center">
        <span className="truncate">
          {displayName.length > 15 ? `${displayName.substring(0, 15)}...` : displayName}
        </span>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(visit.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-white hover:text-red-200"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

// Custom calendar day cell component with drop capability
const DayCell = ({ 
  date, 
  onEventDrop,
  visits,
  onDeleteVisit
}: { 
  date: Date, 
  onEventDrop: (item: any, date: Date) => void,
  visits: Visit[],
  onDeleteVisit: (id: string) => void
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: [ItemTypes.CUSTOMER, ItemTypes.BRANCH, ItemTypes.VISIT],
    drop: (item) => onEventDrop(item, date),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // Filter visits for this day
  const dayVisits = visits.filter(visit => {
    const visitDate = new Date(visit.visit_date);
    return visitDate.getDate() === date.getDate() &&
           visitDate.getMonth() === date.getMonth() &&
           visitDate.getFullYear() === date.getFullYear();
  });

  return (
    <div
      ref={drop}
      className={`h-full w-full ${isOver ? 'bg-green-100' : ''}`}
    >
      {dayVisits.length > 0 && (
        <div className="mt-1 space-y-1">
          {dayVisits.map(visit => (
            <DraggableVisit 
              key={visit.id} 
              visit={visit} 
              onDelete={onDeleteVisit}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const OperatorCalendarPlanning: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVisitType, setSelectedVisitType] = useState('periyodik');
  const [assignedCustomers, setAssignedCustomers] = useState<string[] | null>(null);
  const [assignedBranches, setAssignedBranches] = useState<string[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [mobileAddDate, setMobileAddDate] = useState<Date | null>(null);
  const [mobileSelectedCustomer, setMobileSelectedCustomer] = useState('');
  const [mobileSelectedBranch, setMobileSelectedBranch] = useState('');
  const [mobileBranchOptions, setMobileBranchOptions] = useState<Branch[]>([]);

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (operatorId) {
      fetchCustomers();
      fetchVisits();
    }
  }, [operatorId, assignedCustomers, assignedBranches, currentDate]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      // Check if admin
      setIsAdmin(user.email === 'admin@ilaclamatik.com');

      // Get operator ID and assigned entities
      const { data: operatorData, error: operatorError } = await supabase
        .from('operators')
        .select('id, assigned_customers, assigned_branches')
        .eq('auth_id', user.id)
        .single();

      if (operatorError) throw operatorError;
      
      setOperatorId(operatorData.id);
      setAssignedCustomers(operatorData.assigned_customers);
      setAssignedBranches(operatorData.assigned_branches);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      console.error('Error checking user role:', err);
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      let query = supabase
        .from('customers')
        .select('id, kisa_isim')
        .order('kisa_isim');

      // If not admin and has assigned customers, filter by them
      if (!isAdmin && assignedCustomers && assignedCustomers.length > 0) {
        query = query.in('id', assignedCustomers);
      }

      const { data: customersData, error: customersError } = await query;

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Fetch branches
      let branchesQuery = supabase
        .from('branches')
        .select('id, customer_id, sube_adi, customers(kisa_isim)')
        .order('sube_adi');

      // If not admin and has assigned customers, filter by them
      if (!isAdmin && assignedCustomers && assignedCustomers.length > 0) {
        branchesQuery = branchesQuery.in('customer_id', assignedCustomers);
      }

      // If not admin and has assigned branches, filter by them
      if (!isAdmin && assignedBranches && assignedBranches.length > 0) {
        branchesQuery = branchesQuery.in('id', assignedBranches);
      }

      const { data: branchesData, error: branchesError } = await branchesQuery;

      if (branchesError) throw branchesError;
      
      // Transform branches data to include customer name
      const transformedBranches = branchesData?.map(branch => ({
        id: branch.id,
        customer_id: branch.customer_id,
        sube_adi: branch.sube_adi,
        customer: branch.customers
      })) || [];
      
      setBranches(transformedBranches);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching customers and branches:', err);
    }
  };

  const fetchVisits = async () => {
    try {
      if (!operatorId) return;

      // Get the first and last day of the current month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      let query = supabase
        .from('visits')
        .select(`
          id,
          customer_id,
          branch_id,
          visit_date,
          visit_type,
          status,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi)
        `)
        .eq('operator_id', operatorId)
        .gte('visit_date', firstDay.toISOString())
        .lte('visit_date', lastDay.toISOString());

      // If not admin and has assigned customers, filter by them
      if (!isAdmin && assignedCustomers && assignedCustomers.length > 0) {
        query = query.in('customer_id', assignedCustomers);
      }

      // If not admin and has assigned branches, filter by them
      if (!isAdmin && assignedBranches && assignedBranches.length > 0) {
        query = query.in('branch_id', assignedBranches);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVisits(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching visits:', err);
    }
  };

  const handleEventDrop = async (item: any, date: Date) => {
    try {
      if (!operatorId) {
        toast.error('Operatör bilgisi bulunamadı');
        return;
      }

      // Create a new date object to ensure we're working with the correct date
      const visitDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        12, // Set to noon to avoid timezone issues
        0,
        0
      );

      // Format the date as YYYY-MM-DD
      const formattedDate = visitDate.toISOString().split('T')[0];

      // If this is a visit being moved
      if (item.type === 'visit') {
        // Delete the old visit
        await deleteVisit(item.id);
        
        // Create a new visit at the new date
        await createVisit({
          customer_id: item.customer_id,
          branch_id: item.branch_id,
          visit_date: formattedDate,
          visit_type: item.visit_type || selectedVisitType
        });
        
        toast.success('Ziyaret başarıyla taşındı');
      } 
      // If this is a new customer or branch being added
      else {
        // Create visit based on item type
        if (item.type === 'customer') {
          await createVisit({
            customer_id: item.id,
            branch_id: null,
            visit_date: formattedDate,
            visit_type: selectedVisitType
          });
          toast.success(`${item.kisa_isim} için ziyaret oluşturuldu`);
        } else if (item.type === 'branch') {
          await createVisit({
            customer_id: item.customer_id,
            branch_id: item.id,
            visit_date: formattedDate,
            visit_type: selectedVisitType
          });
          toast.success(`${item.sube_adi} için ziyaret oluşturuldu`);
        }
      }
      
      // Refresh visits
      fetchVisits();
    } catch (err: any) {
      toast.error('Ziyaret oluşturulurken bir hata oluştu');
      console.error('Visit creation error:', err);
    }
  };

  const createVisit = async (visitData: {
    customer_id: string;
    branch_id: string | null;
    visit_date: string;
    visit_type: string;
  }) => {
    if (!operatorId) {
      throw new Error('Operatör bilgisi bulunamadı');
    }
    
    try {
      const { error } = await supabase
        .from('visits')
        .insert([{
          customer_id: visitData.customer_id,
          branch_id: visitData.branch_id,
          operator_id: operatorId,
          visit_date: visitData.visit_date,
          visit_type: visitData.visit_type,
          status: 'planned'
        }]);

      if (error) throw error;
    } catch (err: any) {
      throw err;
    }
  };

  const deleteVisit = async (visitId: string) => {
    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visitId);

      if (error) throw error;
      
      // Update local state
      setVisits(visits.filter(visit => visit.id !== visitId));
      toast.success('Ziyaret silindi');
    } catch (err: any) {
      toast.error('Ziyaret silinirken bir hata oluştu');
      console.error('Error deleting visit:', err);
    }
  };

  const transferToNextMonth = async () => {
    try {
      setIsTransferring(true);
      
      // Get the first day of the next month
      const nextMonth = addMonths(currentDate, 1);
      
      // Create a map to track which days of the week have visits
      const visitsByDayOfWeek: Record<number, Visit[]> = {};
      
      // Group visits by day of week
      visits.forEach(visit => {
        const visitDate = new Date(visit.visit_date);
        const dayOfWeek = getDay(visitDate);
        
        if (!visitsByDayOfWeek[dayOfWeek]) {
          visitsByDayOfWeek[dayOfWeek] = [];
        }
        
        visitsByDayOfWeek[dayOfWeek].push(visit);
      });
      
      // For each day of the week that has visits
      let createdCount = 0;
      for (const [dayOfWeekStr, dayVisits] of Object.entries(visitsByDayOfWeek)) {
        const dayOfWeek = parseInt(dayOfWeekStr);
        
        // Find all matching days in the next month
        const nextMonthDays = eachDayOfInterval({
          start: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1),
          end: new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0)
        }).filter(date => getDay(date) === dayOfWeek);
        
        // For each visit on this day of the week
        for (const visit of dayVisits) {
          // Get the day of the month for the original visit
          const originalDate = new Date(visit.visit_date);
          const originalDayOfMonth = originalDate.getDate();
          
          // Find the closest matching day in the next month
          let targetDay = nextMonthDays.find(date => 
            Math.abs(date.getDate() - originalDayOfMonth) <= 3
          );
          
          // If no close match, just take the first occurrence of this day of week
          if (!targetDay && nextMonthDays.length > 0) {
            targetDay = nextMonthDays[0];
          }
          
          // If we found a target day, create the visit
          if (targetDay) {
            await createVisit({
              customer_id: visit.customer_id,
              branch_id: visit.branch_id,
              visit_date: targetDay.toISOString().split('T')[0],
              visit_type: visit.visit_type
            });
            createdCount++;
          }
        }
      }
      
      // Update the current date to the next month
      setCurrentDate(nextMonth);
      
      toast.success(`${createdCount} ziyaret bir sonraki aya aktarıldı`);
    } catch (err: any) {
      toast.error('Ziyaretler aktarılırken bir hata oluştu');
      console.error('Error transferring visits:', err);
    } finally {
      setIsTransferring(false);
    }
  };

  // Filter customers and branches based on search term
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => 
      customer.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const filteredBranches = useMemo(() => {
    return branches.filter(branch => 
      branch.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.customer?.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [branches, searchTerm]);

  const handleMobileCustomerChange = (customerId: string) => {
    setMobileSelectedCustomer(customerId);
    setMobileSelectedBranch('');
    setMobileBranchOptions(branches.filter(b => b.customer_id === customerId));
  };

  const handleMobileAddVisit = async () => {
    if (!mobileAddDate || !mobileSelectedCustomer) return;
    const formattedDate = format(mobileAddDate, 'yyyy-MM-dd');
    try {
      await createVisit({
        customer_id: mobileSelectedCustomer,
        branch_id: mobileSelectedBranch || null,
        visit_date: formattedDate,
        visit_type: selectedVisitType
      });
      toast.success('Ziyaret oluşturuldu');
      setMobileAddDate(null);
      setMobileSelectedCustomer('');
      setMobileSelectedBranch('');
      fetchVisits();
    } catch {
      toast.error('Ziyaret oluşturulamadı');
    }
  };

  const days = ['Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz'];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  let firstDayOfMonth = monthStart.getDay() - 1;
  if (firstDayOfMonth === -1) firstDayOfMonth = 6;

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  const dndBackend = isTouchDevice ? TouchBackend : HTML5Backend;
  const dndOptions = isTouchDevice ? { enableMouseEvents: true } : undefined;

  const calendarContent = (
    <>
      <div className="flex flex-col sm:flex-row h-auto sm:h-[calc(100vh-64px)]">
        {showSidebar && (
          <div className="hidden sm:block w-64 bg-white shadow-md p-4 overflow-y-auto shrink-0">
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Müşteri veya şube ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-2 border rounded text-sm"
                />
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ziyaret Türü</label>
              <select value={selectedVisitType} onChange={(e) => setSelectedVisitType(e.target.value)} className="w-full p-2 border rounded text-sm">
                <option value="ilk">İlk</option>
                <option value="ucretli">Ücretli</option>
                <option value="acil">Acil Çağrı</option>
                <option value="teknik">Teknik İnceleme</option>
                <option value="periyodik">Periyodik</option>
                <option value="isyeri">İşyeri</option>
                <option value="gozlem">Gözlem</option>
                <option value="son">Son</option>
              </select>
            </div>

            <div className="mb-4">
              <button onClick={transferToNextMonth} disabled={isTransferring || visits.length === 0} className="w-full flex items-center justify-center gap-2 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                <Calendar size={16} />
                <span>Sonraki Aya Aktar</span>
              </button>
              <p className="text-xs text-gray-500 mt-1">Bu aydaki ziyaretleri bir sonraki aya aynı hafta günlerine göre aktarır.</p>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2 text-xs">Müşteriler</h3>
              <div className="space-y-0.5 max-h-[25vh] overflow-y-auto">
                {filteredCustomers.map(customer => (
                  <DraggableItem key={customer.id} item={customer} type="customer" />
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2 text-xs">Şubeler</h3>
              <div className="space-y-0.5 max-h-[25vh] overflow-y-auto">
                {filteredBranches.map(branch => (
                  <DraggableItem key={branch.id} item={branch} type="branch" />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 p-2 sm:p-4 overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3 sm:mb-4">
            <div className="flex items-center">
              <button onClick={() => setShowSidebar(!showSidebar)} className="mr-2 sm:mr-4 p-2 rounded hover:bg-gray-100 hidden sm:block">
                {showSidebar ? <X size={20} /> : <Filter size={20} />}
              </button>
              <h1 className="text-base sm:text-xl font-bold">Ziyaret Planlama</h1>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 rounded hover:bg-gray-100">
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm sm:text-lg font-medium whitespace-nowrap">
                {format(currentDate, 'MMMM yyyy', { locale: tr })}
              </span>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 rounded hover:bg-gray-100">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="sm:hidden flex gap-2 mb-3 overflow-x-auto pb-1">
            <select value={selectedVisitType} onChange={(e) => setSelectedVisitType(e.target.value)} className="p-2 border rounded text-xs flex-1 min-w-0">
              <option value="periyodik">Periyodik</option>
              <option value="ilk">İlk</option>
              <option value="ucretli">Ücretli</option>
              <option value="acil">Acil Çağrı</option>
              <option value="teknik">Teknik</option>
              <option value="isyeri">İşyeri</option>
              <option value="gozlem">Gözlem</option>
              <option value="son">Son</option>
            </select>
            <button onClick={transferToNextMonth} disabled={isTransferring || visits.length === 0} className="px-3 py-2 bg-blue-600 text-white rounded text-xs whitespace-nowrap disabled:opacity-50">
              <Calendar size={14} className="inline mr-1" />Aktar
            </button>
          </div>

          <div className="hidden sm:block bg-white rounded-lg shadow-md">
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {days.map(day => (
                <div key={day} className="bg-gray-50 p-2 text-center">
                  <span className="text-sm font-medium text-gray-500">{day}</span>
                </div>
              ))}

              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="bg-gray-50 p-2 min-h-[100px]" />
              ))}

              {monthDays.map(day => {
                const isCurrentDay = isToday(day);
                return (
                  <div key={day.toISOString()} className={`relative bg-white p-2 min-h-[100px] ${isCurrentDay ? 'ring-2 ring-green-500' : ''}`}>
                    <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                    <DayCell date={day} onEventDrop={handleEventDrop} visits={visits} onDeleteVisit={deleteVisit} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sm:hidden space-y-1">
            {monthDays.map(day => {
              const isCurrentDay = isToday(day);
              const dayVisits = visits.filter(v => {
                const vd = new Date(v.visit_date);
                return vd.getDate() === day.getDate() && vd.getMonth() === day.getMonth() && vd.getFullYear() === day.getFullYear();
              });
              const dayName = format(day, 'EEE', { locale: tr });
              return (
                <div key={day.toISOString()} className={`bg-white rounded-lg border ${isCurrentDay ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-200'}`}>
                  <div className={`flex items-center justify-between px-3 py-2 ${isCurrentDay ? 'bg-green-50' : 'bg-gray-50'} rounded-t-lg`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isCurrentDay ? 'text-green-700' : 'text-gray-800'}`}>{format(day, 'd')}</span>
                      <span className="text-xs text-gray-500 uppercase">{dayName}</span>
                    </div>
                    <button onClick={() => { setMobileAddDate(day); setMobileSelectedCustomer(''); setMobileSelectedBranch(''); }} className="p-1.5 bg-green-600 text-white rounded-full active:scale-95 transition-transform">
                      <Plus size={14} />
                    </button>
                  </div>
                  {dayVisits.length > 0 && (
                    <div className="p-2 space-y-1">
                      {dayVisits.map(v => (
                        <div key={v.id} className={`text-xs p-2 rounded flex justify-between items-center ${v.status === 'completed' ? 'bg-green-100 text-green-800' : v.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          <span className="truncate">{v.customer.kisa_isim}{v.branch ? ` - ${v.branch.sube_adi}` : ''}</span>
                          <button onClick={() => deleteVisit(v.id)} className="ml-2 p-1 hover:bg-white/50 rounded shrink-0"><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-xs sm:text-sm text-gray-500 hidden sm:block">
            <p>Müşteri veya şubeyi takvime sürükleyerek ziyaret oluşturabilirsiniz.</p>
            <p>Mevcut ziyaretleri sürükleyerek başka bir güne taşıyabilirsiniz.</p>
          </div>
        </div>
      </div>

      {mobileAddDate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl">
              <h3 className="text-base font-semibold">{format(mobileAddDate, 'd MMMM EEEE', { locale: tr })}</h3>
              <button onClick={() => setMobileAddDate(null)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
                <select value={mobileSelectedCustomer} onChange={(e) => handleMobileCustomerChange(e.target.value)} className="w-full p-3 border rounded-lg text-sm">
                  <option value="">Müşteri seçin...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                </select>
              </div>
              {mobileBranchOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şube (Opsiyonel)</label>
                  <select value={mobileSelectedBranch} onChange={(e) => setMobileSelectedBranch(e.target.value)} className="w-full p-3 border rounded-lg text-sm">
                    <option value="">Şube seçin...</option>
                    {mobileBranchOptions.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ziyaret Türü</label>
                <select value={selectedVisitType} onChange={(e) => setSelectedVisitType(e.target.value)} className="w-full p-3 border rounded-lg text-sm">
                  <option value="periyodik">Periyodik</option>
                  <option value="ilk">İlk</option>
                  <option value="ucretli">Ücretli</option>
                  <option value="acil">Acil Çağrı</option>
                  <option value="teknik">Teknik İnceleme</option>
                  <option value="isyeri">İşyeri</option>
                  <option value="gozlem">Gözlem</option>
                  <option value="son">Son</option>
                </select>
              </div>
              <button onClick={handleMobileAddVisit} disabled={!mobileSelectedCustomer} className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform">
                Ziyaret Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <DndProvider backend={dndBackend} options={dndOptions}>
      {calendarContent}
    </DndProvider>
  );
};

export default OperatorCalendarPlanning;