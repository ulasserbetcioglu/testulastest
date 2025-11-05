import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { FileText, Eye, Loader2 as Loader, KeyRound, Search, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Arayüz (Interface) tanımları
interface Proposal {
  id: string;
  created_at: string;
  proposal_number: string;
  company_name: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  access_password?: string;
}

const TekliflerListesi: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProposals = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setProposals(data || []);
      } catch (error: any) {
        toast.error('Teklifler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    fetchProposals();
  }, []);

  const filteredProposals = useMemo(() => {
    if (!searchTerm) return proposals;
    return proposals.filter(p => 
        p.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.proposal_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [proposals, searchTerm]);

  const handleCopyToClipboard = (password: string) => {
    navigator.clipboard.writeText(password).then(() => {
        toast.success('Şifre panoya kopyalandı!');
    }, (err) => {
        toast.error('Şifre kopyalanamadı.');
        console.error('Kopyalama hatası:', err);
    });
  };

  const StatusBadge = ({ status }: { status: Proposal['status'] }) => {
    const statusMap = {
        pending: { text: 'Beklemede', color: 'bg-yellow-100 text-yellow-800' },
        approved: { text: 'Onaylandı', color: 'bg-green-100 text-green-800' },
        rejected: { text: 'Reddedildi', color: 'bg-red-100 text-red-800' },
    };
    const currentStatus = statusMap[status] || statusMap.pending;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatus.color}`}>{currentStatus.text}</span>;
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
        <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28 ml-auto"></div></td>
        <td className="px-6 py-4 text-center"><div className="h-5 bg-gray-200 rounded-full w-20 mx-auto"></div></td>
        <td className="px-6 py-4 text-center"><div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div></td>
        <td className="px-6 py-4 text-right"><div className="h-6 bg-gray-200 rounded-md w-24 ml-auto"></div></td>
    </tr>
  );

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <FileText className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold text-gray-800">Oluşturulan Teklifler</h1>
        </div>
        <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
                type="text"
                placeholder="Firma veya Teklif No Ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teklif No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firma Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oluşturma Tarihi</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam Tutar</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Şifre</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : filteredProposals.length > 0 ? (
                filteredProposals.map(proposal => (
                  <tr key={proposal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">{proposal.proposal_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{proposal.company_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(proposal.created_at), 'dd MMMM yyyy', { locale: tr })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{(proposal.total_amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={proposal.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2 font-mono text-sm text-gray-600">
                        <KeyRound size={14} className="text-gray-400"/>
                        <span>{proposal.access_password || '-'}</span>
                        {proposal.access_password && (
                            <button onClick={() => handleCopyToClipboard(proposal.access_password!)} className="text-gray-400 hover:text-blue-600" title="Şifreyi Kopyala">
                                <Copy size={14} />
                            </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => navigate(`/teklif-goruntule/${proposal.id}`)} 
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <Eye size={14}/> Görüntüle
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-500">
                        {searchTerm ? `"${searchTerm}" için sonuç bulunamadı.` : "Gösterilecek teklif yok."}
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TekliflerListesi;
