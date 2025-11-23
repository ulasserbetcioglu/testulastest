import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Building, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import type { Branch } from '../types';
import BranchEquipment from '../components/Branches/BranchEquipment';

const CustomerBranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      // 1. Müşteri Kimliğini Belirle
      let customerId: string | null = null;
      const localSession = localAuth.getSession();

      if (localSession && localSession.type === 'customer') {
        customerId = localSession.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('id')
            .eq('auth_id', user.id)
            .single();
          customerId = customerData?.id || null;
        }
      }

      if (!customerId) {
        throw new Error('Müşteri oturumu bulunamadı.');
      }

      // 2. Şubeleri Çek
      const { data, error } = await supabase
        .from('branches')
        .select(`
          *,
          pricing:branch_pricing(*)
        `)
        .eq('customer_id', customerId)
        .order('sube_adi', { ascending: true });

      if (error) throw error;
      setBranches(data || []);

    } catch (err: any) {
      console.error('Şube çekme hatası:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Hata: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Şubelerim</h1>
        <div className="text-sm text-gray-500">
          Toplam {branches.length} şube listeleniyor
        </div>
      </div>

      {branches.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
          Kayıtlı şubeniz bulunmamaktadır.
        </div>
      ) : (
        <div className="grid gap-6">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
              {/* Şube Başlık ve Temel Bilgiler */}
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                      <Building size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{branch.sube_adi}</h3>
                      <span className="text-sm text-gray-500">{branch.sehir}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin size={18} className="mt-1 shrink-0 text-gray-400" />
                    <span className="text-sm">{branch.adres || 'Adres belirtilmemiş'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={18} className="shrink-0 text-gray-400" />
                    <span className="text-sm">{branch.telefon || 'Telefon belirtilmemiş'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={18} className="shrink-0 text-gray-400" />
                    <span className="text-sm">{branch.email || 'E-posta belirtilmemiş'}</span>
                  </div>
                </div>
              </div>

              {/* Alt Aksiyon Barı (Ekipman Göster/Gizle) */}
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={() => setSelectedBranchId(selectedBranchId === branch.id ? null : branch.id)}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors focus:outline-none"
                >
                  {selectedBranchId === branch.id ? (
                    <>
                      <ChevronUp size={16} /> Ekipmanları Gizle
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} /> Ekipmanları Göster
                    </>
                  )}
                </button>
              </div>

              {/* Ekipman Listesi (Toggle) */}
              {selectedBranchId === branch.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50/50 animate-in slide-in-from-top-2">
                  <BranchEquipment branchId={branch.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerBranchesPage;