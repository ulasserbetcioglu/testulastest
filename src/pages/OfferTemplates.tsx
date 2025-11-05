import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface OfferTemplate {
  id: string;
  name: string;
  description: string;
  created_at: string;
  created_by: string;
  sections: TemplateSection[];
}

interface TemplateSection {
  id: string;
  template_id: string;
  title: string;
  type: 'text' | 'list' | 'table';
  content: string;
  order_no: number;
}

const OfferTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    fetchTemplates();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAdmin(user?.email === 'admin@ilaclamatik.com');
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      const { data: templatesData, error: templatesError } = await supabase
        .from('offer_templates')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (templatesError) throw templatesError;
      
      // Fetch sections for each template
      const templatesWithSections = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: sectionsData, error: sectionsError } = await supabase
            .from('offer_template_sections')
            .select('*')
            .eq('template_id', template.id)
            .order('order_no', { ascending: true });
            
          if (sectionsError) throw sectionsError;
          
          return {
            ...template,
            sections: sectionsData || []
          };
        })
      );
      
      setTemplates(templatesWithSections);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      alert('Sadece admin kullanıcısı şablon silebilir.');
      return;
    }

    if (!confirm('Bu şablonu silmek istediğinizden emin misiniz?')) return;

    try {
      const { error } = await supabase
        .from('offer_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">TEKLİF ŞABLONLARI</h2>
        {isAdmin && (
          <button
            onClick={() => navigate('/teklifler/templates/new')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Yeni Şablon
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Şablon ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Yükleniyor...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-500">Hata: {error}</p>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Henüz şablon bulunmuyor</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">{template.name}</h3>
                {template.description && (
                  <p className="text-gray-600 mb-4">{template.description}</p>
                )}
                <p className="text-sm text-gray-500">
                  {new Date(template.created_at).toLocaleDateString('tr-TR')}
                </p>
                <p className="text-sm text-gray-500">
                  {template.sections.length} bölüm
                </p>
              </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2">
                <button
                  onClick={() => navigate(`/teklifler/new?template=${template.id}`)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Bu şablonu kullan"
                >
                  <Copy size={18} />
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => navigate(`/teklifler/templates/edit/${template.id}`)}
                      className="text-green-600 hover:text-green-800"
                      title="Düzenle"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfferTemplates;