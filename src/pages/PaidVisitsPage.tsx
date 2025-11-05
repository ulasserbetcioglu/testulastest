import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Plus, FileText, Download, Upload, Eye, Edit, Trash, CheckCircle, Clock, X, Loader2 } from 'lucide-react';

import DataTable from '../components/DataTable';
import VisitDetailsModal from '../components/VisitDetailsModal';
import VisitFilters from '../components/VisitFilters';
import PaidMaterialsModal from '../components/PaidMaterialSales/PaidMaterialsModal';

// --- ARAYÜZLER (INTERFACES) ---
// AdminVisits ile aynı arayüzler kullanılabilir
interface Visit {
  id: string;
  customer: { kisa_isim: string; } | null;
  branch?: { sube_adi: string; } | null;
  operator: { name: string; phone?: string; } | null;
  customer_id: string;
  branch_id: string | null;
  operator_id: string;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  visit_type?: string;
  isChecked?: boolean;
  paid_materials?: any[];
  report_number?: string;
}

interface Customer { id: string; kisa_isim: string; }
interface Branch { id: string; sube_adi: string; customer_id: string; }
interface Operator { id: string; name: string; }

const STORAGE_KEY = "checkedPaidVisits"; // Farklı bir anahtar kullanarak çakışmayı önle

