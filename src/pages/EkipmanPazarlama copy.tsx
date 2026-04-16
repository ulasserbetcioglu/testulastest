import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Mail, Users, Send, Loader2 as Loader, Package, Check } from 'lucide-react';

// Arayüz (Interface) tanımları
interface Customer {
  id: string;
  kisa_isim: string;
  email: string;
}

interface Equipment {
  id: number;
  name: string;
  price: number | null; // Fiyatın null olabileceğini belirtiyoruz
  unit_type: 'litre' | 'adet' | 'kg';
  image_url: string;
}

interface SelectedEquipment {
    id: number;
    quantity: number;
    price: number;
}

// Standart imza
const signatureHtml = `
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eeeeee;">
    <tr>
      <td style="width: 80px; vertical-align: top;">
        <img src="https://i.imgur.com/PajSpus.png" alt="İlaçlamatik Logo" style="width: 70px; height: auto;">
      </td>
      <td style="vertical-align: top; padding-left: 15px; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-weight: bold; color: #059669; font-size: 14px;">PESTMENTOR</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">
          <a href="http://www.ilaclamatik.com" style="color: #059669; text-decoration: none;">www.ilaclamatik.com</a> | 
          <span style="color: #333333;">0224 233 83 87 - 0533 665 22 51</span>
        </p>
      </td>
    </tr>
  </table>
`;

