import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { ShoppingCart, Users, Building, Plus, Trash2, Save, Loader2 as Loader, Search } from 'lucide-react';

// Arayüz (Interface) tanımları
interface Equipment {
  id: number;
  name: string;
  price: number | null;
  unit_type: 'litre' | 'adet' | 'kg';
}
interface CartItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  unit_type: 'litre' | 'adet' | 'kg';
}

// Standart imza
const signatureHtml = `
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eeeeee;">
    <tr>
      <td style="width: 80px; vertical-align: top;">
        <img src="https://i.imgur.com/PajSpus.png" alt="İlaçlamatik Logo" style="width: 70px; height: auto;">
      </td>
      <td style="vertical-align: top; padding-left: 15px; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-weight: bold; color: #059669; font-size: 14px;">İlaçlamatik Ekibi</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">Profesyonel Zararlı Kontrol Çözümleri</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">
          <a href="http://www.ilaclamatik.com.tr" style="color: #059669; text-decoration: none;">www.ilaclamatik.com.tr</a> | 
          <span style="color: #333333;">+90 555 123 4567</span>
        </p>
      </td>
    </tr>
  </table>
`;

const SiparisOlusturma: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State'leri
  const [customerName, setCustomerName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailPreview, setEmailPreview] = useState('');

  // Verileri ilk yüklemede çek
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('equipment').select('id, name, price, unit_type').order('name');
        if (error) throw error;
        setEquipmentList(data || []);
      } catch (error: any) {
        toast.error('Ürün verileri çekilirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // E-posta içeriğini oluşturan fonksiyon
  const generateEmailHtml = (customer: string, branch: string, cartItems: CartItem[]): string => {
    let grandTotal = 0;
    const itemRows = cartItems.map(item => {
      const itemTotal = item.quantity * item.price;
      grandTotal += itemTotal;
      return `
      <tr style="border-bottom: 1px solid #eeeeee;">
        <td style="padding: 15px; vertical-align: middle;">
          <p style="margin: 0; font-weight: bold; font-size: 16px; color: #333;">${item.name}</p>
        </td>
        <td style="padding: 15px; font-size: 14px; text-align: center; vertical-align: middle;">${item.quantity} ${item.unit_type}</td>
        <td style="padding: 15px; font-size: 14px; text-align: right; vertical-align: middle;">${item.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
        <td style="padding: 15px; font-size: 16px; font-weight: bold; color: #059669; text-align: right; vertical-align: middle;">
          ${itemTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
        </td>
      </tr>
    `}).join('');

    return `
      <!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.container{max-width:700px;margin:auto;border:1px solid #eee;padding:20px}.header{background-color:#0284c7;color:white;padding:10px;text-align:center}h2{margin:0}.content{padding:20px}table{width:100%;border-collapse:collapse}th{background-color:#f2f2f2;text-align:left;padding:10px;font-size:12px;text-transform:uppercase}</style></head><body><div class="container"><div class="header"><h2>Sipariş Teklifiniz</h2></div><div class="content"><p>Merhaba ${customer || 'Değerli Müşterimiz'},</p><p>${branch ? `<b>${branch}</b> şubesi için ` : ''}hazırladığımız sipariş teklifimiz aşağıda bilgilerinize sunulmuştur.</p><table style="margin-top:20px;margin-bottom:20px"><thead><tr><th>Ürün</th><th style="text-align:center">Miktar</th><th style="text-align:right">Birim Fiyat</th><th style="text-align:right">Toplam</th></tr></thead><tbody>${itemRows}</tbody><tfoot><tr style="border-top: 2px solid #333;"><td colspan="3" style="text-align:right;padding:15px;font-weight:bold;font-size:16px;">GENEL TOPLAM:</td><td style="text-align:right;padding:15px;font-weight:bold;font-size:18px;color:#0284c7;">${grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td></tr><tr><td colspan="4" style="text-align:right;padding-top: 5px; font-size: 12px; color: #777;"><i>Fiyatlara KDV dahil değildir.</i></td></tr></tfoot></table><p>Detaylı bilgi ve sipariş onayı için bu e-postayı yanıtlayabilir veya bizimle iletişime geçebilirsiniz.</p>${signatureHtml}</div></div></body></html>
    `;
  };

  // Sepet veya müşteri bilgisi değiştiğinde önizlemeyi güncelle
  useEffect(() => {
    if (cart.length > 0) {
      const html = generateEmailHtml(customerName, branchName, cart);
      setEmailPreview(html);
    } else {
      setEmailPreview('');
    }
  }, [cart, customerName, branchName]);

  // Sepete ürün ekleme
  const addToCart = (item: Equipment) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prev.map(cartItem => 
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prev, { ...item, price: item.price || 0, quantity: 1 }];
    });
  };

  const updateCartItem = (id: number, field: 'quantity' | 'price', value: number) => {
    const numericValue = isNaN(value) ? 0 : value;
    setCart(prev => prev.map(item => item.id === id ? { ...item, [field]: numericValue } : item));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Siparişi oluştur ve e-posta gönder
  const handleSaveAndSend = async () => {
    if (!customerName || !recipientEmail) {
      toast.error('Lütfen Müşteri Adı ve Alıcı E-posta alanlarını doldurun.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Lütfen sepete ürün ekleyin.');
      return;
    }
    setIsSaving(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Kullanıcı bulunamadı.");

        const totalAmount = cart.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        // 1. Ana sipariş kaydını oluştur
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                customer_name: customerName,
                branch_name: branchName || null,
                created_by: user.id,
                total_amount: totalAmount,
                status: 'pending'
            })
            .select('id')
            .single();

        if (orderError) throw orderError;
        
        const newOrderId = orderData.id;

        // 2. Sipariş kalemlerini oluştur
        const orderItems = cart.map(item => ({
            order_id: newOrderId,
            equipment_id: item.id,
            quantity: item.quantity,
            unit_price: item.price
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        // 3. E-postayı gönder
        const { error: emailError } = await supabase.functions.invoke('send-schedule-email', {
            body: {
              to: recipientEmail,
              subject: `${customerName} İçin Sipariş Teklifi`,
              html: emailPreview,
            },
        });

        if(emailError) throw emailError;

        toast.success('Sipariş oluşturuldu ve e-posta başarıyla gönderildi!');
        setCart([]);
        setCustomerName('');
        setBranchName('');
        setRecipientEmail('');

    } catch (error: any) {
      toast.error('İşlem sırasında bir hata oluştu: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEquipment = useMemo(() => {
    return equipmentList.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [equipmentList, searchTerm]);
  
  const cartTotal = useMemo(() => {
      return cart.reduce((total, item) => total + (item.quantity * item.price), 0);
  }, [cart]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <ShoppingCart className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Sipariş Oluşturma Modülü</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Panel: Müşteri, Ürün ve Sepet */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">1. Müşteri Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Müşteri Adı *" className="w-full p-2 border rounded-lg" />
              <input type="text" value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="Şube Adı (Opsiyonel)" className="w-full p-2 border rounded-lg" />
            </div>
            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">Alıcı E-posta Adresi *</label>
                <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="musteri@adres.com" className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">2. Ürünleri Sepete Ekle</h2>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Ürün ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 border rounded-lg" />
            </div>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
                {loading ? <div className="text-center p-4">Yükleniyor...</div> :
                filteredEquipment.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border-b last:border-b-0">
                        <div>
                            <p className="font-semibold">{item.name}</p>
                            <p className="text-xs text-gray-500">{(item.price || 0).toLocaleString('tr-TR')} TL / {item.unit_type}</p>
                        </div>
                        <button onClick={() => addToCart(item)} className="p-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200">
                            <Plus size={16} />
                        </button>
                    </div>
                ))}
            </div>
          </div>
          
          <div className="bg-white flex flex-col">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">3. Sipariş Sepeti</h2>
            <div className="flex-grow overflow-y-auto -mx-1 px-1 max-h-60">
                {cart.length === 0 ? (
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg text-gray-500 py-10">
                        <p>Sepetiniz boş.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center gap-4 p-2 bg-gray-50 rounded-lg">
                                <div className="flex-grow">
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-xs text-gray-500">Birim: {item.unit_type}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" value={item.quantity} onChange={e => updateCartItem(item.id, 'quantity', parseInt(e.target.value))} className="w-16 p-1 border rounded-md text-center" min="1" />
                                    <input type="number" value={item.price} onChange={e => updateCartItem(item.id, 'price', parseFloat(e.target.value))} className="w-24 p-1 border rounded-md text-right" step="0.01" />
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="border-t pt-4 mt-4 space-y-4">
                <div className="flex justify-between items-center text-xl font-bold">
                    <span>Genel Toplam:</span>
                    <span className="text-blue-600">{cartTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                </div>
                {/* ✅ DÜZELTME: onClick fonksiyon adı 'handleSaveAndSend' olarak değiştirildi */}
                <button onClick={handleSaveAndSend} disabled={isSaving || cart.length === 0 || !customerName || !recipientEmail} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-lg">
                    {isSaving ? <Loader className="animate-spin" /> : <Save />}
                    {isSaving ? 'Oluşturuluyor...' : 'Siparişi Oluştur ve Gönder'}
                </button>
            </div>
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
                        <p>Sepete ürün eklediğinizde önizleme burada görünecektir.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SiparisOlusturma;
