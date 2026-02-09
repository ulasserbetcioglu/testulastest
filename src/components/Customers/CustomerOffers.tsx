import React, { useState, useEffect } from 'react';
import { Plus, FileText, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { localAuth } from '../../lib/localAuth'; // Rol kontrolü için ekledik

interface CustomerOffersProps {
  customerId: string;
}

interface Proposal {
  id: string;
  proposal_number: string;
  created_at: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  company_name: string;
}

const CustomerOffers: React.FC<CustomerOffersProps> = ({ customerId }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // YENİ: Kullanıcı yetki kontrolü
  const [canCreate, setCanCreate] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Rol Kontrolü (Buton görünürlüğü için)
    const checkPermission = () => {
        const session = localAuth.getSession();
        // Sadece admin ve operatörler yeni teklif oluşturabilir
        if (session && (session.type === 'admin' || session.type === 'operator')) {
            setCanCreate(true);
        } else {
            setCanCreate(false);
        }
    };

    checkPermission();

    if (customerId) {
      fetchProposals();
    }
  }, [customerId]);

  const fetchProposals = async () => {
    try {
      setLoading(true);

      // A. Önce Müşterinin E-postasını bulalım
      const { data: customerData, error: custError } = await supabase
        .from('customers')
        .select('email')
        .eq('id', customerId)
        .single();

      if (custError) throw custError;
      
      const customerEmail = customerData?.email;

      // B. Teklifleri Çek (Hem ID'ye hem E-postaya göre)
      // Müşteri ID'si eşleşen VEYA Alıcı E-postası eşleşen teklifleri getir
      let query = supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (customerEmail) {
          // Eğer müşterinin e-postası varsa, ID veya Email eşleşmesine bak
          query = query.or(`customer_id.eq.${customerId},recipient_email.eq.${customerEmail}`);
      } else {
          // E-posta yoksa sadece ID'ye bak
          query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProposals(data || []);

    } catch (err: any) {
      console.error('Teklifler çekilirken hata:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            <CheckCircle size={12} /> Onaylandı
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            <XCircle size={12} /> Reddedildi
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            <Clock size={12} /> Beklemede
          </span>
        );
    }
  };

  const handleNavigateToProposal = (id: string) => {
    navigate(`/teklif-goruntule/${id}`);
  };

  const handleCreateNewProposal = () => {
     navigate('/hizmet-pazarlama'); 
  };

  if (loading) return <div className="p-4 text-center text-gray-500">Teklifler yükleniyor...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Hata: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Teklif Geçmişi</h2>
        
        {/* YENİ: Sadece yetkili personel (Admin/Operatör) bu butonu görür */}
        {canCreate && (
            <button 
            onClick={handleCreateNewProposal}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
            <Plus size={16} />
            Yeni Teklif Oluştur
            </button>
        )}
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Bu müşteriye ait henüz bir teklif bulunmuyor.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teklif No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Firma / Kişi
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Toplam Tutar
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{proposal.proposal_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(proposal.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {proposal.company_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {proposal.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(proposal.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleNavigateToProposal(proposal.id)}
                      className="text-blue-600 hover:text-blue-900 flex items-center justify-end gap-1 w-full"
                      title="Detay Görüntüle (Şifre Gerektirir)"
                    >
                      <Eye size={18} /> <span className="hidden sm:inline">Görüntüle</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerOffers;