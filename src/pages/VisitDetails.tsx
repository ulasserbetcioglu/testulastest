import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Minus, Trash, MapPin, Navigation, Mail, PenTool as Tool, Edit, Camera, X as CloseIcon } from 'lucide-react';
import { calculateDistance } from '../lib/utils';
import { sendEmail, getRecipientEmails } from '../lib/emailClient';
import { toast } from 'sonner';

// --- TİP TANIMLARI ---

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
  report_number?: string;
  status?: string;
  report_photo_url?: string; 
  report_photo_file_path?: string;
  previous_visit_id?: string;
  previous_visit?: {
    branch?: {
      latitude?: number;
      longitude?: number;
    };
  } | null;
}

interface BiocidalProduct {
  id: string;
  name: string;
  unit_type: string;
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

// --- SABİTLER ---

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

// --- MODAL BİLEŞENİ (EKİPMAN EKLEME) ---

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
      const equipmentToInsert = formData.items.flatMap(item => {
        if (!item.equipmentId) return [];
        
        const selectedEquipment = equipment.find(eq => eq.id === item.equipmentId);
        if (!selectedEquipment) return [];

        return Array.from({ length: item.count }, (_, index) => ({
          branch_id: branchId,
          equipment_id: item.equipmentId,
          equipment_code: `${selectedEquipment.code}-${Date.now().toString().slice(-4)}-${index + 1}`, // Basit unique kod
          department: formData.department.toUpperCase()
        }));
      });

      const { error } = await supabase.from('branch_equipment').insert(equipmentToInsert);
      if (error) throw error;

