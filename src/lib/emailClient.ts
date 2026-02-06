import { supabase } from './supabase';

export const sendEmail = async (to: string, subject: string, html: string) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/send-schedule-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
    },
    body: JSON.stringify({ to, subject, html })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'E-posta gonderilemedi');
  }

  return await response.json();
};

// Function to get customer and branch emails
export const getRecipientEmails = async (customerId: string, branchId?: string | null) => {
  try {
    // Get customer email
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('email')
      .eq('id', customerId)
      .single();
      
    if (customerError) throw customerError;
    
    const emails = [customerData.email];
    
    // Get branch email if provided
    if (branchId) {
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('email')
        .eq('id', branchId)
        .single();
        
      if (branchError) throw branchError;
      
      if (branchData.email && !emails.includes(branchData.email)) {
        emails.push(branchData.email);
      }
    }
    
    return emails.filter(Boolean); // Remove any null/undefined values
  } catch (error) {
    console.error('Error getting recipient emails:', error);
    return [];
  }
};