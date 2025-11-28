import React, { useState, useEffect } from 'react';
import { X, Calendar, User, MapPin, FileText, CheckCircle, AlertTriangle, Package, Activity, AlertCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

interface VisitDetailsModalProps {
  visit: any; // Esneklik için any kullanıyoruz, içeride kontrol edeceğiz
  onClose: () => void;
}

const VisitDetailsModal: React.FC<VisitDetailsModalProps> = ({ visit, onClose }) => {
  const [activeTab, setActiveTab] = useState<'genel' | 'ekipman' | 'malzeme'>('genel');
  const [equipmentNames, setEquipmentNames] = useState<Record<string, string>>({});
  const [loadingEq, setLoadingEq] = useState(false);

  // Ziyaret yüklendiğinde, ekipman isimlerini veritabanından çek (ID -> İsim eşleşmesi için)
  useEffect(() => {
    const fetchEquipmentNames = async () => {
      if (!visit?.equipment_checks || Object.keys(visit.equipment_checks).length === 0) return;
      if (!visit.branch_id && !visit.branch?.id) return;

      setLoadingEq(true);
      try {
        // Kontrol edilen ekipmanların ID'lerini al
        const equipmentIds = Object.keys(visit.equipment_checks);
        
        // Bu ID'lerin isimlerini branch_equipment tablosundan çek
        const { data, error } = await supabase
          .from('branch_equipment')
          .select('id, equipment_code, equipment:equipment_id(name)')
          .in('id', equipmentIds);

        if (data) {
          const names: Record<string, string> = {};
          data.forEach((item: any) => {
            names[item.id] = `${item.equipment?.name} (${item.equipment_code})`;
          });
          setEquipmentNames(names);
        }
      } catch (error) {
        console.error("Ekipman isimleri çekilemedi", error);
      } finally {
        setLoadingEq(false);
      }
    };

    fetchEquipmentNames();
  }, [visit]);

  if (!visit) return null;

  // Güvenli Veri Erişimleri
  const customerName = visit.customer?.kisa_isim || visit.customer_name || 'Müşteri Bilgisi Yok';
  const branchName = visit.branch?.sube_adi || visit.branch_name || '-';
  const operatorName = visit.operator?.name || visit.operator_name || '-';
  const visitDate = visit.visit_date && isValid(new Date(visit.visit_date)) 
    ? format(new Date(visit.visit_date), 'dd MMMM yyyy HH:mm', { locale: tr }) 
    : 'Tarih Yok';
  
  const statusColors = {
    completed: 'bg-green-100 text-green-800 border-green-200',
    planned: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200'
  };

  const statusText = {
    completed: 'Tamamlandı',
    planned: 'Planlandı',
    cancelled: 'İptal Edildi'
  };

  const currentStatus = (visit.status as keyof typeof statusColors) || 'planned';

  // Ekipman Kontrol Verilerini Düzenle
  const equipmentCheckList = visit.equipment_checks 
    ? Object.entries(visit.equipment_checks).map(([id, data]: [string, any]) => ({
        id,
        name: equipmentNames[id] || 'Bilinmeyen Ekipman',
        status: data.status || data.check_status || '-',
        details: data
      }))
    : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{customerName}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <MapPin size={14} />
              <span>{branchName}</span>
              <span className="mx-1">•</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[currentStatus]}`}>
                {statusText[currentStatus]}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b px-6 bg-white sticky top-[80px] z-10">
          <button 
            onClick={() => setActiveTab('genel')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'genel' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <FileText size={16} /> Genel Bilgiler
          </button>
          <button 
            onClick={() => setActiveTab('ekipman')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ekipman' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Activity size={16} /> Ekipman Kontrolleri
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">{equipmentCheckList.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('malzeme')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'malzeme' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Package size={16} /> Kullanılan Malzemeler
            <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
              {(visit.paid_materials?.length || 0) + (visit.biocidal_products?.length || 0)}
            </span>
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto bg-gray-50/50 flex-1">
          
          {/* TAB 1: GENEL BİLGİLER */}
          {activeTab === 'genel' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Ziyaret Detayları</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Calendar size={16}/></div>
                      <div>
                        <p className="text-xs text-gray-500">Tarih</p>
                        <p className="text-sm font-medium text-gray-900">{visitDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><User size={16}/></div>
                      <div>
                        <p className="text-xs text-gray-500">Operatör</p>
                        <p className="text-sm font-medium text-gray-900">{operatorName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600"><FileText size={16}/></div>
                      <div>
                        <p className="text-xs text-gray-500">Rapor No</p>
                        <p className="text-sm font-medium text-gray-900 font-mono">{visit.report_number || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Notlar & Tür</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Ziyaret Türü</p>
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border">
                        {Array.isArray(visit.visit_type) ? visit.visit_type.join(', ') : visit.visit_type || 'Belirtilmemiş'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Ziyaret Notları</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded border min-h-[60px]">
                        {visit.notes || 'Not girilmemiş.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hedef Zararlılar */}
              {visit.pest_types && visit.pest_types.length > 0 && (
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Hedef Zararlılar</h3>
                  <div className="flex flex-wrap gap-2">
                    {visit.pest_types.map((pest: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 bg-red-50 text-red-700 text-sm rounded-full border border-red-100 flex items-center gap-1">
                        <AlertCircle size={12}/> {pest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EKİPMAN KONTROLLERİ */}
          {activeTab === 'ekipman' && (
            <div className="space-y-4">
              {loadingEq ? (
                <div className="text-center py-8 text-gray-500">Ekipman bilgileri yükleniyor...</div>
              ) : equipmentCheckList.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                  <Activity className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Ekipman Kontrolü Yok</h3>
                  <p className="mt-1 text-sm text-gray-500">Bu ziyarette herhangi bir ekipman kontrol verisi girilmemiş.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {equipmentCheckList.map((item, index) => {
                    // Durum Rengi Belirleme
                    const hasIssue = 
                      item.status === 'issue' || item.status === 'problem' || item.status === 'missing' ||
                      item.details.activity === true || item.details.activity === 'var';
                    
                    return (
                      <div key={index} className={`bg-white p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm transition-colors ${hasIssue ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 p-2 rounded-full ${hasIssue ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {hasIssue ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{item.name}</h4>
                            <p className="text-xs text-gray-500 font-mono">{item.id}</p>
                            
                            {/* Detaylar */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(item.details).map(([key, val], i) => {
                                if (key === 'status' || key === 'check_status') return null; // Zaten yukarıda ikonla gösterdik
                                return (
                                  <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border">
                                    <span className="font-semibold capitalize">{key}:</span> {String(val)}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end min-w-[100px]">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${hasIssue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {hasIssue ? 'Sorunlu / Aktivite' : 'Temiz / Normal'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MALZEMELER */}
          {activeTab === 'malzeme' && (
            <div className="space-y-6">
              {/* Biyosidal Ürünler */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                  Biyosidal Ürün Kullanımı (Sarf)
                </h3>
                {(!visit.biocidal_products || visit.biocidal_products.length === 0) ? (
                  <p className="text-sm text-gray-500 italic ml-4">Kayıt yok.</p>
                ) : (
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                        <tr>
                          <th className="px-4 py-2">Ürün Adı</th>
                          <th className="px-4 py-2">Miktar</th>
                          <th className="px-4 py-2">Birim</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {visit.biocidal_products.map((prod: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{prod.product_name || prod.name}</td>
                            <td className="px-4 py-2 font-bold">{prod.amount || prod.quantity}</td>
                            <td className="px-4 py-2 text-gray-500">{prod.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Ücretli Satışlar */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Ücretli Malzeme / Ekipman Satışı
                </h3>
                {(!visit.paid_materials || visit.paid_materials.length === 0) ? (
                  <p className="text-sm text-gray-500 italic ml-4">Satış yok.</p>
                ) : (
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                        <tr>
                          <th className="px-4 py-2">Ürün</th>
                          <th className="px-4 py-2">Adet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {visit.paid_materials.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2">{item.product?.name || 'Ürün'}</td>
                            <td className="px-4 py-2 font-bold">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm text-sm font-medium"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};

export default VisitDetailsModal;