      onSave();
      onClose();
      // Reset form
      setFormData({ department: '', items: [{ equipmentId: '', count: 1 }] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addEquipmentItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, { equipmentId: '', count: 1 }] }));
  
  const removeEquipmentItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = [...formData.items];
      newItems.splice(index, 1);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  const updateEquipmentItem = (index: number, field: 'equipmentId' | 'count', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Ekipman Ekle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><CloseIcon size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bölüm</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full p-2 border rounded"
                required
                placeholder="Örn: MUTFAK, KAFE"
              />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Ekipmanlar</h3>
                <button type="button" onClick={addEquipmentItem} className="text-green-600 hover:text-green-700 flex items-center gap-1">
                  <Plus size={16} /> Ekle
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
                      {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
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
                  <button type="button" onClick={() => removeEquipmentItem(index)} className="text-red-600 hover:text-red-800" disabled={formData.items.length === 1}>
                    <Minus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50" disabled={loading}>İptal</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50" disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- ANA BİLEŞEN (VISIT DETAILS) ---

const VisitDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Data States
  const [visit, setVisit] = useState<Visit | null>(null);
  const [branchEquipment, setBranchEquipment] = useState<BranchEquipment[]>([]);
  const [biocidalProducts, setBiocidalProducts] = useState<BiocidalProduct[]>([]);
  const [paidProducts, setPaidProducts] = useState<PaidProduct[]>([]);
  
  // UI/Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  
  // Form States
  const [equipmentChecks, setEquipmentChecks] = useState<Record<string, any>>({});
  const [selectedPestTypes, setSelectedPestTypes] = useState<string[]>([]);
  const [selectedVisitTypes, setSelectedVisitTypes] = useState<string[]>([]);
  const [density, setDensity] = useState('yok');
  const [notes, setNotes] = useState('');
  const [explanation, setExplanation] = useState('');
  const [startTime, setStartTime] = useState(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
  const [endTime, setEndTime] = useState('');
  const [reportNumber, setReportNumber] = useState('');
  const [paidVisitAmount, setPaidVisitAmount] = useState<string>('');
  const [showPaidVisitAmount, setShowPaidVisitAmount] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);

  // Sub-data States
  const [biocidalUsage, setBiocidalUsage] = useState<BiocidalUsageItem[]>([{ productId: '', quantity: '', dosage: '', unit: '' }]);
  const [paidProductUsage, setPaidProductUsage] = useState<Array<{ productId: string; quantity: string }>>([{ productId: '', quantity: '' }]);
  const [noPaidProductsUsed, setNoPaidProductsUsed] = useState(false);
  const [previousPaidMaterials, setPreviousPaidMaterials] = useState<PaidMaterialItem[]>([]);
  const [existingSaleId, setExistingSaleId] = useState<string | null>(null);
  
  // Others
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [distanceFromPrevious, setDistanceFromPrevious] = useState<number | null>(null);
  const [reportPhotoFile, setReportPhotoFile] = useState<File | null>(null);
  const [reportPhotoPreview, setReportPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- INITIAL DATA FETCHING ---

  useEffect(() => {
    fetchVisitDetails();
    fetchBiocidalProducts();
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

  useEffect(() => {
    calculateDistanceFromPrevious();
  }, [visit]);

  // --- HELPER FUNCTIONS ---

  const calculateDistanceFromPrevious = () => {
    if (visit?.branch?.latitude && visit?.branch?.longitude && visit?.previous_visit?.branch?.latitude && visit?.previous_visit?.branch?.longitude) {
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
      const { data, error } = await supabase.from('operators').select('id').eq('auth_id', user.id).single();
      if (error) throw error;
      setOperatorId(data.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchBiocidalProducts = async () => {
    try {
      const { data } = await supabase.from('biocidal_products').select('id, name, unit_type').eq('is_active', true).order('name');
      setBiocidalProducts(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchPaidProducts = async () => {
    try {
      const { data } = await supabase.from('paid_products').select('id, name, unit_type, price').eq('is_active', true).order('name');
      setPaidProducts(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchVisitDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id, visit_date, equipment_checks, pest_types, visit_type, notes, report_number, status, report_photo_url, report_photo_file_path,
          customer:customer_id (id, kisa_isim),
          branch:branch_id (id, sube_adi, latitude, longitude)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Önceki ziyaret verisini çek (Mesafe hesabı için)
        const { data: user } = await supabase.auth.getUser();
        const { data: operatorData } = await supabase.from('operators').select('id').eq('auth_id', user.user?.id).single();
        if (operatorData) {
          const { data: prevVisit } = await supabase
            .from('visits')
            .select('id, branch:branch_id(latitude, longitude)')
            .eq('operator_id', operatorData.id)
            .eq('status', 'completed')
            .lt('visit_date', data.visit_date)
            .order('visit_date', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (prevVisit) {
            data.previous_visit_id = prevVisit.id;
            data.previous_visit = prevVisit;
          }
        }
      }

      setVisit(data);
      setIsEditMode(data?.status === 'completed');

      if (data?.equipment_checks) setEquipmentChecks(data.equipment_checks);
      if (data?.pest_types) setSelectedPestTypes(data.pest_types);
      
      if (data?.visit_type) {
        const types = Array.isArray(data.visit_type) ? data.visit_type : [data.visit_type];
        setSelectedVisitTypes(types);
        setShowPaidVisitAmount(types.includes('ucretli'));
      }

      if (data?.notes) {
        const match = data.notes.match(/Ücretli ziyaret tutarı: (\d+) TL/);
        if (match) {
          setPaidVisitAmount(match[1]);
          setNotes(data.notes.replace(/Ücretli ziyaret tutarı: \d+ TL\n\n/, ''));
        } else {
          setNotes(data.notes);
        }
      }

      if (data?.report_number) setReportNumber(data.report_number);
      if (data?.report_photo_url) setReportPhotoPreview(data.report_photo_url);

      if (data?.status === 'completed') {
        fetchPreviousPaidMaterials(id || '');
        fetchPreviousBiocidalUsage(id || '');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousPaidMaterials = async (visitId: string) => {
    const { data } = await supabase.from('paid_material_sales').select('id, items:paid_material_sale_items(id, product:product_id(id, name), quantity, unit_price, total_price)').eq('visit_id', visitId).maybeSingle();
    if (data && data.items) {
      setPreviousPaidMaterials(data.items);
      setExistingSaleId(data.id);
    }
  };

  const fetchPreviousBiocidalUsage = async (visitId: string) => {
    const { data } = await supabase.from('biocidal_products_usage').select('product_id, quantity, unit, dosage').eq('visit_id', visitId);
    if (data) {
      setBiocidalUsage(data.map(i => ({ productId: i.product_id, quantity: i.quantity.toString(), unit: i.unit || '', dosage: i.dosage || '' })));
    }
  };

  // --- CRITICAL FUNCTION: FETCH & INITIALIZE EQUIPMENT ---
  const fetchBranchEquipment = async (branchId: string) => {
    try {
      const { data: branchEquipmentData } = await supabase
        .from('branch_equipment')
        .select('id, equipment_code, department, equipment_id')
        .eq('branch_id', branchId)
        .order('department', { ascending: true });

      if (!branchEquipmentData || branchEquipmentData.length === 0) {
        setBranchEquipment([]);
        return;
      }

      const equipmentIds = branchEquipmentData.map(item => item.equipment_id);
      const { data: equipmentData } = await supabase.from('equipment').select('id, name, properties').in('id', equipmentIds);

      const combinedData = branchEquipmentData.map(branchItem => {
        const equipmentItem = equipmentData?.find(e => e.id === branchItem.equipment_id);
        return {
          ...branchItem,
          equipment: {
            id: branchItem.equipment_id,
            name: equipmentItem?.name || 'Bilinmeyen Ekipman',
            properties: equipmentItem?.properties || {}
          }
        };
      });

      setBranchEquipment(combinedData);

      // --- İSTİSNA YÖNETİMİ (MANAGEMENT BY EXCEPTION) ---
      // Eğer bu ekipmanlar için daha önce kontrol verisi (equipmentChecks) oluşturulmamışsa,
      // otomatik olarak "Sorun Yok / Aktivite Yok" varsayılan değerlerini ata.
      setEquipmentChecks(prevChecks => {
        const newChecks = { ...prevChecks };
        let hasChanges = false;

        combinedData.forEach(item => {
          // Bu ekipman için check objesi yoksa oluştur
          if (!newChecks[item.id]) {
            newChecks[item.id] = {};
            hasChanges = true;
          }

          // Özellikleri döngüye al
          if (item.equipment.properties) {
            Object.entries(item.equipment.properties).forEach(([key, prop]: [string, any]) => {
              // Eğer değer undefined veya boş ise varsayılanı bas
              if (newChecks[item.id][key] === undefined || newChecks[item.id][key] === '') {
                hasChanges = true;
                if (prop.type === 'boolean') {
                  newChecks[item.id][key] = 'false'; // Varsayılan: Hayır (Aktivite Yok)
                } else if (prop.type === 'number') {
                  newChecks[item.id][key] = 0; // Varsayılan: 0 Tüketim
                } else {
                  newChecks[item.id][key] = 'Normal'; // Varsayılan: Normal Durum
                }
              }
            });
          }
        });

        return hasChanges ? newChecks : prevChecks;
      });
      // --------------------------------------------------

    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- HANDLERS ---

  const handleEquipmentCheckChange = (equipmentId: string, field: string, value: any) => {
    setEquipmentChecks(prev => ({
      ...prev,
      [equipmentId]: { ...(prev[equipmentId] || {}), [field]: value }
    }));
  };

  const handlePestTypeChange = (type: string) => setSelectedPestTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  
  const handleVisitTypeChange = (type: string) => setSelectedVisitTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);

  const handleBiocidalChange = (index: number, field: keyof BiocidalUsageItem, value: string) => {
    const newUsage = [...biocidalUsage];
    newUsage[index] = { ...newUsage[index], [field]: value };
    if (field === 'productId') {
      const product = biocidalProducts.find(p => p.id === value);
      newUsage[index].unit = product?.unit_type || 'adet';
    }
    setBiocidalUsage(newUsage);
  };

  const addBiocidalProduct = () => setBiocidalUsage([...biocidalUsage, { productId: '', quantity: '', dosage: '', unit: '' }]);
  const removeBiocidalProduct = (index: number) => biocidalUsage.length > 1 && setBiocidalUsage(biocidalUsage.filter((_, i) => i !== index));

  const handlePaidProductChange = (index: number, field: 'productId' | 'quantity', value: string) => {
    const newUsage = [...paidProductUsage];
    newUsage[index] = { ...newUsage[index], [field]: value };
    setPaidProductUsage(newUsage);
  };

  const addPaidProduct = () => { setPaidProductUsage([...paidProductUsage, { productId: '', quantity: '' }]); setNoPaidProductsUsed(false); };
  const removePaidProduct = (index: number) => paidProductUsage.length > 1 && setPaidProductUsage(paidProductUsage.filter((_, i) => i !== index));

  const updateOperatorStock = async (productId: string, quantity: number) => {
    if (!operatorId) return;
    const { data: warehouse } = await supabase.from('warehouses').select('id').eq('operator_id', operatorId).single();
    if (warehouse) {
      const { data: item } = await supabase.from('warehouse_items').select('id, quantity').eq('warehouse_id', warehouse.id).eq('product_id', productId).maybeSingle();
      if (item) await supabase.from('warehouse_items').update({ quantity: Math.max(0, item.quantity - quantity) }).eq('id', item.id);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setReportPhotoFile(file);
      setReportPhotoPreview(URL.createObjectURL(file));
    }
  };

  // --- SAVE LOGIC ---

  const saveVisit = async () => {
    if (!reportNumber) return alert('Lütfen faaliyet rapor numarası giriniz');
    if (selectedVisitTypes.length === 0) return alert('Lütfen en az bir ziyaret türü seçiniz');
    if (!noPaidProductsUsed && paidProductUsage.some(i => i.productId && (!i.quantity || parseFloat(i.quantity) <= 0))) {
      return alert('Lütfen eklenen ürünlerin miktarını giriniz.');
    }

    setLoading(true);
    try {
      let uploadedPhotoUrl = visit?.report_photo_url || null;
      let uploadedPhotoFilePath = visit?.report_photo_file_path || null;

      if (reportPhotoFile) {
        const fileName = `report_photos/${id}-${Date.now()}.${reportPhotoFile.name.split('.').pop()}`;
        await supabase.storage.from('documents').upload(fileName, reportPhotoFile, { upsert: true });
        uploadedPhotoUrl = supabase.storage.from('documents').getPublicUrl(fileName).data.publicUrl;
        uploadedPhotoFilePath = fileName;
      } else if (reportPhotoPreview === null && visit?.report_photo_url) {
        uploadedPhotoUrl = null;
        uploadedPhotoFilePath = null;
      }

      let updatedNotes = notes;
      if (showPaidVisitAmount && paidVisitAmount) {
        updatedNotes = `Ücretli ziyaret tutarı: ${paidVisitAmount} TL\n\n${notes}`;
      }

      const { error: visitError } = await supabase.from('visits').update({
        equipment_checks: equipmentChecks,
        pest_types: selectedPestTypes,
        visit_type: selectedVisitTypes[0] || null, // İlk seçileni ana tip yap
        notes: updatedNotes,
        report_number: reportNumber,
        status: 'completed',
        report_photo_url: uploadedPhotoUrl,
        report_photo_file_path: uploadedPhotoFilePath
      }).eq('id', id);

      if (visitError) throw visitError;

      // Ücretli Ürün Kaydı
      if (!noPaidProductsUsed) {
        const validPaidItems = paidProductUsage.filter(i => i.productId && i.quantity);
        if (validPaidItems.length > 0) {
          let totalAmount = 0;
          const saleItems = validPaidItems.map(item => {
            const p = paidProducts.find(prod => prod.id === item.productId);
            const price = (parseFloat(item.quantity) * (p?.price || 0));
            totalAmount += price;
            return { product_id: item.productId, quantity: parseFloat(item.quantity), unit_price: p?.price || 0, total_price: price };
          });

          if (isEditMode && existingSaleId) {
            await supabase.from('paid_material_sale_items').delete().eq('sale_id', existingSaleId);
            await supabase.from('paid_material_sales').update({ total_amount: totalAmount, updated_at: new Date().toISOString() }).eq('id', existingSaleId);
            await supabase.from('paid_material_sale_items').insert(saleItems.map(i => ({ ...i, sale_id: existingSaleId })));
          } else {
            const { data: sale } = await supabase.from('paid_material_sales').insert([{
              customer_id: visit?.customer.id, branch_id: visit?.branch?.id, visit_id: id, sale_date: new Date().toISOString(), total_amount: totalAmount, status: 'pending', created_by: (await supabase.auth.getUser()).data.user?.id
            }]).select().single();
            if (sale) {
              await supabase.from('paid_material_sale_items').insert(saleItems.map(i => ({ ...i, sale_id: sale.id })));
              for (const item of validPaidItems) await updateOperatorStock(item.productId, parseFloat(item.quantity));
            }
          }
        }
      } else if (isEditMode && existingSaleId) {
        await supabase.from('paid_material_sales').delete().eq('id', existingSaleId);
      }

      // Biyosidal Kaydı
      if (isEditMode) await supabase.from('biocidal_products_usage').delete().eq('visit_id', id);
      const validBiocidal = biocidalUsage.filter(i => i.productId && i.quantity);
      if (validBiocidal.length > 0) {
        await supabase.from('biocidal_products_usage').insert(validBiocidal.map(i => ({
          visit_id: id, product_id: i.productId, quantity: parseFloat(i.quantity), unit: i.unit, dosage: i.dosage, operator_id: operatorId, customer_id: visit?.customer.id, branch_id: visit?.branch?.id
        })));
      }

      // E-posta
      if (sendEmailNotification && visit) {
        const recipients = await getRecipientEmails(visit.customer.id, visit.branch?.id || null);
        for (const email of recipients) await sendEmail('visit', id || '', email);
        toast.success('Bildirim e-postası gönderildi.');
      }

      toast.success(isEditMode ? 'Ziyaret güncellendi' : 'Ziyaret tamamlandı');
      navigate('/operator/ziyaretler');

    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupedEquipment = branchEquipment.reduce((acc, item) => {
    if (!acc[item.department]) acc[item.department] = [];
    acc[item.department].push(item);
    return acc;
  }, {} as Record<string, BranchEquipment[]>);

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Hata: {error}</div>;
  if (!visit) return <div className="p-8 text-center">Ziyaret bulunamadı</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* HEADER */}
      <div>
        <div className="text-sm text-gray-500">
          {new Date(visit.visit_date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <h1 className="text-xl font-bold">{visit.customer.kisa_isim}</h1>
        {visit.branch && (
          <div className="text-gray-700 flex items-center">
            {visit.branch.sube_adi}
            {visit.branch.latitude && (
              <span className="ml-2 text-green-600 flex items-center text-sm">
                <MapPin size={14} className="mr-1" /> {visit.branch.latitude.toFixed(4)}, {visit.branch.longitude?.toFixed(4)}
              </span>
            )}
          </div>
        )}
        {distanceFromPrevious !== null && (
          <div className="mt-2 bg-blue-50 p-2 rounded text-blue-700 text-sm flex items-center">
            <Navigation size={16} className="mr-2" /> Önceki ziyaretten mesafe: {distanceFromPrevious.toFixed(2)} km
          </div>
        )}
      </div>

      {/* EKİPMANLAR */}
      {visit.branch && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-red-600 text-white px-4 py-2 flex justify-between items-center">
            <h2 className="font-medium">Ekipman Kontrolleri</h2>
            <button onClick={() => setShowAddEquipmentModal(true)} className="bg-white text-red-600 px-3 py-1 rounded text-sm flex items-center gap-1">
              <Tool size={14} /> Ekle
            </button>
          </div>
          <div className="p-4 space-y-6">
            {Object.keys(groupedEquipment).length === 0 && <p className="text-center text-gray-500">Ekipman bulunamadı.</p>}
            {Object.entries(groupedEquipment).map(([dept, items]) => (
              <div key={dept}>
                <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">{dept}</h3>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={item.id} className="border rounded p-3 bg-gray-50">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-sm">{idx + 1}. {item.equipment_code}</span>
                        <span className="text-xs text-gray-500">{item.equipment.name}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {item.equipment.properties ? Object.entries(item.equipment.properties).map(([key, prop]) => (
                          <div key={key} className="flex items-center justify-between bg-white p-2 rounded border">
                            <span className="text-sm text-gray-600">{prop.label}</span>
                            {prop.type === 'boolean' ? (
                              <select 
                                className="border rounded text-sm p-1"
                                value={equipmentChecks[item.id]?.[key] || 'false'}
                                onChange={(e) => handleEquipmentCheckChange(item.id, key, e.target.value)}
                              >
                                <option value="false">Hayır / Yok</option>
                                <option value="true">Evet / Var</option>
                              </select>
                            ) : prop.type === 'number' ? (
                              <input 
                                type="number" 
                                className="border rounded w-20 text-right text-sm p-1"
                                value={equipmentChecks[item.id]?.[key] !== undefined ? equipmentChecks[item.id]?.[key] : 0}
                                onChange={(e) => handleEquipmentCheckChange(item.id, key, parseFloat(e.target.value))}
                              />
                            ) : (
                              <input 
                                type="text" 
                                className="border rounded w-32 text-sm p-1"
                                value={equipmentChecks[item.id]?.[key] || 'Normal'}
                                onChange={(e) => handleEquipmentCheckChange(item.id, key, e.target.value)}
                              />
                            )}
                          </div>
                        )) : <span className="text-xs text-gray-400">Özellik yok</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEÇENEKLER */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-bold text-gray-700 mb-3 border-b pb-1">Ziyaret Türü</h3>
          <div className="grid grid-cols-2 gap-2">
            {visitTypes.map(t => (
              <label key={t.id} className="flex items-center space-x-2 text-sm">
                <input type="checkbox" checked={selectedVisitTypes.includes(t.id)} onChange={() => handleVisitTypeChange(t.id)} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
          {showPaidVisitAmount && (
            <input 
              type="text" 
              placeholder="Tutar (TL)" 
              className="mt-3 w-full border rounded p-2 text-sm"
              value={paidVisitAmount}
              onChange={(e) => setPaidVisitAmount(e.target.value)}
            />
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-bold text-gray-700 mb-3 border-b pb-1">Zararlılar</h3>
          <div className="grid grid-cols-2 gap-2">
            {pestTypes.map(t => (
              <label key={t.id} className="flex items-center space-x-2 text-sm">
                <input type="checkbox" checked={selectedPestTypes.includes(t.id)} onChange={() => handlePestTypeChange(t.id)} />
                <span>{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* YOĞUNLUK */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="font-bold text-gray-700 mb-3 border-b pb-1">Yoğunluk</h3>
        <div className="flex gap-4">
          {densityOptions.map(o => (
            <label key={o.id} className="flex items-center space-x-2 text-sm">
              <input type="radio" name="density" checked={density === o.id} onChange={() => setDensity(o.id)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* BİYOSİDAL ÜRÜNLER */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between mb-3 border-b pb-1">
          <h3 className="font-bold text-gray-700">Biyosidal Ürünler</h3>
          <button onClick={addBiocidalProduct} className="text-blue-600 text-sm flex items-center"><Plus size={14}/> Ekle</button>
        </div>
        <div className="space-y-4">
          {biocidalUsage.map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-3 items-end bg-gray-50 p-3 rounded">
              <div className="flex-1 w-full">
                <label className="text-xs text-gray-500">Ürün</label>
                <select className="w-full border rounded p-1 text-sm" value={item.productId} onChange={(e) => handleBiocidalChange(idx, 'productId', e.target.value)}>
                  <option value="">Seçiniz</option>
                  {biocidalProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="w-20">
                <label className="text-xs text-gray-500">Miktar</label>
                <input type="text" className="w-full border rounded p-1 text-sm" value={item.quantity} onChange={(e) => handleBiocidalChange(idx, 'quantity', e.target.value)} />
              </div>
              <div className="w-20">
                <label className="text-xs text-gray-500">Birim</label>
                <input type="text" className="w-full border rounded p-1 text-sm" value={item.unit} onChange={(e) => handleBiocidalChange(idx, 'unit', e.target.value)} />
              </div>
              <div className="w-32">
                <label className="text-xs text-gray-500">Doz</label>
                <input type="text" className="w-full border rounded p-1 text-sm" placeholder="10ml/1L" value={item.dosage} onChange={(e) => handleBiocidalChange(idx, 'dosage', e.target.value)} />
              </div>
              {idx > 0 && <button onClick={() => removeBiocidalProduct(idx)} className="text-red-500 mb-1"><Trash size={16}/></button>}
            </div>
          ))}
        </div>
      </div>

      {/* ÜCRETLİ ÜRÜNLER */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex justify-between mb-3 border-b pb-1">
          <h3 className="font-bold text-gray-700">Ücretli Malzemeler</h3>
          {!noPaidProductsUsed && <button onClick={addPaidProduct} className="text-blue-600 text-sm flex items-center"><Plus size={14}/> Ekle</button>}
        </div>
        <div className="mb-3">
          <label className="flex items-center space-x-2 text-sm">
            <input type="checkbox" checked={noPaidProductsUsed} onChange={(e) => { setNoPaidProductsUsed(e.target.checked); if(e.target.checked) setPaidProductUsage([{productId:'', quantity:''}]); }} />
            <span>Kullanılmadı</span>
          </label>
        </div>
        {!noPaidProductsUsed && paidProductUsage.map((item, idx) => (
          <div key={idx} className="flex gap-3 items-end mb-2">
            <select className="flex-1 border rounded p-1 text-sm" value={item.productId} onChange={(e) => handlePaidProductChange(idx, 'productId', e.target.value)}>
              <option value="">Seçiniz</option>
              {paidProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex w-32 border rounded">
              <input type="text" className="w-full p-1 text-sm rounded-l" value={item.quantity} onChange={(e) => handlePaidProductChange(idx, 'quantity', e.target.value)} />
              <span className="bg-gray-100 px-2 py-1 text-xs flex items-center text-gray-500">{paidProducts.find(p => p.id === item.productId)?.unit_type || '-'}</span>
            </div>
            {idx > 0 && <button onClick={() => removePaidProduct(idx)} className="text-red-500 mb-1"><Trash size={16}/></button>}
          </div>
        ))}
      </div>

      {/* NOTLAR & FOTOĞRAF */}
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Notlar (Operatör)</label>
          <textarea className="w-full border rounded p-2 text-sm" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Açıklama (Müşteri)</label>
          <textarea className="w-full border rounded p-2 text-sm" rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)}></textarea>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm">Başlama</label><input type="time" className="w-full border rounded p-2" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div><label className="text-sm">Bitiş</label><input type="time" className="w-full border rounded p-2" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <div>
          <label className="block text-sm font-medium text-red-700">Rapor No *</label>
          <input type="text" className="w-full border rounded p-2" required value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Rapor Fotoğrafı</label>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoChange} />
          <button onClick={() => fileInputRef.current?.click()} className="w-full border border-dashed p-3 rounded flex justify-center items-center gap-2 text-gray-500 hover:bg-gray-50">
            <Camera size={20} /> Yükle / Çek
          </button>
          {reportPhotoPreview && (
            <div className="mt-2 relative w-32 h-32">
              <img src={reportPhotoPreview} className="w-full h-full object-cover rounded" />
              <button onClick={() => { setReportPhotoFile(null); setReportPhotoPreview(null); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"><CloseIcon size={12}/></button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" checked={sendEmailNotification} onChange={(e) => setSendEmailNotification(e.target.checked)} />
          <span className="text-sm text-gray-700 flex items-center gap-1"><Mail size={14}/> E-posta gönder</span>
        </div>
      </div>

      <button onClick={saveVisit} disabled={loading} className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 shadow-lg disabled:opacity-50">
        {loading ? 'Kaydediliyor...' : isEditMode ? 'GÜNCELLE' : 'ZİYARETİ TAMAMLA'}
      </button>

      <AddEquipmentModal isOpen={showAddEquipmentModal} onClose={() => setShowAddEquipmentModal(false)} branchId={visit?.branch?.id || ''} onSave={() => visit?.branch?.id && fetchBranchEquipment(visit.branch.id)} />
    </div>
  );
};

export default VisitDetails;