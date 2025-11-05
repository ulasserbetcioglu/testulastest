import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Truck, Plus, Trash2, Save, Loader2 as Loader, Search } from 'lucide-react';

// Arayüz (Interface) tanımları
interface Equipment {
  id: number;
  name: string;
  unit_type: 'litre' | 'adet' | 'kg';
  image_url: string | null;
}
interface CartItem {
  id: number;
  name: string;
  quantity: number;
  unit_type: 'litre' | 'adet' | 'kg';
  image_url: string | null;
}

// Standart imza
const signatureHtml = `
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 25px; padding-top: 20px; border-top: 1px solid #eeeeee;">
    <tr>
      <td style="width: 80px; vertical-align: top;">
        <img src="https://i.imgur.com/PajSpus.png" alt="İlaçlamatik Logo" style="width: 70px; height: auto;">
      </td>
      <td style="vertical-align: top; padding-left: 15px; font-family: Arial, sans-serif;">
        <p style="margin: 0; font-weight: bold; color: #059669; font-size: 14px;">SİSTEM İLAÇLAMA SANAYİ VE TİCARET LİMİTED ŞİRKETİ / PESTMENTORı</p>
        <p style="margin: 4px 0; font-size: 12px; color: #555555;">
          <a href="http://www.ilaclamatik.com" style="color: #059669; text-decoration: none;">www.ilaclamatik.com</a>
        </p>
      </td>
    </tr>
  </table>
`;

const TedarikSiparisi: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State'leri
  const [supplierName, setSupplierName] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailPreview, setEmailPreview] = useState('');

  // Verileri ilk yüklemede çek
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('equipment').select('id, name, unit_type, image_url').order('name');
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
  const generateEmailHtml = (supplier: string, cartItems: CartItem[]): string => {
    const itemRows = cartItems.map(item => `
      <tr style="border-bottom: 1px solid #eeeeee;">
        <td style="padding: 10px;">
          <img src="${item.image_url || 'https://placehold.co/64x64/e2e8f0/334155?text=?'}" alt="${item.name}" style="width: 64px; height: 64px; object-fit: cover; border-radius: 8px;">
        </td>
        <td style="padding: 10px; vertical-align: middle;">${item.name}</td>
        <td style="padding: 10px; text-align: center; vertical-align: middle;">${item.quantity} ${item.unit_type}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;color:#333}.container{max-width:700px;margin:auto;border:1px solid #eee;padding:20px}.header{background-color:#1d4ed8;color:white;padding:10px;text-align:center}h2{margin:0}.content{padding:20px}table{width:100%;border-collapse:collapse}th{background-color:#f2f2f2;text-align:left;padding:10px;font-size:12px;text-transform:uppercase}</style></head><body><div class="container"><div class="header"><h2>Satın Alma Siparişi</h2></div><div class="content"><p>Merhaba ${supplier || 'Değerli Tedarikçimiz'},</p><p>Aşağıdaki ürünler ile ilgili siparişimiz bulunmaktadır.</p><table style="margin-top:20px;margin-bottom:20px"><thead><tr><th>Görsel</th><th>Ürün</th><th style="text-align:center">Miktar</th></tr></thead><tbody>${itemRows}</tbody></table><p>Teşekkür ederiz.</p>${signatureHtml}</div></div></body></html>
    `;
  };

  // Sepet veya tedarikçi bilgisi değiştiğinde önizlemeyi güncelle
  useEffect(() => {
    if (cart.length > 0) {
      const html = generateEmailHtml(supplierName, cart);
      setEmailPreview(html);
    } else {
      setEmailPreview('');
    }
  }, [cart, supplierName]);

  // Sepete ürün ekleme
  const addToCart = (item: Equipment) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prev.map(cartItem => 
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartItemQuantity = (id: number, value: number) => {
    const numericValue = isNaN(value) || value < 1 ? 1 : value;
    setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: numericValue } : item));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Siparişi oluştur ve e-posta gönder
  const handleSaveAndSend = async () => {
    if (!supplierName || !supplierEmail) {
      toast.error('Lütfen Tedarikçi Adı ve E-posta alanlarını doldurun.');
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

        const { data: orderData, error: orderError } = await supabase
            .from('purchase_orders')
            .insert({
                supplier_name: supplierName,
                supplier_email: supplierEmail,
                created_by: user.id,
                status: 'pending'
            })
            .select('id')
            .single();

        if (orderError) throw orderError;
        
        const newOrderId = orderData.id;

        const orderItems = cart.map(item => ({
            purchase_order_id: newOrderId,
            equipment_id: item.id,
            quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(orderItems);

        if (itemsError) throw itemsError;

        const { error: emailError } = await supabase.functions.invoke('send-schedule-email', {
            body: {
              to: supplierEmail,
              subject: `Yeni Satın Alma Siparişi - #${newOrderId.substring(0, 8)}`,
              html: emailPreview,
            },
        });

        if(emailError) throw emailError;

        toast.success('Sipariş oluşturuldu ve e-posta başarıyla gönderildi!');
        setCart([]);
        setSupplierName('');
        setSupplierEmail('');

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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Truck className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Tedarikçi Sipariş Modülü</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Panel: Tedarikçi, Ürün ve Sepet */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">1. Tedarikçi Bilgileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Tedarikçi Adı *" className="w-full p-2 border rounded-lg" />
              <input type="email" value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)} placeholder="Tedarikçi E-posta Adresi *" className="w-full p-2 border rounded-lg" />
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
                        <div className="flex items-center gap-4">
                            <img src={item.image_url || 'https://placehold.co/48x48/e2e8f0/334155?text=?'} alt={item.name} className="w-12 h-12 object-cover rounded-md bg-gray-100" />
                            <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-xs text-gray-500">Birim: {item.unit_type}</p>
                            </div>
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
                                <img src={item.image_url || 'https://placehold.co/40x40/e2e8f0/334155?text=?'} alt={item.name} className="w-10 h-10 object-cover rounded-md bg-gray-200" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{item.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" value={item.quantity} onChange={e => updateCartItemQuantity(item.id, parseInt(e.target.value))} className="w-20 p-1 border rounded-md text-center" min="1" />
                                    <span className="text-sm text-gray-600">{item.unit_type}</span>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="border-t pt-4 mt-4">
                <button onClick={handleSaveAndSend} disabled={isSaving || cart.length === 0 || !supplierName || !supplierEmail} className="w-full flex items-center justify-center gap-2 p-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-lg">
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

export default TedarikSiparisi;
