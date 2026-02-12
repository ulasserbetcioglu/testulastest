import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

// --- ARAYÜZ (INTERFACE) GÜNCELLEMESİ ---
// dateFrom, dateTo ve ilgili fonksiyonlar kaldırıldı.
// selectedMonth ve onSelectedMonthChange eklendi.
interface VisitFiltersProps {
  customers: { id: string; kisa_isim: string }[];
  branches: { id: string; sube_adi: string; customer_id: string }[];
  operators: { id: string; name: string }[];
  searchTerm: string;
  selectedMonth: string; // YYYY-AA formatında (örn: "2025-06")
  status: string;
  visitType: string;
  customerId: string;
  branchId: string;
  operatorId: string;
  hasPaidMaterials: string;
  showCheckedOnly: string;
  onSearchTermChange: (value: string) => void;
  onSelectedMonthChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onVisitTypeChange: (value: string) => void;
  onCustomerIdChange: (value: string) => void;
  onBranchIdChange: (value: string) => void;
  onOperatorIdChange: (value: string) => void;
  onHasPaidMaterialsChange: (value: string) => void;
  onShowCheckedOnlyChange: (value: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
}

const VisitFilters: React.FC<VisitFiltersProps> = ({
  customers,
  branches,
  operators,
  searchTerm,
  selectedMonth,
  status,
  visitType,
  customerId,
  branchId,
  operatorId,
  hasPaidMaterials,
  showCheckedOnly,
  onSearchTermChange,
  onSelectedMonthChange,
  onStatusChange,
  onVisitTypeChange,
  onCustomerIdChange,
  onBranchIdChange,
  onOperatorIdChange,
  onHasPaidMaterialsChange,
  onShowCheckedOnlyChange,
  onApplyFilters,
  onResetFilters
}) => {
  const [showFilters, setShowFilters] = useState(false);

  // Müşteri seçildiğinde ilgili şubeleri filtrele
  const filteredBranches = customerId 
    ? branches.filter(branch => branch.customer_id === customerId)
    : [];

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* ARAMA ÇUBUĞU */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Müşteri, şube veya operatör ara..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        </div>
        {/* FİLTRE BUTONLARI */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filtrele
          </button>
          <button
            onClick={onResetFilters}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <X className="w-5 h-5" />
            Sıfırla
          </button>
        </div>
      </div>

      {/* AÇILIR FİLTRE ALANI */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* YENİ: AY FİLTRESİ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dönem (Ay)
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => onSelectedMonthChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Müşteri Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri</label>
              <select
                value={customerId}
                onChange={(e) => {
                  onCustomerIdChange(e.target.value);
                  onBranchIdChange(''); // Müşteri değiştiğinde şube seçimini sıfırla
                }}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tüm Müşteriler</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.kisa_isim}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Şube Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şube</label>
              <select
                value={branchId}
                onChange={(e) => onBranchIdChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                disabled={!customerId}
              >
                <option value="">Tüm Şubeler</option>
                {filteredBranches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.sube_adi}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Operatör Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
              <select
                value={operatorId}
                onChange={(e) => onOperatorIdChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tüm Operatörler</option>
                {operators.map(operator => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Durum Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tüm Durumlar</option>
                <option value="planned">Planlandı</option>
                <option value="completed">Tamamlandı</option>
                <option value="cancelled">İptal Edildi</option>
              </select>
            </div>
            
            {/* Ziyaret Türü Filtresi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ziyaret Türü</label>
              <select
                value={visitType}
                onChange={(e) => onVisitTypeChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tüm Türler</option>
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
            
            {/* Diğer Filtreler */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ücretli Malzeme</label>
              <select
                value={hasPaidMaterials}
                onChange={(e) => onHasPaidMaterialsChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tümü</option>
                <option value="true">Var</option>
                <option value="false">Yok</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İşaretli Ziyaretler</label>
              <select
                value={showCheckedOnly}
                onChange={(e) => onShowCheckedOnlyChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tümü</option>
                <option value="true">İşaretli</option>
                <option value="false">İşaretsiz</option>
              </select>
            </div>
          </div>
          
          {/* FİLTRELERİ UYGULA BUTONU */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onApplyFilters}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Filtreleri Uygula
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitFilters;
