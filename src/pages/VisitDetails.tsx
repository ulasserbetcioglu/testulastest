// src/pages/VisitDetails.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Minus, Trash, MapPin, Navigation, Mail, PenTool as Tool, Edit, Camera, UploadCloud, X as CloseIcon } from 'lucide-react';
import { calculateDistance } from '../lib/utils';
import { sendEmail, getRecipientEmails } from '../lib/emailClient';
import { toast } from 'sonner';

interface BranchEquipment {
  id: string;
  equipment_code: string;
  department: string;
  equipment: {
    id: string;
    name: string;
    properties?: Record<string, {
      type: 'boolean' | 'number' | 'string';
      label: string;
    }>;
  };
}

interface Visit {
  id: string;
  customer: {
    id: string;
    kisa_isim: string;
  };
  branch?: {
    id: string;
    sube_adi: string;
    latitude?: number;
    longitude?: number;
  } | null;
  visit_date: string;
  equipment_checks: Record<string, any>;
  pest_types: string[];
  visit_type: string | string[];
  notes: string;
  previous_visit_id?: string;
  previous_visit?: {
    branch?: {
      latitude?: number;
      longitude?: number;
    };
  } | null;
  status?: string;
  report_photo_url?: string;
  report_photo_file_path?: string;
}

// ✅ DÜZELTME: Arayüz 'paid_products' tablosuna göre güncellendi
interface BiocidalProduct {
  id: string;
  name: string;
  unit_type: string; // 'unit_type' AdminProducts dosyasından alındı
}

interface PaidProduct {
  id: string;
  name: string;
  unit_type: string;
  price: number;
}

interface PaidMaterialItem {
  id: string;
  product: {
    id: string;
    name: string;
  };
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ✅ YENİ: Biyosidal kullanım state'i için arayüz
interface BiocidalUsageItem {
  productId: string;
  quantity: string;
  dosage: string;
  unit: string;
}

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  onSave: () => void;
}

// ... (visitTypes, pestTypes, densityOptions sabitleri - Değişiklik yok) ...
const visitTypes = [
  { id: 'ilk', label: 'İlk' },
  { id: 'ucretli', label: 'Ücretli' },
  { id: 'acil', label: 'Acil Çağrı' },
  { id: 'teknik', label: 'Teknik İnceleme' },
  { id: 'periyodik', label: 'Periyodik' },
  { id: 'isyeri', label: 'İşyeri' },
  { id: 'gozlem', label: 'Gözlem' },
  { id: 'son', label: 'Son' }
];

const pestTypes = [
  { id: 'kus', label: 'Kuş' },
  { id: 'hasere', label: 'Haşere' },
  { id: 'ari', label: 'Arı' },
  { id: 'kemirgen', label: 'Kemirgen' },
  { id: 'yumusakca', label: 'Yumuşakça' },
  { id: 'kedi_kopek', label: 'Kedi/Köpek' },
  { id: 'sinek', label: 'Sinek' },
  { id: 'surungen', label: 'Sürüngen' },
  { id: 'ambar', label: 'Ambar Zararlısı' },
  { id: 'diger', label: 'Diğer' }
];

const densityOptions = [
  { id: 'yok', label: 'Yok' },
  { id: 'az', label: 'Az' },
  { id: 'orta', label: 'Orta' },
  { id: 'istila', label: 'İstila' }
];


