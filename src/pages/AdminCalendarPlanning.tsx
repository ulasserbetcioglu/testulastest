import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Search, Filter, Plus, X, ChevronLeft, ChevronRight, Calendar, Trash2, User, Download, FileImage, FileText } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Define item types for drag and drop
const ItemTypes = {
  CUSTOMER: 'customer',
  BRANCH: 'branch',
  VISIT: 'visit',
  OPERATOR: 'operator'
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

interface Operator {
  id: string;
  name: string;
  email: string;
  status: string;
}

interface Visit {
  id: string;
  customer_id: string;
  branch_id: string | null;
  operator_id: string;
  visit_date: string;
  visit_type: string;
  status: string;
  customer: {
    kisa_isim: string;
  };
  branch?: {
    sube_adi: string;
  } | null;
  operator: {
    name: string;
  };
}

interface DraggableItemProps {
  item: Customer | Branch | Operator;
  type: 'customer' | 'branch' | 'operator';
}

interface DraggableVisitProps {
  visit: Visit;
  onDelete: (id: string) => void;
}

// Draggable customer/branch/operator component
const DraggableItem: React.FC<DraggableItemProps> = ({ item, type }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: type === 'customer' ? ItemTypes.CUSTOMER : 
          type === 'branch' ? ItemTypes.BRANCH : ItemTypes.OPERATOR,
    item: { ...item, type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  let displayName = '';
  let bgColor = '';
  
  if (type === 'customer') {
    displayName = (item as Customer).kisa_isim;
    bgColor = 'bg-blue-100';
  } else if (type === 'branch') {
    const branch = item as Branch;
    displayName = `${branch.sube_adi} ${branch.customer?.kisa_isim ? `(${branch.customer.kisa_isim})` : ''}`;
    bgColor = 'bg-green-100';
  } else if (type === 'operator') {
    displayName = (item as Operator).name;
    bgColor = 'bg-purple-100';
  }

  return (
    <div
      ref={drag}
      className={`p-1 mb-1 rounded cursor-move text-[8px] sm:text-xs ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${bgColor}`}
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
      className={`text-[6px] sm:text-[8px] p-0.5 rounded ${
        visit.status === 'completed' ? 'bg-green-500' :
        visit.status === 'cancelled' ? 'bg-red-500' :
        'bg-yellow-500'
      } text-white truncate group relative ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      title={`${displayName} (${visit.operator.name})`}
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
          <Trash2 size={8} />
        </button>
      </div>
      <div className="text-[5px] sm:text-[6px] text-white opacity-75 truncate">
        {visit.operator.name}
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
    accept: [ItemTypes.CUSTOMER, ItemTypes.BRANCH, ItemTypes.VISIT, ItemTypes.OPERATOR],
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
        <div className="mt-0.5 space-y-0.5">
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

const AdminCalendarPlanning: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVisitType, setSelectedVisitType] = useState('periyodik');
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, currentDate, selectedOperator]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const isAdminUser = user?.email === 'admin@ilaclamatik.com';
      setIsAdmin(isAdminUser);
      
      if (!isAdminUser) {
        setError('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error checking admin access:', err);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, kisa_isim')
        .order('kisa_isim');

      if (customersError) throw customersError;
      setCustomers(customersData || []);

      // Fetch branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, customer_id, sube_adi, customers(kisa_isim)')
        .order('sube_adi');

      if (branchesError) throw branchesError;
      
      // Transform branches data to include customer name
      const transformedBranches = branchesData?.map(branch => ({
        id: branch.id,
        customer_id: branch.customer_id,
        sube_adi: branch.sube_adi,
        customer: branch.customers
      })) || [];
      
      setBranches(transformedBranches);
      
      // Fetch operators
      const { data: operatorsData, error: operatorsError } = await supabase
        .from('operators')
        .select('id, name, email, status')
        .eq('status', 'Açık')
        .order('name');
        
      if (operatorsError) throw operatorsError;
      setOperators(operatorsData || []);

      // Get the first and last day of the current month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Fetch visits
      let query = supabase
        .from('visits')
        .select(`
          id,
          customer_id,
          branch_id,
          operator_id,
          visit_date,
          visit_type,
          status,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi),
          operator:operator_id (name)
        `)
        .gte('visit_date', firstDay.toISOString())
        .lte('visit_date', lastDay.toISOString());
        
      // Filter by selected operator if any
      if (selectedOperator) {
        query = query.eq('operator_id', selectedOperator);
      }

      const { data: visitsData, error: visitsError } = await query;

      if (visitsError) throw visitsError;
      setVisits(visitsData || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventDrop = async (item: any, date: Date) => {
    try {
      if (!isAdmin) {
        toast.error('Bu işlemi gerçekleştirmek için admin yetkisine sahip olmalısınız');
        return;
      }
      
      // If no operator is selected for new visits
      if (!selectedOperator && item.type !== 'visit') {
        toast.error('Lütfen önce bir operatör seçin');
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
          operator_id: item.operator_id,
          visit_date: formattedDate,
          visit_type: item.visit_type || selectedVisitType
        });
        
        toast.success('Ziyaret başarıyla taşındı');
      } 
      // If this is a new customer or branch being added
      else if (item.type === 'customer' || item.type === 'branch') {
        // Create visit based on item type
        if (item.type === 'customer') {
          await createVisit({
            customer_id: item.id,
            branch_id: null,
            operator_id: selectedOperator!,
            visit_date: formattedDate,
            visit_type: selectedVisitType
          });
          toast.success(`${item.kisa_isim} için ziyaret oluşturuldu`);
        } else if (item.type === 'branch') {
          await createVisit({
            customer_id: item.customer_id,
            branch_id: item.id,
            operator_id: selectedOperator!,
            visit_date: formattedDate,
            visit_type: selectedVisitType
          });
          toast.success(`${item.sube_adi} için ziyaret oluşturuldu`);
        }
      }
      // If this is an operator being assigned to a day
      else if (item.type === 'operator') {
        // We'll just set the selected operator
        setSelectedOperator(item.id);
        toast.success(`${item.name} seçildi. Şimdi müşteri veya şube sürükleyebilirsiniz.`);
      }
      
      // Refresh visits
      fetchData();
    } catch (err: any) {
      toast.error('Ziyaret oluşturulurken bir hata oluştu');
      console.error('Visit creation error:', err);
    }
  };

  const createVisit = async (visitData: {
    customer_id: string;
    branch_id: string | null;
    operator_id: string;
    visit_date: string;
    visit_type: string;
  }) => {
    try {
      const { error } = await supabase
        .from('visits')
        .insert([{
          customer_id: visitData.customer_id,
          branch_id: visitData.branch_id,
          operator_id: visitData.operator_id,
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
      if (!selectedOperator) {
        toast.error('Lütfen bir operatör seçin');
        return;
      }
      
      setIsTransferring(true);
      
      // Get the first day of the next month
      const nextMonth = addMonths(currentDate, 1);
      
      // Filter visits for the selected operator
      const operatorVisits = visits.filter(visit => visit.operator_id === selectedOperator);
      
      // Create a map to track which days of the week have visits
      const visitsByDayOfWeek: Record<number, Visit[]> = {};
      
      // Group visits by day of week
      operatorVisits.forEach(visit => {
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
              operator_id: visit.operator_id,
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

  const exportToPDF = async () => {
    if (!calendarRef.current) return;
    
    try {
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`Takvim_Planlama_${format(currentDate, 'MMMM_yyyy', { locale: tr })}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('PDF dışa aktarma hatası oluştu.');
    }
  };

  const exportToImage = async () => {
    if (!calendarRef.current) return;
    
    try {
      const canvas = await html2canvas(calendarRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const link = document.createElement('a');
      link.download = `Takvim_Planlama_${format(currentDate, 'MMMM_yyyy', { locale: tr })}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Image export error:', err);
      alert('Görüntü dışa aktarma hatası oluştu.');
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

  const filteredOperators = useMemo(() => {
    return operators.filter(operator => 
      operator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operator.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [operators, searchTerm]);

  const days = ['Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz'];
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  let firstDayOfMonth = monthStart.getDay() - 1;
  if (firstDayOfMonth === -1) firstDayOfMonth = 6;

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;
  if (!isAdmin) return <div>Bu sayfaya erişim yetkiniz bulunmamaktadır.</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-48 sm:w-64 bg-white shadow-md p-2 sm:p-4 overflow-y-auto">
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-6 sm:pl-8 pr-2 py-1 sm:py-2 border rounded text-[10px] sm:text-xs"
                />
                <Search className="absolute left-1 sm:left-2 top-1.5 sm:top-2 text-gray-400" size={12} />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
                Ziyaret Türü
              </label>
              <select
                value={selectedVisitType}
                onChange={(e) => setSelectedVisitType(e.target.value)}
                className="w-full p-1 sm:p-2 border rounded text-[10px] sm:text-xs"
              >
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
              <label className="block text-[10px] sm:text-xs font-medium text-gray-700 mb-1">
                Operatör
              </label>
              <select
                value={selectedOperator || ''}
                onChange={(e) => setSelectedOperator(e.target.value || null)}
                className="w-full p-1 sm:p-2 border rounded text-[10px] sm:text-xs"
              >
                <option value="">Operatör Seçin</option>
                {operators.map(operator => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <button
                onClick={transferToNextMonth}
                disabled={isTransferring || !selectedOperator || visits.filter(v => v.operator_id === selectedOperator).length === 0}
                className="w-full flex items-center justify-center gap-1 sm:gap-2 p-1 sm:p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] sm:text-xs"
              >
                <Calendar size={10} className="sm:w-4 sm:h-4" />
                <span>Sonraki Aya Aktar</span>
              </button>
              <p className="text-[8px] sm:text-[10px] text-gray-500 mt-1">
                Seçili operatörün bu aydaki ziyaretlerini bir sonraki aya aynı hafta günlerine göre aktarır.
              </p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2 text-[10px] sm:text-xs flex items-center">
                <User size={10} className="mr-1 sm:w-4 sm:h-4" />
                Operatörler
              </h3>
              <div className="space-y-0.5 max-h-[15vh] overflow-y-auto">
                {filteredOperators.map(operator => (
                  <DraggableItem key={operator.id} item={operator} type="operator" />
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2 text-[10px] sm:text-xs">Müşteriler</h3>
              <div className="space-y-0.5 max-h-[15vh] overflow-y-auto">
                {filteredCustomers.map(customer => (
                  <DraggableItem key={customer.id} item={customer} type="customer" />
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2 text-[10px] sm:text-xs">Şubeler</h3>
              <div className="space-y-0.5 max-h-[15vh] overflow-y-auto">
                {filteredBranches.map(branch => (
                  <DraggableItem key={branch.id} item={branch} type="branch" />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Main Calendar */}
        <div className="flex-1 p-2 sm:p-4">
          <div className="flex justify-between items-center mb-2 sm:mb-4">
            <div className="flex items-center">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="mr-2 sm:mr-4 p-1 sm:p-2 rounded hover:bg-gray-100"
              >
                {showSidebar ? <X size={16} className="sm:w-5 sm:h-5" /> : <Filter size={16} className="sm:w-5 sm:h-5" />}
              </button>
              <h1 className="text-sm sm:text-xl font-bold">Admin Ziyaret Planlama</h1>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                className="p-1 sm:p-2 rounded hover:bg-gray-100"
              >
                <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
              </button>
              <span className="text-xs sm:text-lg font-medium">
                {format(currentDate, 'MMMM yyyy', { locale: tr })}
              </span>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                className="p-1 sm:p-2 rounded hover:bg-gray-100"
              >
                <ChevronRight size={16} className="sm:w-5 sm:h-5" />
              </button>
              
              <div className="flex gap-1 sm:gap-2 ml-1 sm:ml-4">
                <button
                  onClick={exportToPDF}
                  className="p-1 sm:p-2 bg-red-600 text-white rounded hover:bg-red-700 text-[8px] sm:text-xs flex items-center gap-1"
                >
                  <FileText size={10} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={exportToImage}
                  className="p-1 sm:p-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-[8px] sm:text-xs flex items-center gap-1"
                >
                  <FileImage size={10} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Görüntü</span>
                </button>
              </div>
            </div>
          </div>
          
          <div ref={calendarRef} className="bg-white rounded-lg shadow-md">
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {days.map(day => (
                <div key={day} className="bg-gray-50 p-1 sm:p-2 text-center">
                  <span className="text-[8px] sm:text-xs font-medium text-gray-500">{day}</span>
                </div>
              ))}

              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="bg-gray-50 p-1 sm:p-2 min-h-[60px] sm:min-h-[100px]" />
              ))}

              {monthDays.map(day => {
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`relative bg-white p-1 sm:p-2 min-h-[60px] sm:min-h-[100px] ${
                      isCurrentDay ? 'ring-1 sm:ring-2 ring-green-500' : ''
                    }`}
                  >
                    <div className="text-[8px] sm:text-xs font-medium mb-0.5 sm:mb-1">
                      {format(day, 'd')}
                    </div>
                    <DayCell 
                      date={day} 
                      onEventDrop={handleEventDrop}
                      visits={visits}
                      onDeleteVisit={deleteVisit}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mt-4 text-[8px] sm:text-xs text-gray-500">
            <p>• Önce bir operatör seçin, ardından müşteri veya şubeyi takvime sürükleyerek ziyaret oluşturabilirsiniz.</p>
            <p>• Mevcut ziyaretleri sürükleyerek başka bir güne taşıyabilirsiniz.</p>
            <p>• Ziyaretin üzerine gelip çöp kutusu simgesine tıklayarak silebilirsiniz.</p>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default AdminCalendarPlanning;