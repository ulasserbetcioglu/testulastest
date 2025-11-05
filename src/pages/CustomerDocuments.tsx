import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DocumentList from '../components/Documents/DocumentList';

const CustomerDocuments: React.FC = () => {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerId();
  }, []);

  const fetchCustomerId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;
      setCustomerId(data.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;
  if (!customerId) return <div>Müşteri bilgisi bulunamadı</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">DÖKÜMANLAR</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <h2 className="px-6 py-3 text-lg font-medium">Müşteri Dökümanları</h2>
        </div>

        <div className="p-6">
          <DocumentList entityType="customer" entityId={customerId} />
        </div>
      </div>
    </div>
  );
};

export default CustomerDocuments;