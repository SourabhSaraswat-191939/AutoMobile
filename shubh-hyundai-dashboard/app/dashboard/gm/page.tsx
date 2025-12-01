"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, DollarSign, Shield, Calendar, TrendingUp, BarChart3, Loader2, Building2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getApiUrl } from "@/lib/config"

interface GMDashboardData {
  dataType: string
  cities?: string[]
  summary?: {
    ro_billing: { count: number; totalRevenue: number }
    operations: { count: number; totalAmount: number }
    warranty: { count: number; totalClaims: number }
    service_booking: { count: number; totalBookings: number }
  }
  citiesData?: Record<string, any>
  overallMetrics?: {
    totalRevenue: number
    totalROs: number
    totalCities: number
    avgROValue: number
  }
  topPerformers?: Array<{
    advisorName: string
    city: string
    roBillingPerformance: {
      totalRevenue: number
      roCount: number
    }
  }>
}

export default function GMDashboard() {
  const { user } = useAuth()
  const [selectedCity, setSelectedCity] = useState<string>("all")
  const [dashboardData, setDashboardData] = useState<GMDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async (city: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        getApiUrl(`/api/service-manager/gm-dashboard-data?city=${city}&dataType=average`)
      )

      if (!response.ok) {
        throw new Error("Failed to fetch data")
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      setError("Failed to load data. Please try again.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData(selectedCity)
  }, [selectedCity])

  const renderMetricCard = (title: string, value: string | number, icon: React.ReactNode, color: string, subtitle?: string) => {
    const colorClasses: Record<string, string> = {
      blue: "bg-blue-100 text-blue-600",
      green: "bg-green-100 text-green-600",
      purple: "bg-purple-100 text-purple-600",
      orange: "bg-orange-100 text-orange-600",
      emerald: "bg-emerald-100 text-emerald-600",
      red: "bg-red-100 text-red-600",
    }

    return (
      <Card className="border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderCityBreakdown = () => {
    if (!dashboardData?.citiesData || selectedCity !== "all") return null

    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl">City-wise Breakdown</CardTitle>
          <CardDescription>Performance metrics across all cities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(dashboardData.citiesData).map(([city, data]: [string, any]) => {
              // Handle the optimized data structure
              const roBillingRevenue = data.ro_billing?.totalRevenue || 0
              const roCount = data.ro_billing?.roCount || 0
              const operationsAmount = data.operations?.totalAmount || 0
              const warrantyAmount = data.warranty?.totalClaimValue || 0
              const bookingCount = data.service_booking?.totalBookings || 0
              
              return (
                <div key={city} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">{city}</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCity(city)}
                      className="text-xs"
                    >
                      View Details
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-xs text-gray-600">RO Billing</p>
                      <p className="text-lg font-bold text-blue-600">
                        ₹{(roBillingRevenue / 100000).toFixed(2)}L
                      </p>
                      <p className="text-xs text-gray-500">{roCount} ROs</p>
                    </div>
                    <div className="bg-emerald-50 rounded p-3">
                      <p className="text-xs text-gray-600">Operations</p>
                      <p className="text-lg font-bold text-emerald-600">
                        ₹{(operationsAmount / 100000).toFixed(2)}L
                      </p>
                      <p className="text-xs text-gray-500">{data.operations?.totalOperations || 0} ops</p>
                    </div>
                    <div className="bg-purple-50 rounded p-3">
                      <p className="text-xs text-gray-600">Warranty</p>
                      <p className="text-lg font-bold text-purple-600">
                        ₹{(warrantyAmount / 100000).toFixed(2)}L
                      </p>
                      <p className="text-xs text-gray-500">{data.warranty?.totalClaims || 0} claims</p>
                    </div>
                    <div className="bg-orange-50 rounded p-3">
                      <p className="text-xs text-gray-600">Bookings</p>
                      <p className="text-lg font-bold text-orange-600">{bookingCount}</p>
                      <p className="text-xs text-gray-500">Total bookings</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (user?.role !== "general_manager") {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">Only General Managers can access this page</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">General Manager Dashboard</h1>
          <p className="text-gray-500">
            Overview of all Service Centers •{" "}
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* City Filter */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl text-blue-900">City Filter</CardTitle>
          </div>
          <CardDescription className="text-gray-600">
            View data for all cities or filter by specific city
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="w-full md:w-96 h-12 border-2 border-blue-300 focus:border-blue-500">
                <SelectValue placeholder="Select city..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities (Overall Statistics)</SelectItem>
                {dashboardData?.cities?.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                )) || 
                // Fallback: extract cities from citiesData if cities array is not available
                dashboardData?.citiesData && Object.keys(dashboardData.citiesData).map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCity !== "all" && (
              <Button
                variant="outline"
                onClick={() => setSelectedCity("all")}
                className="whitespace-nowrap"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading/Error States */}
      {isLoading && (
        <Card className="border-gray-200">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-gray-600">Loading dashboard data...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {!isLoading && !error && dashboardData && (
        <>
          {/* Summary Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {selectedCity === "all" ? "All Cities Overview" : `${selectedCity} Statistics`}
                </h2>
                <p className="text-blue-100">
                  {selectedCity === "all"
                    ? `Aggregated data from ${dashboardData.cities?.length || dashboardData.overallMetrics?.totalCities || Object.keys(dashboardData.citiesData || {}).length} cities`
                    : `Detailed statistics for ${selectedCity} service center`}
                </p>
              </div>
              <Building2 className="h-16 w-16 opacity-50" />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderMetricCard(
              "RO Billing Records",
              dashboardData.summary?.ro_billing?.count || dashboardData.overallMetrics?.totalROs || 0,
              <FileText className="h-5 w-5" />,
              "blue",
              "Total billing records"
            )}
            {renderMetricCard(
              "Total Revenue",
              `₹${((dashboardData.summary?.ro_billing?.totalRevenue || dashboardData.overallMetrics?.totalRevenue || 0) / 100000).toFixed(2)}L`,
              <DollarSign className="h-5 w-5" />,
              "emerald",
              "From RO billing"
            )}
            {renderMetricCard(
              "Operations Records",
              dashboardData.summary?.operations?.count || 0,
              <BarChart3 className="h-5 w-5" />,
              "green",
              "Total operations"
            )}
            {renderMetricCard(
              "Operations Amount",
              `₹${((dashboardData.summary?.operations?.totalAmount || 0) / 100000).toFixed(2)}L`,
              <TrendingUp className="h-5 w-5" />,
              "purple",
              "Total operations value"
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderMetricCard(
              "Warranty Claims",
              dashboardData.summary?.warranty?.count || 0,
              <Shield className="h-5 w-5" />,
              "orange",
              "Total claims"
            )}
            {renderMetricCard(
              "Warranty Amount",
              `₹${((dashboardData.summary?.warranty?.totalClaims || 0) / 100000).toFixed(2)}L`,
              <DollarSign className="h-5 w-5" />,
              "red",
              "Total claim value"
            )}
            {renderMetricCard(
              "Service Bookings",
              dashboardData.summary?.service_booking?.count || 0,
              <Calendar className="h-5 w-5" />,
              "blue",
              "Total bookings"
            )}
            {renderMetricCard(
              "Active Cities",
              dashboardData.cities?.length || dashboardData.overallMetrics?.totalCities || Object.keys(dashboardData.citiesData || {}).length,
              <Building2 className="h-5 w-5" />,
              "emerald",
              "Service centers"
            )}
          </div>

          {/* City Breakdown */}
          {renderCityBreakdown()}
        </>
      )}
    </div>
  )
}