// --- BİLEŞEN (COMPONENT) ---
const PaidVisitsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State Tanımlamaları
  const [visits, setVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtre State'leri
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [hasPaidMaterials, setHasPaidMaterials] = useState('');
  const [showCheckedOnly, setShowCheckedOnly] = useState('');

  // Modal ve Diğer UI State'leri
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showPaidMaterialsModal, setShowPaidMaterialsModal] = useState(false);
  const [selectedVisitMaterials, setSelectedVisitMaterials] = useState<Visit | null>(null);
  const [checkedVisits, setCheckedVisits] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [visitToDelete, setVisitToDelete] = useState<string | null>(null);

  // --- VERİ ÇEKME VE İŞLEME ---

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 1).toISOString();

      let query = supabase
        .from('visits')
        .select(`
          id, visit_date, status, visit_type, notes, report_number,
          customer_id, branch_id, operator_id,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi),
          operator:operator_id (name, phone)
        `)
        // TEMEL DEĞİŞİKLİK: Sadece 'ucretli' ziyaretleri çek
        .eq('visit_type', 'ucretli') 
        .gte('visit_date', startDate)
        .lt('visit_date', endDate)
        .order('visit_date', { ascending: false });

      // Diğer filtreleri uygula
      if (selectedStatus) query = query.eq('status', selectedStatus);
      if (selectedCustomer) query = query.eq('customer_id', selectedCustomer);
      if (selectedBranch) query = query.eq('branch_id', selectedBranch);
      if (selectedOperator) query = query.eq('operator_id', selectedOperator);
      if (searchTerm) {
          query = query.or(`customer.kisa_isim.ilike.%${searchTerm}%,branch.sube_adi.ilike.%${searchTerm}%,operator.name.ilike.%${searchTerm}%`);
      }

      const { data: visitsData, error: visitsError } = await query;
      if (visitsError) throw visitsError;

      let enhancedVisits = (visitsData || []).map(visit => ({
        ...visit,
        isChecked: checkedVisits.has(visit.id),
      }));
      
      setVisits(enhancedVisits);

    } catch (err: any) {
      setError(err.message);
      toast.error(`Ziyaretler çekilirken hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedStatus, selectedCustomer, selectedBranch, selectedOperator, searchTerm, checkedVisits]);

  useEffect(() => {
    const fetchInitialStaticData = async () => {
        try {
            const [customersRes, branchesRes, operatorsRes] = await Promise.all([
                supabase.from('customers').select('id, kisa_isim').order('kisa_isim'),
                supabase.from('branches').select('id, sube_adi, customer_id').order('sube_adi'),
                supabase.from('operators').select('id, name').order('name'),
            ]);

            if (customersRes.error) throw customersRes.error;
            if (branchesRes.error) throw branchesRes.error;
            if (operatorsRes.error) throw operatorsRes.error;

            setCustomers(customersRes.data || []);
            setBranches(branchesRes.data || []);
            setOperators(operatorsRes.data || []);
        } catch (err: any) {
            setError(err.message);
            toast.error("Başlangıç verileri çekilirken hata oluştu.");
        }
    };
    fetchInitialStaticData();
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(checkedVisits)));
  }, [checkedVisits]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedMonth(format(new Date(), 'yyyy-MM'));
    setSelectedStatus('');
    setSelectedCustomer('');
    setSelectedBranch('');
    setSelectedOperator('');
    setHasPaidMaterials('');
    setShowCheckedOnly('');
  };

  const handleCheckVisit = (visitId: string) => {
    const newCheckedVisits = new Set(checkedVisits);
    if (newCheckedVisits.has(visitId)) {
      newCheckedVisits.delete(visitId);
    } else {
      newCheckedVisits.add(visitId);
    }
    setCheckedVisits(newCheckedVisits);
  };

  const handleDeleteVisit = async () => {
    if (!visitToDelete) return;
    try {
      const { error } = await supabase.from('visits').delete().eq('id', visitToDelete);
      if (error) throw error;
      toast.success('Ziyaret başarıyla silindi');
      fetchVisits(); // Listeyi yenile
    } catch (err: any) {
      toast.error(`Hata: ${err.message}`);
    } finally {
      setVisitToDelete(null);
    }
  };

  const columns = [
    {
      header: '',
      accessor: 'id' as keyof Visit,
      render: (value: string, row: Visit) => (
        <input type="checkbox" checked={!!row.isChecked} onChange={() => handleCheckVisit(value)} className="h-4 w-4" />
      ),
    },
    {
      header: 'Tarih',
      accessor: 'visit_date' as keyof Visit,
      sortable: true,
      render: (value: string) => <div>{format(new Date(value), 'dd.MM.yyyy HH:mm')}</div>
    },
    { header: 'Müşteri', accessor: 'customer' as keyof Visit, render: (value: Visit['customer']) => <span>{value?.kisa_isim || '-'}</span> },
    { header: 'Şube', accessor: 'branch' as keyof Visit, render: (value: Visit['branch']) => <span>{value?.sube_adi || '-'}</span> },
    { header: 'Operatör', accessor: 'operator' as keyof Visit, render: (value: Visit['operator']) => <span>{value?.name || '-'}</span> },
    {
      header: 'Durum',
      accessor: 'status' as keyof Visit,
      render: (value: string) => {
        const statusMap = {
          completed: { text: 'Tamamlandı', color: 'bg-green-100 text-green-800', icon: <CheckCircle size={14} /> },
          planned: { text: 'Planlandı', color: 'bg-yellow-100 text-yellow-800', icon: <Clock size={14} /> },
          cancelled: { text: 'İptal', color: 'bg-red-100 text-red-800', icon: <X size={14} /> },
        };
        const currentStatus = statusMap[value as keyof typeof statusMap] || { text: value, color: 'bg-gray-100 text-gray-800', icon: null };
        return <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${currentStatus.color}`}>{currentStatus.icon}{currentStatus.text}</span>;
      },
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ücretli Ziyaretler Raporu</h1>
        <div className="flex gap-2">
          {/* Gerekirse buraya özel butonlar eklenebilir */}
        </div>
      </div>
      
      <VisitFilters
        customers={customers}
        branches={branches}
        operators={operators}
        searchTerm={searchTerm}
        selectedMonth={selectedMonth}
        status={selectedStatus}
        visitType={'ucretli'} // Bu sayfa her zaman ücretliyi göstereceği için sabit
        customerId={selectedCustomer}
        branchId={selectedBranch}
        operatorId={selectedOperator}
        hasPaidMaterials={hasPaidMaterials}
        showCheckedOnly={showCheckedOnly}
        onSearchTermChange={setSearchTerm}
        onSelectedMonthChange={setSelectedMonth}
        onStatusChange={setSelectedStatus}
        onVisitTypeChange={() => {}} // Ziyaret türü filtresi bu sayfada etkisiz
        onCustomerIdChange={setSelectedCustomer}
        onBranchIdChange={setSelectedBranch}
        onOperatorIdChange={setSelectedOperator}
        onHasPaidMaterialsChange={setHasPaidMaterials}
        onShowCheckedOnlyChange={setShowCheckedOnly}
        onApplyFilters={fetchVisits}
        onResetFilters={handleResetFilters}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable
            columns={columns}
            data={visits}
            pagination={true}
            itemsPerPage={10}
            searchable={false}
            actions={(visit: Visit) => (
              <div className="flex justify-end space-x-2">
                <button onClick={() => { setSelectedVisit(visit); setShowDetailsModal(true); }} className="text-blue-600 hover:text-blue-900" title="Görüntüle"><Eye size={16} /></button>
                <button onClick={() => navigate(`/admin/visits/edit/${visit.id}`)} className="text-green-600 hover:text-green-900" title="Düzenle"><Edit size={16} /></button>
                <button onClick={() => { setVisitToDelete(visit.id); setShowDeleteConfirm(true); }} className="text-red-600 hover:text-red-900" title="Sil"><Trash size={16} /></button>
              </div>
            )}
        />
      </div>

      {showDetailsModal && selectedVisit && (
        <VisitDetailsModal
          visit={selectedVisit}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
      
      {visitToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Ziyareti Sil</h3>
            <p className="mb-6">Bu ziyareti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setVisitToDelete(null)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">İptal</button>
              <button onClick={handleDeleteVisit} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaidVisitsPage;
