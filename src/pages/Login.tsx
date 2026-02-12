import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { localAuth } from '../lib/localAuth';
import { Mail, Lock, Shield, User, Store, HardHat, ArrowRight, CheckCircle2 } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginType, setLoginType] = useState<'admin' | 'operator' | 'customer' | 'branch'>('admin');

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/');
        return;
      }

      const localSession = localAuth.getSession();
      if (localSession) {
        navigate('/');
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (loginType === 'customer') {
        const { session, error } = await localAuth.signInCustomer(email, password);
        if (error) throw new Error(error);
        if (session) window.location.href = '/customer';
      } else if (loginType === 'branch') {
        const { session, error } = await localAuth.signInBranch(email, password);
        if (error) throw new Error(error);
        if (session) window.location.href = '/branch';
      } else if (loginType === 'operator') {
        const { session, error } = await localAuth.signInOperator(email, password);
        if (error) throw new Error(error);
        if (session) window.location.href = '/operator';
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          switch (error.message) {
            case 'Invalid login credentials':
              throw new Error('E-posta veya parola hatalı');
            case 'Email not confirmed':
              throw new Error('E-posta adresi doğrulanmamış');
            default:
              throw error;
          }
        }

        if (data.session) {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getLoginTypeIcon = (type: string) => {
    switch (type) {
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'operator': return <HardHat className="w-4 h-4" />;
      case 'customer': return <User className="w-4 h-4" />;
      case 'branch': return <Store className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const loginTypes = [
    { id: 'admin', label: 'Admin', icon: Shield },
    { id: 'operator', label: 'Operatör', icon: HardHat },
    { id: 'branch', label: 'Şube', icon: Store },
    { id: 'customer', label: 'Müşteri', icon: User },
  ] as const;

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gray-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-gray-900" />
        <div className="h-full w-full bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row shadow-2xl rounded-2xl overflow-hidden m-4 bg-white/95 backdrop-blur-sm">

        {/* Left Side - Content/Brand */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-green-700 to-green-900 p-12 flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>

          <div className="relative z-10">
            <div className="mb-8">
              <img
                src="https://i.imgur.com/PajSpus.png"
                alt="İlaçlamatik Logo"
                className="h-20 w-auto object-contain brightness-0 invert opacity-90"
              />
            </div>

            <h1 className="text-4xl font-bold mb-6 leading-tight">
              Profesyonel İlaçlama Yönetim Sistemi
            </h1>
            <p className="text-green-100 text-lg leading-relaxed mb-8">
              Operasyonlarınızı, müşterilerinizi ve ekiplerinizi tek bir yerden güvenle yönetin.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center space-x-3 text-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span>Gelişmiş Raporlama</span>
            </div>
            <div className="flex items-center space-x-3 text-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span>Gerçek Zamanlı Takip</span>
            </div>
            <div className="flex items-center space-x-3 text-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span>Bulut Tabanlı Yönetim</span>
            </div>
          </div>

          <div className="relative z-10 mt-12 text-sm text-green-200">
            © 2024 Sistem İlaçlama. Tüm hakları saklıdır.
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 bg-white flex flex-col justify-center">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="text-center mb-8">
              <img src="https://i.imgur.com/PajSpus.png" alt="Logo" className="h-16 mx-auto mb-4 md:hidden" />
              <h2 className="text-3xl font-bold text-gray-900">Hoş Geldiniz</h2>
              <p className="mt-2 text-sm text-gray-600">
                Hesabınıza erişmek için lütfen giriş yapın
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Login Type Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Giriş Türü Seçiniz
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {loginTypes.map((type) => {
                    const Icon = type.icon;
                    const isActive = loginType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setLoginType(type.id)}
                        className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 border ${isActive
                          ? 'bg-green-50 border-green-200 text-green-700 shadow-sm ring-1 ring-green-200'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
                        <span>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                  <div className="mr-2 mt-0.5">⚠️</div>
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta Adresi
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                      placeholder="ornek@sirket.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Parola
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <a href="#" className="text-xs font-medium text-green-600 hover:text-green-500">
                      Parolamı unuttum?
                    </a>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 transform hover:translate-y-[-1px]"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Giriş yapılıyor...
                  </span>
                ) : (
                  <span className="flex items-center">
                    Giriş Yap <ArrowRight className="ml-2 w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
