import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Award, 
  Calendar, 
  Box, 
  FileText, 
  Save, 
  Printer,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Sertifika Seçenekleri
const CERTIFICATES = [
  { id: 'brc', label: 'BRC Food Safety' },
  { id: 'iso22000', label: 'ISO 22000' },
  { id: 'aib', label: 'AIB International' },
  { id: 'haccp', label: 'HACCP' },
  { id: 'tse', label: 'TSE Hizmet Yeterlilik' },
  { id: 'ifs', label: 'IFS Food' },
];

// Ekipman Tipleri
const EQUIPMENT_TYPES = [
  { id: 'kemirgen', label: 'Kemirgen İstasyonu (Rodent Station)' },
  { id: 'yuruyen', label: 'Yürüyen Haşere Monitörü' },
  { id: 'efc', label: 'EFC (Sinek Cihazı)' },
  { id: 'feromon', label: 'Feromon Tuzağı (Güve vb.)' },
];

const SatisGorusmeFormu: React.FC = () => {
  const [formData, setFormData] = useState({
    customerName: '',
    contactPerson: '',
    phone: '',
    branchCount: '',
    squareMeters: '',
    visitFrequency: 'monthly',
    certificates: [] as string[],
    equipments: {
      kemirgen: 0,
      yuruyen: 0,
      efc: 0,
      feromon: 0
    } as Record<string, number>,
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCertificateToggle = (certId: string) => {
    setFormData(prev => {
      const current = prev.certificates;
      if (current.includes(certId)) {
        return { ...prev, certificates: current.filter(c => c !== certId) };
      } else {
        return { ...prev, certificates: [...current, certId] };
      }
    });
  };

  const handleEquipmentChange = (id: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      equipments: {
        ...prev.equipments,
        [id]: parseInt(value) || 0
      }
    }));
  };

  // Toplam Ekipman Sayısı
  const totalEquipment = Object.values(formData.equipments).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 min-h-screen bg-slate-50 font-sans">
      
      {/* Üst Başlık */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Satış Görüşme & Keşif Formu
          </h1>
          <p className="text-slate-500 mt-1">Yeni müşteri görüşmesi sırasında alınan notlar ve saha verileri.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition shadow-sm" onClick={() => window.print()}>
            <Printer size={18} />
            Yazdır / PDF
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm">
            <Save size={18} />
            Kaydet ve Teklif Oluştur
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SOL KOLON: VERİ GİRİŞ FORMU */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Müşteri Temel Bilgileri */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={20} className="text-blue-500" />
              İşletme Bilgileri
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Müşteri / Firma Adı</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  placeholder="Örn: Örnek Gıda San. Tic. A.Ş."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Yetkili Kişi</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder="Ad Soyad"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Telefon / İletişim</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="05XX..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Saha & Operasyon Detayları */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-orange-500" />
              Saha Detayları
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Toplam Alan (m²)</label>
                <div className="relative">
                  <input
                    type="number"
                    name="squareMeters"
                    value={formData.squareMeters}
                    onChange={handleInputChange}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none pl-3 pr-8"
                  />
                  <span className="absolute right-3 top-3 text-slate-400 text-sm">m²</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Şube Sayısı (Opsiyonel)</label>
                <input
                  type="number"
                  name="branchCount"
                  value={formData.branchCount}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ziyaret Sıklığı</label>
                <select
                  name="visitFrequency"
                  value={formData.visitFrequency}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="weekly">Haftalık</option>
                  <option value="biweekly">15 Günde Bir</option>
                  <option value="monthly">Aylık</option>
                  <option value="bimonthly">2 Ayda Bir</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Sertifikalar */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Award size={20} className="text-purple-500" />
              Kalite & Uyumluluk Sertifikaları
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {CERTIFICATES.map((cert) => (
                <div 
                  key={cert.id}
                  onClick={() => handleCertificateToggle(cert.id)}
                  className={`cursor-pointer p-3 rounded-lg border flex items-center gap-3 transition-all ${
                    formData.certificates.includes(cert.id) 
                      ? 'bg-purple-50 border-purple-200 text-purple-700' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    formData.certificates.includes(cert.id) ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'
                  }`}>
                    {formData.certificates.includes(cert.id) && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <span className="text-sm font-medium">{cert.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Ekipman Keşfi */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Box size={20} className="text-emerald-500" />
              Öngörülen Ekipman Sayıları
            </h2>
            <div className="space-y-4">
              {EQUIPMENT_TYPES.map((eq) => (
                <div key={eq.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-700 font-medium">{eq.label}</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      value={formData.equipments[eq.id]}
                      onChange={(e) => handleEquipmentChange(eq.id, e.target.value)}
                      className="w-24 p-2 text-center border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-sm text-slate-400 w-8">Adet</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Notlar */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Görüşme Notları</h2>
            <textarea
              name="notes"
              rows={4}
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="İşletmenin özel istekleri, haşere geçmişi, kritik noktalar..."
            ></textarea>
          </div>

        </div>

        {/* SAĞ KOLON: RAPOR ÖNİZLEME (Canlı) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 p-6 text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold font-oswald tracking-wide">KEŞİF ÖZETİ</h3>
                    <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString('tr-TR')} Tarihli Görüşme</p>
                  </div>
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                    <FileText className="text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Müşteri */}
                <div className="pb-6 border-b border-dashed border-slate-200">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">MÜŞTERİ</span>
                  {formData.customerName ? (
                    <h4 className="text-xl font-bold text-slate-800">{formData.customerName}</h4>
                  ) : (
                    <span className="text-slate-300 italic">Firma adı girilmedi...</span>
                  )}
                  {formData.contactPerson && (
                    <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {formData.contactPerson}
                    </p>
                  )}
                </div>

                {/* Özet Metrikler */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block mb-1">İşletme Alanı</span>
                    <span className="text-lg font-bold text-slate-800">
                      {formData.squareMeters ? `${formData.squareMeters} m²` : '-'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block mb-1">Ziyaret Periyodu</span>
                    <span className="text-lg font-bold text-slate-800 capitalize">
                      {formData.visitFrequency === 'weekly' ? 'Haftalık' : 
                       formData.visitFrequency === 'biweekly' ? '15 Günlük' :
                       formData.visitFrequency === 'monthly' ? 'Aylık' : '2 Aylık'}
                    </span>
                  </div>
                </div>

                {/* Sertifikalar */}
                {formData.certificates.length > 0 && (
                  <div className="pb-6 border-b border-dashed border-slate-200">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">TALEP EDİLEN STANDARTLAR</span>
                    <div className="flex flex-wrap gap-2">
                      {formData.certificates.map(certId => {
                        const cert = CERTIFICATES.find(c => c.id === certId);
                        return (
                          <span key={certId} className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                            {cert?.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ekipman Özeti */}
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">EKİPMAN KURULUM PLANI</span>
                  {totalEquipment > 0 ? (
                    <ul className="space-y-3">
                      {Object.entries(formData.equipments).map(([key, count]) => {
                        if (count === 0) return null;
                        const label = EQUIPMENT_TYPES.find(e => e.id === key)?.label;
                        return (
                          <li key={key} className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 truncate pr-4">{label}</span>
                            <span className="font-bold text-slate-900 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                              {count} Adet
                            </span>
                          </li>
                        );
                      })}
                      <li className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center font-bold text-slate-800">
                        <span>TOPLAM EKİPMAN</span>
                        <span>{totalEquipment} Adet</span>
                      </li>
                    </ul>
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      Ekipman verisi girilmedi.
                    </div>
                  )}
                </div>

                {/* Bilgi Notu */}
                <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 flex gap-2 items-start">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>Bu rapor ön keşif amaçlıdır. Nihai teklif, uzman ekiplerimizin detaylı saha incelemesi ve risk analizinden sonra netleşecektir.</p>
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SatisGorusmeFormu;