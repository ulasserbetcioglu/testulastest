import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { DollarSign, Fuel, User, Shield, TrendingUp, TrendingDown, Loader2, Calendar, Search, Filter, MapPin, Building } from 'lucide-react';
import { calculateDistance } from '../lib/utils'; // Assuming calculateDistance is available here

// --- ARAYÜZLER (INTERFACES) ---
interface Operator {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  kisa_isim: string;
}

interface Branch {
  id: string;
  sube_adi: string;
  latitude?: number;
  longitude?: number;
}

interface Visit {
  id: string;
  visit_date: string;
  operator_id: string;
  customer_id: string;
  branch_id: string | null;
  status: 'planned' | 'completed' | 'cancelled';
  customer: {
    id: string;
    kisa_isim: string;
    pricing?: { monthly_price?: number; per_visit_price?: number; }[];
  } | null;
  branch: {
    id: string;
    sube_adi: string;
    latitude?: number;
    longitude?: number;
    pricing?: { monthly_price?: number; per_visit_price?: number; }[];
  } | null;
}

interface PaidMaterialSale {
  id: string;
  visit_id: string;
  total_amount: number;
  customer_id: string; // Added for attribution
  branch_id: string | null; // Added for attribution
}

interface ProfitabilitySummary {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  revenueBreakdown: {
    monthlyContracts: number;
    perVisitSales: number;
    materialSales: number;
  };
  costBreakdown: {
    operatorWages: number;
    fuel: number;
    insurance: number;
    vehicleMaintenance: number;
    officeExpenses: number;
    otherInsuranceAndTax: number;
  };
}

interface OperatorProfitability {
  operatorId: string;
  operatorName: string;
  revenue: number;
  costs: number;
  netProfit: number;
  profitMargin: number;
  totalVisits: number;
  totalDistance: number;
  totalWorkingDays: number;
}

interface CustomerRevenue {
  id: string;
  name: string;
  totalRevenue: number;
}

interface BranchRevenue {
  id: string;
  name: string;
  totalRevenue: number;
}

interface PerVisitAnalysisItem {
  visitId: string;
  customerName: string;
  branchName: string;
  visitDate: string;
  revenue: number;
  allocatedCosts: number;
  profit: number;
}

