import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Branch } from '../../types';
import AddBranchModal from './AddBranchModal';
import EditBranchModal from './EditBranchModal';
import BranchEquipment from '../Branches/BranchEquipment';
import * as XLSX from 'xlsx';

interface CustomerBranchesProps {
  customerId: string;
}

const CustomerBranches: React.FC<CustomerBranchesProps> = ({ customerId }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchBranches();
  }, [customerId]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select(`
          *,
          pricing:branch_pricing(*)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBranches(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (branchId: string) => {
    if (!isAdmin) {
      alert('Sadece admin kullanıcısı şube silebilir.');
      return;
    }

    if (!confirm('Bu şubeyi silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;
      fetchBranches();
      if (selectedBranchId === branchId) {
        setSelectedBranchId(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsEditModalOpen(true);
  };

  const exportToExcel = () => {
    const data = branches.map(branch => ({
      'Şube Adı': branch.sube_adi,
      'Adres': branch.adres || '',
      'Şehir': branch.sehir || '',
      'Telefon': branch.telefon || '',
      'E-posta': branch.email || '',
      'Enlem': branch.latitude || '',
      'Boylam': branch.longitude || '',
      'Aylık Fiyat': branch.pricing?.monthly_price || '',
      'Ziyaret Başı Fiyat': branch.pricing?.per_visit_price || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Şubeler');
    XLSX.writeFile(wb, `subeler_${customerId}.xlsx`);
  };

  const downloadTemplate = () => {
    const template = [{
      'Şube Adı': '',
      'Adres': '',
      'Şehir': '',
      'Telefon': '',
      'E-posta': '',
      'Enlem': '',
      'Boylam': '',
      'Aylık Fiyat': '',
      'Ziyaret Başı Fiyat': ''
    }];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Şubeler');
    XLSX.writeFile(wb, 'sube_sablonu.xlsx');
  };

  const importFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      alert('Sadece admin kullanıcısı Excel ile içe aktarma yapabilir.');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const branchData = jsonData.map((row: any) => {
        // Check if we have pricing data
        const hasMonthlyPrice = row['Aylık Fiyat'] && row['Aylık Fiyat'] !== '';
        const hasPerVisitPrice = row['Ziyaret Başı Fiyat'] && row['Ziyaret Başı Fiyat'] !== '';
        
        // Validate that only one pricing type is set
        if (hasMonthlyPrice && hasPerVisitPrice) {
          throw new Error('Bir şube için hem aylık hem de ziyaret başı fiyat belirlenemez');
        }
        
        return {
          customer_id: customerId,
          sube_adi: row['Şube Adı'],
          adres: row['Adres'],
          sehir: row['Şehir'],
          telefon: row['Telefon'],
          email: row['E-posta'],
          latitude: row['Enlem'] ? parseFloat(row['Enlem']) : null,
          longitude: row['Boylam'] ? parseFloat(row['Boylam']) : null,
          pricing: hasMonthlyPrice || hasPerVisitPrice ? {
            monthly_price: hasMonthlyPrice ? parseFloat(row['Aylık Fiyat']) : null,
            per_visit_price: hasPerVisitPrice ? parseFloat(row['Ziyaret Başı Fiyat']) : null
          } : null
        };
      });

      // Insert branches
      for (const branch of branchData) {
        const { pricing, ...branchData } = branch;
        
        // Insert branch
        const { data: branchResult, error: branchError } = await supabase
          .from('branches')
          .insert([branchData])
          .select();

        if (branchError) throw branchError;
        
        // Insert pricing if exists
        if (pricing && branchResult && branchResult.length > 0) {
          const { error: pricingError } = await supabase
            .from('branch_pricing')
            .insert([{
              branch_id: branchResult[0].id,
              monthly_price: pricing.monthly_price,
              per_visit_price: pricing.per_visit_price
            }]);

          if (pricingError) throw pricingError;
        }
      }

      fetchBranches();
      event.target.value = '';
    } catch (err: any) {
      setError(err.message);
      alert(`Hata: ${err.message}`);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Şubeler</h2>
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download size={20} />
            Şablon İndir
          </button>

          <label className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors cursor-pointer flex items-center gap-2">
            <Upload size={20} />
            Excel İçe Aktar
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={importFromExcel}
            />
          </label>

          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download size={20} />
            Excel Dışa Aktar
          </button>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Şube Ekle
          </button>
        </div>
      </div>

      {branches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Henüz şube eklenmemiş
        </div>
      ) : (
        <div className="space-y-6">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-4 flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-medium text-lg">{branch.sube_adi}</h3>
                  <div className="text-sm text-gray-600">
                    <p>{branch.adres}</p>
                    <p>{branch.sehir}</p>
                    <p>{branch.telefon}</p>
                    <p>{branch.email}</p>
                    {(branch.latitude && branch.longitude) && (
                      <p className="text-green-600">
                        Koordinatlar: {branch.latitude}, {branch.longitude}
                      </p>
                    )}
                    {branch.pricing && (
                      <p className="text-blue-600 font-medium mt-2">
                        {branch.pricing.monthly_price ? 
                          `Aylık Fiyat: ${branch.pricing.monthly_price.toLocaleString('tr-TR')} ₺` : 
                          branch.pricing.per_visit_price ? 
                          `Ziyaret Başı Fiyat: ${branch.pricing.per_visit_price.toLocaleString('tr-TR')} ₺` : 
                          ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(branch)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(branch.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t">
                <button
                  onClick={() => setSelectedBranchId(selectedBranchId === branch.id ? null : branch.id)}
                  className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {selectedBranchId === branch.id ? 'Ekipmanları Gizle' : 'Ekipmanları Göster'}
                </button>
              </div>

              {selectedBranchId === branch.id && (
                <div className="border-t p-4">
                  <BranchEquipment branchId={branch.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddBranchModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        customerId={customerId}
        onSave={fetchBranches}
      />

      {selectedBranch && (
        <EditBranchModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedBranch(null);
          }}
          branch={selectedBranch}
          onSave={fetchBranches}
        />
      )}
    </div>
  );
};

export default CustomerBranches;