const EkipmanPazarlama: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<SelectedEquipment[]>([]);
  const [emailSubject, setEmailSubject] = useState('Ekipman ve Malzeme Teklifimiz');
  const [emailPreview, setEmailPreview] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [additionalEmail, setAdditionalEmail] = useState('');

  // Verileri ilk yüklemede çek
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id, kisa_isim, email')
          .not('email', 'is', null)
          .order('kisa_isim');
        if (customerError) throw customerError;
        setCustomers(customerData || []);
        
        const { data: equipmentData, error: equipmentError } = await supabase
          .from('equipment')
          .select('*')
          .order('name');
        if (equipmentError) throw equipmentError;
        setEquipmentList(equipmentData || []);

      } catch (error: any) {
        toast.error('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // E-posta içeriğini oluşturan fonksiyon
  const generateEmailHtml = (customerName: string, selectedItems: (Equipment & { quantity: number, customPrice: number })[]): string => {
    let grandTotal = 0;
    const itemRows = selectedItems.map(item => {
      const price = item.customPrice || 0;
      const quantity = item.quantity || 1;
      const itemTotal = quantity * price;
      grandTotal += itemTotal;
      return `
      <tr style="border-bottom: 1px solid #eeeeee;">
        <td style="padding: 15px;">
          <img src="${item.image_url || 'https://placehold.co/80x80/e2e8f0/334155?text=Görsel'}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
        </td>
        <td style="padding: 15px; vertical-align: middle;">
          <p style="margin: 0; font-weight: bold; font-size: 16px; color: #333;">${item.name}</p>
        </td>
        <td style="padding: 15px; font-size: 14px; text-align: center; vertical-align: middle;">${quantity} ${item.unit_type}</td>
        <td style="padding: 15px; font-size: 14px; text-align: right; vertical-align: middle;">${price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
        <td style="padding: 15px; font-size: 16px; font-weight: bold; color: #059669; text-align: right; vertical-align: middle;">
          ${itemTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
        </td>
      </tr>
    `}).join('');

    return `
      <!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.container{max-width:700px;margin:auto;border:1px solid #eee;padding:20px}.header{background-color:#4f46e5;color:white;padding:10px;text-align:center}h2{margin:0}.content{padding:20px}table{width:100%;border-collapse:collapse}th{background-color:#f2f2f2;text-align:left;padding:10px;font-size:12px;text-transform:uppercase}</style></head><body><div class="container"><div class="header"><h2>Size Özel Ekipman ve Malzeme Teklifimiz</h2></div><div class="content"><p>Merhaba ${customerName},</p><p>İşletmenizin ihtiyaçlarına yönelik olarak hazırladığımız ekipman ve malzeme teklifimiz aşağıda bilgilerinize sunulmuştur.</p><table style="margin-top:20px;margin-bottom:20px"><thead><tr><th>Ürün</th><th>Açıklama</th><th style="text-align:center">Miktar</th><th style="text-align:right">Birim Fiyat</th><th style="text-align:right">Toplam</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr style="border-top: 2px solid #333;"><td colspan="4" style="text-align:right;padding:15px;font-weight:bold;font-size:16px;">GENEL TOPLAM:</td><td style="text-align:right;padding:15px;font-weight:bold;font-size:18px;color:#4f46e5;">${grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td></tr></tfoot></table><p>Detaylı bilgi ve sipariş için bu e-postayı yanıtlayabilir veya bizimle iletişime geçebilirsiniz.Fiyatlara KDV dahil değildir.</p>${signatureHtml}</div></div></body></html>
    `;
  };

  // Seçimler değiştiğinde önizlemeyi otomatik güncelle
  useEffect(() => {
    if (selectedEquipment.length === 0) {
      setEmailPreview('');
      return;
    }
    const selectedItemsWithDetails = selectedEquipment.map(selected => {
        const equipmentDetails = equipmentList.find(item => item.id === selected.id);
        return { ...equipmentDetails, quantity: selected.quantity, customPrice: selected.price };
    });

    const customerName = selectedCustomers.length > 0 
      ? (customers.find(c => c.id === selectedCustomers[0])?.kisa_isim || 'Değerli Müşterimiz') 
      : 'Değerli Müşterimiz';
      
    const html = generateEmailHtml(customerName, selectedItemsWithDetails as any);
    setEmailPreview(html);
  }, [selectedCustomers, selectedEquipment, customers, equipmentList]);

  // E-posta gönderme
  const handleSendEmail = async () => {
    const recipients = customers.filter(c => selectedCustomers.includes(c.id));
    const finalRecipients = [...recipients];

    if (additionalEmail.trim() !== '') {
        if (/^\S+@\S+\.\S+$/.test(additionalEmail.trim())) {
            finalRecipients.push({ id: 'additional', kisa_isim: 'Ek Alıcı', email: additionalEmail.trim() });
        } else {
            toast.error('Lütfen geçerli bir ek e-posta adresi girin.');
            return;
        }
    }

    if (finalRecipients.length === 0) {
      toast.error('Lütfen en az bir alıcı seçin veya ekleyin.');
      return;
    }
    if (!emailSubject || !emailPreview) {
      toast.error('E-posta konusu ve içeriği boş olamaz veya önizleme oluşturulmamış.');
      return;
    }

    toast.info(`${finalRecipients.length} alıcıya e-posta gönderim işlemi başlatıldı...`);
    setIsSending(true);
    
    const sendPromises = finalRecipients.map(recipient => {
      const personalizedBody = emailPreview.replace(/\[Müşteri Adı\]/g, recipient.kisa_isim);
      return supabase.functions.invoke('send-schedule-email', {
        body: { to: recipient.email, subject: emailSubject, html: personalizedBody },
      });
    });

    try {
      const results = await Promise.allSettled(sendPromises);
      const successfulSends = results.filter(r => r.status === 'fulfilled' && !r.value.error).length;
      if (successfulSends > 0) toast.success(`${successfulSends} e-posta başarıyla gönderildi.`);
      if (results.length - successfulSends > 0) toast.error(`${results.length - successfulSends} e-posta gönderilemedi.`);
      
      setSelectedCustomers([]);
      setAdditionalEmail('');
    } catch (error: any) {
      toast.error('E-postalar gönderilirken genel bir hata oluştu: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const totalRecipientCount = selectedCustomers.length + (additionalEmail.trim() !== '' ? 1 : 0);

  // Toplam tutarı hesaplayan useMemo
  const grandTotal = useMemo(() => {
      return selectedEquipment.reduce((total, item) => total + ((item.quantity || 1) * (item.price || 0)), 0);
  }, [selectedEquipment]);

  // Ekipman seçme/kaldırma ve miktar/fiyat güncelleme fonksiyonları
  const handleEquipmentSelect = (item: Equipment, isSelected: boolean) => {
      if (isSelected) {
          // ✅ DÜZELTME: Fiyat null ise 0 olarak ayarla
          setSelectedEquipment(prev => [...prev, { id: item.id, quantity: 1, price: item.price || 0 }]);
      } else {
          setSelectedEquipment(prev => prev.filter(selected => selected.id !== item.id));
      }
  };

  const handleEquipmentUpdate = (id: number, field: 'quantity' | 'price', value: number) => {
      // ✅ DÜZELTME: Gelen değerin geçerli bir sayı olduğundan emin ol
      const numericValue = isNaN(value) ? 0 : value;
      setSelectedEquipment(prev => prev.map(item => item.id === id ? { ...item, [field]: numericValue } : item));
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Package className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-800">Ekipman Pazarlama Modülü</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kontrol Paneli */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
          
          {/* Alıcı Seçimi */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">1. Alıcıları Seçin</label>
            <div className="border rounded-lg max-h-48 overflow-y-auto">
                <div className="p-2 border-b sticky top-0 bg-gray-50">
                    <label className="flex items-center space-x-3 px-2">
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" onChange={() => setSelectedCustomers(prev => prev.length === customers.length ? [] : customers.map(c => c.id))} checked={customers.length > 0 && selectedCustomers.length === customers.length} />
                        <span className="text-sm font-medium text-gray-700">Tümünü Seç ({selectedCustomers.length} / {customers.length})</span>
                    </label>
                </div>
                {customers.map(customer => (
                    <div key={customer.id} className="border-b last:border-b-0">
                        <label className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={selectedCustomers.includes(customer.id)} onChange={() => setSelectedCustomers(prev => prev.includes(customer.id) ? prev.filter(id => id !== customer.id) : [...prev, customer.id])} />
                            <div>
                                <p className="text-sm font-semibold text-gray-900">{customer.kisa_isim}</p>
                                <p className="text-xs text-gray-500">{customer.email}</p>
                            </div>
                        </label>
                    </div>
                ))}
            </div>
            <div className="mt-4">
                <label htmlFor="additional-email" className="block text-sm font-medium text-gray-600 mb-1">Ek Alıcı E-postası (Opsiyonel)</label>
                <input type="email" id="additional-email" value={additionalEmail} onChange={e => setAdditionalEmail(e.target.value)} placeholder="ornek@adres.com" className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          {/* Ekipman Seçimi */}
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-2">2. Ürünleri Seçin ve Düzenleyin</label>
             <div className="border rounded-lg max-h-60 overflow-y-auto">
                {equipmentList.map(item => {
                    const selectedItem = selectedEquipment.find(s => s.id === item.id);
                    return (
                        <div key={item.id} className={`border-b last:border-b-0 p-3 ${selectedItem ? 'bg-indigo-50' : ''}`}>
                            <div className="flex items-center space-x-4">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={!!selectedItem} onChange={(e) => handleEquipmentSelect(item, e.target.checked)} />
                                <img src={item.image_url || 'https://placehold.co/64x64/e2e8f0/334155?text=?'} alt={item.name} className="w-12 h-12 object-cover rounded-md bg-gray-100" />
                                <div className="flex-grow">
                                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                                    <p className="text-xs text-gray-500">Birim: {item.unit_type}</p>
                                </div>
                            </div>
                            {selectedItem && (
                                <div className="grid grid-cols-2 gap-4 mt-3 pl-10">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Miktar</label>
                                        <input 
                                            type="number" 
                                            value={selectedItem.quantity}
                                            onChange={(e) => handleEquipmentUpdate(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                            className="w-full p-1 border rounded-md text-sm"
                                            min="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Birim Fiyat (₺)</label>
                                        <input 
                                            type="number"
                                            value={selectedItem.price}
                                            onChange={(e) => handleEquipmentUpdate(item.id, 'price', parseFloat(e.target.value) || 0)}
                                            className="w-full p-1 border rounded-md text-sm"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
          </div>
          
          {/* Toplam Tutar ve Gönder Butonu */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex justify-between items-center text-lg font-semibold">
                <span>Genel Toplam:</span>
                <span className="text-indigo-600">{grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
            </div>
            <button onClick={handleSendEmail} disabled={isSending || totalRecipientCount === 0 || selectedEquipment.length === 0} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-lg">
                {isSending ? <Loader className="animate-spin" /> : <Send />}
                {isSending ? 'Gönderiliyor...' : `${totalRecipientCount} Alıcıya Gönder`}
            </button>
          </div>
        </div>

        {/* E-posta Önizleme */}
        <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-4">E-posta Önizlemesi</h3>
            <div className="border rounded-lg h-[80vh] overflow-hidden">
                {emailPreview ? (
                    <iframe srcDoc={emailPreview} title="E-posta Önizlemesi" className="w-full h-full border-0" />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-50 text-gray-500">
                        <p>Lütfen göndermek için ürün seçin.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default EkipmanPazarlama;
