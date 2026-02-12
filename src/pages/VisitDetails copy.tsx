import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Plus, Minus, Trash, MapPin, Navigation, Mail, PenTool as Tool, Edit, Camera, X as CloseIcon, ChevronDown, ChevronUp, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';
import { calculateDistance } from '../lib/utils';
import { sendEmail, getRecipientEmails } from '../lib/emailClient';
import { toast } from 'sonner';

// --- YARDIMCI FONKSİYON: DOSYA ADI TEMİZLEME ---
const sanitizeFileName = (text: string) => {
  if (!text) return 'unknown';
  return text
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
};

// --- YARDIMCI FONKSİYON: FOTOĞRAF OPTİMİZASYONU ---
const resizeImage = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.85
): Promise<{ file: File; originalSize: number; newSize: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const originalSize = file.size;

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context alınamadı'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve({
              file: optimizedFile,
              originalSize,
              newSize: blob.size,
            });
          } else {
            reject(new Error('Blob oluşturulamadı'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Resim yüklenemedi'));
    };

    img.src = url;
  });
};

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
    cari_isim?: string;
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
          equipment_code: `${selectedEquipment.code}-${Date.now().toString().slice(-4)}-${index + 1}`,
          department: formData.department.toUpperCase()
        }));
      });

      const { error } = await supabase.from('branch_equipment').insert(equipmentToInsert);
      if (error) throw error;

      onSave();
      onClose();
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-800">Ekipman Ekle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2"><CloseIcon size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{error}</div>}
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Bölüm / Lokasyon</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              required
              placeholder="Örn: MUTFAK"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Ekipman Listesi</h3>
              <button type="button" onClick={addEquipmentItem} className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1">
                <Plus size={16} /> Yeni Satır
              </button>
            </div>
            
            {formData.items.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block sm:hidden">Ekipman Tipi</label>
                  <select
                    value={item.equipmentId}
                    onChange={(e) => updateEquipmentItem(index, 'equipmentId', e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg bg-white"
                    required
                  >
                    <option value="">Seçiniz</option>
                    {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="w-24">
                    <label className="text-xs text-gray-500 mb-1 block sm:hidden">Adet</label>
                    <input
                      type="number"
                      min="1"
                      value={item.count}
                      onChange={(e) => updateEquipmentItem(index, 'count', parseInt(e.target.value) || 0)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-center"
                      required
                    />
                  </div>
                  <button type="button" onClick={() => removeEquipmentItem(index)} className="text-red-500 hover:text-red-700 p-2 mt-auto" disabled={formData.items.length === 1}>
                    <Trash size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium" disabled={loading}>İptal</button>
            <button type="submit" className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50" disabled={loading}>{loading ? '...' : 'Kaydet'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- FOTOĞRAF MODAL BİLEŞENİ (YENİ) ---

const PhotoCaptureModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}> = ({ isOpen, onClose, onCapture }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onCapture(e.target.files[0]);
      onClose();
    }
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b bg-white">
          <h2 className="text-lg font-bold text-gray-800">Fotograf Ekle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2">
            <CloseIcon size={24} />
          </button>
        </div>

        <div className="p-4 space-y-3 pb-6">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={cameraInputRef}
            onChange={handleFileSelect}
          />
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <Camera size={24} />
            Kamera ile Cek
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">veya</span>
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={galleryInputRef}
            onChange={handleFileSelect}
          />
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <ImageIcon size={24} />
            Galeriden Sec
          </button>
        </div>
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
  const [customerProductPrices, setCustomerProductPrices] = useState<Map<string, number>>(new Map());

  // UI/Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [showPhotoCaptureModal, setShowPhotoCaptureModal] = useState(false);
  const [collapsedDepartments, setCollapsedDepartments] = useState<Record<string, boolean>>({});
  
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
  const [sendEmailNotification, setSendEmailNotification] = useState(false);

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
    if (visit?.customer?.id) {
      fetchPaidProducts();
      fetchCustomerProductPrices(visit.customer.id);
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

  // --- OTOMATİK AÇIKLAMA METNİ OLUŞTURUCU ---
  useEffect(() => {
    const visitTypeLabels = selectedVisitTypes
      .map(id => visitTypes.find(t => t.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    const pestTypeLabels = selectedPestTypes
      .map(id => pestTypes.find(t => t.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    if (visitTypeLabels && pestTypeLabels) {
      const autoText = `Yapılan ziyarette, İşletmede ${visitTypeLabels} ziyaret(ler)i kapsamında, ${pestTypeLabels}lere karşı zararlı mücadelesi kontrolü yapıldı.`;
      setExplanation(autoText);
    } else if (selectedVisitTypes.length > 0) {
       const autoText = `Yapılan ziyarette, işletmede ${visitTypeLabels} kapsamında genel kontrol yapıldı.`;
       setExplanation(autoText);
    }

  }, [selectedVisitTypes, selectedPestTypes]);

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
      const localSession = localAuth.getSession();
      if (localSession && localSession.type === 'operator') {
        setOperatorId(localSession.id);
        return;
      }
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

  const fetchCustomerProductPrices = async (customerId: string) => {
    try {
      const { data } = await supabase
        .from('customer_product_prices')
        .select('product_id, price')
        .eq('customer_id', customerId);
      const priceMap = new Map<string, number>();
      (data || []).forEach(p => priceMap.set(p.product_id, p.price));
      setCustomerProductPrices(priceMap);
    } catch (err) { console.error(err); }
  };

  const getProductPrice = (productId: string): number => {
    const customPrice = customerProductPrices.get(productId);
    if (customPrice !== undefined) return customPrice;
    const product = paidProducts.find(p => p.id === productId);
    return product?.price || 0;
  };

  const fetchVisitDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('visits')
        .select(`
          id, visit_date, equipment_checks, pest_types, visit_type, notes, report_number, status, report_photo_url, report_photo_file_path,
          customer:customer_id (id, kisa_isim, cari_isim),
          branch:branch_id (id, sube_adi, latitude, longitude)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        let currentOpId: string | null = null;
        const localSession = localAuth.getSession();
        if (localSession && localSession.type === 'operator') {
          currentOpId = localSession.id;
        } else {
          const { data: user } = await supabase.auth.getUser();
          const { data: operatorData } = await supabase.from('operators').select('id').eq('auth_id', user.user?.id).maybeSingle();
          currentOpId = operatorData?.id || null;
        }
        if (currentOpId) {
          const { data: prevVisit } = await supabase
            .from('visits')
            .select('id, branch:branch_id(latitude, longitude)')
            .eq('operator_id', currentOpId)
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

      setEquipmentChecks(prevChecks => {
        const newChecks = { ...prevChecks };
        let hasChanges = false;

        combinedData.forEach(item => {
          if (!newChecks[item.id]) {
            newChecks[item.id] = {};
            hasChanges = true;
          }
          if (item.equipment.properties) {
            Object.entries(item.equipment.properties).forEach(([key, prop]: [string, any]) => {
              if (newChecks[item.id][key] === undefined || newChecks[item.id][key] === '') {
                hasChanges = true;
                if (prop.type === 'boolean') {
                  newChecks[item.id][key] = 'false';
                } else if (prop.type === 'number') {
                  newChecks[item.id][key] = 0;
                } else {
                  newChecks[item.id][key] = 'Normal';
                }
              }
            });
          }
        });
        return hasChanges ? newChecks : prevChecks;
      });

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

  const handlePhotoCapture = async (file: File) => {
    try {
      toast.info('Fotoğraf optimize ediliyor...');

      const { file: optimizedFile, originalSize, newSize } = await resizeImage(file, 1920, 1080, 0.85);

      setReportPhotoFile(optimizedFile);
      setReportPhotoPreview(URL.createObjectURL(optimizedFile));

      const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
      toast.success(
        `Fotoğraf optimize edildi: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(newSize / 1024 / 1024).toFixed(2)} MB (-%${reduction})`
      );
    } catch (error: any) {
      console.error('Optimizasyon hatası:', error);
      toast.warning('Optimizasyon başarısız, orijinal dosya kullanılacak');
      setReportPhotoFile(file);
      setReportPhotoPreview(URL.createObjectURL(file));
    }
  };

  // --- SAVE LOGIC ---

  const saveVisit = async () => {
    if (!reportNumber) return alert('Lütfen faaliyet rapor numarası giriniz');
    if (selectedVisitTypes.length === 0) return alert('Lütfen en az bir ziyaret türü seçiniz');
    const hasValidPaidProduct = paidProductUsage.some(i => i.productId && i.quantity && parseFloat(i.quantity) > 0);
    if (!noPaidProductsUsed && !hasValidPaidProduct) {
      return alert('Lütfen ücretli malzeme ekleyin veya "Ücretli ürün kullanılmadı" kutucuğunu işaretleyin.');
    }
    if (!noPaidProductsUsed && paidProductUsage.some(i => i.productId && (!i.quantity || parseFloat(i.quantity) <= 0))) {
      return alert('Lütfen eklenen ürünlerin miktarını giriniz.');
    }

    setLoading(true);
    try {
      let uploadedPhotoUrl = visit?.report_photo_url || null;
      let uploadedPhotoFilePath = visit?.report_photo_file_path || null;

      if (reportPhotoFile && visit) {
        const formattedDate = new Date(visit.visit_date).toISOString().split('T')[0]; 
        const customerName = visit.customer.kisa_isim || visit.customer.cari_isim || 'Musteri';
        const branchName = visit.branch?.sube_adi || 'Sube';
        const fileExt = reportPhotoFile.name.split('.').pop();
        const newFileName = `${sanitizeFileName(customerName)}_${sanitizeFileName(branchName)}_${formattedDate}_${reportNumber}.${fileExt}`;
        const filePath = `report_photos/${newFileName}`;

        await supabase.storage.from('documents').upload(filePath, reportPhotoFile, { upsert: true });
        
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
        uploadedPhotoUrl = urlData.publicUrl;
        uploadedPhotoFilePath = filePath;
      } else if (reportPhotoPreview === null && visit?.report_photo_url) {
        uploadedPhotoUrl = null;
        uploadedPhotoFilePath = null;
      }

      let finalNotes = notes;
      
      if (explanation) {
        finalNotes = `MÜŞTERİ AÇIKLAMASI:\n${explanation}\n\nOPERATÖR NOTLARI:\n${notes}`;
      }
      
      if (showPaidVisitAmount && paidVisitAmount) {
        finalNotes = `Ücretli ziyaret tutarı: ${paidVisitAmount} TL\n\n${finalNotes}`;
      }

      const { error: visitError } = await supabase.from('visits').update({
        equipment_checks: equipmentChecks,
        pest_types: selectedPestTypes,
        visit_type: selectedVisitTypes[0] || null, 
        notes: finalNotes,
        report_number: reportNumber,
        status: 'completed',
        report_photo_url: uploadedPhotoUrl,
        report_photo_file_path: uploadedPhotoFilePath
      }).eq('id', id);

      if (visitError) throw visitError;

      if (!noPaidProductsUsed) {
        const validPaidItems = paidProductUsage.filter(i => i.productId && i.quantity);
        if (validPaidItems.length > 0) {
          let totalAmount = 0;
          const saleItems = validPaidItems.map(item => {
            const unitPrice = getProductPrice(item.productId);
            const price = parseFloat(item.quantity) * unitPrice;
            totalAmount += price;
            return { product_id: item.productId, quantity: parseFloat(item.quantity), unit_price: unitPrice, total_price: price };
          });

          if (isEditMode && existingSaleId) {
            await supabase.from('paid_material_sale_items').delete().eq('sale_id', existingSaleId);
            await supabase.from('paid_material_sales').update({ total_amount: totalAmount, updated_at: new Date().toISOString() }).eq('id', existingSaleId);
            await supabase.from('paid_material_sale_items').insert(saleItems.map(i => ({ ...i, sale_id: existingSaleId })));
          } else {
            const { data: sale } = await supabase.from('paid_material_sales').insert([{
              customer_id: visit?.customer.id, branch_id: visit?.branch?.id, visit_id: id, sale_date: new Date().toISOString(), total_amount: totalAmount, status: 'pending', created_by: localAuth.getCurrentOperatorId() || (await supabase.auth.getUser()).data.user?.id
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

      if (isEditMode) await supabase.from('biocidal_products_usage').delete().eq('visit_id', id);
      const validBiocidal = biocidalUsage.filter(i => i.productId && i.quantity);
      if (validBiocidal.length > 0) {
        await supabase.from('biocidal_products_usage').insert(validBiocidal.map(i => ({
          visit_id: id, product_id: i.productId, quantity: parseFloat(i.quantity), unit: i.unit, dosage: i.dosage, operator_id: operatorId, customer_id: visit?.customer.id, branch_id: visit?.branch?.id
        })));
      }

      if (sendEmailNotification && visit) {
        const recipients = await getRecipientEmails(visit.customer.id, visit.branch?.id || null);
        const visitDate = new Date(visit.visit_date).toLocaleDateString('tr-TR');
        const customerName = visit.customer.kisa_isim || visit.customer.cari_isim || '';
        const branchName = visit.branch?.sube_adi || '';
        const subject = `Ziyaret Bildirimi - ${customerName} ${branchName} - ${visitDate}`;
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#16a34a;border-bottom:2px solid #16a34a;padding-bottom:10px;">Ziyaret Bildirimi</h2>
            <p><strong>Musteri:</strong> ${customerName}</p>
            ${branchName ? `<p><strong>Sube:</strong> ${branchName}</p>` : ''}
            <p><strong>Tarih:</strong> ${visitDate}</p>
            ${reportNumber ? `<p><strong>Rapor No:</strong> ${reportNumber}</p>` : ''}
            ${explanation ? `<p><strong>Aciklama:</strong> ${explanation}</p>` : ''}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
            <p style="color:#6b7280;font-size:12px;">Bu e-posta Ilaclamatik sistemi tarafindan otomatik olarak gonderilmistir.</p>
          </div>
        `;
        for (const email of recipients) await sendEmail(email, subject, html);
        toast.success('Bildirim e-postasi gonderildi.');
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
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <div className="text-sm text-gray-500 flex justify-between">
          <span>{new Date(visit.visit_date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          <span>{new Date(visit.visit_date).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{visit.customer.kisa_isim}</h1>
        {visit.branch && (
          <div className="text-gray-700 flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="font-medium text-lg">{visit.branch.sube_adi}</span>
            {visit.branch.latitude && (
              <span className="text-green-600 flex items-center text-sm sm:ml-3">
                <MapPin size={16} className="mr-1" />
                <a href={`https://maps.google.com/?q=${visit.branch.latitude},${visit.branch.longitude}`} target="_blank" rel="noreferrer" className="underline">Konuma Git</a>
              </span>
            )}
          </div>
        )}
        {distanceFromPrevious !== null && (
          <div className="bg-blue-50 p-2.5 rounded-lg text-blue-700 text-sm flex items-center border border-blue-100">
            <Navigation size={16} className="mr-2 shrink-0" /> Önceki ziyaretten mesafe: {distanceFromPrevious.toFixed(2)} km
          </div>
        )}
      </div>

      {/* EKİPMANLAR */}
      {visit.branch && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 sm:px-4 py-3 flex justify-between items-center">
            <h2 className="font-semibold text-base sm:text-lg">Ekipman Kontrolleri</h2>
            <button onClick={() => setShowAddEquipmentModal(true)} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 backdrop-blur-sm transition-colors">
              <Tool size={16} /> <span className="hidden sm:inline">Ekipman</span> Ekle
            </button>
          </div>
          <div className="p-3 sm:p-5 space-y-4 sm:space-y-6">
            {Object.keys(groupedEquipment).length === 0 && <p className="text-center text-gray-500 py-8">Bu subede tanimli ekipman bulunmuyor.</p>}
            {Object.entries(groupedEquipment).map(([dept, items]) => {
              const isCollapsed = collapsedDepartments[dept] === true;
              return (
                <div key={dept} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setCollapsedDepartments(prev => ({ ...prev, [dept]: !prev[dept] }))}
                    className="w-full flex items-center justify-between p-3 sm:p-4 hover:bg-gray-100 transition-colors"
                  >
                    <h3 className="font-bold text-gray-800 text-base sm:text-lg flex items-center gap-2">
                      <span className="w-1 h-6 bg-red-500 rounded-full shrink-0"></span>
                      {dept}
                      <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{items.length}</span>
                    </h3>
                    <div className="flex items-center gap-1 text-gray-500">
                      {isCollapsed ? <EyeOff size={18} /> : <Eye size={18} />}
                      {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </div>
                  </button>

                  {!isCollapsed && (
                    <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3">
                      {items.map((item, idx) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                          <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                            <div className="min-w-0">
                              <span className="font-bold text-gray-900 block text-sm sm:text-base truncate">{item.equipment_code}</span>
                              <span className="text-xs text-gray-500">{item.equipment.name}</span>
                            </div>
                            <span className="text-xs font-mono text-gray-400 shrink-0 ml-2">#{idx + 1}</span>
                          </div>

                          <div className="flex flex-col gap-3">
                            {item.equipment.properties ? Object.entries(item.equipment.properties).map(([key, prop]) => (
                              <div key={key} className="flex items-center justify-between gap-2 sm:gap-4">
                                <span className="text-xs sm:text-sm font-medium text-gray-600 min-w-0">{prop.label}</span>
                                <div className="flex-shrink-0">
                                  {prop.type === 'boolean' ? (
                                    <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg">
                                      <button
                                        type="button"
                                        onClick={() => handleEquipmentCheckChange(item.id, key, 'false')}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                          (equipmentChecks[item.id]?.[key] === 'false' || !equipmentChecks[item.id]?.[key])
                                            ? 'bg-white text-green-700 shadow-sm border border-gray-200'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                      >
                                        Yok
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleEquipmentCheckChange(item.id, key, 'true')}
                                        className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                                          equipmentChecks[item.id]?.[key] === 'true'
                                            ? 'bg-red-500 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                      >
                                        Var
                                      </button>
                                    </div>
                                  ) : prop.type === 'number' ? (
                                    <input
                                      type="number"
                                      className="border border-gray-300 rounded-lg w-16 sm:w-20 text-center py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                      value={equipmentChecks[item.id]?.[key] !== undefined ? equipmentChecks[item.id]?.[key] : 0}
                                      onChange={(e) => handleEquipmentCheckChange(item.id, key, parseFloat(e.target.value))}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      className="border border-gray-300 rounded-lg w-full min-w-[100px] sm:min-w-[120px] py-1.5 sm:py-2 px-2 sm:px-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                      value={equipmentChecks[item.id]?.[key] || 'Normal'}
                                      onChange={(e) => handleEquipmentCheckChange(item.id, key, e.target.value)}
                                    />
                                  )}
                                </div>
                              </div>
                            )) : <span className="text-xs text-gray-400 italic">Ozellik yok</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SEÇENEKLER & ZARARLILAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <h3 className="font-bold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100 text-base sm:text-lg">Ziyaret Turu</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {visitTypes.map(t => (
              <label key={t.id} className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all ${selectedVisitTypes.includes(t.id) ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 rounded focus:ring-red-500"
                  checked={selectedVisitTypes.includes(t.id)}
                  onChange={() => handleVisitTypeChange(t.id)}
                />
                <span className={`text-xs sm:text-sm font-medium ${selectedVisitTypes.includes(t.id) ? 'text-red-700' : 'text-gray-700'}`}>{t.label}</span>
              </label>
            ))}
          </div>
          {showPaidVisitAmount && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Ücretli Ziyaret Tutarı (TL)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                className="w-full border border-gray-300 rounded-lg p-3 text-lg font-semibold focus:ring-2 focus:ring-red-500 outline-none"
                value={paidVisitAmount}
                onChange={(e) => setPaidVisitAmount(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <h3 className="font-bold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100 text-base sm:text-lg">Hedef Zararlilar</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {pestTypes.map(t => (
              <label key={t.id} className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all ${selectedPestTypes.includes(t.id) ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
                <input
                  type="checkbox"
                  className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 rounded focus:ring-orange-500"
                  checked={selectedPestTypes.includes(t.id)}
                  onChange={() => handlePestTypeChange(t.id)}
                />
                <span className={`text-xs sm:text-sm font-medium ${selectedPestTypes.includes(t.id) ? 'text-orange-800' : 'text-gray-700'}`}>{t.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* YOĞUNLUK */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <h3 className="font-bold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100 text-base sm:text-lg">Populasyon Yogunlugu</h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {densityOptions.map(o => (
            <label key={o.id} className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border cursor-pointer transition-all ${density === o.id ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}>
              <input type="radio" name="density" className="sr-only" checked={density === o.id} onChange={() => setDensity(o.id)} />
              <span className={`text-xs sm:text-sm font-bold ${density === o.id ? 'text-blue-700' : 'text-gray-600'}`}>{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* BİYOSİDAL ÜRÜNLER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="mb-3 sm:mb-4 pb-2 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base sm:text-lg">Biyosidal Urunler</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          {biocidalUsage.map((item, idx) => (
            <div key={idx} className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 relative">
              {idx > 0 && <button onClick={() => removeBiocidalProduct(idx)} className="absolute top-2 right-2 text-red-500 bg-white p-1.5 rounded-full shadow-sm hover:bg-red-50 z-10"><Trash size={16}/></button>}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Urun</label>
                  <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value={item.productId} onChange={(e) => handleBiocidalChange(idx, 'productId', e.target.value)}>
                    <option value="">Seciniz</option>
                    {biocidalProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Miktar</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2 sm:p-2.5 text-sm" value={item.quantity} onChange={(e) => handleBiocidalChange(idx, 'quantity', e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Birim</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2 sm:p-2.5 text-sm" value={item.unit} onChange={(e) => handleBiocidalChange(idx, 'unit', e.target.value)} placeholder="lt/kg" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Doz</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg p-2 sm:p-2.5 text-sm" value={item.dosage} onChange={(e) => handleBiocidalChange(idx, 'dosage', e.target.value)} placeholder="Doz" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addBiocidalProduct}
            className="w-full border-2 border-dashed border-blue-300 text-blue-600 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-400 transition-all active:scale-[0.98]"
          >
            <Plus size={20} /> Biyosidal Urun Ekle
          </button>
        </div>
      </div>

      {/* ÜCRETLİ ÜRÜNLER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="mb-3 sm:mb-4 pb-2 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 text-base sm:text-lg">Ucretli Malzemeler</h3>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 text-gray-600 rounded" checked={noPaidProductsUsed} onChange={(e) => { setNoPaidProductsUsed(e.target.checked); if(e.target.checked) setPaidProductUsage([{productId:'', quantity:''}]); }} />
            <span className="font-medium text-gray-700">Ucretli urun kullanilmadi</span>
          </label>
        </div>

        {!noPaidProductsUsed && (
          <div className="space-y-3">
            {paidProductUsage.map((item, idx) => (
              <div key={idx} className="bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200 relative">
                {idx > 0 && <button onClick={() => removePaidProduct(idx)} className="absolute top-2 right-2 text-red-500 bg-white p-1.5 rounded-full shadow-sm hover:bg-red-50 z-10"><Trash size={16}/></button>}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Malzeme Adi</label>
                    <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value={item.productId} onChange={(e) => handlePaidProductChange(idx, 'productId', e.target.value)}>
                      <option value="">Seciniz</option>
                      {paidProducts.map(p => {
                        const customPrice = customerProductPrices.get(p.id);
                        return <option key={p.id} value={p.id}>{p.name} - {(customPrice ?? p.price).toLocaleString('tr-TR')} TL{customPrice !== undefined ? ' (Ozel)' : ''}</option>;
                      })}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Adet</label>
                    <div className="flex">
                      <input type="text" className="w-full border border-gray-300 rounded-l-lg p-2.5 text-sm" value={item.quantity} onChange={(e) => handlePaidProductChange(idx, 'quantity', e.target.value)} placeholder="0" />
                      <span className="bg-gray-200 border border-gray-300 border-l-0 rounded-r-lg px-3 flex items-center text-xs font-medium text-gray-600 min-w-[3rem] justify-center">
                        {paidProducts.find(p => p.id === item.productId)?.unit_type || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addPaidProduct}
              className="w-full border-2 border-dashed border-green-300 text-green-600 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-50 hover:border-green-400 transition-all active:scale-[0.98]"
            >
              <Plus size={20} /> Ucretli Malzeme Ekle
            </button>
          </div>
        )}
      </div>

      {/* NOTLAR, AÇIKLAMA, RAPOR NO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 space-y-4 sm:space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Aciklamalar (Musteriye Gider)
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30"
            rows={3}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Otomatik olusturulur, duzenleyebilirsiniz..."
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Notlar (Sadece Operator)</label>
          <textarea className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm focus:ring-2 focus:ring-gray-500 outline-none" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sirket ici notlar..."></textarea>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Baslama</label><input type="time" className="w-full border border-gray-300 rounded-lg p-2 sm:p-2.5 text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Bitis</label><input type="time" className="w-full border border-gray-300 rounded-lg p-2 sm:p-2.5 text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-800 mb-1">Faaliyet Rapor No <span className="text-red-500">*</span></label>
          <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-base sm:text-lg font-mono tracking-wide focus:ring-2 focus:ring-green-500 outline-none" required value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} placeholder="Rapor numarasi..." />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Rapor Fotografi</label>
          <div className="flex gap-3 items-start">
            <button
              onClick={() => setShowPhotoCaptureModal(true)}
              className="flex-1 border-2 border-dashed border-gray-300 p-4 sm:p-6 rounded-xl flex flex-col justify-center items-center gap-2 text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-[0.98]"
            >
              <Camera size={28} className="text-gray-400" />
              <span className="text-sm font-medium">Fotograf Ekle</span>
            </button>
            {reportPhotoPreview && (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                <img src={reportPhotoPreview} className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-200" alt="Preview" />
                <button onClick={() => { setReportPhotoFile(null); setReportPhotoPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md"><CloseIcon size={14}/></button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 text-green-600 rounded focus:ring-green-500" checked={sendEmailNotification} onChange={(e) => setSendEmailNotification(e.target.checked)} />
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2"><Mail size={16}/> Musteriye bildirim e-postasi gonder</span>
          </label>
        </div>
      </div>

      <button 
        onClick={saveVisit} 
        disabled={loading} 
        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98] mb-12"
      >
        {loading ? 'İşleniyor...' : isEditMode ? 'GÜNCELLE' : 'ZİYARETİ TAMAMLA'}
      </button>

      <AddEquipmentModal isOpen={showAddEquipmentModal} onClose={() => setShowAddEquipmentModal(false)} branchId={visit?.branch?.id || ''} onSave={() => visit?.branch?.id && fetchBranchEquipment(visit.branch.id)} />
      
      <PhotoCaptureModal 
        isOpen={showPhotoCaptureModal} 
        onClose={() => setShowPhotoCaptureModal(false)} 
        onCapture={handlePhotoCapture}
      />
    </div>
  );
};

export default VisitDetails;