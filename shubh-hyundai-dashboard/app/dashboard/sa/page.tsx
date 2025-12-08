"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { getAdvisorTargets, getAdvisorPerformance, type ServiceAdvisorTarget, type AdvisorPerformance } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Target, CheckCircle, Star, Shield, Loader2 } from "lucide-react"

export default function ServiceAdvisorDashboard() {
  const { user } = useAuth()
  const { hasPermission, isLoading: permissionsLoading } = usePermissions()
  const [targets, setTargets] = useState<ServiceAdvisorTarget[]>([])
  const [performance, setPerformance] = useState<AdvisorPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        const [targetsData, performanceData] = await Promise.all([
          getAdvisorTargets(user.id),
          getAdvisorPerformance(user.id),
        ])
        setTargets(targetsData)
        setPerformance(performanceData)
      }
      setIsLoading(false)
    }
    loadData()
  }, [user?.id])

  // Check permissions first, then fallback to role
  const canAccess = hasPermission('can_access_sa_dashboard') || user?.role === "service_advisor"
  
  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-4 text-gray-600">Loading permissions...</p>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">You don't have permission to access the SA Dashboard</p>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading dashboard...</div>
  }

  const currentTarget = targets[targets.length - 1]
  const currentPerformance = performance[0]

  const revenueAchievement = currentTarget
    ? Math.round((currentTarget.achievedRevenue / currentTarget.targetRevenue) * 100)
    : 0
  const serviceAchievement = currentTarget
    ? Math.round((currentTarget.completedServices / currentTarget.targetServices) * 100)
    : 0
  const satisfactionAchievement = currentTarget
    ? Math.round((currentTarget.achievedCustomerSatisfaction / currentTarget.targetCustomerSatisfaction) * 100)
    : 0

  const targetTrendData = targets.map((t) => ({
    month: t.month,
    target: t.targetRevenue,
    achieved: t.achievedRevenue,
  }))

  const serviceComparisonData = targets.map((t) => ({
    month: t.month,
    target: t.targetServices,
    completed: t.completedServices,
  }))

  const achievementData = [
    { name: "Revenue", value: revenueAchievement, fill: "hsl(var(--chart-1))" },
    { name: "Remaining", value: 100 - revenueAchievement, fill: "hsl(var(--chart-2))" },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">SA Dashboard</h1>
        <p className="text-muted-foreground mt-2">Service Advisor Dashboard - Target tracking and performance metrics for {user?.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Achievement</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueAchievement}%</div>
            <p className="text-xs text-muted-foreground">
              ₹{currentTarget?.achievedRevenue.toLocaleString()} / ₹{currentTarget?.targetRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Target</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serviceAchievement}%</div>
            <p className="text-xs text-muted-foreground">
              {currentTarget?.completedServices} / {currentTarget?.targetServices} services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{satisfactionAchievement}%</div>
            <p className="text-xs text-muted-foreground">
              {currentTarget?.achievedCustomerSatisfaction} / {currentTarget?.targetCustomerSatisfaction}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Service Value</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{currentPerformance?.averageServiceValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{currentPerformance?.totalServices} total services</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Target vs Achievement</CardTitle>
            <CardDescription>Monthly revenue performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={targetTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Bar dataKey="target" fill="hsl(var(--chart-2))" name="Target" />
                <Bar dataKey="achieved" fill="hsl(var(--chart-1))" name="Achieved" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Completion</CardTitle>
            <CardDescription>Target vs completed services</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={serviceComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="target" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Target" />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Achievement Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Current Month Achievement</CardTitle>
          <CardDescription>Revenue target progress</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={achievementData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {achievementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Target History</CardTitle>
          <CardDescription>Monthly targets and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Month</th>
                  <th className="text-right py-3 px-4 font-semibold">Revenue Target</th>
                  <th className="text-right py-3 px-4 font-semibold">Revenue Achieved</th>
                  <th className="text-right py-3 px-4 font-semibold">Achievement %</th>
                  <th className="text-right py-3 px-4 font-semibold">Services</th>
                  <th className="text-right py-3 px-4 font-semibold">Satisfaction</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((target) => {
                  const revenuePercent = Math.round((target.achievedRevenue / target.targetRevenue) * 100)
                  return (
                    <tr key={target.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{target.month}</td>
                      <td className="text-right py-3 px-4">₹{target.targetRevenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 font-semibold">₹{target.achievedRevenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            revenuePercent >= 100
                              ? "bg-green-100 text-green-800"
                              : revenuePercent >= 90
                                ? "bg-blue-100 text-blue-800"
                                : "bg-orange-100 text-orange-800"
                          }`}
                        >
                          {revenuePercent}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        {target.completedServices}/{target.targetServices}
                      </td>
                      <td className="text-right py-3 px-4">
                        {target.achievedCustomerSatisfaction}/{target.targetCustomerSatisfaction}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
