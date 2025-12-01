'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getApiUrl } from '@/lib/config';
import { 
  ArrowLeft, User, DollarSign, Wrench, Package, Target,
  TrendingUp, TrendingDown, Calendar, BarChart3, PieChart,
  CheckCircle, Clock, AlertTriangle, Award, Activity
} from 'lucide-react';

interface AdvisorDetails {
  name: string;
  // RO Billing Data
  totalROs: number;
  freeService: number;
  paidService: number;
  runningRepair: number;
  labourAmount: number;
  partAmount: number;
  totalRevenue: number;
  // Operations Data
  vasAmount: number;
  withoutVasAmount: number;
  operationCount: number;
  // Target Data
  targetAmount: number;
  achievedAmount: number;
  shortfall: number;
  perDayAsking: number;
  daysRemaining: number;
}

const AdvisorDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const advisorName = decodeURIComponent(params.advisorName as string);
  const { user } = useAuth();
  
  const [advisorData, setAdvisorData] = useState<AdvisorDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetData, setTargetData] = useState<any>(null);

  // Fetch target data from localStorage (client-side only)
  useEffect(() => {
    if (!user?.city || !advisorName) return;

    try {
      // Get current month for target lookup
      const currentDate = new Date();
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Use the same localStorage keys as reports/targets page
      const ADVISOR_ASSIGNMENTS_KEY = "advisor_field_targets_v1";
      const advisorTargetsData = localStorage.getItem(ADVISOR_ASSIGNMENTS_KEY);
      
      console.log('🔍 Debug Target Lookup (Reports/Targets Logic):');
      console.log('- Advisor Name:', advisorName);
      console.log('- User City:', user.city);
      console.log('- Target Key:', ADVISOR_ASSIGNMENTS_KEY);
      console.log('- Found Data:', advisorTargetsData);
      
      if (advisorTargetsData) {
        const assignments = JSON.parse(advisorTargetsData);
        console.log('- Parsed assignments:', assignments);
        
        // Find assignment for this advisor and city (same logic as reports/targets)
        const assignment = assignments.find((assign: any) => 
          assign.advisorName === advisorName && assign.city === user.city
        );
        
        console.log('- Found assignment:', assignment);
        setTargetData(assignment || null);
      } else {
        console.log('- No assignment data found');
        setTargetData(null);
      }
    } catch (error) {
      console.error('Error loading advisor targets from localStorage:', error);
      setTargetData(null);
    }
  }, [user?.city, advisorName]);

  useEffect(() => {
    const fetchAdvisorDetails = async () => {
      if (!user?.email || !user?.city || !advisorName) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch RO Billing data
        const roBillingResponse = await fetch(
          getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=ro_billing`)
        );

        // Fetch Operations data
        const operationsResponse = await fetch(
          getApiUrl(`/api/service-manager/advisor-operations?uploadedBy=${user.email}&city=${user.city}&viewMode=cumulative`)
        );

        let roBillingData = { data: [] };
        let operationsData = { data: [] };

        if (roBillingResponse.ok) {
          roBillingData = await roBillingResponse.json();
        }
        if (operationsResponse.ok) {
          operationsData = await operationsResponse.json();
        }

        // Process RO Billing data for this advisor (same logic as reports/targets page)
        const advisorROs = roBillingData.data.filter((record: any) => 
          record.serviceAdvisor === advisorName
        );

        // Calculate achieved values using reports/targets page logic
        const achievedMap = {
          labour: 0,
          parts: 0,
          vehicles: 0,
          paid: 0,
          free: 0,
          rr: 0
        };

        advisorROs.forEach((record: any) => {
          // Labour and parts (same as reports/targets)
          achievedMap.labour += Number(record.labourAmt || 0);
          achievedMap.parts += Number(record.partAmt || 0);
          achievedMap.vehicles += 1;
          
          // Work type categorization (same as reports/targets)
          const workType = record.workType || '';
          if (workType.toLowerCase().includes("paid")) {
            achievedMap.paid += 1;
          }
          if (workType.toLowerCase().includes("free")) {
            achievedMap.free += 1;
          }
          const wt = workType.toLowerCase();
          if (wt.includes("r&r") || wt.includes("r and r") || wt.includes("running repair") || wt.includes("rr") || wt.includes("running")) {
            achievedMap.rr += 1;
          }
        });

        // Use achieved values for display
        const labourAmount = achievedMap.labour;
        const partAmount = achievedMap.parts;
        const freeService = achievedMap.free;
        const paidService = achievedMap.paid;
        const runningRepair = achievedMap.rr;

        // Process Operations data for this advisor
        const advisorOps = operationsData.data.find((op: any) => 
          op.advisorName === advisorName
        ) as any;

        const vasAmount = advisorOps?.totalMatchedAmount || 0;
        const operationCount = advisorOps?.totalOperationsCount || 0;
        const withoutVasAmount = vasAmount - labourAmount; // VAS - Labour = Without VAS

        // Calculate target performance (same logic as reports/targets page)
        const targetLabour = targetData?.labour || 0;
        const targetParts = targetData?.parts || 0;
        const targetTotalVehicles = targetData?.totalVehicles || 0;
        const targetPaidService = targetData?.paidService || 0;
        const targetFreeService = targetData?.freeService || 0;
        const targetRR = targetData?.rr || 0;

        // Calculate shortfalls using achievedMap values
        const labourShortfall = Math.max(0, targetLabour - achievedMap.labour);
        const partsShortfall = Math.max(0, targetParts - achievedMap.parts);
        const vehiclesShortfall = Math.max(0, targetTotalVehicles - achievedMap.vehicles);
        const paidServiceShortfall = Math.max(0, targetPaidService - achievedMap.paid);
        const freeServiceShortfall = Math.max(0, targetFreeService - achievedMap.free);

        // Calculate days remaining (same as reports/targets page)
        const daysInMonth = 30;
        const today = new Date().getDate();
        const daysRemaining = Math.max(1, daysInMonth - today);
        
        const labourPerDayAsking = daysRemaining > 0 ? Math.ceil(labourShortfall / daysRemaining) : 0;

        const details: AdvisorDetails = {
          name: advisorName,
          totalROs: achievedMap.vehicles,
          freeService,
          paidService,
          runningRepair,
          labourAmount: achievedMap.labour,
          partAmount: achievedMap.parts,
          totalRevenue: achievedMap.labour + achievedMap.parts,
          vasAmount,
          withoutVasAmount,
          operationCount,
          targetAmount: targetLabour,
          achievedAmount: achievedMap.labour,
          shortfall: labourShortfall,
          perDayAsking: labourPerDayAsking,
          daysRemaining
        };

        setAdvisorData(details);
      } catch (err) {
        setError('Failed to load advisor details. Please try again.');
        console.error('Error fetching advisor details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvisorDetails();
  }, [user?.email, user?.city, advisorName, targetData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getAchievementPercentage = () => {
    if (!advisorData || advisorData.targetAmount === 0) return 0;
    return Math.min(100, (advisorData.achievedAmount / advisorData.targetAmount) * 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading advisor details...</p>
        </div>
      </div>
    );
  }

  if (error || !advisorData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <User className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-600">{error || 'Advisor not found'}</p>
          <button 
            onClick={() => router.back()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const achievementPercentage = getAchievementPercentage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-3 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Advisors
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {advisorData.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{advisorData.name}</h1>
              <p className="text-gray-600">Service Advisor Performance Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <BarChart3 className="h-5 w-5" />
              </div>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold mb-1">{advisorData.totalROs}</div>
            <div className="text-blue-100 text-sm">Total ROs</div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold mb-1">{formatCurrency(advisorData.totalRevenue)}</div>
            <div className="text-green-100 text-sm">Total Revenue</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <Wrench className="h-5 w-5" />
              </div>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold mb-1">{advisorData.operationCount}</div>
            <div className="text-purple-100 text-sm">Operations</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <Target className="h-5 w-5" />
              </div>
              {achievementPercentage >= 100 ? <Award className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
            <div className="text-2xl font-bold mb-1">{achievementPercentage.toFixed(1)}%</div>
            <div className="text-orange-100 text-sm">Target Achievement</div>
          </div>
        </div>

        {/* RO Billing Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            RO Billing Performance
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700">{advisorData.freeService}</div>
                  <div className="text-sm text-green-600">Free Service</div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">{advisorData.paidService}</div>
                  <div className="text-sm text-blue-600">Paid Service</div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Wrench className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-700">{advisorData.runningRepair}</div>
                  <div className="text-sm text-orange-600">Running Repair</div>
                </div>
              </div>
            </div>
          </div>

          {/* Simple Bar Chart for Service Types */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Service Distribution</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-600">Free</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-500 h-4 rounded-full" 
                    style={{ width: `${(advisorData.freeService / advisorData.totalROs) * 100}%` }}
                  ></div>
                </div>
                <div className="w-12 text-sm text-gray-600">{advisorData.freeService}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-600">Paid</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-500 h-4 rounded-full" 
                    style={{ width: `${(advisorData.paidService / advisorData.totalROs) * 100}%` }}
                  ></div>
                </div>
                <div className="w-12 text-sm text-gray-600">{advisorData.paidService}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 text-sm text-gray-600">Repair</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-orange-500 h-4 rounded-full" 
                    style={{ width: `${(advisorData.runningRepair / advisorData.totalROs) * 100}%` }}
                  ></div>
                </div>
                <div className="w-12 text-sm text-gray-600">{advisorData.runningRepair}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Operations & VAS Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Operations & VAS Performance
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">{formatCurrency(advisorData.vasAmount)}</div>
                  <div className="text-sm text-purple-600">VAS Amount</div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Activity className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-700">{formatCurrency(advisorData.withoutVasAmount)}</div>
                  <div className="text-sm text-indigo-600">Without VAS</div>
                </div>
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="bg-teal-100 p-2 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-700">{advisorData.operationCount}</div>
                  <div className="text-sm text-teal-600">Operation Count</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Target Performance */}
        <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-red-500 to-red-600 p-2.5 shadow-md">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Target Performance</h2>
                <p className="text-sm text-gray-600 mt-1">Monthly targets vs achievements for {targetData?.month || 'Current Month'}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Days Remaining</div>
                <div className="text-2xl font-bold text-blue-600">{advisorData?.daysRemaining || 0}</div>
              </div>
            </div>
          </div>
          
          

          {targetData ? (
            <div className="space-y-6">
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Labour Achievement</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(advisorData.achievedAmount)}</p>
                      <p className="text-xs text-gray-500">Target: {formatCurrency(targetData.labour)}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${advisorData.achievedAmount >= targetData.labour ? 'text-green-600' : 'text-red-600'}`}>
                        {((advisorData.achievedAmount / targetData.labour) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Parts Achievement</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(advisorData.partAmount)}</p>
                      <p className="text-xs text-gray-500">Target: {formatCurrency(targetData.parts)}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${advisorData.partAmount >= targetData.parts ? 'text-green-600' : 'text-red-600'}`}>
                        {((advisorData.partAmount / targetData.parts) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Vehicles Serviced</p>
                      <p className="text-2xl font-bold text-purple-600">{advisorData.totalROs}</p>
                      <p className="text-xs text-gray-500">Target: {targetData.totalVehicles}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${advisorData.totalROs >= targetData.totalVehicles ? 'text-green-600' : 'text-red-600'}`}>
                        {((advisorData.totalROs / targetData.totalVehicles) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Performance Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Performance Breakdown</h3>
                  <p className="text-sm text-gray-600 mt-1">Complete target vs achievement analysis</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <th className="text-left py-4 px-6 font-semibold">Metric</th>
                        <th className="text-right py-4 px-4 font-semibold">Target</th>
                        <th className="text-right py-4 px-4 font-semibold">Achieved</th>
                        <th className="text-right py-4 px-4 font-semibold">Achievement %</th>
                        <th className="text-right py-4 px-4 font-semibold">Shortfall</th>
                        <th className="text-right py-4 px-6 font-semibold">Daily Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">💼</span>
                            <span className="font-medium text-gray-900">Labour Revenue</span>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold">{formatCurrency(targetData.labour)}</td>
                        <td className="text-right py-4 px-4 font-semibold text-green-600">{formatCurrency(advisorData.achievedAmount)}</td>
                        <td className="text-right py-4 px-4">
                          <span className={`font-bold ${advisorData.achievedAmount >= targetData.labour ? 'text-green-600' : 'text-red-600'}`}>
                            {((advisorData.achievedAmount / targetData.labour) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold text-red-600">{formatCurrency(advisorData.shortfall)}</td>
                        <td className="text-right py-4 px-6 font-semibold text-orange-600">{formatCurrency(advisorData.perDayAsking)}</td>
                      </tr>
                      
                      <tr className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🔧</span>
                            <span className="font-medium text-gray-900">Parts Revenue</span>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold">{formatCurrency(targetData.parts)}</td>
                        <td className="text-right py-4 px-4 font-semibold text-green-600">{formatCurrency(advisorData.partAmount)}</td>
                        <td className="text-right py-4 px-4">
                          <span className={`font-bold ${advisorData.partAmount >= targetData.parts ? 'text-green-600' : 'text-red-600'}`}>
                            {((advisorData.partAmount / targetData.parts) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold text-red-600">{formatCurrency(Math.max(0, targetData.parts - advisorData.partAmount))}</td>
                        <td className="text-right py-4 px-6 font-semibold text-orange-600">{formatCurrency(Math.ceil(Math.max(0, targetData.parts - advisorData.partAmount) / advisorData.daysRemaining))}</td>
                      </tr>
                      
                      <tr className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🚗</span>
                            <span className="font-medium text-gray-900">Total Vehicles</span>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold">{targetData.totalVehicles.toLocaleString()}</td>
                        <td className="text-right py-4 px-4 font-semibold text-green-600">{advisorData.totalROs.toLocaleString()}</td>
                        <td className="text-right py-4 px-4">
                          <span className={`font-bold ${advisorData.totalROs >= targetData.totalVehicles ? 'text-green-600' : 'text-red-600'}`}>
                            {((advisorData.totalROs / targetData.totalVehicles) * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold text-red-600">{Math.max(0, targetData.totalVehicles - advisorData.totalROs).toLocaleString()}</td>
                        <td className="text-right py-4 px-6 font-semibold text-orange-600">{Math.ceil(Math.max(0, targetData.totalVehicles - advisorData.totalROs) / advisorData.daysRemaining).toLocaleString()}</td>
                      </tr>
                      
                      <tr className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">💳</span>
                            <span className="font-medium text-gray-900">Paid Service</span>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold">{targetData.paidService.toLocaleString()}</td>
                        <td className="text-right py-4 px-4 font-semibold text-green-600">{advisorData.paidService.toLocaleString()}</td>
                        <td className="text-right py-4 px-4">
                          <span className={`font-bold ${advisorData.paidService >= targetData.paidService ? 'text-green-600' : 'text-red-600'}`}>
                            {targetData.paidService > 0 ? ((advisorData.paidService / targetData.paidService) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold text-red-600">{Math.max(0, targetData.paidService - advisorData.paidService).toLocaleString()}</td>
                        <td className="text-right py-4 px-6 font-semibold text-orange-600">{Math.ceil(Math.max(0, targetData.paidService - advisorData.paidService) / advisorData.daysRemaining).toLocaleString()}</td>
                      </tr>
                      
                      <tr className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🎁</span>
                            <span className="font-medium text-gray-900">Free Service</span>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold">{targetData.freeService.toLocaleString()}</td>
                        <td className="text-right py-4 px-4 font-semibold text-green-600">{advisorData.freeService.toLocaleString()}</td>
                        <td className="text-right py-4 px-4">
                          <span className={`font-bold ${advisorData.freeService >= targetData.freeService ? 'text-green-600' : 'text-red-600'}`}>
                            {targetData.freeService > 0 ? ((advisorData.freeService / targetData.freeService) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold text-red-600">{Math.max(0, targetData.freeService - advisorData.freeService).toLocaleString()}</td>
                        <td className="text-right py-4 px-6 font-semibold text-orange-600">{Math.ceil(Math.max(0, targetData.freeService - advisorData.freeService) / advisorData.daysRemaining).toLocaleString()}</td>
                      </tr>
                      
                      <tr className="hover:bg-blue-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🔄</span>
                            <span className="font-medium text-gray-900">R&R Jobs</span>
                          </div>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold">{targetData.rr.toLocaleString()}</td>
                        <td className="text-right py-4 px-4 font-semibold text-green-600">{advisorData.runningRepair.toLocaleString()}</td>
                        <td className="text-right py-4 px-4">
                          <span className={`font-bold ${advisorData.runningRepair >= targetData.rr ? 'text-green-600' : 'text-red-600'}`}>
                            {targetData.rr > 0 ? ((advisorData.runningRepair / targetData.rr) * 100).toFixed(1) : '0.0'}%
                          </span>
                        </td>
                        <td className="text-right py-4 px-4 font-semibold text-red-600">{Math.max(0, targetData.rr - advisorData.runningRepair).toLocaleString()}</td>
                        <td className="text-right py-4 px-6 font-semibold text-orange-600">{Math.ceil(Math.max(0, targetData.rr - advisorData.runningRepair) / advisorData.daysRemaining).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Items */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Daily Action Plan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-700"><strong>Primary Focus:</strong> {formatCurrency(advisorData.perDayAsking)} labour revenue per day</p>
                        <p className="text-gray-600 mt-1">Remaining days: <strong>{advisorData.daysRemaining}</strong></p>
                      </div>
                      <div>
                        <p className="text-purple-700"><strong>Vehicle Target:</strong> {Math.ceil(Math.max(0, targetData.totalVehicles - advisorData.totalROs) / advisorData.daysRemaining)} vehicles per day</p>
                        <p className="text-gray-600 mt-1">Current achievement: <strong>{((advisorData.achievedAmount / targetData.labour) * 100).toFixed(1)}%</strong></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-yellow-700 font-semibold">No Targets Assigned</div>
              <div className="text-sm text-yellow-600 mt-1">
                Please assign targets for this advisor in the SM Targets page
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvisorDetailPage;
