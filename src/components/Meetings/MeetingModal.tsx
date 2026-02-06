import React, { useState, useEffect } from 'react';
import { X, Save, Building, Users, Calendar, Clock, FileText, CheckSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedMeeting?: any; // Düzenleme için
}

export const MeetingModal: React.FC<MeetingModalProps> = ({ isOpen, onClose, onSuccess, selectedMeeting }) => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    customer_id: '',
    branch_id: '',
    meeting_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    location: 'Müşteri Ofisi',
    participants: '',
    subject: '',
    agenda: '',
    decisions: '',
    action_items: '',
    next_meeting_date: ''
  });

  // Müşterileri Çek
  useEffect(() => {
    if (isOpen) {
      fetchCustomers();
      if (selectedMeeting) {
        setFormData({
          customer_id: selectedMeeting.customer_id,
          branch_id: selectedMeeting.branch_id || '',
          meeting_date: selectedMeeting.meeting_date,
          start_time: selectedMeeting.start_time || '09:00',
          end_time: selectedMeeting.end_time || '10:00',
          location: selectedMeeting.location || '',
          participants: selectedMeeting.participants || '',
          subject: selectedMeeting.subject || '',
          agenda: selectedMeeting.agenda || '',
          decisions: selectedMeeting.decisions || '',
          action_items: selectedMeeting.action_items || '',
          next_meeting_date: selectedMeeting.next_meeting_date || ''
        });
        // Düzenleme modunda şubeleri de çekelim
        if (selectedMeeting.customer_id) {
            fetchBranches(selectedMeeting.customer_id);
        }
      } else {
        // Reset form
        setFormData({
            customer_id: '',
            branch_id: '',
            meeting_date: new Date().toISOString().split('T')[0],
            start_time: '09:00',
            end_time: '10:00',
            location: 'Müşteri Ofisi',
            participants: '',
            subject: '',
            agenda: '',
            decisions: '',
            action_items: '',
            next_meeting_date: ''
        });
      }
    }
  }, [isOpen, selectedMeeting]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, kisa_isim').eq('is_active', true).order('kisa_isim');
    setCustomers(data || []);
  };

  const fetchBranches = async (customerId: string) => {
    const { data } = await supabase.from('branches').select('id, sube_adi').eq('customer_id', customerId);
    setBranches(data || []);
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setFormData({ ...formData, customer_id: custId, branch_id: '' });
    if (custId) {
      fetchBranches(custId);
    } else {
      setBranches([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        branch_id: formData.branch_id || null, // Boşsa null gönder
        next_meeting_date: formData.next_meeting_date || null
      };

      let error;
      if (selectedMeeting) {
        const { error: updateError } = await supabase
          .from('meeting_minutes')
          .update(payload)
          .eq('id', selectedMeeting.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('meeting_minutes')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(selectedMeeting ? 'Toplantı güncellendi' : 'Toplantı kaydedildi');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Hata: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" />
            {selectedMeeting ? 'Toplantı Tutanağını Düzenle' : 'Yeni Toplantı Tutanağı'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* 1. SATIR: Müşteri ve Şube */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri *</label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <select
                  required
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.customer_id}
                  onChange={handleCustomerChange}
                >
                  <option value="">Seçiniz...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.kisa_isim}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şube (Opsiyonel)</label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <select
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  disabled={!formData.customer_id}
                >
                  <option value="">Merkez / Şube Yok</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.sube_adi}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 2. SATIR: Tarih ve Saat */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Toplantı Tarihi *</label>
              <input
                type="date"
                required
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.meeting_date}
                onChange={(e) => setFormData({ ...formData, meeting_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
              <input
                type="time"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
              <input
                type="time"
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          {/* 3. SATIR: Konu ve Lokasyon */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Toplantı Konusu *</label>
                <input
                    type="text"
                    required
                    placeholder="Örn: Yıllık Sözleşme Yenileme"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasyon</label>
                <input
                    type="text"
                    placeholder="Örn: Müşteri Ofisi"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
            </div>
          </div>

          {/* 4. SATIR: Katılımcılar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Katılımcılar</label>
            <textarea
                rows={2}
                placeholder="Toplantıya katılan kişilerin isimleri..."
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={formData.participants}
                onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
            />
          </div>

          <div className="border-t pt-4"></div>

          {/* 5. SATIR: Gündem ve Kararlar (Yan yana) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <FileText size={16} className="text-orange-500"/> Gündem Maddeleri
                </label>
                <textarea
                    rows={6}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                    placeholder="- Madde 1..."
                    value={formData.agenda}
                    onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <CheckSquare size={16} className="text-green-600"/> Alınan Kararlar
                </label>
                <textarea
                    rows={6}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                    placeholder="- Karar 1..."
                    value={formData.decisions}
                    onChange={(e) => setFormData({ ...formData, decisions: e.target.value })}
                />
            </div>
          </div>

          {/* 6. SATIR: Aksiyonlar ve Sonraki Adım */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-2">Aksiyonlar / Yapılacaklar</label>
            <textarea
                rows={3}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Kim ne yapacak?"
                value={formData.action_items}
                onChange={(e) => setFormData({ ...formData, action_items: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bir Sonraki Toplantı Tarihi</label>
                <input
                    type="date"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.next_meeting_date}
                    onChange={(e) => setFormData({ ...formData, next_meeting_date: e.target.value })}
                />
             </div>
          </div>

          {/* Butonlar */}
          <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};