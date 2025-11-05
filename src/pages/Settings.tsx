import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Save, Upload, Trash } from 'lucide-react';

interface CompanySettings {
  id: number;
  company_name: string;
  tax_office: string;
  tax_number: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  header_text: string;
  footer_text: string;
  logo_url: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings>({
    id: 1,
    company_name: '',
    tax_office: '',
    tax_number: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    header_text: '',
    footer_text: '',
    logo_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchSettings();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found, create default settings
          await createDefaultSettings();
          await fetchSettings();
          return;
        }
        throw error;
      }

      setSettings(data);
      if (data.logo_url) {
        setLogoPreview(data.logo_url);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Ayarlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const { error } = await supabase
        .from('company_settings')
        .insert([
          {
            id: 1,
            company_name: 'İlaçlamatik',
            tax_office: '',
            tax_number: '',
            phone: '',
            email: '',
            address: '',
            website: '',
            header_text: '',
            footer_text: '',
            logo_url: ''
          }
        ]);

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      toast.error('Varsayılan ayarlar oluşturulurken bir hata oluştu');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setSettings({ ...settings, logo_url: '' });
  };

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Bu işlemi gerçekleştirmek için admin yetkisine sahip olmalısınız');
      return;
    }

    try {
      setSaving(true);
      
      // Upload logo if selected
      let logoUrl = settings.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `company-logo-${Date.now()}.${fileExt}`;
        const filePath = `logos/${fileName}`;
        
        try {
          const { error: uploadError } = await supabase.storage
            .from('company-assets')
            .upload(filePath, logoFile);
  
          if (uploadError) {
            if (uploadError.message?.includes('bucket') || uploadError.statusCode === 403) {
              toast.error('Logo yüklenemedi. Yetki hatası. Lütfen admin olarak giriş yaptığınızdan emin olun.');
              return;
            }
            throw uploadError;
          }
  
          const { data } = supabase.storage
            .from('company-assets')
            .getPublicUrl(filePath);
  
          logoUrl = data.publicUrl;
        } catch (err: any) {
          console.error('Logo upload error:', err);
          toast.error('Logo yüklenirken bir hata oluştu');
          return;
        }
      }

      // Update settings
      const { error } = await supabase
        .from('company_settings')
        .update({
          ...settings,
          logo_url: logoUrl
        })
        .eq('id', 1);

      if (error) throw error;

      toast.success('Ayarlar başarıyla kaydedildi');
    } catch (err: any) {
      setError(err.message);
      toast.error('Ayarlar kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">ŞİRKET AYARLARI</h1>
        <button
          onClick={handleSave}
          disabled={saving || !isAdmin}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Save size={20} />
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      {!isAdmin && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700">
            Bu sayfada değişiklik yapmak için admin yetkisine sahip olmalısınız.
          </p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Şirket Logosu
            </label>
            <div className="flex items-start space-x-6">
              <div className="w-40 h-40 border rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-gray-400 text-center p-4">Logo Yok</div>
                )}
              </div>
              <div className="space-y-2">
                <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50">
                  <Upload size={16} className="mr-2" />
                  Logo Yükle
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    disabled={!isAdmin}
                  />
                </label>
                {logoPreview && (
                  <button
                    onClick={handleRemoveLogo}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    disabled={!isAdmin}
                  >
                    <Trash size={16} className="mr-2" />
                    Logoyu Kaldır
                  </button>
                )}
                <p className="text-sm text-gray-500">
                  Önerilen: 200x200 piksel, PNG veya WEBP formatı
                </p>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Şirket Bilgileri</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şirket Adı
            </label>
            <input
              type="text"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={!isAdmin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Web Sitesi
            </label>
            <input
              type="text"
              value={settings.website}
              onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={!isAdmin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon
            </label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={!isAdmin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              E-posta
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={!isAdmin}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adres
            </label>
            <textarea
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              rows={3}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={!isAdmin}
            />
          </div>

          {/* Tax Information */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Vergi Bilgileri</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vergi Dairesi
            </label>
            <input
              type="text"
              value={settings.tax_office}
              onChange={(e) => setSettings({ ...settings, tax_office: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={!isAdmin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vergi Numarası
            </label>
            <input
              type="text"
              value={settings.tax_number}
              onChange={(e) => setSettings({ ...settings, tax_number: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={!isAdmin}
            />
          </div>

          {/* Document Settings */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Doküman Ayarları</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Üst Bilgi Metni
            </label>
            <textarea
              value={settings.header_text}
              onChange={(e) => setSettings({ ...settings, header_text: e.target.value })}
              rows={3}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={!isAdmin}
              placeholder="Raporlar ve dokümanlarda üst bilgi olarak görünecek metin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alt Bilgi Metni
            </label>
            <textarea
              value={settings.footer_text}
              onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
              rows={3}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              disabled={!isAdmin}
              placeholder="Raporlar ve dokümanlarda alt bilgi olarak görünecek metin"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;