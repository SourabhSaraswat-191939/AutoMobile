"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, FileText, DollarSign, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import { getApiUrl } from "@/lib/config"

export default function WarrantyPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!user?.email || !user?.city) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=warranty`)
        )

        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }

        const result = await response.json()
        setData(Array.isArray(result.data) ? result.data : [])
      } catch (err) {
        setError("Failed to load data. Please try again.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [user?.email, user?.city])
  
  // Check permission first
  // ✅ UPDATED: Single permission check - no need for dual checks
  if (!hasPermission("warranty_report") && user?.role !== "service_manager") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view the Warranty Report.</p>
            <p className="text-sm text-gray-500 mt-2">Required: warranty_report permission or service_manager role</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalLabour = data.reduce((sum, row) => sum + (row.labour || 0), 0)
  const totalPart = data.reduce((sum, row) => sum + (row.part || 0), 0)
  const totalClaims = totalLabour + totalPart

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warranty Report</h1>
          <p className="text-muted-foreground mt-2">View warranty claims for {user?.city}</p>
        </div>
        <Button onClick={() => router.push("/dashboard/sm/upload")} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Upload Data
        </Button>
      </div>


      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warranty Claims</CardTitle>
          <CardDescription>{data.length} claims found</CardDescription>
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
                    <th className="text-left py-3 px-4 font-semibold">Claim Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Claim Type</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 font-semibold">Labour</th>
                    <th className="text-right py-3 px-4 font-semibold">Part</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((record, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{record.claimDate}</td>
                      <td className="py-3 px-4">{record.claimType}</td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status?.toLowerCase() === "approved"
                              ? "bg-green-100 text-green-800"
                              : record.status?.toLowerCase() === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">₹{record.labour?.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">₹{record.part?.toLocaleString()}</td>
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
