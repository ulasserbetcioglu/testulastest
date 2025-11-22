// src/pages/OperatorQuickNotes.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X, Loader2, NotebookPen } from 'lucide-react';
import { format } from 'date-fns'; // Add this import

interface QuickNote {
  id: string;
  operator_id: string | null; // operator_id artık null olabilir
  user_id: string; // Yeni eklenen user_id
  note_content: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

const OperatorQuickNotes: React.FC = () => {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // Mevcut kullanıcının auth.uid() değeri

  useEffect(() => {
    const fetchOperatorId = async () => {
      try {
        const opId = await localAuth.getCurrentOperatorId();
        if (!opId) throw new Error('Kullanıcı bulunamadı');

        setCurrentUserId(opId);

        const { data: opData, error: opError } = await supabase
          .from('operators')
          .select('id')
          .eq('id', opId)
          .maybeSingle();

        if (opError && opError.code !== 'PGRST116') throw opError;
        if (opData) {
          setOperatorId(opData.id);
        } else {
          // Operatör kaydı yoksa, notları çekmeye çalışmayız.
          setLoading(false);
        }
      } catch (err: any) {
        toast.error(`Operatör ID çekilirken hata: ${err.message}`);
        setLoading(false);
      }
    };
    fetchOperatorId();
  }, []);

  useEffect(() => {
    if (operatorId) {
      fetchNotes();
    }
  }, [operatorId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quick_notes')
        .select('*')
        .eq('operator_id', operatorId) // Sadece bu operatöre ait notları çek
        .eq('is_archived', false) // Sadece arşivlenmemiş notları göster
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
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
    if (!operatorId || !currentUserId) { // Hem operatorId hem de currentUserId kontrolü
      toast.error('Operatör veya kullanıcı bilgisi eksik.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('quick_notes').insert({
        operator_id: operatorId, // Operatörün kendi ID'si
        user_id: currentUserId, // Notu oluşturan kullanıcının ID'si
        note_content: newNoteContent.trim(),
      });
      if (error) throw error;
      setNewNoteContent('');
      toast.success('Not başarıyla eklendi!');
      fetchNotes();
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
      fetchNotes();
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
      fetchNotes();
    } catch (err: any) {
      toast.error(`Not arşivlenirken hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin" /> Notlar yükleniyor...</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex items-center gap-4 mb-6">
        <NotebookPen className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold text-gray-800">Hızlı Notlar</h1>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Yeni Not Ekle</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Buraya yeni notunuzu yazın..."
            rows={3}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddNote}
            disabled={saving || !operatorId}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Plus />}
            Ekle
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Notlarım</h2>
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Henüz hiç notunuz yok. Yukarıdan yeni bir not ekleyebilirsiniz.
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map(note => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                {editingNoteId === note.id ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <textarea
                      value={editingNoteContent}
                      onChange={(e) => setEditingNoteContent(e.target.value)}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                    <div className="w-full sm:w-auto flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={saving}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="animate-spin" /> : <Save />}
                        Kaydet
                      </button>
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
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
    </div>
  );
};

export default OperatorQuickNotes;
