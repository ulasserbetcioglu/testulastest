import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreVertical, Plus, Search, Filter, CheckCircle, Clock, XCircle, Edit, Trash2, AlertTriangle, FileText, FileImage, Loader2, Eye, Key, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { toast } from 'sonner';

// --- ARAYÜZLER (INTERFACES) ---
interface Proposal {
  id: string;
  proposal_number: string;
  access_password: string;
  customer_id: string;
  recipient_email: string; // E-posta kontrolü için gerekli
  customer: {
    kisa_isim: string;
    cari_isim?: string;
    email?: string;
  } | null;
  company_name: string;
  contact_person: string;
  created_at: string;
  validity_date?: string;
  status: 'pending' | 'approved' | 'rejected';
  total_amount: number;
  proposal_items: any[];
  customer_notes?: string;
}

const StatusBadge: React.FC<{ status: Proposal['status'] }> = ({ status }) => {
  const config = {
    approved: { text: 'Onaylandı', icon: CheckCircle, color: 'green' },
    pending: { text: 'Beklemede', icon: Clock, color: 'yellow' },
    rejected: { text: 'Reddedildi', icon: XCircle, color: 'red' },
  }[status] || { text: status, icon: Clock, color: 'gray' };

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800`}>
      <Icon className={`w-4 h-4 mr-1.5 text-${config.color}-500`} />
      {config.text}
    </span>
  );
};

const OffersPage: React.FC = () => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Proposal | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // YETKİ STATE'LERİ
  const [userRole, setUserRole] = useState<'admin' | 'operator' | 'customer' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filtreleme
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 1. KULLANICI ROLÜNÜ BELİRLE
  useEffect(() => {
    const checkUser = async () => {
        const session = localAuth.getSession();
        if (session) {
            setUserRole(session.type); 
            setCurrentUserId(session.id);
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                if (user.email === 'admin@ilaclamatik.com') setUserRole('admin');
                else setUserRole('operator');
            }
        }
    };
    checkUser();

    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 2. VERİLERİ ÇEK
  useEffect(() => {
    const fetchProposals = async () => {
        setLoading(true);

        try {
            let query = supabase
                .from('proposals')
                .select(`*, customer:customer_id(kisa_isim, cari_isim, email), proposal_items(*)`)
                .order('created_at', { ascending: false });

            // --- GÜVENLİK FİLTRESİ (DÜZELTİLDİ) ---
            if (userRole === 'customer' && currentUserId) {
                // 1. Adım: Önce bu müşterinin e-posta adresini bulalım
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('email')
                    .eq('id', currentUserId)
                    .single();
                
                const customerEmail = customerData?.email;

                if (customerEmail) {
                    // ID'si eşleşen VEYA E-postası eşleşen teklifleri getir
                    // Not: Supabase 'or' filtresi string içinde virgülle ayrılır
                    query = query.or(`customer_id.eq.${currentUserId},recipient_email.eq.${customerEmail}`);
                } else {
                    // E-posta bulunamadıysa sadece ID'ye bak
                    query = query.eq('customer_id', currentUserId);
                }
            }
            // ---------------------------------------

            // Durum filtresi
            if (statusFilter) {
                query = query.eq('status', statusFilter);
            }

            // Arama filtresi
            if (searchTerm.trim()) {
                query = query.or(`proposal_number.ilike.%${searchTerm.trim()}%,company_name.ilike.%${searchTerm.trim()}%`);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Veri çekme hatası:', error);
                // Hata olsa bile boş dizi ile devam et, UI çökmesin
                setProposals([]);
                toast.error("Teklifler alınırken bir sorun oluştu.");
            } else {
                setProposals(data as any || []);
            }
        } catch (err: any) {
            console.error('Beklenmeyen hata:', err);
            setProposals([]);
        } finally {
            setLoading(false);
        }
    };

    // Role belli olduktan veya session yoksa çalıştır
    if (userRole !== null || !localAuth.getSession()) {
         fetchProposals();
    }
  }, [searchTerm, statusFilter, userRole, currentUserId]);

  const handleDelete = async (id: string) => {
    try {
        await supabase.from('proposal_items').delete().eq('proposal_id', id);
        
        const { error } = await supabase.from('proposals').delete().eq('id', id);
        if (error) throw error;
        
        setProposals(prev => prev.filter(p => p.id !== id));
        toast.success("Teklif başarıyla silindi.");
    } catch (err: any) {
        toast.error(`Silme işlemi başarısız: ${err.message}`);
    } finally {
        setShowDeleteConfirm(null);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(prevId => (prevId === id ? null : id));
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Erişim kodu kopyalandı!");
  };

  // --- YETKİ KONTROLÜ ---
  const isStaff = userRole === 'admin' || userRole === 'operator';

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Teklifler</h1>
        
        {/* YENİ TEKLİF BUTONU: Sadece Personel (Admin/Operatör) Görebilir */}
        {isStaff && (
            <Link to="/hizmet-pazarlama" className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-sm hover:bg-green-700 transition-colors">
            <Plus size={20} /> Yeni Teklif Oluştur
            </Link>
        )}
      </header>

      {/* Filtreleme ve Arama Çubuğu */}
      <div className="mb-6 bg-white p-4 rounded-xl shadow-md flex flex-col md:flex-row gap-4">
        <div className="flex-grow relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Teklif No veya Firma Adı ile Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none"
          >
            <option value="">Tüm Durumlar</option>
            <option value="pending">Beklemede</option>
            <option value="approved">Onaylandı</option>
            <option value="rejected">Reddedildi</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-10"><Loader2 className="animate-spin inline-block w-8 h-8 text-gray-400" /></div>
      ) : proposals.length === 0 ? (
        <div className="text-center p-10 bg-white rounded-lg shadow">
            <h3 className="text-xl font-semibold text-gray-700">Henüz Teklif Yok</h3>
            <p className="text-gray-500 mt-2">
                {isStaff ? 'İlk teklifinizi oluşturmak için yukarıdaki butonu kullanın.' : 'Size ait herhangi bir teklif bulunamadı.'}
            </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map(proposal => (
            <div key={proposal.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* Sol Kısım: Teklif No ve İsim */}
                <div className="md:col-span-4">
                  <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-green-700 text-sm">#{proposal.proposal_number}</span>
                      {/* ERİŞİM KODU: Şifre */}
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-600 font-mono border border-gray-200" title="Erişim Kodu">
                          <Key size={10} /> {proposal.access_password}
                          <button onClick={() => copyToClipboard(proposal.access_password)} className="hover:text-blue-600 ml-1"><Copy size={10}/></button>
                      </span>
                  </div>
                  <p className="text-lg font-bold text-gray-800">{proposal.company_name}</p>
                  <p className="text-xs text-gray-500">{proposal.contact_person}</p>
                </div>

                {/* Orta Kısım: Tarih */}
                <div className="md:col-span-3 text-sm text-gray-600">
                  <p><strong>Oluşturulma:</strong> {new Date(proposal.created_at).toLocaleDateString('tr-TR')}</p>
                  <p className="text-xs text-gray-400 mt-1">Erişim Kodu ile detayları görüntüleyebilirsiniz.</p>
                </div>

                {/* Durum */}
                <div className="md:col-span-2 text-center">
                  <StatusBadge status={proposal.status} />
                </div>

                {/* Tutar */}
                <div className="md:col-span-2 text-right">
                  <p className="text-xl font-extrabold text-gray-800">
                    {proposal.total_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                  </p>
                </div>

                {/* İşlemler */}
                <div className="md:col-span-1 flex justify-end items-center relative">
                    <button onClick={(e) => handleMenuToggle(e, proposal.id)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><MoreVertical size={20} /></button>
                    
                    {openMenuId === proposal.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200 top-8">
                            {/* HERKES GÖREBİLİR (Müşteri dahil) */}
                            <button 
                                onClick={() => navigate(`/teklif-goruntule/${proposal.id}`)} 
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                                <Eye size={16} /> Görüntüle
                            </button>
                            
                            {/* DÜZENLEME VE SİLME: Sadece Personel (Admin/Operatör) */}
                            {isStaff && (
                                <>
                                    <button 
                                        onClick={() => { setShowDeleteConfirm(proposal); setOpenMenuId(null); }} 
                                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 size={16} /> Sil
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Silme Onay Modalı */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 text-red-600 flex items-center gap-2">
                <AlertTriangle size={20}/> Teklifi Sil
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-bold">#{showDeleteConfirm.proposal_number}</span> numaralı teklifi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium">İptal</button>
              <button onClick={() => handleDelete(showDeleteConfirm.id)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium">Evet, Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersPage;