"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { useDashboardData } from "@/hooks/useDashboardData"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, FileText, Calendar, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ServiceBookingPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  
  // ✅ Use shared dashboard cache so Service Booking data is fetched once and reused
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useDashboardData({ dataType: "service_booking" })

  useEffect(() => {
    const dataArray = Array.isArray(dashboardData?.data) ? dashboardData.data : []
    setData(dataArray)
  }, [dashboardData])
  
  // Check permission first
  // ✅ UPDATED: Single permission check - no need for dual checks
  if (!hasPermission("service_booking_report") && user?.role !== "service_manager") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view the Service Booking Report.</p>
            <p className="text-sm text-gray-500 mt-2">Required: service_booking_report permission or service_manager role</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Status mapping: Close = Completed, In Progress = Pending
  const completed = data.filter((row) => {
    const status = row.status?.toLowerCase()
    return status === "completed" || status === "close" || status === "closed"
  }).length
  
  const pending = data.filter((row) => {
    const status = row.status?.toLowerCase()
    return status === "pending" || status === "in progress"
  }).length
  
  const open = data.filter((row) => row.status?.toLowerCase() === "open").length
  const cancelled = data.filter((row) => {
    const status = row.status?.toLowerCase()
    return status === "cancel" || status === "cancelled" || status === "canceled"
  }).length
  
  const completionRate = data.length ? Math.round((completed / data.length) * 100) : 0

  // Work Type counts
  const paidService = data.filter((row) => row.workType?.toLowerCase().includes("paid")).length
  const freeService = data.filter((row) => row.workType?.toLowerCase().includes("free")).length
  const runningRepair = data.filter((row) => row.workType?.toLowerCase().includes("running")).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Booking Report</h1>
          <p className="text-muted-foreground mt-2">View service bookings for {user?.city}</p>
        </div>
        <Button onClick={() => router.push("/dashboard/sm/upload")} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Upload Data
        </Button>
      </div>


      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Bookings</CardTitle>
          <CardDescription>{data.length} bookings found</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : data.length === 0 ? (
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Service Advisor</th>
                    <th className="text-left py-3 px-4 font-semibold">B.T Date & Time</th>
                    <th className="text-left py-3 px-4 font-semibold">Work Type</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((record, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{record.serviceAdvisor}</td>
                      <td className="py-3 px-4">{record.btDateTime}</td>
                      <td className="py-3 px-4">{record.workType}</td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status?.toLowerCase() === "close" || record.status?.toLowerCase() === "closed" || record.status?.toLowerCase() === "completed"
                              ? "bg-green-100 text-green-800"
                              : record.status?.toLowerCase() === "cancel" || record.status?.toLowerCase() === "cancelled" || record.status?.toLowerCase() === "canceled"
                                ? "bg-red-100 text-red-800"
                                : record.status?.toLowerCase() === "in progress" || record.status?.toLowerCase() === "pending"
                                  ? "bg-orange-100 text-orange-800"
                                  : record.status?.toLowerCase() === "open"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {record.status}
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
  )
}
