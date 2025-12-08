"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, FileText, DollarSign, Search, TrendingUp, TrendingDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getApiUrl } from "@/lib/config"
import { Badge } from "@/components/ui/badge"

interface AdvisorOperation {
  advisorName: string
  fileName?: string
  uploadDate?: string
  dataDate?: string
  totalMatchedAmount: number
  totalOperationsCount?: number
  matchedOperations?: Array<{
    operation: string
    amount: number
    count?: number
  }>
}

export default function OperationsPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [operationsData, setOperationsData] = useState<AdvisorOperation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<'cumulative' | 'specific'>('cumulative')
  const [sortBy, setSortBy] = useState<'advisorName' | 'totalMatchedAmount' | 'operations'>('totalMatchedAmount')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch operations data
  const fetchOperationsData = async () => {
    if (!user?.email || !user?.city) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        getApiUrl(`/api/service-manager/advisor-operations?uploadedBy=${user.email}&city=${user.city}&viewMode=${viewMode}`)
      )

      if (!response.ok) {
        throw new Error("Failed to fetch operations data")
      }

      const result = await response.json()
      setOperationsData(Array.isArray(result.data) ? result.data : [])
    } catch (err) {
      setError("Failed to load operations data. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Update operations data when view mode changes
  useEffect(() => {
    fetchOperationsData()
  }, [viewMode, user?.email, user?.city])
  
  // Check permission first
  if (!hasPermission("operations_report")) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view the Operations Report.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter and sort operations data
  const filteredAndSortedData = operationsData
    .filter(op => 
      op.advisorName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'advisorName':
          comparison = a.advisorName.localeCompare(b.advisorName)
          break
        case 'totalMatchedAmount':
          comparison = a.totalMatchedAmount - b.totalMatchedAmount
          break
        case 'operations':
          comparison = (a.matchedOperations?.length || 0) - (b.matchedOperations?.length || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  // Handle sort
  const handleSort = (column: 'advisorName' | 'totalMatchedAmount' | 'operations') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  // Calculate totals
  const totalAmount = operationsData.reduce((sum, op) => sum + (op.totalMatchedAmount || 0), 0)
  const totalOperations = operationsData.reduce((sum, op) => {
    // First try to get the total operations count from the API response
    const directCount = op.totalOperationsCount || 0
    // Fallback to matched operations length
    const matchedCount = op.matchedOperations?.length || 0
    // Try to sum up individual operation counts if available
    const summedCount = op.matchedOperations?.reduce((total, operation) => total + (operation.count || 1), 0) || 0
    
    const finalCount = directCount || summedCount || matchedCount
    console.log(`Advisor ${op.advisorName}: directCount=${directCount}, matchedCount=${matchedCount}, summedCount=${summedCount}, finalCount=${finalCount}`)
    return sum + finalCount
  }, 0)
  
  console.log('Total Operations Calculated:', totalOperations)
  console.log('Operations Data Length:', operationsData.length)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Operations Report</h1>
          <p className="text-gray-600">View advisor operations performance data</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'cumulative' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cumulative')}
            >
              Cumulative
            </Button>
            <Button
              variant={viewMode === 'specific' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('specific')}
            >
              Specific Date
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Advisors</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operationsData.length}</div>
            <p className="text-xs text-muted-foreground">
              with operations data
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalAmount / 100000).toFixed(2)}L</div>
            <p className="text-xs text-muted-foreground">
              across all advisors
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOperations}</div>
            <p className="text-xs text-muted-foreground">
              operations tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operations Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Advisor Operations Data</CardTitle>
              <CardDescription>Performance metrics by advisor</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Search advisors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading operations data...</p>
            </div>
          ) : filteredAndSortedData.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No operations data found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('advisorName')}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        Advisor Name
                        {sortBy === 'advisorName' && (
                          sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('totalMatchedAmount')}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        Total Amount
                        {sortBy === 'totalMatchedAmount' && (
                          sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('operations')}
                        className="flex items-center gap-1 hover:text-gray-700"
                      >
                        Operations Count
                        {sortBy === 'operations' && (
                          sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedData.map((operation, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-semibold text-sm">
                              {operation.advisorName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {operation.advisorName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {operation.uploadDate || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {operation.dataDate || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          ₹{(operation.totalMatchedAmount / 100000).toFixed(2)}L
                        </div>
                        <div className="text-xs text-gray-500">
                          ₹{operation.totalMatchedAmount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-lg font-semibold text-blue-600">
                          {(() => {
                            // First try to get the total operations count from the API response
                            const directCount = operation.totalOperationsCount || 0
                            // Fallback to matched operations length
                            const matchedCount = operation.matchedOperations?.length || 0
                            // Try to sum up individual operation counts if available
                            const summedCount = operation.matchedOperations?.reduce((total, op) => total + (op.count || 1), 0) || 0
                            
                            return directCount || summedCount || matchedCount
                          })()} 
                        </div>
                        <div className="text-xs text-gray-500">
                          {operation.matchedOperations?.length || 0} unique operations
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
