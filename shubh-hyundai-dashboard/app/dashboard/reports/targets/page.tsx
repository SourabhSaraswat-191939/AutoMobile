"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { getRoBillingReports } from "@/lib/api"
import { getApiUrl } from "@/lib/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Target, TrendingUp, AlertCircle, CheckCircle, Calendar, 
  Search, X, ChevronDown, ChevronUp, Users, BarChart3, 
  DollarSign, Car, Wrench, Award, Activity, Filter, 
  Eye, EyeOff, Download, PieChart, TargetIcon, UserCheck,
  Zap, Sparkles, ArrowUpRight, ArrowDownRight
} from "lucide-react"
import { Progress } from "@/components/ui/progress"

const GM_TARGETS_KEY = "gm_field_targets_v1"
const ADVISOR_ASSIGNMENTS_KEY = "advisor_field_targets_v1"

function remainingWorkingDaysFromToday() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = today.getDate(); d <= lastDay; d++) {
    const dt = new Date(year, month, d)
    if (dt.getDay() !== 0) count++ // exclude Sundays
  }
  return count
}

// Professional advisor card component
const AdvisorCard = ({ 
  advisor, 
  assignment, 
  expanded, 
  onToggle,
  remainingDays 
}: {
  advisor: any;
  assignment: any;
  expanded: boolean;
  onToggle: () => void;
  remainingDays: number;
}) => {
  const metrics = [
    { key: "labour", label: "Labour", icon: DollarSign, prefix: "₹", color: "emerald", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
    { key: "parts", label: "Parts", icon: Wrench, prefix: "₹", color: "blue", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
    { key: "totalVehicles", label: "Vehicles", icon: Car, prefix: "", color: "purple", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
    { key: "paidService", label: "Paid", icon: BarChart3, prefix: "", color: "indigo", bgColor: "bg-indigo-50", borderColor: "border-indigo-200" },
    { key: "freeService", label: "Free", icon: CheckCircle, prefix: "", color: "green", bgColor: "bg-green-50", borderColor: "border-green-200" },
    { key: "rr", label: "R&R", icon: Activity, prefix: "", color: "orange", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  ]

  const achieved = assignment?.achieved || { 
    labour: 0, parts: 0, totalVehicles: 0, paidService: 0, freeService: 0, rr: 0 
  }

  // Calculate overall performance
  const calculateOverallPerformance = () => {
    let totalTarget = 0
    let totalAchieved = 0
    
    metrics.forEach(metric => {
      const target = assignment?.[metric.key] || 0
      const ach = achieved[metric.key] || 0
      totalTarget += target
      totalAchieved += ach
    })

    return totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0
  }

  const overallPerformance = calculateOverallPerformance()
  
  // Get performance status
  const getPerformanceStatus = () => {
    if (overallPerformance >= 100) return { label: "Exceeding", color: "text-emerald-600", bg: "bg-emerald-100", icon: Sparkles }
    if (overallPerformance >= 80) return { label: "On Track", color: "text-blue-600", bg: "bg-blue-100", icon: TrendingUp }
    if (overallPerformance >= 60) return { label: "Moderate", color: "text-yellow-600", bg: "bg-yellow-100", icon: TargetIcon }
    return { label: "Needs Focus", color: "text-orange-600", bg: "bg-orange-100", icon: AlertCircle }
  }

  const status = getPerformanceStatus()

  return (
    <Card className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-md ${
      expanded ? 'border-blue-300 shadow-lg' : 'border-gray-200'
    }`}>
      {/* Card Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status.bg}`}>
              <Users className={`h-5 w-5 ${status.color}`} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{advisor.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs font-medium ${status.color} border-${status.color.split('-')[1]}-200`}>
                  <status.icon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
                <span className="text-xs text-gray-500">• {overallPerformance.toFixed(1)}% Overall</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-4">
              {metrics.slice(0, 2).map(metric => {
                const target = assignment?.[metric.key] || 0
                const ach = achieved[metric.key] || 0
                const percentage = target > 0 ? (ach / target) * 100 : 0
                
                return (
                  <div key={metric.key} className="text-right">
                    <div className="text-xs text-gray-500">{metric.label}</div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold text-gray-900">{metric.prefix}{ach.toLocaleString()}</span>
                      <span className="text-xs text-gray-400">/ {metric.prefix}{target.toLocaleString()}</span>
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className={`h-1 rounded-full ${
                          percentage >= 100 ? 'bg-emerald-500' : 
                          percentage >= 80 ? 'bg-blue-500' : 
                          percentage >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Toggle Button */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Content - Only visible when expanded */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(metric => {
              const Icon = metric.icon
              const target = assignment?.[metric.key] || 0
              const ach = achieved[metric.key] || 0
              const percentage = target > 0 ? (ach / target) * 100 : 0
              const shortfall = Math.max(0, target - ach)
              const perDay = Math.ceil(shortfall / Math.max(1, remainingDays))
              
              const getMetricStatus = () => {
                if (percentage >= 100) return { color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200" }
                if (percentage >= 80) return { color: "text-blue-600", bg: "bg-blue-100", border: "border-blue-200" }
                if (percentage >= 60) return { color: "text-yellow-600", bg: "bg-yellow-100", border: "border-yellow-200" }
                return { color: "text-orange-600", bg: "bg-orange-100", border: "border-orange-200" }
              }
              
              const status = getMetricStatus()

              return (
                <div 
                  key={metric.key} 
                  className={`rounded-lg border p-4 ${status.bg} ${status.border}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-md ${status.bg.replace('100', '200')}`}>
                        <Icon className={`h-4 w-4 ${status.color}`} />
                      </div>
                      <span className="font-medium text-gray-900">{metric.label}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${status.color} border-${status.color.split('-')[1]}-200`}
                    >
                      {percentage.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {metric.prefix}{ach.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          Target: {metric.prefix}{target.toLocaleString()}
                        </div>
                      </div>
                      {shortfall > 0 && (
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Shortfall</div>
                          <div className="font-semibold text-red-600">
                            {metric.prefix}{shortfall.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            percentage >= 100 ? 'bg-emerald-500' : 
                            percentage >= 80 ? 'bg-blue-500' : 
                            percentage >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Daily target */}
                    {shortfall > 0 && remainingDays > 0 && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Daily required:</span>
                          <span className="font-semibold text-gray-900">
                            {metric.prefix}{perDay.toLocaleString()}/day
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary Section */}
          <div className="mt-6 pt-4 border-t border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Performance Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Overall Achievement</span>
                    <span className="font-bold text-gray-900">{overallPerformance.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Metrics on Track</span>
                    <span className="font-bold text-gray-900">
                      {metrics.filter(m => {
                        const target = assignment?.[m.key] || 0
                        const ach = achieved[m.key] || 0
                        return (ach / target * 100) >= 80
                      }).length} / {metrics.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Remaining Challenge</h4>
                <div className="space-y-2">
                  {metrics
                    .filter(m => {
                      const target = assignment?.[m.key] || 0
                      const ach = achieved[m.key] || 0
                      return ach < target
                    })
                    .slice(0, 2)
                    .map(m => {
                      const target = assignment?.[m.key] || 0
                      const ach = achieved[m.key] || 0
                      const percentage = target > 0 ? (ach / target) * 100 : 0
                      
                      return (
                        <div key={m.key} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{m.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
                            {percentage < 80 ? (
                              <ArrowDownRight className="h-3 w-3 text-red-500" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="h-3 w-3 mr-2" />
                    Export Details
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <TargetIcon className="h-3 w-3 mr-2" />
                    Adjust Targets
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// Summary stats component
const SummaryStats = ({ advisors, assignments, cityTarget, remainingDays }: {
  advisors: any[];
  assignments: any[];
  cityTarget: any;
  remainingDays: number;
}) => {
  const calculateCityPerformance = () => {
    let totalTarget = 0
    let totalAchieved = 0
    
    const metrics = ['labour', 'parts', 'totalVehicles', 'paidService', 'freeService', 'rr']
    
    assignments.forEach(assign => {
      metrics.forEach(metric => {
        totalTarget += assign[metric] || 0
        totalAchieved += assign.achieved?.[metric] || 0
      })
    })

    return totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0
  }

  const performance = calculateCityPerformance()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Advisors</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{advisors.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Avg. Performance</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{performance.toFixed(1)}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-emerald-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Days Remaining</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{remainingDays}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Active Targets</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {assignments.filter(a => a.cityTarget).length}
              </p>
            </div>
            <TargetIcon className="h-8 w-8 text-amber-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdvisorTargetsReportPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [advisors, setAdvisors] = useState<any[]>([])
  const [cityTarget, setCityTarget] = useState<any | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [roRows, setRoRows] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAdvisors, setSelectedAdvisors] = useState<string[]>([])
  const [expandedAdvisor, setExpandedAdvisor] = useState<string | null>(null)
  const [showDistributeDialog, setShowDistributeDialog] = useState(false)
  const [distributionMode, setDistributionMode] = useState<'automatic' | 'manual' | null>(null)
  const [advisorTargets, setAdvisorTargets] = useState<any[]>([])
  const [selectedAdvisorForManual, setSelectedAdvisorForManual] = useState<string>('')
  const [manualTarget, setManualTarget] = useState({
    labour: 0,
    parts: 0,
    totalVehicles: 0,
    paidService: 0,
    freeService: 0,
    rr: 0
  })
  const [successMessage, setSuccessMessage] = useState('')
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'exceeding' | 'on-track' | 'needs-focus'>('all')

  const remainingDays = remainingWorkingDaysFromToday()

  // Check if targets are already distributed for current month
  const areTargetsDistributed = () => {
    if (!user?.city || !cityTarget) return false
    
    const currentMonth = cityTarget?.month || new Date().toLocaleString("default", { month: "long" })
    const currentYear = new Date().getFullYear()
    
    return assignments.some(assignment => 
      assignment.city === user.city && 
      assignment.month === currentMonth &&
      assignment.createdAt && 
      new Date(assignment.createdAt).getFullYear() === currentYear
    )
  }

  const targetsAlreadyDistributed = areTargetsDistributed()

  useEffect(() => {
    async function load() {
      if (!user?.city) return
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(
          getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=ro_billing`)
        )
        
        if (!response.ok) {
          throw new Error("Failed to fetch RO Billing data")
        }
        
        const result = await response.json()
        const roData = Array.isArray(result.data) ? result.data : []
        setRoRows(roData)
        
        const uniqueAdvisorNames = Array.from(
          new Set(roData.map((r: any) => r.serviceAdvisor).filter(Boolean))
        )
        const advisorList = uniqueAdvisorNames.map((name: any) => ({ name }))
        setAdvisors(advisorList)
        
        const rawTarget = localStorage.getItem(GM_TARGETS_KEY)
        const targets = rawTarget ? JSON.parse(rawTarget) : []
        setCityTarget(targets.find((t: any) => t.city === user.city) || null)
        
        const rawAssign = localStorage.getItem(ADVISOR_ASSIGNMENTS_KEY)
        setAssignments(rawAssign ? JSON.parse(rawAssign) : [])
      } catch (err) {
        console.error("Error loading data:", err)
        setError("Failed to load data. Please check if RO Billing data is uploaded.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [user?.city, user?.email])

  const handleDistributeClick = () => {
    if (!user?.city) {
      alert("No city assigned to your account.")
      return
    }
    if (!cityTarget) {
      alert("No GM city-level target found. Ask GM to assign a target first.")
      return
    }
    if (advisors.length === 0) {
      alert("No advisors found for your city.")
      return
    }
    setShowDistributeDialog(true)
    setDistributionMode(null)
    setAdvisorTargets([])
    setSelectedAdvisorForManual('')
  }

  const computeAchievedMap = () => {
    const achievedMap: Record<string, any> = {}
    roRows.forEach((r) => {
      const name = r.serviceAdvisor || "Unknown"
      if (!achievedMap[name]) {
        achievedMap[name] = { labour: 0, parts: 0, totalVehicles: 0, paidService: 0, freeService: 0, rr: 0 }
      }
      
      achievedMap[name].labour += Number(r.labourAmt || 0)
      achievedMap[name].parts += Number(r.partAmt || 0)
      achievedMap[name].totalVehicles += 1
      
      if (r.workType?.toLowerCase().includes("paid")) {
        achievedMap[name].paidService += 1
      }
      if (r.workType?.toLowerCase().includes("free")) {
        achievedMap[name].freeService += 1
      }
      const wt = (r.workType || "").toString().toLowerCase()
      if (wt.includes("r&r") || wt.includes("r and r") || wt.includes("running repair") || wt.includes("rr") || wt.includes("running")) {
        achievedMap[name].rr += 1
      }
    })
    return achievedMap
  }

  const handleAutomaticDistribution = () => {
    if (!cityTarget || advisors.length === 0) return
    
    const per = (value: number) => Math.round(value / advisors.length)
    const achievedMap = computeAchievedMap()
    
    const distributed = advisors.map((a: any) => {
      const achieved = achievedMap[a.name] || { labour: 0, parts: 0, totalVehicles: 0, paidService: 0, freeService: 0, rr: 0 }
      return {
        advisorName: a.name,
        labour: per(cityTarget.labour || 0),
        parts: per(cityTarget.parts || 0),
        totalVehicles: per(cityTarget.totalVehicles || 0),
        paidService: per(cityTarget.paidService || 0),
        freeService: per(cityTarget.freeService || 0),
        rr: per(cityTarget.rr || 0),
        achieved
      }
    })
    
    setAdvisorTargets(distributed)
    setDistributionMode('automatic')
  }

  const handleManualDistribution = () => {
    setDistributionMode('manual')
    setAdvisorTargets([])
  }

  const handleAddManualTarget = () => {
    if (!selectedAdvisorForManual) return
    
    const achievedMap = computeAchievedMap()
    const achieved = achievedMap[selectedAdvisorForManual] || { labour: 0, parts: 0, totalVehicles: 0, paidService: 0, freeService: 0, rr: 0 }
    
    const newTarget = {
      advisorName: selectedAdvisorForManual,
      ...manualTarget,
      achieved
    }
    
    setAdvisorTargets([...advisorTargets, newTarget])
    setSelectedAdvisorForManual('')
    setManualTarget({
      labour: 0,
      parts: 0,
      totalVehicles: 0,
      paidService: 0,
      freeService: 0,
      rr: 0
    })
  }

  const handleSaveDistribution = () => {
    const month = cityTarget?.month || new Date().toLocaleString("default", { month: "long" })
    const now = new Date().toISOString()
    
    const newAssigns = advisorTargets.map((at: any) => ({
      id: `a-${Date.now()}-${at.advisorName}`,
      advisorName: at.advisorName,
      city: user?.city,
      month,
      labour: at.labour,
      parts: at.parts,
      totalVehicles: at.totalVehicles,
      paidService: at.paidService,
      freeService: at.freeService,
      rr: at.rr,
      achieved: at.achieved,
      createdAt: now,
    }))

    localStorage.setItem(ADVISOR_ASSIGNMENTS_KEY, JSON.stringify(newAssigns))
    setAssignments(newAssigns)
    setSuccessMessage('Targets distributed successfully!')
    setShowDistributeDialog(false)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const getRemainingAdvisors = () => {
    const assigned = advisorTargets.map(t => t.advisorName)
    return advisors.filter(a => !assigned.includes(a.name))
  }

  // Filter advisors based on search term and performance
  const filteredAdvisors = advisors.filter(advisor => {
    const matchesSearch = advisor.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (performanceFilter === 'all') return matchesSearch
    
    const assign = assignments.find((as) => 
      as.advisorName === advisor.name && as.city === user?.city
    )
    const achieved = assign?.achieved || { labour: 0, parts: 0, totalVehicles: 0, paidService: 0, freeService: 0, rr: 0 }
    
    let totalTarget = 0
    let totalAchieved = 0
    const metrics = ['labour', 'parts', 'totalVehicles', 'paidService', 'freeService', 'rr']
    
    metrics.forEach(metric => {
      totalTarget += assign?.[metric] || 0
      totalAchieved += achieved[metric] || 0
    })
    
    const overallPerformance = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0
    
    switch (performanceFilter) {
      case 'exceeding':
        return matchesSearch && overallPerformance >= 100
      case 'on-track':
        return matchesSearch && overallPerformance >= 80 && overallPerformance < 100
      case 'needs-focus':
        return matchesSearch && overallPerformance < 80
      default:
        return matchesSearch
    }
  })

  // Get advisors to display
  const displayAdvisors = selectedAdvisors.length > 0 
    ? advisors.filter(advisor => selectedAdvisors.includes(advisor.name))
    : filteredAdvisors

  // Toggle advisor expansion
  const toggleAdvisorExpansion = (advisorName: string) => {
    setExpandedAdvisor(expandedAdvisor === advisorName ? null : advisorName)
  }

  // Toggle advisor selection
  const toggleAdvisorSelection = (advisorName: string) => {
    setSelectedAdvisors(prev => 
      prev.includes(advisorName)
        ? prev.filter(name => name !== advisorName)
        : [...prev, advisorName]
    )
  }

  // Check permission first
  if (!hasPermission("target_report")) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view the Target Report.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
            <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg shadow-lg">
              <CheckCircle className="h-5 w-5" />
              <p className="font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Advisor Performance Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor and manage service advisor targets and achievements</p>
              {targetsAlreadyDistributed && (
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Targets have been distributed for {cityTarget?.month || new Date().toLocaleString("default", { month: "long" })}
                  </span>
                </div>
              )}
            </div>
            
            {user?.role === "service_manager" && (
              <Button 
                onClick={handleDistributeClick}
                disabled={!cityTarget || targetsAlreadyDistributed}
                className={`font-semibold shadow-md ${
                  targetsAlreadyDistributed 
                    ? "bg-gray-400 hover:bg-gray-400 text-gray-600 cursor-not-allowed" 
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                }`}
              >
                <Users className="h-4 w-4 mr-2" />
                {targetsAlreadyDistributed ? "Targets Already Distributed" : "Distribute Targets"}
              </Button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        {!isLoading && !error && advisors.length > 0 && (
          <SummaryStats 
            advisors={advisors}
            assignments={assignments}
            cityTarget={cityTarget}
            remainingDays={remainingDays}
          />
        )}

        {/* Main Content */}
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Advisor Performance</CardTitle>
                <CardDescription>
                  {displayAdvisors.length} advisor{displayAdvisors.length !== 1 ? 's' : ''} • {remainingDays} working days remaining
                </CardDescription>
              </div>
              
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search advisors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                
                <Select value={performanceFilter} onValueChange={(value: any) => setPerformanceFilter(value)}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Advisors</SelectItem>
                    <SelectItem value="exceeding">Exceeding Targets</SelectItem>
                    <SelectItem value="on-track">On Track</SelectItem>
                    <SelectItem value="needs-focus">Needs Focus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Quick Selection */}
            {searchTerm && filteredAdvisors.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Quick Selection</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      const names = filteredAdvisors.map(a => a.name)
                      setSelectedAdvisors(names)
                    }}
                  >
                    Select All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredAdvisors.slice(0, 6).map(advisor => (
                    <Badge
                      key={advisor.name}
                      variant={selectedAdvisors.includes(advisor.name) ? "default" : "outline"}
                      className="cursor-pointer px-3 py-1.5"
                      onClick={() => toggleAdvisorSelection(advisor.name)}
                    >
                      {advisor.name}
                      {selectedAdvisors.includes(advisor.name) && (
                        <X className="h-3 w-3 ml-1.5" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-4 md:p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                  <div className="animate-spin">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-gray-600">Loading advisor data...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-800 font-semibold">{error}</p>
                <p className="text-red-700 mt-2">Please upload RO Billing data to see advisors and their performance.</p>
              </div>
            ) : displayAdvisors.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-semibold">No advisors found</p>
                <p className="text-gray-500 mt-2">
                  {searchTerm ? "Try adjusting your search" : "No advisors available for your city"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayAdvisors.map((advisor) => {
                  const assign = assignments.find((as) => 
                    as.advisorName === advisor.name && as.city === user?.city
                  )
                  
                  return (
                    <AdvisorCard
                      key={advisor.name}
                      advisor={advisor}
                      assignment={assign}
                      expanded={expandedAdvisor === advisor.name}
                      onToggle={() => toggleAdvisorExpansion(advisor.name)}
                      remainingDays={remainingDays}
                    />
                  )
                })}
              </div>
            )}

            {/* Legend */}
            {!isLoading && !error && displayAdvisors.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Performance Indicators</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-sm text-gray-600">100%+ - Exceeding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-600">80-99% - On Track</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm text-gray-600">60-79% - Moderate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm text-gray-600">Below 60% - Needs Focus</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribution Dialog */}
        <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <VisuallyHidden>
                <DialogTitle>Distribute Targets</DialogTitle>
              </VisuallyHidden>
              <DialogDescription>
                Distribute targets to service advisors for the current month.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {!distributionMode ? (
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Choose Distribution Method</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={handleAutomaticDistribution}
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                    >
                      <Zap className="h-6 w-6" />
                      <span>Automatic Distribution</span>
                    </Button>
                    <Button
                      onClick={handleManualDistribution}
                      variant="outline"
                      className="h-20 flex flex-col items-center justify-center space-y-2"
                    >
                      <Users className="h-6 w-6" />
                      <span>Manual Distribution</span>
                    </Button>
                  </div>
                </div>
              ) : distributionMode === 'automatic' ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Automatic Distribution Preview</h3>
                  <div className="space-y-2">
                    {advisorTargets.map((target, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <h4 className="font-medium">{target.advisorName}</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mt-2">
                          <span>Labour: ₹{target.labour?.toLocaleString()}</span>
                          <span>Parts: ₹{target.parts?.toLocaleString()}</span>
                          <span>Vehicles: {target.totalVehicles}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setDistributionMode(null)}>
                      Back
                    </Button>
                    <Button onClick={handleSaveDistribution}>
                      Save Distribution
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Manual Distribution</h3>
                  
                  {/* Manual target input form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="advisor-select">Select Advisor</Label>
                      <Select value={selectedAdvisorForManual} onValueChange={setSelectedAdvisorForManual}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose advisor" />
                        </SelectTrigger>
                        <SelectContent>
                          {getRemainingAdvisors().map(advisor => (
                            <SelectItem key={advisor.name} value={advisor.name}>
                              {advisor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="labour">Labour Target</Label>
                        <Input
                          id="labour"
                          type="number"
                          value={manualTarget.labour}
                          onChange={(e) => setManualTarget(prev => ({ ...prev, labour: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="parts">Parts Target</Label>
                        <Input
                          id="parts"
                          type="number"
                          value={manualTarget.parts}
                          onChange={(e) => setManualTarget(prev => ({ ...prev, parts: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="vehicles">Vehicles Target</Label>
                        <Input
                          id="vehicles"
                          type="number"
                          value={manualTarget.totalVehicles}
                          onChange={(e) => setManualTarget(prev => ({ ...prev, totalVehicles: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="paid">Paid Service</Label>
                        <Input
                          id="paid"
                          type="number"
                          value={manualTarget.paidService}
                          onChange={(e) => setManualTarget(prev => ({ ...prev, paidService: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <Button 
                        onClick={handleAddManualTarget}
                        disabled={!selectedAdvisorForManual}
                        className="w-full"
                      >
                        Add Target
                      </Button>
                    </div>
                  </div>

                  {/* Show added targets */}
                  {advisorTargets.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Added Targets</h4>
                      {advisorTargets.map((target, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <h5 className="font-medium">{target.advisorName}</h5>
                          <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mt-2">
                            <span>Labour: ₹{target.labour?.toLocaleString()}</span>
                            <span>Parts: ₹{target.parts?.toLocaleString()}</span>
                            <span>Vehicles: {target.totalVehicles}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setDistributionMode(null)}>
                      Back
                    </Button>
                    <Button 
                      onClick={handleSaveDistribution}
                      disabled={advisorTargets.length === 0}
                    >
                      Save Distribution
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}