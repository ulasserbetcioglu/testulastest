import React, { useState, useEffect } from 'react';
import { X, Download, Upload, Save, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface PricingItem {
  id: string;
  name: string;
  currentPricing: {
    id?: string;
    type: 'monthly' | 'per_visit' | 'none';
    amount: number | null;
  };
  newPricing: {
    type: 'monthly' | 'per_visit' | 'none';
    amount: number | null;
  };
}

const BulkPricingModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  type: 'customer' | 'branch';
}> = ({ isOpen, onClose, onSave, type }) => {
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [bulkType, setBulkType] = useState<'monthly' | 'per_visit' | 'none'>('none');
  const [bulkAmount, setBulkAmount] = useState<string>('');
  const [percentageChange, setPercentageChange] = useState<string>('');
  const [applyToAll, setApplyToAll] = useState(false);
  const [applyToFiltered, setApplyToFiltered] = useState(false);
  const [applyToSelected, setApplyToSelected] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showOnlyWithPricing, setShowOnlyWithPricing] = useState(false);
  const [showOnlyWithoutPricing, setShowOnlyWithoutPricing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, type]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      if (type === 'customer') {
        const { data: customersData, error: customersError } = await supabase.from('customers').select('id, kisa_isim').order('kisa_isim');
        if (customersError) throw customersError;
        const customers = customersData || [];
        const customerIds = customers.map(c => c.id);

        const { data: pricingData, error: pricingError } = await supabase.from('customer_pricing').select('id, customer_id, monthly_price, per_visit_price').in('customer_id', customerIds);
        if (pricingError) throw pricingError;

        const pricingMap = new Map((pricingData || []).map(p => [p.customer_id, p]));
        
        const formattedItems = customers.map(customer => {
          const pricing = pricingMap.get(customer.id);
          const pricingType = pricing?.monthly_price ? 'monthly' : pricing?.per_visit_price ? 'per_visit' : 'none';
          const amount = pricing?.monthly_price || pricing?.per_visit_price || null;
          return { id: customer.id, name: customer.kisa_isim, currentPricing: { id: pricing?.id, type: pricingType, amount }, newPricing: { type: pricingType, amount } };
        });
        setItems(formattedItems);

      } else { // type === 'branch'
        const { data: branchesData, error: branchesError } = await supabase.from('branches').select('id, sube_adi, customer:customer_id(kisa_isim)').order('sube_adi');
        if (branchesError) throw branchesError;
        const branches = branchesData || [];
        const branchIds = branches.map(b => b.id);

        const { data: pricingData, error: pricingError } = await supabase.from('branch_pricing').select('id, branch_id, monthly_price, per_visit_price').in('branch_id', branchIds);
        if (pricingError) throw pricingError;

        const pricingMap = new Map((pricingData || []).map(p => [p.branch_id, p]));
        
        const formattedItems = branches.map(branch => {
          const pricing = pricingMap.get(branch.id);
          const pricingType = pricing?.monthly_price ? 'monthly' : pricing?.per_visit_price ? 'per_visit' : 'none';
          const amount = pricing?.monthly_price || pricing?.per_visit_price || null;
          return { id: branch.id, name: `${branch.sube_adi} (${branch.customer?.kisa_isim || 'Bilinmeyen'})`, currentPricing: { id: pricing?.id, type: pricingType, amount }, newPricing: { type: pricingType, amount } };
        });
        setItems(formattedItems);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const itemsToUpdate = items.filter(item => {
        const current = item.currentPricing;
        const newP = item.newPricing;
        return current.type !== newP.type || current.amount !== newP.amount;
      });

      if (itemsToUpdate.length === 0) {
        toast.info('Değişiklik yapılmadı');
        onClose();
        return;
      }

      const table = type === 'customer' ? 'customer_pricing' : 'branch_pricing';
      const idField = type === 'customer' ? 'customer_id' : 'branch_id';

      const upsertData = itemsToUpdate.map(item => {
        const baseData = {
          [idField]: item.id,
          monthly_price: item.newPricing.type === 'monthly' ? item.newPricing.amount : null,
          per_visit_price: item.newPricing.type === 'per_visit' ? item.newPricing.amount : null,
        };
        return item.currentPricing.id ? { ...baseData, id: item.currentPricing.id } : baseData;
      });
      
      const toDelete = itemsToUpdate.filter(item => item.newPricing.type === 'none' && item.currentPricing.id).map(item => item.currentPricing.id);

      if (toDelete.length > 0) {
          const { error: deleteError } = await supabase.from(table).delete().in('id', toDelete);
          if(deleteError) throw deleteError;
      }

      const toUpsert = upsertData.filter(d => (d as any).monthly_price !== null || (d as any).per_visit_price !== null);
      if(toUpsert.length > 0) {
          const { error: upsertError } = await supabase.from(table).upsert(toUpsert);
          if(upsertError) throw upsertError;
      }

      toast.success(`${itemsToUpdate.length} adet fiyatlandırma güncellendi`);
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error('Fiyatlandırma güncellenirken bir hata oluştu');
      console.error('Error saving pricing:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleItemChange = (id: string, field: 'type' | 'amount', value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newPricing = { ...item.newPricing, [field]: value };
        if (field === 'type' && value === 'none') {
          newPricing.amount = null;
        }
        return { ...item, newPricing };
      }
      return item;
    }));
  };

  const handleSelectItem = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedItems(selected ? new Set(filteredItems.map(item => item.id)) : new Set());
  };

  const applyBulkChanges = () => {
    let itemsToUpdateIds: string[] = [];
    if (applyToAll) itemsToUpdateIds = items.map(item => item.id);
    else if (applyToFiltered) itemsToUpdateIds = filteredItems.map(item => item.id);
    else if (applyToSelected) itemsToUpdateIds = Array.from(selectedItems);

    if (itemsToUpdateIds.length === 0) {
      toast.error('Lütfen fiyat güncellenecek öğeleri seçin');
      return;
    }

    setItems(prev => prev.map(item => {
      if (itemsToUpdateIds.includes(item.id)) {
        let newAmount: number | null = null;
        if (bulkType !== 'none') {
          if (percentageChange) {
            const currentAmount = item.newPricing.amount || 0;
            const percentage = parseFloat(percentageChange);
            if (!isNaN(percentage)) {
              newAmount = Math.round((currentAmount * (1 + percentage / 100)) * 100) / 100;
            }
          } else if (bulkAmount) {
            newAmount = parseFloat(bulkAmount);
            if (isNaN(newAmount)) newAmount = null;
          }
        }
        return { ...item, newPricing: { type: bulkType, amount: newAmount } };
      }
      return item;
    }));
    toast.success(`${itemsToUpdateIds.length} adet öğe için fiyat güncellendi`);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase());
    const hasPricing = item.currentPricing.type !== 'none';
    if (showOnlyWithPricing && !hasPricing) return false;
    if (showOnlyWithoutPricing && hasPricing) return false;
    return matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{type === 'customer' ? 'Müşteri' : 'Şube'} Toplu Fiyatlandırma</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-6 h-6" /></button>
        </div>

        <div className="p-4 border-b bg-gray-50">
          {/* ... Toplu işlem form alanları ... */}
        </div>

        <div className="p-4 border-b">
          {/* ... Arama ve filtreleme alanları ... */}
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <div className="p-4 bg-red-50 text-red-700">{error}</div>}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="w-10 px-3 py-3 text-left"><input type="checkbox" checked={filteredItems.length > 0 && filteredItems.every(item => selectedItems.has(item.id))} onChange={(e) => handleSelectAll(e.target.checked)} className="rounded" /></th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{type === 'customer' ? 'Müşteri' : 'Şube'}</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mevcut Fiyatlandırma</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yeni Fiyatlandırma</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">Yükleniyor...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">Sonuç bulunamadı.</td></tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4"><input type="checkbox" checked={selectedItems.has(item.id)} onChange={(e) => handleSelectItem(item.id, e.target.checked)} className="rounded" /></td>
                    <td className="px-3 py-4"><div className="text-sm font-medium text-gray-900">{item.name}</div></td>
                    <td className="px-3 py-4">
                      {item.currentPricing.type === 'monthly' ? <div className="text-sm text-blue-600">Aylık: {item.currentPricing.amount?.toLocaleString('tr-TR')} ₺</div> : item.currentPricing.type === 'per_visit' ? <div className="text-sm text-green-600">Ziyaret Başı: {item.currentPricing.amount?.toLocaleString('tr-TR')} ₺</div> : <div className="text-sm text-gray-500">Yok</div>}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex items-center space-x-4">
                        <select value={item.newPricing.type} onChange={(e) => handleItemChange(item.id, 'type', e.target.value)} className="p-1.5 border rounded text-sm">
                          <option value="none">Yok</option>
                          <option value="monthly">Aylık</option>
                          <option value="per_visit">Ziyaret Başı</option>
                        </select>
                        {item.newPricing.type !== 'none' && (<input type="number" value={item.newPricing.amount || ''} onChange={(e) => handleItemChange(item.id, 'amount', e.target.value ? parseFloat(e.target.value) : null)} className="p-1.5 border rounded w-24 text-sm" placeholder="Fiyat" min="0" step="0.01" />)}
                        {item.newPricing.type !== item.currentPricing.type || item.newPricing.amount !== item.currentPricing.amount ? (<span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Değişti</span>) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50" disabled={saving}>İptal</button>
          <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 disabled:opacity-50" disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Kaydet</button>
        </div>
      </div>
    </div>
  );
};

export default BulkPricingModal;