// ... (AddEquipmentModal bileşeni - Değişiklik yok) ...
const AddEquipmentModal: React.FC<AddEquipmentModalProps> = ({ isOpen, onClose, branchId, onSave }) => {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    department: '',
    items: [{ equipmentId: '', count: 1 }]
  });

  useEffect(() => {
    if (isOpen) {
      fetchEquipment();
    }
  }, [isOpen]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, code')
        .eq('is_active', true)
        .order('order_no', { ascending: true });

      if (error) throw error;
      setEquipment(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Generate equipment codes for each item
      const equipmentToInsert = formData.items.flatMap(item => {
        if (!item.equipmentId) return [];
        
        const selectedEquipment = equipment.find(eq => eq.id === item.equipmentId);
        if (!selectedEquipment) return [];

        return Array.from({ length: item.count }, (_, index) => ({
          branch_id: branchId,
          equipment_id: item.equipmentId,
          equipment_code: `${selectedEquipment.code}-${index + 1}`,
          department: formData.department.toUpperCase()
        }));
      });

      const { error } = await supabase
        .from('branch_equipment')
        .insert(equipmentToInsert);

      if (error) throw error;

      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addEquipmentItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { equipmentId: '', count: 1 }]
    }));
  };

  const removeEquipmentItem = (index: number) => {
    if (formData.items.length > 1) {
      const newEquipmentUsage = [...formData.items];
      newEquipmentUsage.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        items: newEquipmentUsage
      }));
    }
  };

  const updateEquipmentItem = (index: number, field: 'equipmentId' | 'count', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Ekipman Ekle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bölüm
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full p-2 border rounded"
                required
                placeholder="Örn: MUTFAK, KAFE, DEPO"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Ekipmanlar</h3>
                <button
                  type="button"
                  onClick={addEquipmentItem}
                  className="text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Ekipman Ekle
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 bg-gray-50 p-4 rounded">
                  <div className="flex-1">
                    <select
                      value={item.equipmentId}
                      onChange={(e) => updateEquipmentItem(index, 'equipmentId', e.target.value)}
                      className="w-full p-2 border rounded"
                      required
                    >
                      <option value="">Seçiniz</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      min="1"
                      value={item.count}
                      onChange={(e) => updateEquipmentItem(index, 'count', parseInt(e.target.value) || 0)}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeEquipmentItem(index)}
                    className="text-red-600 hover:text-red-800"
                    disabled={formData.items.length === 1}
                  >
                    <Minus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const VisitDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [branchEquipment, setBranchEquipment] = useState<BranchEquipment[]>([]);
  const [biocidalProducts, setBiocidalProducts] = useState<BiocidalProduct[]>([]);
  const [paidProducts, setPaidProducts] = useState<PaidProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [equipmentChecks, setEquipmentChecks] = useState<Record<string, any>>({});
  const [selectedPestTypes, setSelectedPestTypes] = useState<string[]>([]);
  const [selectedVisitTypes, setSelectedVisitTypes] = useState<string[]>([]);
  const [density, setDensity] = useState('yok');
  const [notes, setNotes] = useState('');
  const [explanation, setExplanation] = useState('');
  const [startTime, setStartTime] = useState(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  const [endTime, setEndTime] = useState('');
  const [reportNumber, setReportNumber] = useState('');

  // ✅ DÜZELTME: Biyosidal state'i 'dosage' ve 'unit' içerecek şekilde güncellendi
  const [biocidalUsage, setBiocidalUsage] = useState<BiocidalUsageItem[]>([
    { productId: '', quantity: '', dosage: '', unit: '' }
  ]);
  
  const [paidProductUsage, setPaidProductUsage] = useState<Array<{
    productId: string;
    quantity: string;
  }>>([{ productId: '', quantity: '' }]);
  
  const [noPaidProductsUsed, setNoPaidProductsUsed] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [distanceFromPrevious, setDistanceFromPrevious] = useState<number | null>(null);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [paidVisitAmount, setPaidVisitAmount] = useState<string>('');
  const [showPaidVisitAmount, setShowPaidVisitAmount] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [previousPaidMaterials, setPreviousPaidMaterials] = useState<PaidMaterialItem[]>([]);
  const [existingSaleId, setExistingSaleId] = useState<string | null>(null);

  const [reportPhotoFile, setReportPhotoFile] = useState<File | null>(null);
  const [reportPhotoPreview, setReportPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 

  useEffect(() => {
    fetchVisitDetails();
    fetchBiocidalProducts(); // ✅ GÜNCELLENDİ: Artık paid_products'tan çekecek
    fetchOperatorId();
  }, [id]);

  useEffect(() => {
    if (visit?.branch?.id) {
      fetchBranchEquipment(visit.branch.id);
    } else {
      setBranchEquipment([]);
    }
  }, [visit]);

  useEffect(() => {
    if (operatorId) {
      fetchPaidProducts();
    }
  }, [operatorId]);

  useEffect(() => {
    setShowPaidVisitAmount(selectedVisitTypes.includes('ucretli'));
  }, [selectedVisitTypes]);

  useEffect(() => {
    if (isEditMode && previousPaidMaterials.length > 0) {
      const initialPaidProducts = previousPaidMaterials.map(item => ({
        productId: item.product.id,
        quantity: item.quantity.toString()
      }));
      setPaidProductUsage(initialPaidProducts);
      setNoPaidProductsUsed(false);
    }
  }, [isEditMode, previousPaidMaterials]);

  // ... (calculateDistanceFromPrevious, fetchOperatorId, fetchPaidProducts - Değişiklik yok) ...
  const calculateDistanceFromPrevious = () => {
    if (
      visit?.branch?.latitude && 
      visit?.branch?.longitude && 
      visit?.previous_visit?.branch?.latitude && 
      visit?.previous_visit?.branch?.longitude
    ) {
      const distance = calculateDistance(
        visit.branch.latitude,
        visit.branch.longitude,
        visit.previous_visit.branch.latitude,
        visit.previous_visit.branch.longitude
      );
      setDistanceFromPrevious(distance);
    } else {
      setDistanceFromPrevious(null);
    }
  };

  const fetchOperatorId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data, error } = await supabase
        .from('operators')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;
      setOperatorId(data.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchPaidProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('paid_products')
        .select('id, name, unit_type, price')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setPaidProducts(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };


  const fetchVisitDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          equipment_checks,
          pest_types,
          visit_type,
          notes,
          report_number,
          status,
          report_photo_url,
          report_photo_file_path,
          customer:customer_id (id, kisa_isim),
          branch:branch_id (id, sube_adi, latitude, longitude)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        const { data: operatorData } = await supabase
          .from('operators')
          .select('id')
          .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
          .single();
          
        if (operatorData) {
          const { data: previousVisitData } = await supabase
            .from('visits')
            .select(`
              id,
              branch:branch_id (latitude, longitude)
            `)
            .eq('operator_id', operatorData.id)
            .eq('status', 'completed')
            .lt('visit_date', data.visit_date)
            .order('visit_date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (previousVisitData) {
            data.previous_visit_id = previousVisitData.id;
            data.previous_visit = previousVisitData;
          } else {
            data.previous_visit = null;
          }
        }
      }
      
      setVisit(data);
      setIsEditMode(data?.status === 'completed');
      
      if (data?.equipment_checks) {
        setEquipmentChecks(data.equipment_checks);
      }
      
      if (data?.pest_types) {
        setSelectedPestTypes(data.pest_types);
      }
      
      if (data?.visit_type) {
        if (Array.isArray(data.visit_type)) {
          setSelectedVisitTypes(data.visit_type);
          if (data.visit_type.includes('ucretli')) {
            setShowPaidVisitAmount(true);
          }
        } else if (typeof data.visit_type === 'string') {
          setSelectedVisitTypes([data.visit_type]);
          if (data.visit_type === 'ucretli') {
            setShowPaidVisitAmount(true);
          }
        }
      }
      
      if (data?.notes) {
        const paidVisitAmountMatch = data.notes.match(/Ücretli ziyaret tutarı: (\d+) TL/);
        if (paidVisitAmountMatch) {
          setPaidVisitAmount(paidVisitAmountMatch[1]);
          setNotes(data.notes.replace(/Ücretli ziyaret tutarı: \d+ TL\n\n/, ''));
        } else {
          setNotes(data.notes);
        }
      }
      
      if (data?.report_number) {
        setReportNumber(data.report_number);
      }

      if (data?.report_photo_url) {
        setReportPhotoPreview(data.report_photo_url);
      }

      // ✅ GÜNCELLENDİ: Düzenleme modunda hem ücretli hem de biyosidal verileri çek
      if (data?.status === 'completed') {
        fetchPreviousPaidMaterials(id);
        fetchPreviousBiocidalUsage(id); // ✅ YENİ
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (fetchPreviousPaidMaterials - Değişiklik yok) ...
  const fetchPreviousPaidMaterials = async (visitId: string) => {
    try {
      const { data, error } = await supabase
        .from('paid_material_sales')
        .select(`
          id,
          items:paid_material_sale_items (
            id,
            product:product_id (id, name),
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('visit_id', visitId)
        .maybeSingle();

      if (error) throw error;
      
      if (data && data.items && data.items.length > 0) {
        setPreviousPaidMaterials(data.items);
        setExistingSaleId(data.id);
      }
    } catch (err: any) {
      console.error('Error fetching previous paid materials:', err);
    }
  };


  // ✅ YENİ: Düzenleme modunda eski biyosidal verilerini çeker
  const fetchPreviousBiocidalUsage = async (visitId: string) => {
    try {
      const { data, error } = await supabase
        .from('biocidal_products_usage')
        .select('product_id, quantity, unit, dosage')
        .eq('visit_id', visitId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Veriyi state'in formatıyla eşleştir
        const loadedUsage = data.map(item => ({
          productId: item.product_id,
          quantity: item.quantity.toString(), // State'de string tutuluyor
          unit: item.unit || '',
          dosage: item.dosage || ''
        }));
        setBiocidalUsage(loadedUsage);
      }
    } catch (err: any) {
      console.error('Error fetching previous biocidal usage:', err);
    }
  };

  // ... (fetchBranchEquipment - Değişiklik yok) ...
  const fetchBranchEquipment = async (branchId: string) => {
    try {
      const { data: branchEquipmentData, error: branchEquipmentError } = await supabase
        .from('branch_equipment')
        .select(`
          id,
          equipment_code,
          department,
          equipment_id
        `)
        .eq('branch_id', branchId)
        .order('department', { ascending: true });

      if (branchEquipmentError) throw branchEquipmentError;
      
      if (!branchEquipmentData || branchEquipmentData.length === 0) {
        setBranchEquipment([]);
        setLoading(false);
        return;
      }
      
      const equipmentIds = branchEquipmentData.map(item => item.equipment_id);
      
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          id,
          name,
          properties
        `)
        .in('id', equipmentIds);
        
      if (equipmentError) throw equipmentError;
      
      const combinedData = branchEquipmentData.map(branchItem => {
        const equipmentItem = equipmentData?.find(e => e.id === branchItem.equipment_id);
        return {
          ...branchItem,
          equipment: {
            id: branchItem.equipment_id,
            name: equipmentItem?.name || 'Unknown Equipment',
            properties: equipmentItem?.properties || {}
          }
        };
      });
      
      setBranchEquipment(combinedData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // ✅ DÜZELTME: Biyosidal ürünleri 'paid_products' tablosundan çeker
  const fetchBiocidalProducts = async () => {
    try {
      // AdminProducts.tsx'teki gibi 'paid_products' tablosunu kullanıyoruz
      // NOT: Eğer 'paid_products' içinde biyosidal olanları ayırmak için
      // (örn: 'type' veya 'category' gibi) bir sütununuz varsa,
      // buraya .eq('category', 'BİYOSİDAL') gibi bir filtre ekleyebilirsiniz.
      // Şimdilik hepsi çekiliyor:
      const { data, error } = await supabase
        .from('paid_products') 
        .select('id, name, unit_type')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBiocidalProducts(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ... (handleEquipmentCheckChange, handlePestTypeChange, handleVisitTypeChange - Değişiklik yok) ...
  const handleEquipmentCheckChange = (equipmentId: string, field: string, value: any) => {
    setEquipmentChecks(prev => ({
      ...prev,
      [equipmentId]: {
        ...(prev[equipmentId] || {}),
        [field]: value
      }
    }));
  };

  const handlePestTypeChange = (pestType: string) => {
    setSelectedPestTypes(prev => 
      prev.includes(pestType)
        ? prev.filter(type => type !== pestType)
        : [...prev, pestType]
    );
  };

  const handleVisitTypeChange = (visitType: string) => {
    setSelectedVisitTypes(prev => {
      if (prev.includes(visitType)) {
        return prev.filter(type => type !== visitType);
      } else {
        return [...prev, visitType];
      }
    });
  };


  // ✅ DÜZELTME: Biyosidal state handler'ı 'dosage' ve 'unit'i içerecek şekilde güncellendi
  const handleBiocidalChange = (index: number, field: 'productId' | 'quantity' | 'dosage' | 'unit', value: string) => {
    const newBiocidalUsage = [...biocidalUsage];
    newBiocidalUsage[index] = {
      ...newBiocidalUsage[index],
      [field]: value
    };

    // Eğer ürün seçimi değiştiyse, birimi otomatik doldur
    if (field === 'productId') {
      const product = biocidalProducts.find(p => p.id === value);
      newBiocidalUsage[index].unit = product?.unit_type || 'adet';
    }
    
    setBiocidalUsage(newBiocidalUsage);
  };

  // ✅ DÜZELTME: Yeni eklenen satır 'dosage' ve 'unit' içeriyor
  const addBiocidalProduct = () => {
    setBiocidalUsage([...biocidalUsage, { productId: '', quantity: '', dosage: '', unit: '' }]);
  };

  const removeBiocidalProduct = (index: number) => {
    if (biocidalUsage.length > 1) {
      const newBiocidalUsage = [...biocidalUsage];
      newBiocidalUsage.splice(index, 1);
      setBiocidalUsage(newBiocidalUsage);
    }
  };

  // ... (handlePaidProductChange, addPaidProduct, removePaidProduct, updateOperatorStock, savePaidMaterialSale - Değişiklik yok) ...
  const handlePaidProductChange = (index: number, field: 'productId' | 'quantity', value: string) => {
    const newPaidProductUsage = [...paidProductUsage];
    newPaidProductUsage[index] = {
      ...newPaidProductUsage[index],
      [field]: value
    };
    setPaidProductUsage(newPaidProductUsage);
  };

  const addPaidProduct = () => {
    setPaidProductUsage([...paidProductUsage, { productId: '', quantity: '' }]);
    setNoPaidProductsUsed(false);
  };

  const removePaidProduct = (index: number) => {
    if (paidProductUsage.length > 1) {
      const newPaidProductUsage = [...paidProductUsage];
      newPaidProductUsage.splice(index, 1);
      setPaidProductUsage(newPaidProductUsage);
    }
  };

  const updateOperatorStock = async (productId: string, quantity: number) => {
    try {
      if (!operatorId) return;
      
      const { data: warehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .select('id')
        .eq('operator_id', operatorId)
        .single();

      if (warehouseError) throw warehouseError;
      
      const { data: currentStock, error: stockError } = await supabase
        .from('warehouse_items')
        .select('id, quantity')
        .eq('warehouse_id', warehouse.id)
        .eq('product_id', productId)
        .maybeSingle();
        
      if (stockError) throw stockError;
      
      if (currentStock) {
        const newQuantity = Math.max(0, currentStock.quantity - quantity);
        
        const { error: updateError } = await supabase
          .from('warehouse_items')
          .update({ quantity: newQuantity })
          .eq('id', currentStock.id);
          
        if (updateError) throw updateError;
      } else {
        console.error(`No stock found for product ${productId} in warehouse ${warehouse.id}`);
      }
    } catch (error: any) {
      console.error('Error updating operator stock:', error);
    }
  };

  const savePaidMaterialSale = async () => {
    if (noPaidProductsUsed) {
      return;
    }
    
    const validPaidProducts = paidProductUsage.filter(
      item => item.productId && item.quantity && parseFloat(item.quantity) > 0
    );
    
    if (validPaidProducts.length === 0) {
      return;
    }
    
    try {
      let totalAmount = 0;
      const saleItems = validPaidProducts.map(item => {
        const product = paidProducts.find(p => p.id === item.productId);
        if (!product) throw new Error('Ürün bulunamadı');
        
        const quantity = parseFloat(item.quantity);
        const unitPrice = product.price;
        const totalPrice = quantity * unitPrice;
        
        totalAmount += totalPrice;
        
        return {
          product_id: item.productId,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice
        };
      });
      
      if (isEditMode && existingSaleId) {
        await supabase
          .from('paid_material_sale_items')
          .delete()
          .eq('sale_id', existingSaleId);
          
        await supabase
          .from('paid_material_sales')
          .update({
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSaleId);
          
        const saleItemsWithSaleId = saleItems.map(item => ({
          ...item,
          sale_id: existingSaleId
        }));
        
        await supabase
          .from('paid_material_sale_items')
          .insert(saleItemsWithSaleId);
          
        return;
      }
      
      const { data: saleData, error: saleError } = await supabase
        .from('paid_material_sales')
        .insert([{
          customer_id: visit?.customer.id,
          branch_id: visit?.branch?.id || null,
          visit_id: id,
          sale_date: new Date().toISOString().split('T')[0],
          status: 'pending',
          total_amount: totalAmount,
          notes: `Ziyaret sırasında satılan ürünler: ${new Date().toISOString().split('T')[0]}`,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();
        
      if (saleError) throw saleError;
      
      const saleItemsWithSaleId = saleItems.map(item => ({
        ...item,
        sale_id: saleData.id
      }));
      
      const { error: itemsError } = await supabase
        .from('paid_material_sale_items')
        .insert(saleItemsWithSaleId);
      
      if (itemsError) throw itemsError;
      
      for (const item of validPaidProducts) {
        await updateOperatorStock(item.productId, parseFloat(item.quantity));
      }
      
    } catch (err: any) {
      console.error('Error saving paid material sale:', err);
    }
  };


  // ✅ YENİ: Biyosidal verilerini 'biocidal_products_usage' tablosuna kaydeder
  const saveBiocidalUsage = async () => {
    if (!id || !operatorId || !visit) return; // Gerekli ID'ler var mı kontrol et

    // Düzenleme modundaysak, bu ziyarete ait eski kayıtları sil
    if (isEditMode) {
      const { error: deleteError } = await supabase
        .from('biocidal_products_usage')
        .delete()
        .eq('visit_id', id);
      
      if (deleteError) {
        throw new Error(`Eski biyosidal verileri silinemedi: ${deleteError.message}`);
      }
    }

    // Sadece geçerli (ürün seçilmiş ve miktar girilmiş) satırları filtrele
    const validBiocidalUsage = biocidalUsage.filter(
      item => item.productId && item.quantity && parseFloat(item.quantity) > 0
    );

    if (validBiocidalUsage.length === 0) {
      return; // Kaydedilecek bir şey yok
    }

    // Veritabanı tablosuna eklenecek verileri hazırla
    const dataToInsert = validBiocidalUsage.map(item => ({
      visit_id: id,
      product_id: item.productId,
      quantity: parseFloat(item.quantity), // String'i sayıya çevir
      unit: item.unit,
      dosage: item.dosage,
      operator_id: operatorId,
      customer_id: visit.customer.id,
      branch_id: visit.branch?.id || null
    }));

    // Yeni verileri ekle
    const { error: insertError } = await supabase
      .from('biocidal_products_usage')
      .insert(dataToInsert);

    if (insertError) {
      throw new Error(`Biyosidal verileri kaydedilemedi: ${insertError.message}`);
    }
  };


  // ... (handlePhotoChange, clearPhoto - Değişiklik yok) ...
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setReportPhotoFile(null);
      setReportPhotoPreview(null);
      return;
    }

    const file = e.target.files[0];
    setReportPhotoFile(file);
    setReportPhotoPreview(URL.createObjectURL(file)); 
  };

  const clearPhoto = () => {
    setReportPhotoFile(null);
    setReportPhotoPreview(null);
  };


  const saveVisit = async () => {
    if (!reportNumber) {
      alert('Lütfen faaliyet rapor numarası giriniz');
      return;
    }
    
    if (selectedVisitTypes.length === 0) {
      alert('Lütfen en az bir ziyaret türü seçiniz');
      return;
    }
    
    if (!noPaidProductsUsed) {
      const validPaidProducts = paidProductUsage.filter(
        item => item.productId && item.quantity && parseFloat(item.quantity) > 0
      );
      
      if (validPaidProducts.length === 0) {
        alert('Lütfen ücretli ürün ekleyin veya "Ücretli ürün kullanılmadı" seçeneğini işaretleyin');
        return;
      }
    }
    
    try {
      setLoading(true);
      
      // 1. Rapor fotoğrafı yükleme
      let uploadedPhotoUrl: string | null = visit?.report_photo_url || null;
      let uploadedPhotoFilePath: string | null = visit?.report_photo_file_path || null;

      if (reportPhotoFile) {
        const fileExt = reportPhotoFile.name.split('.').pop();
        const fileName = `report_photos/${id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents') 
          .upload(fileName, reportPhotoFile, {
            cacheControl: '3600',
            upsert: true, 
          });

        if (uploadError) throw uploadError;
        
        uploadedPhotoUrl = supabase.storage.from('documents').getPublicUrl(fileName).data.publicUrl;
        uploadedPhotoFilePath = fileName;
      } else if (reportPhotoPreview === null && visit?.report_photo_url) {
        uploadedPhotoUrl = null;
        uploadedPhotoFilePath = null;
      }

      // Notları hazırla
      let updatedNotes = notes;
      if (showPaidVisitAmount && paidVisitAmount) {
        updatedNotes = `Ücretli ziyaret tutarı: ${paidVisitAmount} TL\n\n${notes}`;
      }
      
      // Ziyaret tipini string'e çevir
      const visitTypeValue = selectedVisitTypes.length > 0 ? selectedVisitTypes[0] : null;
      
      // 2. 'visits' tablosunu güncelle
      const { data, error } = await supabase
        .from('visits')
        .update({
          equipment_checks: equipmentChecks,
          pest_types: selectedPestTypes,
          visit_type: visitTypeValue, 
          notes: updatedNotes,
          report_number: reportNumber,
          status: 'completed',
          report_photo_url: uploadedPhotoUrl, 
          report_photo_file_path: uploadedPhotoFilePath,
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      
      // 3. Ücretli ürünleri kaydet (veya güncelle)
      if (!noPaidProductsUsed) {
        await savePaidMaterialSale();
      } else if (isEditMode && existingSaleId) {
        // Eğer "ürün kullanılmadı" seçildiyse ve eski satış varsa, onu sil
        await supabase.from('paid_material_sales').delete().eq('id', existingSaleId);
      }

      // ✅ YENİ: 4. Biyosidal ürünleri kaydet (veya güncelle)
      await saveBiocidalUsage();

      // 5. E-posta gönder
      if (sendEmailNotification && visit) {
        try {
          const recipientEmails = await getRecipientEmails(
            visit.customer.id, 
            visit.branch?.id || null
          );
          
          if (recipientEmails.length > 0) {
            for (const email of recipientEmails) {
              await sendEmail('visit', id || '', email);
            }
            toast.success('Ziyaret tamamlandı bildirimi e-posta olarak gönderildi');
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          toast.error('E-posta gönderimi başarısız oldu');
        }
      }
      
      toast.success(isEditMode ? 'Ziyaret güncellendi' : 'Ziyaret kaydedildi');
      navigate('/operator/ziyaretler');
    } catch (err: any) {
      setError(err.message);
      toast.error(`Hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ... (handleAddEquipment, handleEquipmentAdded, groupedEquipment - Değişiklik yok) ...
  const handleAddEquipment = () => {
    if (visit?.branch?.id) {
      setShowAddEquipmentModal(true);
    } else {
      alert('Şube bilgisi bulunamadı');
    }
  };

  const handleEquipmentAdded = () => {
    if (visit?.branch?.id) {
      fetchBranchEquipment(visit.branch.id);
    }
  };

  const groupedEquipment = branchEquipment.reduce((acc, item) => {
    if (!acc[item.department]) {
      acc[item.department] = [];
    }
    acc[item.department].push(item);
    return acc;
  }, {} as Record<string, BranchEquipment[]>);


  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;
  if (!visit) return <div>Ziyaret bulunamadı</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* ... (Header bölümü - Müşteri, Şube vb. - Değişiklik yok) ... */}
      <div className="mb-6">
        <div className="text-sm text-gray-500">
          {new Date(visit.visit_date).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
        <h1 className="text-xl font-bold">
          {visit.customer.kisa_isim}
        </h1>
        {visit.branch && (
          <div className="text-gray-700 flex items-center">
            {visit.branch.sube_adi}
            {visit.branch.latitude && visit.branch.longitude && (
              <span className="ml-2 text-green-600 flex items-center text-sm">
                <MapPin size={14} className="mr-1" />
                {visit.branch.latitude.toFixed(4)}, {visit.branch.longitude.toFixed(4)}
              </span>
            )}
          </div>
        )}
        
        {distanceFromPrevious !== null && visit?.previous_visit && (
          <div className="mt-2 bg-blue-50 p-2 rounded-md text-blue-700 text-sm flex items-center">
            <Navigation size={16} className="mr-2" />
            Önceki ziyaretten mesafe: {distanceFromPrevious.toFixed(2)} km
          </div>
        )}
        
        {isEditMode && (
          <div className="mt-2 bg-yellow-50 p-2 rounded-md text-yellow-700 text-sm flex items-center">
            <Edit size={16} className="mr-2" />
            Düzenleme modundasınız. Ziyaret bilgilerini güncelleyebilirsiniz.
          </div>
        )}
      </div>

      {/* ... (Ekipmanlar bölümü - Değişiklik yok) ... */}
      {visit.branch && (
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
            <h2 className="font-medium">Ekipmanlar</h2>
            {branchEquipment.length === 0 && (
              <button 
                onClick={handleAddEquipment}
                className="bg-white text-red-600 px-3 py-1 rounded text-sm flex items-center"
              >
                <Tool size={16} className="mr-1" />
                Ekipman Ekle
              </button>
            )}
          </div>
          <div className="p-4">
            {Object.entries(groupedEquipment).length === 0 ? (
              <div className="text-center py-4 text-gray-500 flex flex-col items-center">
                <p className="mb-4">Bu şubede ekipman bulunmuyor</p>
                <button 
                  onClick={handleAddEquipment}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
                >
                  <Plus size={16} className="mr-2" />
                  Ekipman Ekle
                </button>
              </div>
            ) : (
              Object.entries(groupedEquipment).map(([department, items]) => (
                <div key={department} className="mb-6 last:mb-0">
                  <h3 className="font-medium text-lg mb-3">{department}</h3>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="font-medium">
                          Ekipman {index + 1} ({item.equipment_code})
                        </div>
                        <div className="text-sm text-gray-600 mb-3">{item.equipment.name}</div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {item.equipment.properties && Object.entries(item.equipment.properties).length > 0 ? (
                            <div className="space-y-2">
                              {Object.entries(item.equipment.properties).map(([key, prop]) => (
                                <div key={key} className="flex justify-between items-center">
                                  <span>{prop.label}</span>
                                  {prop.type === 'boolean' ? (
                                    <select
                                      value={equipmentChecks[item.id]?.[key] || ''}
                                      onChange={(e) => handleEquipmentCheckChange(item.id, key, e.target.value)}
                                      className="border rounded p-1"
                                    >
                                      <option value="">Seçiniz</option>
                                      <option value="true">Evet</option>
                                      <option value="false">Hayır</option>
                                    </select>
                                  ) : prop.type === 'number' ? (
                                    <input
                                      type="number"
                                      value={equipmentChecks[item.id]?.[key] || ''}
                                      onChange={(e) => handleEquipmentCheckChange(item.id, key, e.target.value)}
                                      className="border rounded p-1 w-20 text-right"
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={equipmentChecks[item.id]?.[key] || ''}
                                      onChange={(e) => handleEquipmentCheckChange(item.id, key, e.target.value)}
                                      className="border rounded p-1 w-40"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Bu ekipman için tanımlanmış özellik bulunmuyor
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ... (Ziyaret Türü, Hedef Zararlılar, Yoğunluk bölümleri - Değişiklik yok) ... */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg">
          <h2 className="font-medium">Ziyaret Türü</h2>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {visitTypes.map((type) => (
            <label key={type.id} className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={selectedVisitTypes.includes(type.id)}
                onChange={() => handleVisitTypeChange(type.id)}
                className="form-checkbox" 
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
        
        {showPaidVisitAmount && (
          <div className="px-4 pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ücretli Ziyaret Tutarı (TL)
            </label>
            <input
              type="text"
              value={paidVisitAmount}
              onChange={(e) => setPaidVisitAmount(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Ücretli ziyaret tutarını giriniz..."
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg">
          <h2 className="font-medium">Hedef Zararlılar</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4">
          {pestTypes.map((type) => (
            <label key={type.id} className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={selectedPestTypes.includes(type.id)}
                onChange={() => handlePestTypeChange(type.id)}
                className="form-checkbox" 
              />
              <span>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg">
          <h2 className="font-medium">Yoğunluk</h2>
        </div>
        <div className="p-4 flex justify-between">
          {densityOptions.map((option) => (
            <label key={option.id} className="flex items-center space-x-2">
              <input 
                type="radio" 
                name="density" 
                value={option.id}
                checked={density === option.id}
                onChange={() => setDensity(option.id)}
                className="form-radio" 
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>


      {/* ✅ GÜNCELLENDİ: Biyosidal Ürünler bölümü */}
      {biocidalUsage.map((item, index) => (
        <div key={`biocidal-${index}`} className="bg-white rounded-lg shadow-md mb-6">
          <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
            <h2 className="font-medium">Biyosidal Ürün {index + 1}</h2>
            {index > 0 && (
              <button 
                onClick={() => removeBiocidalProduct(index)}
                className="text-white hover:text-red-200"
              >
                <Trash size={16} />
              </button>
            )}
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Adı
                </label>
                <select 
                  value={item.productId}
                  onChange={(e) => handleBiocidalChange(index, 'productId', e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Seçiniz...</option>
                  {/* 'biocidalProducts' state'i artık 'paid_products'tan geliyor */}
                  {biocidalProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Miktar
                  </label>
                  <input 
                    type="text" 
                    value={item.quantity}
                    onChange={(e) => handleBiocidalChange(index, 'quantity', e.target.value)}
                    className="w-full p-2 border rounded" 
                    placeholder="örn: 1.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birim
                  </label>
                  <input 
                    type="text" 
                    value={item.unit}
                    onChange={(e) => handleBiocidalChange(index, 'unit', e.target.value)}
                    className="w-full p-2 border rounded bg-gray-50" 
                    placeholder="örn: lt, ml, gr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doz
                </label>
                <input 
                  type="text" 
                  value={item.dosage}
                  onChange={(e) => handleBiocidalChange(index, 'dosage', e.target.value)}
                  className="w-full p-2 border rounded" 
                  placeholder="örn: 10ml / 1L Su"
                />
              </div>

              {index === biocidalUsage.length - 1 && (
                <div className="flex items-end">
                  <button 
                    onClick={addBiocidalProduct}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
                  >
                    <Plus size={16} className="mr-1" /> Biyosidal Ekle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* ... (Ücretli Ürünler bölümü - Değişiklik yok) ... */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg">
          <h2 className="font-medium">Ücretli Ürünler</h2>
        </div>
        <div className="p-4">
          {isEditMode && previousPaidMaterials.length > 0 && (
            <div className="mb-4 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Önceki Ziyarette Kullanılan Ürünler</h3>
              <div className="space-y-2">
                {previousPaidMaterials.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span>{item.product.name}</span>
                    <span className="font-medium">{item.quantity} adet</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={noPaidProductsUsed}
                onChange={(e) => {
                  setNoPaidProductsUsed(e.target.checked);
                  if (e.target.checked) {
                    setPaidProductUsage([{ productId: '', quantity: '' }]);
                  }
                }}
                className="form-checkbox" 
              />
              <span className="font-medium">Ücretli ürün kullanılmadı</span>
            </label>
          </div>
          
          {!noPaidProductsUsed && paidProductUsage.map((item, index) => (
            <div key={`paid-${index}`} className="mb-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Ücretli Ürün {index + 1}</h3>
                {index > 0 && (
                  <button 
                    onClick={() => removePaidProduct(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash size={16} />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ürün Adı
                  </label>
                  <select 
                    value={item.productId}
                    onChange={(e) => handlePaidProductChange(index, 'productId', e.target.value)}
                    className="w-full p-2 border rounded"
                    disabled={noPaidProductsUsed}
                  >
                    <option value="">Seçiniz...</option>
                    {paidProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Miktar
                    </label>
                    <div className="flex">
                      <input 
                        type="text" 
                        value={item.quantity}
                        onChange={(e) => handlePaidProductChange(index, 'quantity', e.target.value)}
                        className="w-full p-2 border rounded-l"
                        disabled={noPaidProductsUsed}
                      />
                      <span className="bg-gray-100 p-2 border border-l-0 rounded-r">
                        {paidProducts.find(p => p.id === item.productId)?.unit_type || 'birim'}
                      </span>
                    </div>
                  </div>
                  {index === paidProductUsage.length - 1 && !noPaidProductsUsed && (
                    <div className="flex items-end">
                      <button 
                        onClick={addPaidProduct}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center"
                      >
                        <Plus size={16} className="mr-1" /> Ürün Ekle
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ... (Notlar, Açıklamalar, Saatler, Rapor No, Fotoğraf, E-posta ve Kaydet Butonu - Değişiklik yok) ... */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg">
          <h2 className="font-medium">Notlar (Sadece Operatör Görür)</h2>
        </div>
        <div className="p-4">
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded" 
            rows={4}
            placeholder="Operatör notları (müşteri göremez)..."
          ></textarea>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="bg-red-600 text-white px-4 py-2 rounded-t-lg">
          <h2 className="font-medium">Açıklamalar (Müşteri Görebilir)</h2>
        </div>
        <div className="p-4">
          <textarea 
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full p-2 border rounded" 
            rows={4}
            placeholder="Müşterinin göreceği açıklamalar..."
          ></textarea>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Başlama Saati
          </label>
          <input 
            type="time" 
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full p-2 border rounded" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bitiş Saati
          </label>
          <input 
            type="time" 
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full p-2 border rounded" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Faaliyet Rapor No <span className="text-red-600">*</span>
          </label>
          <input 
            type="text" 
            value={reportNumber}
            onChange={(e) => setReportNumber(e.target.value)}
            className="w-full p-2 border rounded" 
            required
          />
          {!reportNumber && (
            <p className="mt-1 text-sm text-red-600">Bu alan zorunludur</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rapor Fotoğrafı
          </label>
          <input
            type="file"
            accept="image/*"
            capture="camera"
            onChange={handlePhotoChange}
            ref={fileInputRef}
            style={{ display: 'none' }} 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()} 
            className="w-full p-2 border rounded bg-gray-100 flex items-center justify-center gap-2 hover:bg-gray-200"
          >
            <Camera size={18} /> Resim Çek / Yükle
          </button>
          {reportPhotoPreview && (
            <div className="mt-2 relative">
              <img src={reportPhotoPreview} alt="Rapor Fotoğrafı Önizleme" className="w-full h-32 object-cover rounded" />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <CloseIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center mb-6">
        <input
          type="checkbox"
          id="sendEmail"
          checked={sendEmailNotification}
          onChange={(e) => setSendEmailNotification(e.target.checked)}
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
        <label htmlFor="sendEmail" className="ml-2 block text-sm text-gray-700 flex items-center">
          <Mail size={16} className="mr-1" />
          Müşteriye e-posta bildirimi gönder
        </label>
      </div>

      <button 
        onClick={saveVisit}
        className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
        disabled={loading || !reportNumber || selectedVisitTypes.length === 0 || (!noPaidProductsUsed && paidProductUsage.every(item => !item.productId || !item.quantity))}
      >
        {loading ? 'Kaydediliyor...' : isEditMode ? 'Güncelle' : 'Tamamlandı'}
      </button>

      <AddEquipmentModal
        isOpen={showAddEquipmentModal}
        onClose={() => setShowAddEquipmentModal(false)}
        branchId={visit.branch?.id || ''}
        onSave={handleEquipmentAdded}
      />
    </div>
  );
};

export default VisitDetails;