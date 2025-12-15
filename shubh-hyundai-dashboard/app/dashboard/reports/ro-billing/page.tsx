"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { useDashboardData } from "@/hooks/useDashboardData"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, FileText, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

export default function ROBillingPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  
  // ✅ Use shared dashboard cache so RO Billing data is fetched once and reused
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useDashboardData({ dataType: "ro_billing" })

  // Sync local table state with cached dashboard data
  useEffect(() => {
    const dataArray = Array.isArray(dashboardData?.data) ? dashboardData.data : []
    setData(dataArray)
    setFilteredData(dataArray)
  }, [dashboardData])

  // Search filter effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(data)
      return
    }

    const filtered = data.filter((record) => {
      const searchLower = searchTerm.toLowerCase()
      return (
        record.billDate?.toLowerCase().includes(searchLower) ||
        record.serviceAdvisor?.toLowerCase().includes(searchLower) ||
        record.workType?.toLowerCase().includes(searchLower) ||
        record.labourAmt?.toString().includes(searchLower) ||
        record.partAmt?.toString().includes(searchLower)
      )
    })
    setFilteredData(filtered)
  }, [searchTerm, data])
  
  // ✅ UPDATED: Single permission check - no need for dual checks
  if (!hasPermission("ro_billing_report") && user?.role !== "service_manager") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view the RO Billing Report.</p>
            <p className="text-sm text-gray-500 mt-2">Required: ro_billing_report permission or service_manager role</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pb-8">
      <div className="container mx-auto space-y-6">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">RO Billing Records</h1>
              <p className="text-blue-100 mt-2">Professional billing analytics for {user?.city} Service Center</p>
            </div>
            <Button 
              onClick={() => router.push("/dashboard/sm/upload")} 
              className="bg-white text-blue-700 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6"
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload Excel File
            </Button>
          </div>
        </div>

      {/* Data Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>RO Billing Records</CardTitle>
              <CardDescription>
                {filteredData.length} of {data.length} records
                {searchTerm && ` (filtered by "${searchTerm}")`}
              </CardDescription>
            </div>
          </div>
          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by date, advisor, work type, or amount..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-2 border-gray-300 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          )}
          {!isLoading && error && (
          <div className="text-center py-8 text-red-600">{error}</div>
          )}
          {!isLoading && !error && data.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No data uploaded yet</p>
              <Button
                onClick={() => router.push("/dashboard/sm/upload")}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Data
              </Button>
            </div>
          )}
          {!isLoading && !error && data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <th className="text-left py-4 px-4 font-bold text-gray-700">Bill Date</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-700">Service Advisor</th>
                    <th className="text-right py-4 px-4 font-bold text-gray-700">Labour Amt</th>
                    <th className="text-right py-4 px-4 font-bold text-gray-700">Part Amt</th>
                    <th className="text-left py-4 px-4 font-bold text-gray-700">Work Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record, idx) => (
                    <tr key={idx} className="border-b hover:bg-blue-50/50 transition-colors">
                      <td className="py-4 px-4 font-medium text-gray-900">{record.billDate}</td>
                      <td className="py-4 px-4 text-gray-700">
                        {record.serviceAdvisor}
                      </td>
                      <td className="text-right py-4 px-4 font-semibold text-green-700">₹{record.labourAmt?.toLocaleString()}</td>
                      <td className="text-right py-4 px-4 font-semibold text-blue-700">₹{record.partAmt?.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                          {record.workType}
                        </span>
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
    </div>
  )
}
