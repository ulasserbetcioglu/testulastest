import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Users, Building, FileText, ChevronRight, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MeetingModal } from '../components/Meetings/MeetingModal';
import * as XLSX from 'xlsx';

const AdminMeetingMinutes: React.FC = () => {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meeting_minutes')
        .select(`
          *,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi)
        `)
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (meeting: any) => {
    setSelectedMeeting(meeting);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setSelectedMeeting(null);
    setIsModalOpen(true);
  };

  // Filtreleme
  const filteredMeetings = meetings.filter(m => 
    m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.customer?.kisa_isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.branch?.sube_adi && m.branch.sube_adi.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportExcel = () => {
    const data = filteredMeetings.map(m => ({
        'Tarih': m.meeting_date,
        'Müşteri': m.customer?.kisa_isim,
        'Şube': m.branch?.sube_adi || 'Merkez',
        'Konu': m.subject,
        'Katılımcılar': m.participants,
        'Kararlar': m.decisions
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Toplantı Tutanakları");
    XLSX.writeFile(wb, "Toplanti_Tutanaklari.xlsx");
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Toplantı Tutanakları</h1>
          <p className="text-gray-500 text-sm">Müşteri görüşmelerini ve alınan kararları yönetin.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={exportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Download size={18} /> Excel
            </button>
            <button onClick={handleNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus size={18} /> Yeni Tutanak
            </button>
        </div>
      </div>

      {/* Arama */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Müşteri, şube veya konu ara..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Liste */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
            <div className="text-center py-10 text-gray-500">Yükleniyor...</div>
        ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                Kayıt bulunamadı.
            </div>
        ) : (
            filteredMeetings.map((meeting) => (
            <div key={meeting.id} onClick={() => handleEdit(meeting)} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold mb-1">
                            <Calendar size={14} />
                            {format(new Date(meeting.meeting_date), 'dd MMMM yyyy, EEEE', { locale: tr })}
                            <span className="text-gray-300">|</span>
                            <span>{meeting.start_time?.slice(0,5)} - {meeting.end_time?.slice(0,5)}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                            {meeting.subject}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <Users size={14} /> {meeting.customer?.kisa_isim}
                            </span>
                            {meeting.branch && (
                                <span className="flex items-center gap-1">
                                    <Building size={14} /> {meeting.branch.sube_adi}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 min-w-[200px]">
                        {meeting.next_meeting_date && (
                            <div className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded border border-orange-100">
                                Sonraki: {format(new Date(meeting.next_meeting_date), 'dd.MM.yyyy')}
                            </div>
                        )}
                        <ChevronRight className="text-gray-300 group-hover:text-gray-500" />
                    </div>
                </div>
                
                {/* Önizleme Metni */}
                {(meeting.decisions || meeting.action_items) && (
                    <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {meeting.decisions && (
                            <div className="text-gray-600">
                                <span className="font-semibold text-gray-800">Kararlar:</span> {meeting.decisions.slice(0, 100)}...
                            </div>
                        )}
                        {meeting.action_items && (
                            <div className="text-gray-600">
                                <span className="font-semibold text-gray-800">Aksiyonlar:</span> {meeting.action_items.slice(0, 100)}...
                            </div>
                        )}
                    </div>
                )}
            </div>
            ))
        )}
      </div>

      {/* Modal */}
      <MeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchMeetings}
        selectedMeeting={selectedMeeting}
      />
    </div>
  );
};

export default AdminMeetingMinutes;