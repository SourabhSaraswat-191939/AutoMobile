'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getApiUrl } from '@/lib/config';
import { 
  ArrowLeft, Users, DollarSign, Wrench, 
  TrendingUp, IndianRupee, Package,
  MapPin, Download, Search, ChevronDown, ChevronUp
} from 'lucide-react';

interface Advisor {
  name: string;
  ros: number;
  rovasAmount: number;
  partAmount: number;
  operationCount: number;
}

const AdvisorsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showroomId = searchParams.get('showroom');
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Advisor; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [advisorsData, setAdvisorsData] = useState<Advisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real advisor data from RO Billing and Operations
  useEffect(() => {
    const fetchAdvisorData = async () => {
      if (!user?.email || !user?.city) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch RO Billing data
        const roBillingResponse = await fetch(
          getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=ro_billing`)
        );

        if (!roBillingResponse.ok) {
          throw new Error('Failed to fetch RO Billing data');
        }

        const roBillingData = await roBillingResponse.json();
        console.log('RO Billing Data Received:', roBillingData);

        // Fetch Operations data
        const operationsResponse = await fetch(
          getApiUrl(`/api/service-manager/advisor-operations?uploadedBy=${user.email}&city=${user.city}&viewMode=cumulative`)
        );

        let operationsData = { data: [] };
        if (operationsResponse.ok) {
          operationsData = await operationsResponse.json();
          console.log('Operations Data Received:', operationsData);
        }

        if (roBillingData && Array.isArray(roBillingData.data)) {
          // Group RO Billing by service advisor
          const advisorMap: Record<string, { ros: number; rovasAmount: number; partAmount: number }> = {};

          roBillingData.data.forEach((record: any) => {
            const advisor = record.serviceAdvisor || 'Unknown';
            const labourAmt = record.labourAmt || 0;
            const labourTax = record.labourTax || 0;
            const partAmt = record.partAmt || 0;
            
            // Calculate ROVas Amount (Labour Amount) - same logic as SM dashboard
            const rovasAmount = labourAmt + labourTax; // Include tax for ROVas amount

            if (!advisorMap[advisor]) {
              advisorMap[advisor] = { ros: 0, rovasAmount: 0, partAmount: 0 };
            }

            advisorMap[advisor].ros += 1;
            advisorMap[advisor].rovasAmount += rovasAmount;
            advisorMap[advisor].partAmount += partAmt;
          });

          // Create operations map for operation count only
          const operationsMap: Record<string, { operationCount: number }> = {};
          if (operationsData.data && Array.isArray(operationsData.data)) {
            operationsData.data.forEach((opRecord: any) => {
              operationsMap[opRecord.advisorName] = {
                operationCount: opRecord.totalOperationsCount || 0
              };
            });
          }

          // Convert to advisor array with merged data
          const advisors: Advisor[] = Object.entries(advisorMap).map(([name, stats]) => {
            const operationData = operationsMap[name] || { operationCount: 0 };
            return {
              name,
              ros: stats.ros,
              rovasAmount: stats.rovasAmount, // Now from RO Billing labour amount
              partAmount: stats.partAmount,
              operationCount: operationData.operationCount
            };
          });

          setAdvisorsData(advisors);
        } else {
          setAdvisorsData([]);
        }
      } catch (err) {
        setError('Failed to load advisor data. Please try again.');
        console.error('Error fetching advisor data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdvisorData();
  }, [user?.email, user?.city]);

  const currentShowroom = user?.city || 'All Branches';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSort = (key: keyof Advisor) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    let filteredData = [...advisorsData];

    // Filter by search term
    if (searchTerm) {
      filteredData = filteredData.filter(advisor =>
        advisor.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort data
    if (sortConfig.key) {
      filteredData.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return 0;
      });
    }

    return filteredData;
  };

  const sortedAdvisors = getSortedData();

  // Calculate totals
  const totals = sortedAdvisors.reduce((acc, advisor) => ({
    ros: acc.ros + advisor.ros,
    rovasAmount: acc.rovasAmount + advisor.rovasAmount,
    partAmount: acc.partAmount + advisor.partAmount,
    operationCount: acc.operationCount + advisor.operationCount
  }), {
    ros: 0,
    rovasAmount: 0,
    partAmount: 0,
    operationCount: 0
  });

  const SortIcon = ({ columnKey }: { columnKey: keyof Advisor }) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronDown className="h-4 w-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" />
      : <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading advisor data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <Users className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-3 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Overview
          </button>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 mb-1 truncate">Service Advisors</h1>
              <div className="flex items-center gap-2 text-gray-600 text-sm flex-wrap">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{currentShowroom}</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs flex-shrink-0">
                  {sortedAdvisors.length} {sortedAdvisors.length === 1 ? 'advisor' : 'advisors'}
                </span>
              </div>
            </div>
            
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow text-sm w-fit flex-shrink-0">
              <Download className="h-4 w-4" />
              Export Report
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 text-white shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Users className="h-3 w-3" />
                </div>
                <TrendingUp className="h-3 w-3" />
              </div>
              <div className="text-lg font-bold mb-1">{totals.ros}</div>
              <div className="text-green-100 text-xs">Total ROs</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <DollarSign className="h-3 w-3" />
                </div>
                <TrendingUp className="h-3 w-3" />
              </div>
              <div className="text-lg font-bold mb-1 truncate">{formatCurrency(totals.rovasAmount)}</div>
              <div className="text-blue-100 text-xs">Total ROVas</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-3 text-white shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Wrench className="h-3 w-3" />
                </div>
                <TrendingUp className="h-3 w-3" />
              </div>
              <div className="text-lg font-bold mb-1">{totals.operationCount}</div>
              <div className="text-orange-100 text-xs">Total Operations</div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg p-3 shadow mt-3">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search advisors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table - Only 5 Columns */}
      <div className="flex-1 min-h-0 bg-white">
        <div className="h-full max-w-full">
          {sortedAdvisors.length === 0 ? (
            <div className="text-center py-12 h-full flex items-center justify-center">
              <div>
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No advisors found</h3>
                <p className="text-gray-500">Try adjusting your search criteria</p>
              </div>
            </div>
          ) : (
            <div className="overflow-auto h-full">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 min-w-[150px]">
                      <div className="flex items-center gap-1 cursor-pointer" onClick={() => handleSort('name')}>
                        <span>Advisor</span>
                        <SortIcon columnKey="name" />
                      </div>
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                      <div className="flex items-center gap-1 cursor-pointer justify-center" onClick={() => handleSort('ros')}>
                        <span>ROs</span>
                        <SortIcon columnKey="ros" />
                      </div>
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      <div className="flex items-center gap-1 cursor-pointer justify-end" onClick={() => handleSort('rovasAmount')}>
                        <span>ROVas Amount</span>
                        <SortIcon columnKey="rovasAmount" />
                      </div>
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      <div className="flex items-center gap-1 cursor-pointer justify-end" onClick={() => handleSort('partAmount')}>
                        <span>Part Amount</span>
                        <SortIcon columnKey="partAmount" />
                      </div>
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      <div className="flex items-center gap-1 cursor-pointer justify-center" onClick={() => handleSort('operationCount')}>
                        <span>Operation Count</span>
                        <SortIcon columnKey="operationCount" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAdvisors.map((advisor, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white z-10 min-w-[150px]">
                        <div 
                          className="flex items-center cursor-pointer hover:bg-blue-50 rounded-lg p-2 -m-2 transition-colors"
                          onClick={() => router.push(`/dashboard/gm/overview/advisors/${encodeURIComponent(advisor.name)}`)}
                        >
                          <div className="flex-shrink-0 h-6 w-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {advisor.name.charAt(0)}
                          </div>
                          <div className="ml-2 min-w-0 flex-1">
                            <div className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate">{advisor.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                          {advisor.ros}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-emerald-600">{formatCurrency(advisor.rovasAmount)}</div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-blue-600">{formatCurrency(advisor.partAmount)}</div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-12 h-8 rounded-full bg-orange-600 text-white font-bold text-sm">
                          {advisor.operationCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300 sticky bottom-0">
                  <tr className="font-semibold">
                    <td className="px-3 py-2 text-xs text-gray-900 sticky left-0 bg-gray-100 z-20">
                      Total ({sortedAdvisors.length})
                    </td>
                    <td className="px-2 py-2 text-xs text-gray-900 text-center">{totals.ros}</td>
                    <td className="px-2 py-2 text-xs text-gray-900 text-right">{formatCurrency(totals.rovasAmount)}</td>
                    <td className="px-2 py-2 text-xs text-gray-900 text-right">{formatCurrency(totals.partAmount)}</td>
                    <td className="px-2 py-2 text-xs text-gray-900 text-center">{totals.operationCount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvisorsPage;
