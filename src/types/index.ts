export type Customer = {
  id: string;
  musteri_no: string;
  kisa_isim: string;
  cari_isim?: string;
  adres: string;
  sehir: string;
  telefon: string;
  email: string;
  parola: string;
  created_at: string;
  updated_at: string;
  pricing?: CustomerPricing;
  floor_plan?: FloorPlan;
  latitude?: number;
  longitude?: number;
  tax_number?: string;
  tax_office?: string;
  is_one_time?: boolean;
  assigned_operator_id?: string | null;
  assigned_operator?: { name: string } | null;
};

type CustomerPricing = {
  id: string;
  customer_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
  created_at: string;
  updated_at: string;
};

type BranchPricing = {
  id: string;
  branch_id: string;
  monthly_price: number | null;
  per_visit_price: number | null;
  created_at: string;
  updated_at: string;
};

export type Branch = {
  id: string;
  customer_id: string;
  sube_adi: string;
  adres: string;
  sehir: string;
  telefon: string;
  email: string;
  latitude?: number;
  longitude?: number;
  pricing?: BranchPricing;
  floor_plan?: FloorPlan;
  is_one_time?: boolean;
  assigned_operator_id?: string | null;
  assigned_operator?: { name: string } | null;
};

export type Treatment = {
  id: string;
  customer_id: string;
  branch_id: string | null;
  operator_id: string;
  tarih: string;
  tur: string;
  durum: 'beklemede' | 'tamamlandi' | 'iptal';
  notlar: string;
};

export type Offer = {
  id: string;
  customer_id: string;
  branch_id: string | null;
  teklif_no: string;
  tarih: string;
  gecerlilik: string;
  tur: 'satis' | 'satin_alma';
  durum: 'beklemede' | 'kabul' | 'red';
  tutar: number;
  aciklama: string;
};

export type Operator = { // Changed to export type
  id: string;
  name: string;
  phone: string;
  email: string;
  role?: string; // Made optional as it might come from profiles table
  treatmentsCompleted?: number; // Made optional
  auth_id?: string; // Added auth_id
  assigned_customers?: string[]; // Added assigned_customers
  assigned_branches?: string[]; // Added assigned_branches
  status?: string; // Added status
  created_at?: string; // Added created_at
  updated_at?: string; // Added updated_at
  total_leave_days?: number; // Added total_leave_days
};

type NavItem = {
  name: string;
  path: string;
  icon: string;
};

export type VisitWithDistance = {
  id: string;
  customer_id: string;
  branch_id: string | null;
  operator_id: string;
  visit_date: string;
  status: 'planned' | 'completed' | 'cancelled';
  branch?: {
    latitude?: number;
    longitude?: number;
  };
  customer?: {
    pricing?: {
      monthly_price?: number;
      per_visit_price?: number;
    }[];
  };
  branch_pricing?: {
    monthly_price?: number;
    per_visit_price?: number;
  };
  distance?: number;
};

export type DailyDistanceStats = {
  date: string;
  totalDistance: number;
  visitCount: number;
  averageDistance: number;
  revenue?: number;
};

type FloorPlan = {
  width: number;
  height: number;
  background?: string;
  elements: FloorPlanElement[];
};

type FloorPlanElement = {
  id: string;
  type: 'wall' | 'door' | 'window' | 'equipment' | 'text' | 'room';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  text?: string;
  equipmentId?: string;
  equipmentCode?: string;
  hasActivity?: boolean;
  lastActivity?: boolean;
};

type BranchEquipment = {
  id: string;
  branch_id: string;
  equipment_id: string;
  equipment_code: string;
  department: string;
  equipment: {
    id: string;
    name: string;
    type: string;
    properties?: Record<string, {
      type: string;
      label: string;
    }>;
  };
  last_check?: Record<string, any>;
};