// --- YARDIMCI BİLEŞENLER ---
const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; colorClass: string }> = ({ title, value, icon, colorClass }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg flex items-center gap-4 ${colorClass}`}>
    <div className="p-3 bg-white/20 rounded-full">{icon}</div>
    <div>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const ProfitabilityAnalysis: React.FC = () => {
  // --- STATE YÖNETİMİ ---
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('all');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Maliyet Parametreleri
  const [fuelCostPerKm, setFuelCostPerKm] = useState<number>(5.0); // TL/km
  const [minWagePerDay, setMinWagePerDay] = useState<number>(800); // TL/gün
  const [monthlyInsuranceCost, setMonthlyInsuranceCost] = useState<number>(200); // TL/ay/operatör
  const [monthlyVehicleMaintenanceCost, setMonthlyVehicleMaintenanceCost] = useState<number>(150); // TL/ay/operatör
  const [monthlyOfficeExpenses, setMonthlyOfficeExpenses] = useState<number>(100); // TL/ay/operatör
  const [monthlyOtherInsuranceAndTaxCost, setMonthlyOtherInsuranceAndTaxCost] = useState<number>(50); // TL/ay/operatör

  // Kalitatif Risk Değerlendirme
  const [fuelCostRisk, setFuelCostRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [wageCostRisk, setWageCostRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [insuranceCostRisk, setInsuranceCostRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [maintenanceCostRisk, setMaintenanceCostRisk] = useState<'low' | 'medium' | 'high'>('low');
  const [officeCostRisk, setOfficeCostRisk] = useState<'low' | 'medium' | 'high'>('low');

  const [summary, setSummary] = useState<ProfitabilitySummary | null>(null);
  const [operatorBreakdown, setOperatorBreakdown] = useState<OperatorProfitability[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New states for customer/branch revenue analysis
  const [customerRevenueAnalysis, setCustomerRevenueAnalysis] = useState<CustomerRevenue[]>([]);
  const [branchRevenueAnalysis, setBranchRevenueAnalysis] = useState<BranchRevenue[]>([]);

  // New state for per-visit analysis
  const [perVisitAnalysis, setPerVisitAnalysis] = useState<PerVisitAnalysisItem[]>([]);

  // Revenue thresholds for color-coding
  const LOW_REVENUE_THRESHOLD = 5000; // Example: Below 5000 TL is low
  const MEDIUM_REVENUE_THRESHOLD = 15000; // Example: Between 5000 and 15000 TL is medium
  const PROFIT_THRESHOLD_MEDIUM = 100; // Profit above this is considered high

  // --- VERİ ÇEKME ---
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const { data, error } = await supabase.from('operators').select('id, name').order('name');
        if (error) throw error;
        setOperators([{ id: 'all', name: 'Tüm Operatörler' }, ...(data || [])]);
      } catch (err: any) {
        toast.error("Operatörler yüklenirken hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    fetchOperators();
  }, []);

  // --- KARLILIK HESAPLAMA ---
  const calculateProfitability = useCallback(async () => {
    setCalculating(true);
    setError(null);
    setSummary(null);
    setOperatorBreakdown([]);
    setCustomerRevenueAnalysis([]);
    setBranchRevenueAnalysis([]);
    setPerVisitAnalysis([]); // Reset per-visit analysis

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day

      // Fetch all necessary data
      const [visitsRes, salesRes, customerPricingRes, branchPricingRes] = await Promise.all([
        supabase.from('visits').select(`
          id, visit_date, operator_id, customer_id, branch_id, status,
          customer:customer_id(id, kisa_isim, pricing:customer_pricing(monthly_price, per_visit_price)),
          branch:branch_id(id, sube_adi, latitude, longitude, pricing:branch_pricing(monthly_price, per_visit_price))
        `).eq('status', 'completed').gte('visit_date', start.toISOString()).lte('visit_date', end.toISOString()),
        supabase.from('paid_material_sales').select('visit_id, total_amount, customer_id, branch_id').gte('sale_date', start.toISOString()).lte('sale_date', end.toISOString()),
        supabase.from('customer_pricing').select('customer_id, monthly_price, per_visit_price'),
        supabase.from('branch_pricing').select('branch_id, monthly_price, per_visit_price'),
      ]);

      if (visitsRes.error) throw visitsRes.error;
      if (salesRes.error) throw salesRes.error;
      if (customerPricingRes.error) throw customerPricingRes.error;
      if (branchPricingRes.error) throw branchPricingRes.error;

      const allVisits: Visit[] = visitsRes.data || [];
      const allSales: PaidMaterialSale[] = salesRes.data || [];
      const allCustomerPricing = customerPricingRes.data || [];
      const allBranchPricing = branchPricingRes.data || [];

      // Fetch all customers and branches for comprehensive analysis
      const { data: allCustomersData, error: allCustomersError } = await supabase.from('customers').select('id, kisa_isim');
      if (allCustomersError) throw allCustomersError;

      const { data: allBranchesData, error: allBranchesError } = await supabase.from('branches').select('id, sube_adi, customer_id');
      if (allBranchesError) throw allBranchesError;

      // Filter visits by selected operator
      const filteredVisits = selectedOperatorId === 'all'
        ? allVisits
        : allVisits.filter(visit => visit.operator_id === selectedOperatorId);

      // --- REVENUE CALCULATION ---
      let totalMonthlyContractsRevenue = 0;
      let totalPerVisitSalesRevenue = 0;
      let totalMaterialSalesRevenue = 0;

      // Initialize revenue maps for customer and branch analysis
      const customerRevenueMap = new Map<string, number>();
      const branchRevenueMap = new Map<string, number>();

      allCustomersData.forEach(c => customerRevenueMap.set(c.id, 0));
      allBranchesData.forEach(b => branchRevenueMap.set(b.id, 0));

      // Monthly Contracts (avoid double counting if both customer and branch have monthly pricing)
      const processedMonthlyEntities = new Set<string>(); // To track customer_id or branch_id
      allCustomerPricing.forEach(cp => {
        if (cp.monthly_price && !processedMonthlyEntities.has(`customer-${cp.customer_id}`)) {
          totalMonthlyContractsRevenue += cp.monthly_price;
          customerRevenueMap.set(cp.customer_id, (customerRevenueMap.get(cp.customer_id) || 0) + cp.monthly_price);
          processedMonthlyEntities.add(`customer-${cp.customer_id}`);
        }
      });
      allBranchPricing.forEach(bp => {
        if (bp.monthly_price && !processedMonthlyEntities.has(`branch-${bp.branch_id}`)) {
          totalMonthlyContractsRevenue += bp.monthly_price;
          branchRevenueMap.set(bp.branch_id, (branchRevenueMap.get(bp.branch_id) || 0) + bp.monthly_price);
          processedMonthlyEntities.add(`branch-${bp.branch_id}`);
        }
      });

      // Per-Visit Sales & Material Sales (per operator breakdown)
      const operatorProfitabilityMap = new Map<string, OperatorProfitability>();
      const operatorCostAllocationMap = new Map<string, { totalCosts: number; totalVisits: number; }>();

      operators.forEach(op => {
        if (op.id === 'all') return; // Skip 'all' operator
        operatorProfitabilityMap.set(op.id, {
          operatorId: op.id,
          operatorName: op.name,
          revenue: 0,
          costs: 0,
          netProfit: 0,
          profitMargin: 0,
          totalVisits: 0,
          totalDistance: 0,
          totalWorkingDays: 0,
        });
        operatorCostAllocationMap.set(op.id, { totalCosts: 0, totalVisits: 0 });
      });

      // Process visits for per-visit revenue and operator breakdown
      const visitsByOperator: Record<string, Visit[]> = {};
      filteredVisits.forEach(visit => {
        if (!visitsByOperator[visit.operator_id]) {
          visitsByOperator[visit.operator_id] = [];
        }
        visitsByOperator[visit.operator_id].push(visit);
      });

      // Calculate monthly visit counts for each customer/branch for accurate monthly pricing distribution
      const monthlyVisitCountsByCustomer: Map<string, Map<number, number>> = new Map(); // Map<customerId, Map<monthIndex, count>>
      const monthlyVisitCountsByBranch: Map<string, Map<number, number>> = new Map();   // Map<branchId, Map<monthIndex, count>>

      filteredVisits.forEach(visit => {
        const visitDate = new Date(visit.visit_date);
        const month = visitDate.getMonth(); // 0-11

        // For customer
        if (visit.customer_id) {
          if (!monthlyVisitCountsByCustomer.has(visit.customer_id)) {
            monthlyVisitCountsByCustomer.set(visit.customer_id, new Map());
          }
          const customerMonthMap = monthlyVisitCountsByCustomer.get(visit.customer_id)!;
          customerMonthMap.set(month, (customerMonthMap.get(month) || 0) + 1);
        }

        // For branch
        if (visit.branch_id) {
          if (!monthlyVisitCountsByBranch.has(visit.branch_id)) {
            monthlyVisitCountsByBranch.set(visit.branch_id, new Map());
          }
          const branchMonthMap = monthlyVisitCountsByBranch.get(visit.branch_id)!;
          branchMonthMap.set(month, (branchMonthMap.get(month) || 0) + 1);
        }
      });

      // Create pricing lookup maps for efficiency
      const customerPricingMap = new Map(allCustomerPricing.map(cp => [cp.customer_id, cp]));
      const branchPricingMap = new Map(allBranchPricing.map(bp => [bp.branch_id, bp]));

      for (const opId in visitsByOperator) {
        const operatorVisits = visitsByOperator[opId].sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());
        let currentOperatorPerVisitRevenue = 0;
        let currentOperatorTotalDistance = 0;
        let lastVisitLocation: { latitude: number; longitude: number } | null = null;

        operatorVisits.forEach(visit => {
          // Per-Visit Revenue Calculation (aligned with calendar page logic)
          let visitRevenue = 0;
          const visitDate = new Date(visit.visit_date);
          const month = visitDate.getMonth();

          const branchPriceInfo = visit.branch_id ? branchPricingMap.get(visit.branch_id) : undefined;
          const customerPriceInfo = visit.customer_id ? customerPricingMap.get(visit.customer_id) : undefined;

          // Pricing hierarchy:
          // 1. Branch per-visit price
          if (branchPriceInfo?.per_visit_price) {
            visitRevenue = branchPriceInfo.per_visit_price;
          }
          // 2. Customer per-visit price (if branch doesn't have one)
          else if (customerPriceInfo?.per_visit_price) {
            visitRevenue = customerPriceInfo.per_visit_price;
          }
          // 3. Branch monthly price distributed per visit
          else if (branchPriceInfo?.monthly_price) {
            const branchVisitsThisMonth = monthlyVisitCountsByBranch.get(visit.branch_id!)?.get(month) || 1;
            visitRevenue = branchPriceInfo.monthly_price / branchVisitsThisMonth;
          }
          // 4. Customer monthly price distributed per visit
          else if (customerPriceInfo?.monthly_price) {
            const customerVisitsThisMonth = monthlyVisitCountsByCustomer.get(visit.customer_id)?.get(month) || 1;
            visitRevenue = customerPriceInfo.monthly_price / customerVisitsThisMonth;
          }
          currentOperatorPerVisitRevenue += visitRevenue;

          // Attribute to customer and branch revenue maps
          if (visit.customer_id) {
            customerRevenueMap.set(visit.customer_id, (customerRevenueMap.get(visit.customer_id) || 0) + visitRevenue);
          }
          if (visit.branch_id) {
            branchRevenueMap.set(visit.branch_id, (branchRevenueMap.get(visit.branch_id) || 0) + visitRevenue);
          }

          // Distance Calculation
          if (visit.branch?.latitude && visit.branch?.longitude) {
            if (lastVisitLocation) {
              currentOperatorTotalDistance += calculateDistance(
                lastVisitLocation.latitude,
                lastVisitLocation.longitude,
                visit.branch.latitude,
                visit.branch.longitude
              );
            }
            lastVisitLocation = { latitude: visit.branch.latitude, longitude: visit.branch.longitude };
          }

          // Update operator's total visits
          const opStats = operatorProfitabilityMap.get(opId);
          if (opStats) {
            opStats.totalVisits++;
          }
        });

        totalPerVisitSalesRevenue += currentOperatorPerVisitRevenue;
        const opStats = operatorProfitabilityMap.get(opId);
        if (opStats) {
          opStats.revenue += currentOperatorPerVisitRevenue;
          opStats.totalDistance = currentOperatorTotalDistance;
        }
      }

      // Material Sales Revenue
      const salesByVisitId = new Map(allSales.map(sale => [sale.visit_id, sale]));
      filteredVisits.forEach(visit => {
        const sale = salesByVisitId.get(visit.id);
        if (sale) {
          totalMaterialSalesRevenue += sale.total_amount;
          const opStats = operatorProfitabilityMap.get(visit.operator_id);
          if (opStats) {
            opStats.revenue += sale.total_amount;
          }
          // Attribute material sales to customer and branch revenue maps
          if (sale.customer_id) {
            customerRevenueMap.set(sale.customer_id, (customerRevenueMap.get(sale.customer_id) || 0) + sale.total_amount);
          }
          if (sale.branch_id) {
            branchRevenueMap.set(sale.branch_id, (branchRevenueMap.get(sale.branch_id) || 0) + sale.total_amount);
          }
        }
      });

      const overallTotalRevenue = totalMonthlyContractsRevenue + totalPerVisitSalesRevenue + totalMaterialSalesRevenue;

      // --- COST CALCULATION ---
      const totalDaysInPeriod = differenceInDays(end, start) + 1;
      const monthsInPeriod = Math.ceil(totalDaysInPeriod / 30); // Approximate months

      // Declare overall cost variables outside the loop
      let overallTotalWages = 0;
      let overallTotalFuelCost = 0;
      let overallTotalInsuranceCost = 0;
      let overallTotalVehicleMaintenanceCost = 0;
      let overallTotalOfficeExpenses = 0;
      let overallTotalOtherInsuranceAndTaxCost = 0;

      for (const opId in visitsByOperator) {
        const opStats = operatorProfitabilityMap.get(opId);
        if (!opStats) continue;

        // Operator Wages
        const operatorWages = minWagePerDay * totalDaysInPeriod;
        overallTotalWages += operatorWages;
        opStats.costs += operatorWages;
        opStats.totalWorkingDays = totalDaysInPeriod;

        // Fuel Cost
        const fuelCost = opStats.totalDistance * fuelCostPerKm;
        overallTotalFuelCost += fuelCost;
        opStats.costs += fuelCost;

        // Insurance Cost (per operator)
        const insuranceCost = monthlyInsuranceCost * monthsInPeriod;
        overallTotalInsuranceCost += insuranceCost;
        opStats.costs += insuranceCost;

        // Vehicle Maintenance Cost (per operator)
        const vehicleMaintenanceCost = monthlyVehicleMaintenanceCost * monthsInPeriod;
        overallTotalVehicleMaintenanceCost += vehicleMaintenanceCost;
        opStats.costs += vehicleMaintenanceCost;

        // Office Expenses (per operator)
        const officeExpenses = monthlyOfficeExpenses * monthsInPeriod;
        overallTotalOfficeExpenses += officeExpenses;
        opStats.costs += officeExpenses;

        // Other Insurance and Tax Cost (per operator)
        const otherInsuranceAndTaxCost = monthlyOtherInsuranceAndTaxCost * monthsInPeriod;
        overallTotalOtherInsuranceAndTaxCost += otherInsuranceAndTaxCost;
        opStats.costs += otherInsuranceAndTaxCost;

        // Store total costs and visit count for per-visit allocation
        operatorCostAllocationMap.set(opId, {
          totalCosts: opStats.costs,
          totalVisits: opStats.totalVisits,
        });
      }

      const overallTotalCosts = overallTotalWages + overallTotalFuelCost + overallTotalInsuranceCost + overallTotalVehicleMaintenanceCost + overallTotalOfficeExpenses + overallTotalOtherInsuranceAndTaxCost;

      // --- PROFITABILITY ---
      const overallNetProfit = overallTotalRevenue - overallTotalCosts;
      const overallProfitMargin = overallTotalRevenue > 0 ? (overallNetProfit / overallTotalRevenue) * 100 : 0;

      setSummary({
        totalRevenue: overallTotalRevenue,
        totalCosts: overallTotalCosts,
        netProfit: overallNetProfit,
        profitMargin: overallProfitMargin,
        revenueBreakdown: {
          monthlyContracts: totalMonthlyContractsRevenue,
          perVisitSales: totalPerVisitSalesRevenue,
          materialSales: totalMaterialSalesRevenue,
        },
        costBreakdown: {
          operatorWages: overallTotalWages,
          fuel: overallTotalFuelCost,
          insurance: overallTotalInsuranceCost,
          vehicleMaintenance: overallTotalVehicleMaintenanceCost,
          officeExpenses: overallTotalOfficeExpenses,
          otherInsuranceAndTax: overallTotalOtherInsuranceAndTaxCost,
        },
      });

      // Finalize operator breakdown
      const finalOperatorBreakdown: OperatorProfitability[] = [];
      operatorProfitabilityMap.forEach(opStats => {
        const netProfit = opStats.revenue - opStats.costs;
        const profitMargin = opStats.revenue > 0 ? (netProfit / opStats.revenue) * 100 : 0;
        finalOperatorBreakdown.push({
          ...opStats,
          netProfit,
          profitMargin,
        });
      });
      setOperatorBreakdown(finalOperatorBreakdown.sort((a, b) => b.netProfit - a.netProfit));

      // Finalize customer and branch revenue analysis
      const finalCustomerRevenueAnalysis: CustomerRevenue[] = Array.from(customerRevenueMap.entries()).map(([id, totalRevenue]) => ({
        id,
        name: allCustomersData.find(c => c.id === id)?.kisa_isim || 'Bilinmeyen Müşteri',
        totalRevenue,
      })).sort((a, b) => b.totalRevenue - a.totalRevenue);

      const finalBranchRevenueAnalysis: BranchRevenue[] = Array.from(branchRevenueMap.entries()).map(([id, totalRevenue]) => ({
        id,
        name: allBranchesData.find(b => b.id === id)?.sube_adi || 'Bilinmeyen Şube',
        totalRevenue,
      })).sort((a, b) => b.totalRevenue - a.totalRevenue);

      setCustomerRevenueAnalysis(finalCustomerRevenueAnalysis);
      setBranchRevenueAnalysis(finalBranchRevenueAnalysis);

      // --- PER-VISIT ANALYSIS ---
      const perVisitData: PerVisitAnalysisItem[] = [];
      filteredVisits.forEach(visit => {
        const operatorAllocation = operatorCostAllocationMap.get(visit.operator_id);
        let allocatedCosts = 0;
        if (operatorAllocation && operatorAllocation.totalVisits > 0) {
          allocatedCosts = operatorAllocation.totalCosts / operatorAllocation.totalVisits;
        }

        let visitRevenue = 0;
        const visitDate = new Date(visit.visit_date);
        const month = visitDate.getMonth();

        const branchPriceInfo = visit.branch_id ? branchPricingMap.get(visit.branch_id) : undefined;
        const customerPriceInfo = visit.customer_id ? customerPricingMap.get(visit.customer_id) : undefined;

        if (branchPriceInfo?.per_visit_price) {
          visitRevenue = branchPriceInfo.per_visit_price;
        } else if (customerPriceInfo?.per_visit_price) {
          visitRevenue = customerPriceInfo.per_visit_price;
        } else if (branchPriceInfo?.monthly_price) {
          const branchVisitsThisMonth = monthlyVisitCountsByBranch.get(visit.branch_id!)?.get(month) || 1;
          visitRevenue = branchPriceInfo.monthly_price / branchVisitsThisMonth;
        } else if (customerPriceInfo?.monthly_price) {
          const customerVisitsThisMonth = monthlyVisitCountsByCustomer.get(visit.customer_id)?.get(month) || 1;
          visitRevenue = customerPriceInfo.monthly_price / customerVisitsThisMonth;
        }
        
        const sale = salesByVisitId.get(visit.id);
        if (sale) {
          visitRevenue += sale.total_amount;
        }

        const profit = visitRevenue - allocatedCosts;

        perVisitData.push({
          visitId: visit.id,
          customerName: visit.customer?.kisa_isim || 'Bilinmeyen Müşteri',
          branchName: visit.branch?.sube_adi || 'Genel Merkez',
          visitDate: format(new Date(visit.visit_date), 'dd.MM.yyyy HH:mm', { locale: tr }),
          revenue: visitRevenue,
          allocatedCosts: allocatedCosts,
          profit: profit,
        });
      });
      setPerVisitAnalysis(perVisitData.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()));

    } catch (err: any) {
      setError(err.message);
      toast.error(`Hesaplama sırasında hata: ${err.message}`);
      console.error("Profitability calculation error:", err);
    } finally {
      setCalculating(false);
    }
  }, [selectedOperatorId, startDate, endDate, fuelCostPerKm, minWagePerDay, monthlyInsuranceCost, monthlyVehicleMaintenanceCost, monthlyOfficeExpenses, monthlyOtherInsuranceAndTaxCost, operators]);

  // Helper to get color for profitability
  const getProfitabilityColor = (revenue: number) => {
    if (revenue < LOW_REVENUE_THRESHOLD) return 'bg-red-100 text-red-800';
    if (revenue < MEDIUM_REVENUE_THRESHOLD) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getProfitColor = (profit: number) => {
    if (profit < 0) return 'text-red-600';
    if (profit < PROFIT_THRESHOLD_MEDIUM) return 'text-orange-600';
    return 'text-green-600';
  };

  // --- RENDER ---
  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Karlılık Analizi</h1>
      </header>

      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Parametreler</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operatör</label>
            <select value={selectedOperatorId} onChange={(e) => setSelectedOperatorId(e.target.value)} className="w-full p-2 border rounded-lg">
              {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yakıt Maliyeti (₺/km)</label>
            <input type="number" step="0.1" value={fuelCostPerKm} onChange={(e) => setFuelCostPerKm(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asgari Ücret (₺/gün)</label>
            <input type="number" step="1" value={minWagePerDay} onChange={(e) => setMinWagePerDay(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aylık Sigorta (₺/operatör)</label>
            <input type="number" step="1" value={monthlyInsuranceCost} onChange={(e) => setMonthlyInsuranceCost(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aylık Araç Bakım (₺/operatör)</label>
            <input type="number" step="1" value={monthlyVehicleMaintenanceCost} onChange={(e) => setMonthlyVehicleMaintenanceCost(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aylık Ofis Giderleri (₺/operatör)</label>
            <input type="number" step="1" value={monthlyOfficeExpenses} onChange={(e) => setMonthlyOfficeExpenses(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aylık Diğer Sigorta/Vergi (₺/operatör)</label>
            <input type="number" step="1" value={monthlyOtherInsuranceAndTaxCost} onChange={(e) => setMonthlyOtherInsuranceAndTaxCost(parseFloat(e.target.value))} className="w-full p-2 border rounded-lg" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={calculateProfitability} disabled={calculating} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
            {calculating ? <Loader2 className="animate-spin" /> : <Calendar />}
            {calculating ? 'Hesaplanıyor...' : 'Analiz Et'}
          </button>
        </div>
      </div>

      {/* Kalitatif Risk Değerlendirme */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Maliyet Risk Değerlendirmesi (Kalitatif)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yakıt Maliyeti Riski</label>
            <select value={fuelCostRisk} onChange={(e) => setFuelCostRisk(e.target.value as 'low' | 'medium' | 'high')} className="w-full p-2 border rounded-lg">
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asgari Ücret Riski</label>
            <select value={wageCostRisk} onChange={(e) => setWageCostRisk(e.target.value as 'low' | 'medium' | 'high')} className="w-full p-2 border rounded-lg">
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sigorta Maliyeti Riski</label>
            <select value={insuranceCostRisk} onChange={(e) => setInsuranceCostRisk(e.target.value as 'low' | 'medium' | 'high')} className="w-full p-2 border rounded-lg">
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Araç Bakım Maliyeti Riski</label>
            <select value={maintenanceCostRisk} onChange={(e) => setMaintenanceCostRisk(e.target.value as 'low' | 'medium' | 'high')} className="w-full p-2 border rounded-lg">
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ofis Giderleri Riski</label>
            <select value={officeCostRisk} onChange={(e) => setOfficeCostRisk(e.target.value as 'low' | 'medium' | 'high')} className="w-full p-2 border rounded-lg">
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-8">{error}</div>}

      {summary && (
        <>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Genel Karlılık Özeti</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Toplam Gelir" value={summary.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} icon={<DollarSign />} colorClass="bg-green-50" />
            <StatCard title="Toplam Maliyet" value={summary.totalCosts.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} icon={<Fuel />} colorClass="bg-red-50" />
            <StatCard title="Net Kar" value={summary.netProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} icon={<TrendingUp />} colorClass={summary.netProfit >= 0 ? 'bg-blue-50' : 'bg-red-50'} />
            <StatCard title="Kar Marjı" value={`${summary.profitMargin.toFixed(2)}%`} icon={<TrendingDown />} colorClass={summary.profitMargin >= 0 ? 'bg-blue-50' : 'bg-red-50'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Gelir Dağılımı</h3>
              <ul className="space-y-2">
                <li>Aylık Anlaşmalar: {summary.revenueBreakdown.monthlyContracts.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</li>
                <li>Ziyaret Başı Satışlar: {summary.revenueBreakdown.perVisitSales.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</li>
                <li>Malzeme Satışları: {summary.revenueBreakdown.materialSales.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</li>
              </ul>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Maliyet Dağılımı</h3>
              <ul className="space-y-2">
                <li>Operatör Maaşları: {summary.costBreakdown.operatorWages.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</li>
                <li>Yakıt Maliyeti: {summary.costBreakdown.fuel.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</li>
                <li>Sigorta Maliyeti: {summary.costBreakdown.insurance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</li>
                <li>Araç Bakım Maliyeti: {summary.costBreakdown.vehicleMaintenance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</li>
                <li>Ofis Giderleri: {summary.costBreakdown.officeExpenses.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</li>
                <li>Diğer Sigorta/Vergi: {summary.costBreakdown.otherInsuranceAndTax.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</li>
              </ul>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">Operatör Bazlı Karlılık</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operatör</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gelir</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Maliyet</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Kar</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kar Marjı</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Ziyaret</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Mesafe (km)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışma Günü</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {operatorBreakdown.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Veri bulunamadı.</td></tr>
                ) : (
                  operatorBreakdown.map(op => (
                    <tr key={op.operatorId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{op.operatorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{op.revenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{op.costs.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right" style={{ color: op.netProfit >= 0 ? '#10B981' : '#EF4444' }}>{op.netProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{op.profitMargin.toFixed(2)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{op.totalVisits}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{op.totalDistance.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{op.totalWorkingDays}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Müşteri ve Şube Fiyatlandırma Analizi</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Müşteri Fiyatlandırma Karlılığı</h3>
              <div className="space-y-2">
                {customerRevenueAnalysis.length === 0 ? (
                  <p className="text-gray-500">Müşteri verisi bulunamadı.</p>
                ) : (
                  customerRevenueAnalysis.map(customer => (
                    <div key={customer.id} className={`p-3 rounded-lg flex justify-between items-center ${getProfitabilityColor(customer.totalRevenue)}`}>
                      <span className="font-medium">{customer.name}</span>
                      <span className="font-bold">{customer.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Şube Fiyatlandırma Karlılığı</h3>
              <div className="space-y-2">
                {branchRevenueAnalysis.length === 0 ? (
                  <p className="text-gray-500">Şube verisi bulunamadı.</p>
                ) : (
                  branchRevenueAnalysis.map(branch => (
                    <div key={branch.id} className={`p-3 rounded-lg flex justify-between items-center ${getProfitabilityColor(branch.totalRevenue)}`}>
                      <span className="font-medium">{branch.name}</span>
                      <span className="font-bold">{branch.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-bold mb-2">Karlılık Göstergesi:</p>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full bg-red-100 text-red-800">Düşük Karlılık ( &lt; {LOW_REVENUE_THRESHOLD.toLocaleString('tr-TR')} ₺)</span>
              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800">Orta Karlılık ( {LOW_REVENUE_THRESHOLD.toLocaleString('tr-TR')} ₺ - {MEDIUM_REVENUE_THRESHOLD.toLocaleString('tr-TR')} ₺)</span>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-800">Yüksek Karlılık ( &gt; {MEDIUM_REVENUE_THRESHOLD.toLocaleString('tr-TR')} ₺)</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Ziyaret Bazlı Karlılık Analizi</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gelir</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Maliyet</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Kar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {perVisitAnalysis.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Ziyaret verisi bulunamadı.</td></tr>
                ) : (
                  perVisitAnalysis.map(visit => (
                    <tr key={visit.visitId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{visit.visitDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{visit.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{visit.branchName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{visit.revenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{visit.allocatedCosts.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right" style={{ color: getProfitColor(visit.profit) }}>{visit.profit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitabilityAnalysis;
