// src/pages/AdminVehicles.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Car, Wrench, Download, Loader2 } from 'lucide-react'; // Loader2 eklendi
import AddVehicleModal from '../components/Vehicles/AddVehicleModal';
import EditVehicleModal from '../components/Vehicles/EditVehicleModal';
import MaintenanceModal from '../components/Vehicles/MaintenanceModal';
import * as XLSX from 'xlsx';

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color?: string;
  vin?: string;
  current_km?: number;
  fuel_type?: string;
  status: 'active' | 'maintenance' | 'inactive';
  operator_id?: string;
  operator?: { name: string } | null;
  insurance_expiry?: string;
  inspection_expiry?: string;
  insurance_policy_number?: string;
  notes?: string;
}

const AdminVehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`*, operator:operator_id(name)`)
        .order('plate_number', { ascending: true });

      if (error) throw error;
      setVehicles(data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error('Araçlar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Bu aracı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;
      toast.success('Araç başarıyla silindi.');
      fetchVehicles();
    } catch (err: any) {
      toast.error('Araç silinirken hata oluştu: ' + err.message);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowEditModal(true);
  };

  const handleManageMaintenance = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowMaintenanceModal(true);
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.operator?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const data = vehicles.map(vehicle => ({
      'Plaka': vehicle.plate_number,
      'Marka': vehicle.brand,
      'Model': vehicle.model,
      'Yıl': vehicle.year,
      'Renk': vehicle.color || '',
      'VIN': vehicle.vin || '',
      'Güncel KM': vehicle.current_km || '',
      'Yakıt Tipi': vehicle.fuel_type || '',
      'Durum': vehicle.status,
      'Atanan Operatör': vehicle.operator?.name || '',
      'Sigorta Bitiş': vehicle.insurance_expiry || '',
      'Muayene Bitiş': vehicle.inspection_expiry || '',
      'Poliçe No': vehicle.insurance_policy_number || '',
      'Notlar': vehicle.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Araçlar');
    XLSX.writeFile(wb, 'araclar.xlsx');
    toast.success('Araç listesi Excel\'e aktarıldı!');
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Araçlar yükleniyor...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Hata: {error}</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Araç Yönetimi</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download size={20} /> Excel'e Aktar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} /> Yeni Araç Ekle
          </button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Plaka, marka, model veya operatör ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plaka</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marka Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yıl</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KM</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atanan Operatör</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Araç bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(vehicle => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.plate_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vehicle.brand} {vehicle.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.current_km?.toLocaleString('tr-TR') || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vehicle.status === 'active' ? 'bg-green-100 text-green-800' :
                        vehicle.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {vehicle.status === 'active' ? 'Aktif' : vehicle.status === 'maintenance' ? 'Bakımda' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.operator?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleManageMaintenance(vehicle)}
                          className="text-purple-600 hover:text-purple-900 p-1"
                          title="Bakım Yönetimi"
                        >
                          <Wrench size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Düzenle"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddVehicleModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={fetchVehicles}
      />

      {selectedVehicle && (
        <EditVehicleModal
          isOpen={showEditModal}
          onClose={() => { setShowEditModal(false); setSelectedVehicle(null); }}
          onSave={fetchVehicles}
          vehicle={selectedVehicle}
        />
      )}

      {selectedVehicle && (
        <MaintenanceModal
          isOpen={showMaintenanceModal}
          onClose={() => { setShowMaintenanceModal(false); setSelectedVehicle(null); }}
          vehicle={selectedVehicle}
        />
      )}
    </div>
  );
};

export default AdminVehicles;
