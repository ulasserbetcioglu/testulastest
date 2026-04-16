
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Save, X, Loader2, Bug } from 'lucide-react';
import { format } from 'date-fns';

// --- INTERFACES ---
interface BiocidalProduct {
    id: string;
    name: string;
    active_ingredient: string;
    concentration: string;
    target_pest: string;
    cas_no: string;
    manufacturer: string;
    license_date: string;
    license_number: string;
    is_active: boolean;
    order_no?: number;
    parasut_id?: number | null;
}

// --- MODAL COMPONENT ---
const ProductModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: BiocidalProduct) => Promise<void>;
    product: BiocidalProduct | null;
}> = ({ isOpen, onClose, onSave, product }) => {
    const [formData, setFormData] = useState<BiocidalProduct>({
        id: '',
        name: '',
        active_ingredient: '',
        concentration: '',
        target_pest: '',
        cas_no: '',
        manufacturer: '',
        license_date: '',
        license_number: '',
        is_active: true,
        parasut_id: null
    });
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    const handleParasutSearch = async () => {
        if (!formData.name || formData.name.length < 3) {
            toast.error('Aramak için en az 3 karakter giriniz.');
            return;
        }

        setSearching(true);
        setShowResults(true);
        try {
            const { data, error: fetchErr } = await supabase.functions.invoke('parasut-fetch', {
                body: { type: 'products', filter_key: 'filter[name]', query: formData.name }
            });

            if (fetchErr) throw fetchErr;
            if (data?.success) {
                setSearchResults(data.data || []);
                if (data.data?.length === 0) toast.info('Sonuç bulunamadı.');
            } else {
                throw new Error(data?.error || 'Arama başarısız');
            }
        } catch (err: any) {
            toast.error('Paraşüt Arama Hatası: ' + err.message);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (product) {
            setFormData(product);
        } else {
            setFormData({
                id: '',
                name: '',
                active_ingredient: '',
                concentration: '',
                target_pest: '',
                cas_no: '',
                manufacturer: '',
                license_date: format(new Date(), 'yyyy-MM-dd'),
                license_number: '',
                is_active: true
            });
        }
    }, [product, isOpen]);

    const handleChange = (field: keyof BiocidalProduct, value: string | boolean | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSave(formData);
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">
                        {product ? 'Pestisit Düzenle' : 'Yeni Pestisit Ekle'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ticari Adı</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Örn: K-Othrine SC 50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Aktif Maddesi</label>
                            <input
                                type="text"
                                value={formData.active_ingredient || ''}
                                onChange={(e) => handleChange('active_ingredient', e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Örn: Deltamethrin"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Konsantrasyon</label>
                            <input
                                type="text"
                                value={formData.concentration || ''}
                                onChange={(e) => handleChange('concentration', e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Örn: %5 SC"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Zararlı</label>
                            <input
                                type="text"
                                value={formData.target_pest || ''}
                                onChange={(e) => handleChange('target_pest', e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Örn: Yürüyen Haşereler"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CAS No</label>
                            <input
                                type="text"
                                value={formData.cas_no || ''}
                                onChange={(e) => handleChange('cas_no', e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Örn: 52918-63-5"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Üretici Firma</label>
                            <input
                                type="text"
                                value={formData.manufacturer || ''}
                                onChange={(e) => handleChange('manufacturer', e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Örn: Bayer"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ruhsat Tarihi</label>
                            <input
                                type="date"
                                value={formData.license_date ? format(new Date(formData.license_date), 'yyyy-MM-dd') : ''}
                                onChange={(e) => handleChange('license_date', e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ruhsat No</label>
                            <input
                                type="text"
                                value={formData.license_number || ''}
                                onChange={(e) => handleChange('license_number', e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Örn: 2011/123"
                            />
                        </div>

                        <div className="col-span-2 flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => handleChange('is_active', e.target.checked)}
                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Bu ürün listede aktif olarak görünsün</label>
                        </div>

                        <div className="col-span-2 p-4 rounded-xl border border-blue-100 bg-blue-50/50 relative mt-2">
                            <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-2">PARAŞÜT ÜRÜN EŞLEŞTİRME</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={formData.parasut_id || ''}
                                    onChange={(e) => handleChange('parasut_id', e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder="Paraşüt ID (Örn: 103011)"
                                    className="flex-1 p-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={handleParasutSearch}
                                    disabled={searching}
                                    className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center min-w-[50px] shadow-sm"
                                >
                                    {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                </button>
                            </div>
                            
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[250px] overflow-auto p-1 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center p-2 border-b mb-1 sticky top-0 bg-white z-10">
                                        <span className="text-[10px] font-black text-gray-400 uppercase">PARAŞÜT SONUÇLARI</span>
                                        <button onClick={() => setShowResults(false)} className="text-gray-400 p-1 hover:bg-gray-100 rounded"><X size={14}/></button>
                                    </div>
                                    {searchResults.map((item: any) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                handleChange('parasut_id', parseInt(item.id));
                                                setShowResults(false);
                                                toast.success('ID başarıyla aktarıldı.');
                                            }}
                                            className="w-full text-left p-3 hover:bg-blue-50 rounded-lg transition-colors flex flex-col gap-0.5 border border-transparent hover:border-blue-100 mb-0.5 group"
                                        >
                                            <span className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{item.name}</span>
                                            <span className="text-[10px] font-mono text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded self-start">ID: {item.id}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            disabled={loading}
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---
const AdminApprovedPesticides: React.FC = () => {
    const [products, setProducts] = useState<BiocidalProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<BiocidalProduct | null>(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('biocidal_products')
                .select('*')
                .order('name');

            if (error) throw error;
            setProducts(data || []);
        } catch (error: any) {
            toast.error('Ürünler yüklenirken hata oluştu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleEdit = (product: BiocidalProduct) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('biocidal_products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Ürün silindi');
            fetchProducts();
        } catch (error: any) {
            toast.error('Silme işlemi başarısız: ' + error.message);
        }
    };

    const handleSave = async (productData: BiocidalProduct) => {
        try {
            const dataToSave = { ...productData };
            if (!dataToSave.id) {
                // @ts-ignore - id is generated by DB or uuid if needed, but supabase handles uuid usually if configured, 
                // strictly speaking we should let DB handle it or generate it. 
                // Definitions.tsx manages IDs manually with uuidv4, so we follow that pattern if insert fails without ID.
                // Actually, biocidal_products usually has default uuid generation. Let's try upsert without ID for new.
                // If ID is empty string, we should remove it to let DB generate.
                delete (dataToSave as any).id;
            }

            const { error } = await supabase
                .from('biocidal_products')
                .upsert(dataToSave)
                .select()
                .single();

            if (error) throw error;

            toast.success('Ürün başarıyla kaydedildi');
            setIsModalOpen(false);
            fetchProducts();
        } catch (error: any) {
            console.error('Save error:', error);
            // Fallback: if it failed because ID is missing and DB doesn't auto-gen (unlikely for new projects but possible)
            // re-try with uuid
            if (error.code === '23502' || error.message.includes('id')) {
                const retryData = { ...productData, id: productData.id || crypto.randomUUID() };
                const { error: retryError } = await supabase.from('biocidal_products').upsert(retryData);
                if (retryError) {
                    toast.error('Kaydetme hatası: ' + retryError.message);
                } else {
                    toast.success('Ürün başarıyla kaydedildi');
                    setIsModalOpen(false);
                    fetchProducts();
                }
            } else {
                toast.error('Kaydetme hatası: ' + error.message);
            }
        }
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.active_ingredient?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Bug className="text-green-600" />
                        Onaylı Pestisit Listesi
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Şubelerde ve müşteri ekranlarında görünecek onaylı biyosidal ürünleri yönetin.
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <Plus size={18} /> Yeni Ürün Ekle
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Ürün adı, aktif madde veya üretici ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="animate-spin text-gray-400" size={32} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-100 text-gray-700 font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Ticari Adı</th>
                                    <th className="px-6 py-3">Aktif Madde</th>
                                    <th className="px-6 py-3">Konsantrasyon</th>
                                    <th className="px-6 py-3">Hedef Zararlı</th>
                                    <th className="px-6 py-3">CAS No</th>
                                    <th className="px-6 py-3">Üretici</th>
                                    <th className="px-6 py-3">Ruhsat Bilgisi</th>
                                    <th className="px-6 py-3">Paraşüt ID</th>
                                    <th className="px-6 py-3 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-gray-400">
                                            Kayıt bulunamadı.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                                            <td className="px-6 py-4">{product.active_ingredient || '-'}</td>
                                            <td className="px-6 py-4">{product.concentration || '-'}</td>
                                            <td className="px-6 py-4">{product.target_pest || '-'}</td>
                                            <td className="px-6 py-4">{product.cas_no || '-'}</td>
                                            <td className="px-6 py-4">{product.manufacturer || '-'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span>{product.license_number}</span>
                                                    <span className="text-xs text-gray-400">
                                                        {product.license_date ? format(new Date(product.license_date), 'dd.MM.yyyy') : '-'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleEdit(product)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        title="Düzenle"
                                                    >
                                                        <Edit size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ProductModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                product={editingProduct}
            />
        </div>
    );
};

export default AdminApprovedPesticides;
