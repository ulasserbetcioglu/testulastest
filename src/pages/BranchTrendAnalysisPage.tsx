import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import BranchTrendAnalysis from './BranchTrendAnalysis';
import { Loader2 } from 'lucide-react';

const BranchTrendAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranchInfo();
  }, []);

  const fetchBranchInfo = async () => {
    try {
      const localSession = localAuth.getSession();
      if (localSession && localSession.type === 'branch') {
        setBranchId(localSession.branchId);
        setBranchName(localSession.name);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('branches')
        .select('id, sube_adi')
        .eq('auth_id', user.id)
        .single();

      if (error) throw error;
      setBranchId(data.id);
      setBranchName(data.sube_adi);
    } catch (error) {
      console.error('Error fetching branch info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Yükleniyor...</span>
      </div>
    );
  }

  if (!branchId) {
    return (
      <div className="flex justify-center items-center h-96 text-gray-500">
        <p className="text-lg font-medium">Şube bilgisi bulunamadı</p>
      </div>
    );
  }

  return <BranchTrendAnalysis branchId={branchId} branchName={branchName} />;
};

export default BranchTrendAnalysisPage;
