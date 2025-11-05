import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendEmail, getRecipientEmails } from '../../lib/emailClient';
import { toast } from 'sonner';

interface CorrectiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitId?: string;
  onSave: () => void;
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  customer_id: string;
}

interface Visit {
  id: string;
  customer: {
    kisa_isim: string;
  };
  branch?: {
    sube_adi: string;
  };
  visit_date: string;
}

const CorrectiveActionModal: React.FC<CorrectiveActionModalProps> = ({
  isOpen,
  onClose,
  visitId,
  onSave
}) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [useVisit, setUseVisit] = useState(!!visitId);
  const [sendEmailNotification, setSendEmailNotification] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [assignedCustomers, setAssignedCustomers] = useState<string[] | null>(null);
  const [assignedBranches, setAssignedBranches] = useState<string[] | null>(null);
  
  const [formData, setFormData] = useState({
    visitId: visitId || '',
    customerId: '',
    branchId: '',
    nonComplianceType: '',
    nonComplianceDescription: '',
    rootCauseAnalysis: '',
    correctiveAction: '',
    preventiveAction: '',
    responsible: '',
    dueDate: new Date().toISOString().split('T')[0],
    relatedStandard: '',
    status: 'open'
  });

  useEffect(() => {
    if (isOpen) {
      checkUserRole();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && operatorId) {
      fetchCustomers();
      fetchVisits();
      if (visitId) {
        setFormData(prev => ({ ...prev, visitId }));
        setUseVisit(true);
      }
    }
  }, [isOpen, visitId, operatorId, assignedCustomers]);

  useEffect(() => {
    if (formData.customerId) {
      fetchBranches(formData.customerId);
    } else {
      setFilteredBranches([]);
    }
  }, [formData.customerId, assignedBranches]);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      // Check if admin
      setIsAdmin(user.email === 'admin@ilaclamatik.com');

      // Get operator ID and assigned entities
      const { data: operatorData, error: operatorError } = await supabase
        .from('operators')
        .select('id, assigned_customers, assigned_branches')
        .eq('auth_id', user.id)
        .single();

      if (operatorError) throw operatorError;
      
      setOperatorId(operatorData.id);
      setAssignedCustomers(operatorData.assigned_customers);
      setAssignedBranches(operatorData.assigned_branches);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchCustomers = async () => {
    try {
      let query = supabase
        .from('customers')
        .select('id, kisa_isim')
        .order('kisa_isim');

      // If not admin and has assigned customers, filter by them
      if (!isAdmin && assignedCustomers && assignedCustomers.length > 0) {
        query = query.in('id', assignedCustomers);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCustomers(data || []);

      // Fetch all branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, sube_adi, customer_id')
        .order('sube_adi');

      if (branchesError) throw branchesError;
      setBranches(branchesData || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchBranches = async (customerId: string) => {
    // Filter branches by customer ID
    const customerBranches = branches.filter(branch => branch.customer_id === customerId);
    
    // If not admin and has assigned branches, further filter by them
    if (!isAdmin && assignedBranches && assignedBranches.length > 0) {
      setFilteredBranches(customerBranches.filter(branch => 
        assignedBranches.includes(branch.id)
      ));
    } else {
      setFilteredBranches(customerBranches);
    }
  };

  const fetchVisits = async () => {
    try {
      if (!operatorId) return;

      let query = supabase
        .from('visits')
        .select(`
          id,
          visit_date,
          customer:customer_id (kisa_isim),
          branch:branch_id (sube_adi)
        `)
        .eq('operator_id', operatorId)
        .order('visit_date', { ascending: false });

      // If not admin and has assigned customers, filter by them
      if (!isAdmin && assignedCustomers && assignedCustomers.length > 0) {
        query = query.in('customer_id', assignedCustomers);
      }

      // If not admin and has assigned branches, filter by them
      if (!isAdmin && assignedBranches && assignedBranches.length > 0) {
        query = query.in('branch_id', assignedBranches);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVisits(data || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      let customer_id, branch_id;

      if (useVisit) {
        // Get visit details to link to customer and branch
        const { data: visitData, error: visitError } = await supabase
          .from('visits')
          .select('customer_id, branch_id')
          .eq('id', formData.visitId)
          .single();

        if (visitError) throw visitError;
        
        customer_id = visitData.customer_id;
        branch_id = visitData.branch_id;
      } else {
        // Use directly selected customer and branch
        customer_id = formData.customerId;
        branch_id = formData.branchId || null;
      }

      // Create the corrective action record
      const { data, error } = await supabase
        .from('corrective_actions')
        .insert([
          {
            visit_id: useVisit ? formData.visitId : null,
            customer_id: customer_id,
            branch_id: branch_id,
            non_compliance_type: formData.nonComplianceType,
            non_compliance_description: formData.nonComplianceDescription,
            root_cause_analysis: formData.rootCauseAnalysis,
            corrective_action: formData.correctiveAction,
            preventive_action: formData.preventiveAction,
            responsible: formData.responsible,
            due_date: formData.dueDate,
            related_standard: formData.relatedStandard,
            status: formData.status,
            created_by: user.id
          }
        ])
        .select();

      if (error) throw error;

      // Send email notification if enabled
      if (sendEmailNotification && data && data.length > 0) {
        try {
          // Get customer and branch emails
          const recipientEmails = await getRecipientEmails(customer_id, branch_id);
          
          if (recipientEmails.length > 0) {
            // Send email to each recipient
            for (const email of recipientEmails) {
              await sendEmail('dof', data[0].id, email);
            }
            toast.success('DÖF bildirimi e-posta olarak gönderildi');
          }
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          toast.error('E-posta gönderimi başarısız oldu');
        }
      }

      setSuccess(true);
      setTimeout(() => {
        onSave();
        onClose();
        resetForm();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      visitId: '',
      customerId: '',
      branchId: '',
      nonComplianceType: '',
      nonComplianceDescription: '',
      rootCauseAnalysis: '',
      correctiveAction: '',
      preventiveAction: '',
      responsible: '',
      dueDate: new Date().toISOString().split('T')[0],
      relatedStandard: '',
      status: 'open'
    });
    setSuccess(false);
    setError(null);
    setUseVisit(!!visitId);
    setSendEmailNotification(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Düzeltici Önleyici Faaliyet</h2>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
            <AlertTriangle size={20} className="mr-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center">
            <CheckCircle size={20} className="mr-2" />
            Düzeltici önleyici faaliyet başarıyla kaydedildi!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="mb-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={useVisit}
                  onChange={() => setUseVisit(true)}
                  className="mr-2"
                />
                <span>Ziyaret Seç</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!useVisit}
                  onChange={() => setUseVisit(false)}
                  className="mr-2"
                />
                <span>Müşteri/Şube Seç</span>
              </label>
            </div>
          </div>

          {useVisit ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ziyaret
              </label>
              <select
                value={formData.visitId}
                onChange={(e) => setFormData({ ...formData, visitId: e.target.value })}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Ziyaret Seçiniz</option>
                {visits.map(visit => (
                  <option key={visit.id} value={visit.id}>
                    {visit.customer.kisa_isim} - {visit.branch?.sube_adi || 'Şube Yok'} - {new Date(visit.visit_date).toLocaleDateString('tr-TR')}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Müşteri
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value, branchId: '' })}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Müşteri Seçiniz</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.kisa_isim}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şube
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full p-2 border rounded"
                  disabled={!formData.customerId}
                >
                  <option value="">Şube Seçiniz (Opsiyonel)</option>
                  {filteredBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.sube_adi}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uygunsuzluk Tipi
            </label>
            <select
              value={formData.nonComplianceType}
              onChange={(e) => setFormData({ ...formData, nonComplianceType: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Seçiniz</option>
              <option value="kritik">Kritik</option>
              <option value="major">Majör</option>
              <option value="minor">Minör</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uygunsuzluk Tanımı
            </label>
            <textarea
              value={formData.nonComplianceDescription}
              onChange={(e) => setFormData({ ...formData, nonComplianceDescription: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Uygunsuzluğun detaylı açıklaması..."
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kök Neden Analizi
            </label>
            <textarea
              value={formData.rootCauseAnalysis}
              onChange={(e) => setFormData({ ...formData, rootCauseAnalysis: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Uygunsuzluğun kök nedeni..."
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Düzeltici Faaliyet
            </label>
            <textarea
              value={formData.correctiveAction}
              onChange={(e) => setFormData({ ...formData, correctiveAction: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Uygunsuzluğu gidermek için yapılacak faaliyet..."
              required
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Önleyici Faaliyet
            </label>
            <textarea
              value={formData.preventiveAction}
              onChange={(e) => setFormData({ ...formData, preventiveAction: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="Uygunsuzluğun tekrarını önlemek için yapılacak faaliyet..."
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sorumlu
              </label>
              <input
                type="text"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full p-2 border rounded"
                placeholder="Faaliyetten sorumlu kişi..."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Termin Tarihi
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              İlgili Standart
            </label>
            <select
              value={formData.relatedStandard}
              onChange={(e) => setFormData({ ...formData, relatedStandard: e.target.value })}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Seçiniz</option>
              <option value="haccp">HACCP</option>
              <option value="brc">BRC</option>
              <option value="aib">AIB</option>
              <option value="iso22000">ISO 22000</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendEmail"
              checked={sendEmailNotification}
              onChange={(e) => setSendEmailNotification(e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="sendEmail" className="ml-2 block text-sm text-gray-700">
              Müşteriye e-posta bildirimi gönder
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              disabled={loading || (useVisit && !formData.visitId) || (!useVisit && !formData.customerId)}
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CorrectiveActionModal;