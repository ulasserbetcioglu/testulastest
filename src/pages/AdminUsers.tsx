import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, Filter, Download, Calendar, CheckCircle, Clock, X, AlertTriangle, Eye, Edit2, Trash2, BarChart2, Calendar as CalendarIcon, FileText, UserCog, Building, User, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  role?: string;
  name?: string;
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user has admin role in profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // If profile doesn't exist, check email
        setIsAdmin(user.email === 'admin@ilaclamatik.com');
      } else {
        setIsAdmin(profileData.role === 'admin');
      }
      
      if (isAdmin) {
        fetchUsers();
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Error checking admin access:', err);
      navigate('/');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users from profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, role, full_name');
      
      if (profilesError) throw profilesError;
      
      // Get additional user info from database tables
      const userList: User[] = [];
      
      for (const profile of profilesData || []) {
        let role = profile.role || 'unknown';
        let name = profile.full_name || '';
        
        // If profile doesn't have a name, try to get it from other tables
        if (!name) {
          // Check if user is an operator
          const { data: operatorData } = await supabase
            .from('operators')
            .select('name')
            .eq('auth_id', profile.id)
            .maybeSingle();
            
          if (operatorData) {
            name = operatorData.name;
            role = 'operator';
          } else {
            // Check if user is a customer
            const { data: customerData } = await supabase
              .from('customers')
              .select('kisa_isim')
              .eq('auth_id', profile.id)
              .maybeSingle();
              
            if (customerData) {
              name = customerData.kisa_isim;
              role = 'customer';
            } else {
              // Check if user is a branch
              const { data: branchData } = await supabase
                .from('branches')
                .select('sube_adi')
                .eq('auth_id', profile.id)
                .maybeSingle();
                
              if (branchData) {
                name = branchData.sube_adi;
                role = 'branch';
              }
            }
          }
        }
        
        userList.push({
          id: profile.id,
          email: profile.email,
          role,
          name: name || profile.email
        });
      }
      
      setUsers(userList);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (userId: string, type: 'customer' | 'branch' | 'operator' | 'admin', entityId: string) => {
    try {
      if (!isAdmin) {
        toast.error('Bu işlemi gerçekleştirmek için admin yetkisine sahip olmalısınız');
        return;
      }

      // First, remove any existing assignments
      await removeUserAssignments(userId);
      
      // Update user role in profiles table
      await supabase.rpc('update_user_role', {
        user_id: userId,
        new_role: type
      });
      
      // Then assign to the new entity if not admin
      if (type !== 'admin') {
        let updateResult;
        
        if (type === 'customer') {
          updateResult = await supabase
            .from('customers')
            .update({ auth_id: userId })
            .eq('id', entityId);
        } else if (type === 'branch') {
          updateResult = await supabase
            .from('branches')
            .update({ auth_id: userId })
            .eq('id', entityId);
        } else if (type === 'operator') {
          updateResult = await supabase
            .from('operators')
            .update({ auth_id: userId })
            .eq('id', entityId);
        }
        
        if (updateResult?.error) throw updateResult.error;
      }
      
      toast.success(`Kullanıcı ${type} olarak atandı`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error assigning user:', error);
      setError(error.message);
      toast.error(`Atama yapılırken bir hata oluştu: ${error.message}`);
    }
  };

  const removeUserAssignments = async (userId: string) => {
    try {
      // Remove from customers
      await supabase
        .from('customers')
        .update({ auth_id: null })
        .eq('auth_id', userId);
      
      // Remove from branches
      await supabase
        .from('branches')
        .update({ auth_id: null })
        .eq('auth_id', userId);
      
      // Remove from operators
      await supabase
        .from('operators')
        .update({ auth_id: null })
        .eq('auth_id', userId);
      
      return true;
    } catch (error) {
      console.error('Error removing user assignments:', error);
      return false;
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    if (!isAdmin) {
      toast.error('Bu işlemi gerçekleştirmek için admin yetkisine sahip olmalısınız');
      return;
    }
    
    if (!confirm('Bu kullanıcının atamasını kaldırmak istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      const success = await removeUserAssignments(userId);
      
      if (success) {
        // Update user role to basic user
        await supabase.rpc('update_user_role', {
          user_id: userId,
          new_role: 'user'
        });
        
        toast.success('Kullanıcı ataması kaldırıldı');
        fetchUsers();
      } else {
        throw new Error('Atama kaldırılamadı');
      }
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      setError(error.message);
      toast.error(`Atama kaldırılırken bir hata oluştu: ${error.message}`);
    }
  };

  const handleRefreshUsers = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
    toast.success('Kullanıcı listesi yenilendi');
  };

  const exportToExcel = () => {
    const data = users.map(user => ({
      'E-posta': user.email,
      'İsim': user.name || '',
      'Rol': user.role || 'user',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kullanıcılar');
    
    XLSX.writeFile(wb, 'kullanicilar.xlsx');
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'operator':
        return <UserCog className="h-4 w-4 text-blue-500" />;
      case 'customer':
        return <Building className="h-4 w-4 text-green-500" />;
      case 'branch':
        return <Building className="h-4 w-4 text-purple-500" />;
      case 'admin':
        return <User className="h-4 w-4 text-red-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;
  if (!isAdmin) return <div>Bu sayfaya erişim yetkiniz bulunmamaktadır.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">KULLANICI YÖNETİMİ</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshUsers}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 ${refreshing ? 'opacity-50' : ''}`}
            disabled={refreshing}
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            Yenile
          </button>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download size={20} />
            Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Kullanıcı Ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kullanıcı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-posta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Müşteri Olarak Ata
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Şube Olarak Ata
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operatör Olarak Ata
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {getRoleIcon(user.role || 'unknown')}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-100 text-red-800' :
                      user.role === 'operator' ? 'bg-blue-100 text-blue-800' :
                      user.role === 'customer' ? 'bg-green-100 text-green-800' :
                      user.role === 'branch' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      value={user.role === 'customer' ? 'customer' : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignUser(user.id, 'customer', e.target.value);
                        }
                      }}
                      disabled={user.role === 'admin'}
                    >
                      <option value="">Müşteri Seçin</option>
                      <option value="admin" disabled={user.role === 'admin'}>
                        Admin Yap
                      </option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      value={user.role === 'branch' ? 'branch' : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignUser(user.id, 'branch', e.target.value);
                        }
                      }}
                      disabled={user.role === 'admin'}
                    >
                      <option value="">Şube Seçin</option>
                      <option value="admin" disabled={user.role === 'admin'}>
                        Admin Yap
                      </option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                      value={user.role === 'operator' ? 'operator' : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAssignUser(user.id, 'operator', e.target.value);
                        }
                      }}
                      disabled={user.role === 'admin'}
                    >
                      <option value="">Operatör Seçin</option>
                      <option value="admin" disabled={user.role === 'admin'}>
                        Admin Yap
                      </option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {user.role !== 'admin' && (
                      <div className="flex justify-center space-x-2">
                        <button
                          onClick={() => handleAssignUser(user.id, 'admin', '')}
                          className="text-red-600 hover:text-red-800 px-2 py-1 rounded border border-red-600 hover:bg-red-50 text-xs"
                          title="Admin Yap"
                        >
                          Admin Yap
                        </button>
                        {user.role !== 'user' && (
                          <button
                            onClick={() => handleRemoveAssignment(user.id)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Atamayı Kaldır"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;