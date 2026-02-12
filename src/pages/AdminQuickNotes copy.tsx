import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X, Loader2, NotebookPen, User, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

interface QuickNote {
  id: string;
  operator_id: string;
  note_content: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  operator?: { // Operatör bilgisi için eklendi
    name: string;
    email: string;
  };
}

interface Operator {
  id: string;
  name: string;
  email: string;
}

const AdminQuickNotes: React.FC = () => {
  const [allNotes, setAllNotes] = useState<QuickNote[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [adminNotes, setAdminNotes] = useState<QuickNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.email !== 'admin@ilaclamatik.com') {
          toast.error('Bu sayfaya erişim yetkiniz bulunmamaktadır.');
          // Yönlendirme yapılabilir, şimdilik sadece hata mesajı gösteriliyor.
          setLoading(false);
          return;
        }
        setCurrentAdminId(user.id);

        const { data: operatorsData, error: operatorsError } = await supabase
          .from('operators')
          .select('id, name, email')
          .order('name');
        if (operatorsError) throw operatorsError;
        setOperators(operatorsData || []);

        await fetchNotes(user.id);

      } catch (err: any) {
        toast.error(`Veriler yüklenirken hata: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchNotes = async (adminId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quick_notes')
        .select(`
          id,
          operator_id,
          note_content,
          created_at,
          updated_at,
          is_archived,
          operator:operator_id(name, email)
        `)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const adminOwnNotes = data.filter(note => note.operator_id === adminId);
      const otherOperatorNotes = data.filter(note => note.operator_id !== adminId);

      setAdminNotes(adminOwnNotes);
      setAllNotes(otherOperatorNotes); // Diğer operatörlerin notları

    } catch (err: any) {
      toast.error(`Notlar çekilirken hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      toast.error('Not içeriği boş olamaz.');
      return;
    }
    if (!currentAdminId) {
      toast.error('Yönetici bilgisi eksik.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('quick_notes').insert({
        operator_id: currentAdminId,
        note_content: newNoteContent.trim(),
      });
      if (error) throw error;
      setNewNoteContent('');
      toast.success('Not başarıyla eklendi!');
      fetchNotes(currentAdminId);
    } catch (err: any) {
      toast.error(`Not eklenirken hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (note: QuickNote) => {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.note_content);
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editingNoteContent.trim()) {
      toast.error('Not içeriği boş olamaz.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('quick_notes')
        .update({ note_content: editingNoteContent.trim(), updated_at: new Date().toISOString() })
        .eq('id', noteId);
      if (error) throw error;
      setEditingNoteId(null);
      setEditingNoteContent('');
      toast.success('Not başarıyla güncellendi!');
      fetchNotes(currentAdminId!);
    } catch (err: any) {
      toast.error(`Not güncellenirken hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveNote = async (noteId: string) => {
    if (!confirm('Bu notu arşivlemek istediğinizden emin misiniz?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('quick_notes')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', noteId);
      if (error) throw error;
      toast.success('Not başarıyla arşivlendi!');
      fetchNotes(currentAdminId!);
    } catch (err: any) {
      toast.error(`Not arşivlenirken hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredOperatorNotes = useMemo(() => {
    let filtered = allNotes;

    if (selectedOperatorFilter !== 'all') {
      filtered = filtered.filter(note => note.operator_id === selectedOperatorFilter);
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(note =>
        note.note_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.operator?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.operator?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [allNotes, selectedOperatorFilter, searchTerm]);

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Notlar yükleniyor...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex items-center gap-4 mb-6">
        <NotebookPen className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">Yönetici Hızlı Notlar</h1>
      </header>

      {/* Yönetici Kendi Notları Bölümü */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Kendi Notlarım</h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Buraya yeni notunuzu yazın..."
            rows={3}
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddNote}
            disabled={saving || !currentAdminId}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Ekle
          </button>
        </div>

        {adminNotes.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Henüz kendi notunuz yok.
          </div>
        ) : (
          <div className="space-y-4">
            {adminNotes.map(note => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                {editingNoteId === note.id ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <textarea
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      rows={3}
                      className="flex-grow p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="animate-spin" /> : <Save />}
                        Kaydet
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                      >
                        <X /> İptal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <p className="text-gray-800 flex-grow pr-4">{note.note_content}</p>
                    <div className="flex-shrink-0 flex gap-2">
                      <button
                        onClick={() => handleEditClick(note)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleArchiveNote(note.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-full"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2 text-right">
                  Oluşturuldu: {format(new Date(note.created_at), 'dd.MM.yyyy HH:mm')}
                  {note.created_at !== note.updated_at && ` (Güncellendi: ${format(new Date(note.updated_at), 'dd.MM.yyyy HH:mm')})`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operatör Notları Bölümü */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Operatör Notları</h2>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-grow relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Not içeriği, operatör adı veya e-posta ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="operator-filter" className="sr-only">Operatör Filtrele</label>
            <select
              id="operator-filter"
              value={selectedOperatorFilter}
              onChange={(e) => setSelectedOperatorFilter(e.target.value)}
              className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Operatörler</option>
              {operators.map(op => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredOperatorNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Gösterilecek operatör notu bulunamadı.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOperatorNotes.map(note => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-gray-800 flex-grow pr-4">{note.note_content}</p>
                  <div className="flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <User size={16} /> {note.operator?.name || 'Bilinmeyen Operatör'}
                    </span>
                    <p className="text-xs text-gray-500 text-right">{note.operator?.email}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-right">
                  Oluşturuldu: {format(new Date(note.created_at), 'dd.MM.yyyy HH:mm')}
                  {note.created_at !== note.updated_at && ` (Güncellendi: ${format(new Date(note.updated_at), 'dd.MM.yyyy HH:mm')})`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuickNotes;
