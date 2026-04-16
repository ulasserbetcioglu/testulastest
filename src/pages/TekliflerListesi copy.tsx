import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { FileText, Eye, Loader2 as Loader, KeyRound, Search, Copy, CheckCircle, XCircle, Mail, Send, X, RefreshCcw } from 'lucide-react';
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
  contract_available: boolean; // Yeni alan eklendi
}

const TekliflerListesi: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
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

  const handleSendEmail = async () => {
    if (!selectedProposal || !targetEmail) return;
    if (!/^\S+@\S+\.\S+$/.test(targetEmail)) {
      toast.error('Geçerli bir e-posta adresi giriniz.');
      return;
    }

    setIsSending(true);
    try {
      const proposalUrl = `${window.location.origin}/teklif-goruntule/${selectedProposal.id}`;
      const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #1e293b; margin-top: 0;">Yeni Teklif Paylaşımı</h2>
                <p style="color: #4b5563; line-height: 1.5;">${selectedProposal.company_name} firması için hazırlanan <strong>${selectedProposal.proposal_number}</strong> numaralı teklif sizinle paylaşıldı.</p>
                <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Teklifi görüntülemek için aşağıdaki bağlantıya tıklayın:</p>
                    <a href="${proposalUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Teklifi Görüntüle</a>
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
                        <p style="margin: 0; font-size: 13px; color: #64748b;">Erişim Şifresi: <strong style="color: #1e293b; font-family: monospace; font-size: 16px;">${selectedProposal.access_password || '-'}</strong></p>
                    </div>
                </div>
                <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
            </div>
        `;

      const { error } = await supabase.functions.invoke('send-schedule-email', {
        body: {
          to: targetEmail,
          subject: `${selectedProposal.proposal_number} Numaralı Teklif Paylaşımı`,
          html: emailHtml
        }
      });

      if (error) throw error;

      toast.success('E-posta başarıyla gönderildi!');
      setIsEmailModalOpen(false);
      setTargetEmail('');
    } catch (err: any) {
      console.error('Email send error:', err);
      toast.error('E-posta gönderilirken bir hata oluştu.');
    } finally {
      setIsSending(false);
    }
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam Tutar</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase" title="Sözleşme yapılabilir mi?">Sözleşme</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(proposal.created_at), 'dd MMM yyyy', { locale: tr })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{(proposal.total_amount || 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={proposal.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {proposal.contract_available ? (
                        <span title="Sözleşme Yapılabilir"><CheckCircle size={18} className="mx-auto text-green-500" /></span>
                      ) : (
                        <span title="Sözleşme Yok"><XCircle size={18} className="mx-auto text-gray-300" /></span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2 font-mono text-sm text-gray-600">
                        <KeyRound size={14} className="text-gray-400" />
                        <span>{proposal.access_password || '-'}</span>
                        {proposal.access_password && (
                          <button onClick={() => handleCopyToClipboard(proposal.access_password!)} className="text-gray-400 hover:text-blue-600" title="Şifreyi Kopyala">
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedProposal(proposal);
                            setTargetEmail('');
                            setIsEmailModalOpen(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="E-posta Gönder"
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/hizmet-pazarlama?revision_of=${proposal.id}`)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Revize Et (Kopyala)"
                        >
                          <RefreshCcw size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/teklif-goruntule/${proposal.id}`)}
                          className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md hover:bg-blue-200 transition-colors"
                        >
                          <Eye size={14} /> Görüntüle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    {searchTerm ? `"${searchTerm}" için sonuç bulunamadı.` : "Gösterilecek teklif yok."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* E-posta Gönder Modal */}
      {
        isEmailModalOpen && selectedProposal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Mail className="text-blue-600" size={18} />
                  Teklifi E-posta ile Gönder
                </h3>
                <button onClick={() => setIsEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Gönderilecek Teklif:</p>
                  <p className="font-semibold text-gray-800">{selectedProposal.proposal_number} - {selectedProposal.company_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alıcı E-posta Adresi</label>
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="ornek@mail.com"
                    className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSendEmail}
                    disabled={isSending || !targetEmail}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSending ? <Loader className="animate-spin" size={18} /> : <Send size={18} />}
                    {isSending ? 'Gönderiliyor...' : 'Şimdi Gönder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default TekliflerListesi;