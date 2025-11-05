import React, { useState, useEffect, useMemo } from 'react';

import { supabase } from '../lib/supabase';

import { toast } from 'sonner';

import { Mail, Search, Eye, CheckCircle, XCircle, Loader2 as Loader, X } from 'lucide-react';

import { format } from 'date-fns';

import { tr } from 'date-fns/locale';



// Arayüz (Interface) tanımları

interface EmailLog {

  id: string;

  created_at: string;

  recipient: string | null; // Null olabilir

  subject: string | null; // Null olabilir

  body: string;

  status: 'success' | 'failed';

}



const GonderilenEpostalar: React.FC = () => {

  const [logs, setLogs] = useState<EmailLog[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  

  // Veri çekme

  useEffect(() => {

    const fetchLogs = async () => {

      setLoading(true);

      try {

        const { data, error } = await supabase

          .from('email_logs')

          .select('*')

          .order('created_at', { ascending: false });

        if (error) throw error;

        setLogs(data || []);

      } catch (error: any) {

        toast.error('E-posta kayıtları çekilirken bir hata oluştu.');

      } finally {

        setLoading(false);

      }

    };

    fetchLogs();

  }, []);



  // Arama filtresi

  const filteredLogs = useMemo(() => {

    return logs.filter(log =>

      // ✅ DÜZELTME: Alıcı veya konu alanı boş olsa bile hatasız arama yapması için kontrol eklendi.

      (log.recipient || '').toLowerCase().includes(searchTerm.toLowerCase()) ||

      (log.subject || '').toLowerCase().includes(searchTerm.toLowerCase())

    );

  }, [logs, searchTerm]);



  return (

    <div className="p-6 bg-gray-50 min-h-screen">

      <div className="flex items-center justify-between mb-6">

        <div className="flex items-center gap-4">

          <Mail className="w-8 h-8 text-gray-600" />

          <h1 className="text-3xl font-bold text-gray-800">Gönderilen E-postalar</h1>

        </div>

      </div>



      <div className="bg-white p-4 rounded-xl shadow-md mb-6">

        <div className="relative">

          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />

          <input

            type="text"

            placeholder="Alıcı veya konuya göre ara..."

            value={searchTerm}

            onChange={(e) => setSearchTerm(e.target.value)}

            className="w-full pl-10 pr-4 py-2 border rounded-lg"

          />

        </div>

      </div>



      <div className="bg-white rounded-xl shadow-md overflow-hidden">

        <div className="overflow-x-auto">

          <table className="min-w-full divide-y divide-gray-200">

            <thead className="bg-gray-50">

              <tr>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alıcı</th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Konu</th>

                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gönderim Tarihi</th>

                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">İçerik</th>

              </tr>

            </thead>

            <tbody className="bg-white divide-y divide-gray-200">

              {loading ? (

                <tr><td colSpan={5} className="text-center py-10"><Loader className="w-8 h-8 animate-spin text-gray-400 mx-auto" /></td></tr>

              ) : (

                filteredLogs.map(log => (

                  <tr key={log.id} className="hover:bg-gray-50">

                    <td className="px-6 py-4 whitespace-nowrap">

                      {log.status === 'success' ? (

                        <CheckCircle className="w-5 h-5 text-green-500" title="Başarılı" />

                      ) : (

                        <XCircle className="w-5 h-5 text-red-500" title="Başarısız" />

                      )}

                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.recipient}</td>

                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{log.subject}</td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(log.created_at), 'dd MMMM yyyy, HH:mm', { locale: tr })}</td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">

                      <button onClick={() => setSelectedEmail(log)} className="text-blue-600 hover:text-blue-800">

                        <Eye size={20} />

                      </button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

      

      {/* E-posta İçeriği Görüntüleme Modalı */}

      {selectedEmail && (

        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={() => setSelectedEmail(null)}>

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] m-4 flex flex-col" onClick={e => e.stopPropagation()}>

                <div className="flex justify-between items-center p-4 border-b">

                    <div>

                        <h2 className="text-xl font-bold text-gray-800">{selectedEmail.subject}</h2>

                        <p className="text-sm text-gray-500">Alıcı: {selectedEmail.recipient}</p>

                    </div>

                    <button onClick={() => setSelectedEmail(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>

                </div>

                <div className="flex-grow overflow-hidden">

                    <iframe srcDoc={selectedEmail.body} title="E-posta İçeriği" className="w-full h-full border-0" />

                </div>

            </div>

        </div>

      )}

    </div>

  );

};



export default GonderilenEpostalar;