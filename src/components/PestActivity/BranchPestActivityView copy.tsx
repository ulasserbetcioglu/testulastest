import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import PestActivityPreview from './PestActivityPreview';
import type { PestActivityReport } from './PestActivityData';

interface Props {
  branchId?: string;
  customerId?: string;
}

const BranchPestActivityView: React.FC<Props> = ({ branchId, customerId }) => {
  const [report, setReport] = useState<PestActivityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: settings } = await supabase.from('company_settings').select('*').maybeSingle();
        setCompanySettings(settings);

        let query = supabase.from('pest_activity_limits').select('*').eq('status', 'active');

        if (branchId) {
          query = query.eq('branch_id', branchId);
        } else if (customerId) {
          query = query.eq('customer_id', customerId).is('branch_id', null);
        }

        const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
        setReport(data);
      } catch (err) {
        console.error('Pest activity load error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (branchId || customerId) load();
  }, [branchId, customerId]);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="animate-spin text-green-600" size={24} />
    </div>
  );

  if (!report) return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <AlertCircle size={32} className="mb-2" />
      <p className="text-sm">Bu {branchId ? 'sube' : 'musteri'} icin Zararli Aktivitesi Kritik Limitleri raporu bulunamadi.</p>
      <p className="text-xs mt-1">Admin panelinden olusturulabilir.</p>
    </div>
  );

  return <PestActivityPreview report={report} companySettings={companySettings} />;
};

export default BranchPestActivityView;
