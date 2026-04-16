import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Customer } from '../../types';
import CustomerBranches from './CustomerBranches';
import CustomerOffers from './CustomerOffers';
import CustomerTreatments from './CustomerTreatments';
import CustomerDocuments from './CustomerDocuments';
import BranchEquipment from '../Branches/BranchEquipment';

const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'branches' | 'offers' | 'treatments' | 'documents' | 'equipment'>('branches');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;
  if (!customer) return <div>Müşteri bulunamadı</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{customer.kisa_isim}</h1>
          <p className="text-gray-500">Cari No: {customer.musteri_no}</p>
          {customer.cari_isim && (
            <p className="text-gray-500">Cari İsim: {customer.cari_isim}</p>
          )}
        </div>
        <button
          onClick={() => navigate('/musteriler')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ← Geri
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">İletişim Bilgileri</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Telefon:</span> {customer.telefon || '-'}</p>
              <p><span className="font-medium">E-posta:</span> {customer.email || '-'}</p>
              <p><span className="font-medium">Adres:</span> {customer.adres || '-'}</p>
              <p><span className="font-medium">Şehir:</span> {customer.sehir || '-'}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Hesap Bilgileri</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Kayıt Tarihi:</span> {new Date(customer.created_at).toLocaleDateString('tr-TR')}</p>
              <p><span className="font-medium">Son Güncelleme:</span> {new Date(customer.updated_at).toLocaleDateString('tr-TR')}</p>
              {customer.tax_office && (
                <p><span className="font-medium">Vergi Dairesi:</span> {customer.tax_office}</p>
              )}
              {customer.tax_number && (
                <p><span className="font-medium">Vergi Numarası:</span> {customer.tax_number}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('branches')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'branches'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Şubeler
            </button>
            <button
              onClick={() => setActiveTab('offers')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'offers'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Teklifler
            </button>
            <button
              onClick={() => setActiveTab('treatments')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'treatments'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Ziyaretler
            </button>
            <button
              onClick={() => setActiveTab('equipment')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'equipment'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Ekipmanlar
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'documents'
                  ? 'border-b-2 border-green-500 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dökümanlar
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'branches' && <CustomerBranches customerId={customer.id} />}
          {activeTab === 'offers' && <CustomerOffers customerId={customer.id} />}
          {activeTab === 'treatments' && <CustomerTreatments customerId={customer.id} />}
          {activeTab === 'equipment' && <BranchEquipment customerId={customer.id} />}
          {activeTab === 'documents' && <CustomerDocuments customerId={customer.id} />}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;