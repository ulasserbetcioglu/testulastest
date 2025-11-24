import React, { useEffect, useState } from 'react';
import { X, Calendar, User, FileText, AlertCircle, Package, Bug, DollarSign, MapPin, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

interface Visit {
  id: string;
  visit_date: string | null;
  visit_type: string | string[];
  status: string;
  report_number?: string;
  notes?: string;
  equipment_checks?: Record<string, any>;
  pest_types?: string[];
  operator?: { name: string };
  customer?: { kisa_isim: string };
  branch?: { sube_adi: string };
  report_photo_url?: string;
}

interface VisitDetailsModalProps {
  visit: Visit;
  onClose: () => void;
}

const VisitDetailsModal: React.FC<VisitDetailsModalProps> = ({ visit, onClose }) => {
  const [biocidalUsage, setBiocidalUsage] = useState<any[]>([]);
  const [paidMaterials, setPaidMaterials] = useState<any[]>([]);
  const [equipmentNames, setEquipmentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        // 1. Biyosidal Kullanımını Çek
        const { data: biocidalData } = await supabase
          .from('biocidal_products_usage')
          .select(`
            quantity, unit, dosage,
            product:biocidal_products(name, active_ingredient)
          `)
          .eq('visit_id', visit.id);
        
        if (biocidalData) setBiocidalUsage(biocidalData);

        // 2. Ücretli Malzemeleri Çek
        // Not: Tablo ilişkileri daha önce düzeltildiği için burada hata almazsınız
        const { data: paidData } = await supabase
          .from('paid_material_sales')
          .select(`
            total_amount,
            items:paid_material_sale_items(
              quantity, unit_price, total_price,
              product:paid_products(name)
            )
          `)
          .eq('visit_id', visit.id)
          .maybeSingle();
        
        if (paidData) setPaidMaterials(paidData.items || []);

        // 3. Ekipman İsimlerini Çek (ID'den isme çevirmek için)
        if (visit.equipment_checks) {
          const equipmentIds = Object.keys(visit.equipment_checks);
          if (equipmentIds.length > 0) {
            const { data: eqData } = await supabase
              .from('branch_equipment')
              .select('id, equipment_code, equipment:equipment_id(name)')
              .in('id', equipmentIds);
            
            const namesMap: Record<string, string> = {};
            eqData?.forEach((item: any) => {
               namesMap[item.id] = `${item.equipment?.name} (${item.equipment_code})`;
            });
            setEquipmentNames(namesMap);
          }
        }
      } catch (error) {
        console.error("Detaylar yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    if (visit.id) {
      fetchDetails();
    }
  }, [visit]);

  const getVisitTypeText = (type?: string | string[]) => {
    if (!type) return 'Belirtilmemiş';
    if (Array.isArray(type)) return type.join(', ');
    return type;
  };

  // Helper function to format boolean values from equipment checks
  const formatCheckValue = (key: string, val: any) => {
    if (val === true || val === 'true') return 'Evet/Var';
    if (val === false || val === 'false') return 'Hayır/Yok';
    return String(val);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b sticky top-0 bg-white z-10 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ziyaret Raporu Detayı</h2>
            <p className="text-sm text-gray-500 mt-1">
              Rapor No: <span className="font-mono font-medium text-gray-700">{visit.report_number || '-'}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* 1. Temel Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 text-blue-800 font-semibold mb-3">
                <Calendar size={18} /> Ziyaret Bilgileri
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tarih:</span>
                  <span className="font-medium">{visit.visit_date ? format(new Date(visit.visit_date), 'dd MMMM yyyy HH:mm', { locale: tr }) : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tür:</span>
                  <span className="font-medium capitalize">{getVisitTypeText(visit.visit_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Durum:</span>
                  <span className="font-medium capitalize">{visit.status === 'completed' ? 'Tamamlandı' : visit.status}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 text-green-800 font-semibold mb-3">
                <User size={18} /> Müşteri & Operatör
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs">Müşteri:</span>
                  <span className="font-medium block">{visit.customer?.kisa_isim}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Şube:</span>
                  <span className="font-medium block">{visit.branch?.sube_adi || 'Genel Merkez'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Operatör:</span>
                  <span className="font-medium block">{visit.operator?.name || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Notlar ve Açıklamalar */}
          {visit.notes && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FileText size={18} className="text-gray-500" /> Notlar & Açıklamalar
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono text-xs bg-white p-2 rounded border">
                {visit.notes}
              </p>
            </div>
          )}

          {/* 3. Ekipman Kontrolleri */}
          {visit.equipment_checks && Object.keys(visit.equipment_checks).length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-3 font-semibold text-gray-800 flex items-center gap-2">
                <AlertCircle size={18} /> Ekipman Kontrol Sonuçları
              </div>
              <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                {Object.entries(visit.equipment_checks).map(([eqId, checkData]: [string, any]) => (
                  <div key={eqId} className="p-3 hover:bg-gray-50 text-sm">
                    <div className="font-medium text-blue-600 mb-1">
                      {equipmentNames[eqId] || 'Ekipman Yükleniyor...'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(checkData).map(([key, val]) => (
                        <div key={key} className="flex justify-between bg-white p-1.5 rounded border items-center">
                          <span className="text-gray-500 capitalize">{key}:</span>
                          <span className="font-medium">{formatCheckValue(key, val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Pestisit (Biyosidal) Kullanımı */}
          {biocidalUsage.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-3 font-semibold text-red-800 flex items-center gap-2 border-b border-red-100">
                <Bug size={18} /> Pestisit Kullanımı
              </div>
              <table className="w-full text-sm">
                <thead className="bg-red-50/50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Ürün</th>
                    <th className="px-4 py-2 text-left">Etken Madde</th>
                    <th className="px-4 py-2 text-right">Miktar</th>
                    <th className="px-4 py-2 text-right">Doz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {biocidalUsage.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 font-medium">{item.product?.name}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{item.product?.active_ingredient || '-'}</td>
                      <td className="px-4 py-2 text-right font-medium">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{item.dosage || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Ücretli Malzemeler */}
          {paidMaterials.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-yellow-50 px-4 py-3 font-semibold text-yellow-800 flex items-center gap-2 border-b border-yellow-100">
                <DollarSign size={18} /> Satılan Malzemeler
              </div>
              <table className="w-full text-sm">
                <thead className="bg-yellow-50/50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Ürün</th>
                    <th className="px-4 py-2 text-center">Adet</th>
                    <th className="px-4 py-2 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paidMaterials.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 font-medium">{item.product?.name}</td>
                      <td className="px-4 py-2 text-center">{item.quantity}</td>
                      <td className="px-4 py-2 text-right font-semibold">{item.total_price?.toLocaleString()} ₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. Rapor Fotoğrafı */}
          {visit.report_photo_url && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <ImageIcon size={18} className="text-gray-500" /> Rapor Fotoğrafı
              </h3>
              <div className="relative rounded-lg overflow-hidden bg-gray-100 border flex justify-center">
                <img 
                  src={visit.report_photo_url} 
                  alt="Rapor Fotoğrafı" 
                  className="max-h-96 object-contain"
                  loading="lazy"
                />
              </div>
              <div className="mt-2 text-right">
                <a 
                  href={visit.report_photo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm hover:underline flex items-center justify-end gap-1"
                >
                  <ImageIcon size={14}/> Resmi yeni sekmede aç
                </a>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 sticky bottom-0 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium shadow-sm"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};

export default VisitDetailsModal;