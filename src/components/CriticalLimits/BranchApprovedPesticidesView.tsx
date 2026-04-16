import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Loader2, Download, Bug } from 'lucide-react';
import { format } from 'date-fns';
import { generateApprovedPesticidesPDF } from '../../lib/pdfGenerator';

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
}

interface BranchApprovedPesticidesViewProps {
    branchId: string;
}

const BranchApprovedPesticidesView: React.FC<BranchApprovedPesticidesViewProps> = ({ branchId }) => {
    const [products, setProducts] = useState<BiocidalProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [branchData, setBranchData] = useState<any>(null);
    const [companySettings, setCompanySettings] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, [branchId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Company Settings
            const { data: settings } = await supabase.from('company_settings').select('*').single();
            setCompanySettings(settings);

            // 2. Fetch Branch & Customer Data
            const { data: branch, error: branchError } = await supabase
                .from('branches')
                .select(`
          id, sube_adi, adres, telefon,
          customers (id, kisa_isim, cari_isim, adres, telefon, email)
        `)
                .eq('id', branchId)
                .single();

            if (branchError) throw branchError;
            setBranchData(branch);

            // 3. Fetch Approved Pesticides (Active ones)
            const { data: productsData, error: productsError } = await supabase
                .from('biocidal_products')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (productsError) throw productsError;
            setProducts(productsData || []);

        } catch (error: any) {
            toast.error('Veriler yüklenirken hata oluştu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
        if (products.length === 0) {
            toast.error('İndirilecek kayıt bulunamadı');
            return;
        }

        const loadingToast = toast.loading('PDF hazırlanıyor...');

        try {
            generateApprovedPesticidesPDF({
                products,
                branchData,
                companySettings
            });
            toast.success('PDF başarıyla indirildi');
        } catch (error) {
            console.error('PDF Error:', error);
            toast.error('PDF oluşturulurken bir hata oluştu');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={downloadPDF}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
                >
                    <Download size={18} />
                    PDF İndir
                </button>
            </div>

            {/* VIEW MODE (Scrollable) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <Bug className="text-blue-600" />
                    <h3 className="font-semibold text-gray-800">Onaylı Biyosidal Ürün Listesi</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-100 text-gray-700 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Ticari Adı</th>
                                <th className="px-4 py-3">Aktif Madde</th>
                                <th className="px-4 py-3">Konsantrasyon</th>
                                <th className="px-4 py-3">Hedef Zararlı</th>
                                <th className="px-4 py-3">CAS No</th>
                                <th className="px-4 py-3">Üretici</th>
                                <th className="px-4 py-3">Ruhsat No/Tarih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                                        Kayıt bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-bold text-gray-900">{product.name}</td>
                                        <td className="px-4 py-3">{product.active_ingredient}</td>
                                        <td className="px-4 py-3">{product.concentration}</td>
                                        <td className="px-4 py-3">{product.target_pest}</td>
                                        <td className="px-4 py-3">{product.cas_no}</td>
                                        <td className="px-4 py-3">{product.manufacturer}</td>
                                        <td className="px-4 py-3">
                                            <div>{product.license_number}</div>
                                            <div className="text-xs text-gray-400">{product.license_date ? format(new Date(product.license_date), 'dd.MM.yyyy') : ''}</div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BranchApprovedPesticidesView;
