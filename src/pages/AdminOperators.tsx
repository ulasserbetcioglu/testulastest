// src/pages/AdminOperators.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Mail, Phone, Check, X, Edit2, Trash2, Download, Upload, Loader2 as Loader, Search, Users, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AddOperatorModal from '../components/Operators/AddOperatorModal';
import EditOperatorModal from '../components/Operators/EditOperatorModal';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Operator as OperatorType } from '../types'; // Import the updated Operator type

interface Operator extends OperatorType { // Extend the imported type
  // No need to redefine properties here if OperatorType is complete
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

const AdminOperators: React.FC = () => {
  const navigate = useNavigate();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [branches, setBranches] = useState<Record<string, Branch>>({});
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAdminAccess();
    fetchOperators();
    fetchCustomersAndBranches();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== 'admin@ilaclamatik.com') {
      navigate('/');
    }
  };

  const fetchOperators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('operators')
        .select('*, total_leave_days')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOperators(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error("Operatörler çekilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersAndBranches = async () => {
    try {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, kisa_isim');
      if (customersError) throw customersError;
      
      const customersRecord: Record<string, Customer> = {};
      customersData?.forEach(customer => {
        customersRecord[customer.id] = customer;
      });
      setCustomers(customersRecord);

      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, sube_adi, customer_id');
      if (branchesError) throw branchesError;
      
      const branchesRecord: Record<string, Branch> = {};
      branchesData?.forEach(branch => {
        branchesRecord[branch.id] = branch;
      });
      setBranches(branchesRecord);
    } catch (err: any) {
      setError(err.message);
      toast.error("Müşteri ve şube verileri çekilirken hata oluştu.");
    }
  };

  const handleDelete = async (id: string) => {
    toast("Bu operatörü silmek istediğinizden emin misiniz?", {
        action: {
            label: "Evet, Sil",
            onClick: async () => {
                try {
                    // Silme işlemi için de RLS kurallarını atlayan bir Edge Function gerekebilir.
                    const { error } = await supabase.from('operators').delete().eq('id', id);
                    if (error) throw error;
                    toast.success("Operatör başarıyla silindi.");
                    fetchOperators();
                } catch (err: any) {
                    toast.error(`Silme işlemi başarısız: ${err.message}`);
                }
            }
        },
        cancel: {
            label: "İptal"
        }
    });
  };

  const handleEdit = (operatorId: string) => {
    setSelectedOperatorId(operatorId);
    setShowEditModal(true);
  };

  const getAssignedCustomersText = (operator: Operator) => {
    if (!operator.assigned_customers || operator.assigned_customers.length === 0) {
      return 'Tüm müşteriler';
    }
    return operator.assigned_customers
      .map(id => customers[id]?.kisa_isim || 'Bilinmeyen Müşteri')
      .join(', ');
  };

  const getAssignedBranchesText = (operator: Operator) => {
    if (!operator.assigned_branches || operator.assigned_branches.length === 0) {
      return 'Tüm şubeler';
    }
    return operator.assigned_branches
      .map(id => branches[id]?.sube_adi || 'Bilinmeyen Şube')
      .join(', ');
  };

  const downloadTemplate = () => {
    const template = [{'Ad Soyad': '', 'E-posta': '', 'Telefon': '', 'Durum': 'Açık', 'Toplam İzin Günü': 20}]; // ✅ MODIFIED: Added 'Toplam İzin Günü'
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Operatörler');
    XLSX.writeFile(wb, 'operator-sablonu.xlsx');
  };

  const exportToExcel = () => {
    const data = operators.map(operator => ({
      'Ad Soyad': operator.name,
      'E-posta': operator.email,
      'Telefon': operator.phone || '',
      'Durum': operator.status,
      'Atanmış Müşteriler': getAssignedCustomersText(operator),
      'Atanmış Şubeler': getAssignedBranchesText(operator),
      'Toplam İzin Günü': operator.total_leave_days || 0 // ✅ MODIFIED: Export total_leave_days
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Operatörler');
    XLSX.writeFile(wb, 'operatorler.xlsx');
  };

  // ✅ DEĞİŞİKLİK: Bu fonksiyon artık Edge Function'ı çağırıyor.
  const importFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const failedImports: { email: string; reason: string }[] = [];

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      for (const row of jsonData as any[]) {
        const email = row['E-posta'];
        const name = row['Ad Soyad'];
        
        if (!name || !email) {
          failedImports.push({ email: email || 'Bilinmiyor', reason: 'Eksik Ad veya E-posta' });
          continue;
        }

        try {
          const phone = row['Telefon'] ? String(row['Telefon']) : null;
          const status = row['Durum'] || 'Açık';
          const totalLeaveDays = row['Toplam İzin Günü'] ? parseInt(row['Toplam İzin Günü'], 10) : 0; // ✅ MODIFIED: Read total_leave_days

          const { data: existingOperator } = await supabase.from('operators').select('id').eq('email', email).maybeSingle();

          if (existingOperator) {
            const { error: updateError } = await supabase.from('operators').update({ name, phone, status, total_leave_days: totalLeaveDays }).eq('id', existingOperator.id); // ✅ MODIFIED: Update total_leave_days
            if (updateError) throw updateError;
          } else {
            // 'supabase.auth.signUp' yerine Edge Function çağrılıyor.
            const { data: functionResponse, error: invokeError } = await supabase.functions.invoke('create-operator', {
              body: {
                email,
                name,
                phone,
                status,
                password: 'TempPassword123!', // Güvenli, geçici bir şifre
                total_leave_days: totalLeaveDays // ✅ MODIFIED: Pass total_leave_days to Edge Function
              },
            });

            // Edge function'dan dönen hatayı kontrol et
            if (invokeError) throw invokeError;
            if (functionResponse?.error) throw new Error(functionResponse.error);
          }
        } catch (err: any) {
          failedImports.push({ email, reason: err.message });
          console.error(`Satır işlenemedi (${email}):`, err);
        }
      }

      if (failedImports.length > 0) {
        toast.warning(`İçe aktarma tamamlandı ancak ${failedImports.length} satırda hata oluştu.`);
        console.error("Başarısız olanlar:", failedImports);
      } else {
        toast.success("Tüm operatörler başarıyla içe aktarıldı!");
      }

      fetchOperators();

    } catch (err: any) {
      toast.error(`Dosya okunurken bir hata oluştu: ${err.message}`);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const filteredOperators = operators.filter(operator => 
    operator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    operator.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (operator.phone && operator.phone.includes(searchTerm))
  );

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader size={48} className="animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Operatör Yönetimi</h1>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm">
            <Download size={18} /> Şablon İndir
          </button>
          <label className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors cursor-pointer flex items-center gap-2 text-sm">
            {isUploading ? <Loader size={18} className="animate-spin" /> : <Upload size={18} />}
            {isUploading ? 'Yükleniyor...' : 'Excel İçe Aktar'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importFromExcel} disabled={isUploading} />
          </label>
          <button onClick={exportToExcel} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm">
            <Download size={18} /> Dışa Aktar
          </button>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm">
            <Plus size={18} /> Yeni Operatör
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p>{error}</p></div>}

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <input type="text" placeholder="Operatör adı, e-posta veya telefona göre ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operatör Bilgileri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giriş Bilgileri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Erişim İzinleri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İzin Günü</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperators.map((operator) => (
                <tr key={operator.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{operator.name}</div></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-700"><Mail size={16} className="text-gray-400 mr-2" />{operator.email}</div>
                    {operator.phone && <div className="flex items-center text-sm text-gray-500 mt-1"><Phone size={16} className="text-gray-400 mr-2" />{operator.phone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-gray-600 mb-1">
                      <span className="font-semibold">Email:</span>
                      <span className="ml-1 font-mono bg-gray-100 px-2 py-1 rounded">{operator.email || '-'}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <span className="font-semibold">Şifre:</span>
                      <span className="ml-1 font-mono bg-yellow-50 px-2 py-1 rounded border border-yellow-200">{operator.password_hash || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 max-w-xs truncate" title={getAssignedCustomersText(operator)}><Users size={16} className="text-gray-400 mr-2 inline-block" />{getAssignedCustomersText(operator)}</div>
                    <div className="text-sm text-gray-500 mt-1 max-w-xs truncate" title={getAssignedBranchesText(operator)}><Building size={16} className="text-gray-400 mr-2 inline-block" />{getAssignedBranchesText(operator)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${operator.status === 'Açık' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {operator.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operator.total_leave_days !== undefined ? operator.total_leave_days : '-'} gün
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleEdit(operator.id)} className="text-blue-600 hover:text-blue-900 p-1" title="Düzenle"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(operator.id)} className="text-red-600 hover:text-red-900 p-1 ml-2" title="Sil"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddOperatorModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSave={fetchOperators} />
      {selectedOperatorId && <EditOperatorModal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedOperatorId(null); }} onSave={fetchOperators} operatorId={selectedOperatorId} />}
    </div>
  );
};

export default AdminOperators;
