import { supabase } from './supabase';

export interface LocalSession {
  type: 'customer' | 'branch';
  id: string;
  email: string;
  name: string;
  customerId?: string;
}

const SESSION_KEY = 'local_session';

export const localAuth = {
  async signInCustomer(email: string, password: string): Promise<{ session: LocalSession | null; error: string | null }> {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, email, kisa_isim, password_hash')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        return { session: null, error: 'Giriş yapılırken hata oluştu' };
      }

      if (!customer) {
        return { session: null, error: 'E-posta veya parola hatalı' };
      }

      if (!customer.password_hash || customer.password_hash !== password) {
        return { session: null, error: 'E-posta veya parola hatalı' };
      }

      const session: LocalSession = {
        type: 'customer',
        id: customer.id,
        email: customer.email,
        name: customer.kisa_isim,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { session, error: null };
    } catch (err) {
      return { session: null, error: 'Beklenmeyen bir hata oluştu' };
    }
  },

  async signInBranch(email: string, password: string): Promise<{ session: LocalSession | null; error: string | null }> {
    try {
      const { data: branch, error } = await supabase
        .from('branches')
        .select('id, email, sube_adi, password_hash, customer_id')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        return { session: null, error: 'Giriş yapılırken hata oluştu' };
      }

      if (!branch) {
        return { session: null, error: 'E-posta veya parola hatalı' };
      }

      if (!branch.password_hash || branch.password_hash !== password) {
        return { session: null, error: 'E-posta veya parola hatalı' };
      }

      const session: LocalSession = {
        type: 'branch',
        id: branch.id,
        email: branch.email,
        name: branch.sube_adi,
        customerId: branch.customer_id,
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { session, error: null };
    } catch (err) {
      return { session: null, error: 'Beklenmeyen bir hata oluştu' };
    }
  },

  getSession(): LocalSession | null {
    try {
      const sessionStr = localStorage.getItem(SESSION_KEY);
      if (!sessionStr) return null;
      return JSON.parse(sessionStr) as LocalSession;
    } catch {
      return null;
    }
  },

  signOut(): void {
    localStorage.removeItem(SESSION_KEY);
  },

  isCustomerOrBranch(): boolean {
    const session = this.getSession();
    return session !== null && (session.type === 'customer' || session.type === 'branch');
  }
};
