import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Search, Eye, FileDown, FileText, Calendar, X, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

interface Contract {
  id: string;
  contract_number: string;
  company_name: string;
  contact_person: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  content: string; // HTML İçerik
  created_at: string;
  status: string;
}

const Sozlesmeler: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showModal, setShowModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('service_contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error: any) {
      toast.error('Sözleşmeler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!printRef.current || !(window as any).html2pdf) {
        toast.error("PDF oluşturucu hazır değil.");
        return;
    }
    
    const element = printRef.current;
    const options = {
        margin:       5,
        filename:     `Sozlesme_${selectedContract?.contract_number}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    (window as any).html2pdf().set(options).from(element).save();
  };

  const filteredContracts = contracts.filter(c => 
    c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contract_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <FileText className="text-blue-600" /> Hizmet Sözleşmeleri
        </h1>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Sözleşme No veya Firma Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Sözleşme No</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Firma Ünvanı</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Yetkili</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase">Başlangıç / Bitiş</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Tutar</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></td></tr>
              ) : filteredContracts.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Kayıtlı sözleşme bulunamadı.</td></tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-blue-600">{contract.contract_number}</td>
                    <td className="p-4 text-sm font-semibold text-gray-800">{contract.company_name}</td>
                    <td className="p-4 text-sm text-gray-600">{contract.contact_person}</td>
                    <td className="p-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} className="text-gray-400"/>
                        {format(new Date(contract.start_date), 'dd.MM.yyyy')} - {format(new Date(contract.end_date), 'dd.MM.yyyy')}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-800 text-right">
                      {contract.contract_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => { setSelectedContract(contract); setShowModal(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Görüntüle"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAY MODALI */}
      {showModal && selectedContract && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-blue-600"/> Sözleşme Detayı: {selectedContract.contract_number}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={24}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
               <div className="bg-white shadow-lg p-10 max-w-[210mm] mx-auto min-h-[297mm]">
                  <div ref={printRef} dangerouslySetInnerHTML={{ __html: selectedContract.content }} />
               </div>
            </div>

            <div className="p-4 border-t bg-white flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700">Kapat</button>
              <button onClick={() => handleDownloadPdf()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <FileDown size={18}/> PDF İndir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sozlesmeler;