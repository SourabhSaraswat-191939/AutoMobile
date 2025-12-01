"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getRoBillingReports } from "@/lib/api"
import { getApiUrl } from "@/lib/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, TrendingUp, AlertCircle, CheckCircle, Calendar, Search, X, ChevronDown, ChevronUp, Users } from "lucide-react"

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

// Dropdown component for click details
const MetricDropdown = ({ metric, target, achieved, shortfall, perDay, isOpen }) => (
  <div className={`absolute z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl min-w-[220px] top-full left-1/2 transform -translate-x-1/2 mt-2 transition-all duration-200 ${isOpen ? 'block' : 'hidden'}`}>
    <div className="text-sm font-semibold mb-2 border-b border-gray-700 pb-1">{metric}</div>
    <div className="space-y-1 text-xs">
      <div className="flex justify-between">
        <span>Target:</span>
        <span className="font-bold">{target.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span>Achieved:</span>
        <span className="font-bold text-green-400">{achieved.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span>Shortfall:</span>
        <span className="font-bold text-orange-400">{shortfall.toLocaleString()}</span>
      </div>
      <div className="flex justify-between">
        <span>Per Day Rate:</span>
        <span className="font-bold text-purple-400">{perDay.toLocaleString()}</span>
      </div>
    </div>
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-b-gray-900"></div>
  </div>
)

// Format numbers to remove decimals and format with commas
const formatNumber = (num: number) => {
  return Math.round(num).toLocaleString()
}

export default function AdvisorTargetsReportPage() {
  const { user } = useAuth()
  const [advisors, setAdvisors] = useState<any[]>([])
  const [cityTarget, setCityTarget] = useState<any | null>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [roRows, setRoRows] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAdvisors, setSelectedAdvisors] = useState<string[]>([])
  const [openCell, setOpenCell] = useState<string | null>(null)
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('td')) {
        setOpenCell(null)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    async function load() {
      if (!user?.city) return
      setIsLoading(true)
      setError(null)
      try {
        // Fetch RO Billing data
        const response = await fetch(
          getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=ro_billing`)
        )
        
        if (!response.ok) {
          throw new Error("Failed to fetch RO Billing data")
        }
        
        const result = await response.json()
        const roData = Array.isArray(result.data) ? result.data : []
        setRoRows(roData)
        
        // Extract unique advisors from RO Billing data
        const uniqueAdvisorNames = Array.from(
          new Set(roData.map((r: any) => r.serviceAdvisor).filter(Boolean))
        )
        const advisorList = uniqueAdvisorNames.map((name: any) => ({ name }))
        setAdvisors(advisorList)
        
        // Get GM targets
        const rawTarget = localStorage.getItem(GM_TARGETS_KEY)
        const targets = rawTarget ? JSON.parse(rawTarget) : []
        setCityTarget(targets.find((t: any) => t.city === user.city) || null)
        
        // Get existing assignments
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
        achievedMap[name] = { labour: 0, parts: 0, vehicles: 0, paid: 0, free: 0, rr: 0 }
      }
      
      achievedMap[name].labour += Number(r.labourAmt || 0)
      achievedMap[name].parts += Number(r.partAmt || 0)
      achievedMap[name].vehicles += 1
      
      if (r.workType?.toLowerCase().includes("paid")) {
        achievedMap[name].paid += 1
      }
      if (r.workType?.toLowerCase().includes("free")) {
        achievedMap[name].free += 1
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
      const achieved = achievedMap[a.name] || { labour: 0, parts: 0, vehicles: 0, paid: 0, free: 0, rr: 0 }
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
    const achieved = achievedMap[selectedAdvisorForManual] || { labour: 0, parts: 0, vehicles: 0, paid: 0, free: 0, rr: 0 }
    
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
      achieved: {
        labour: at.achieved.labour,
        parts: at.achieved.parts,
        totalVehicles: at.achieved.vehicles,
        paidService: at.achieved.paid,
        freeService: at.achieved.free,
        rr: at.achieved.rr,
      },
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

  const remainingDays = remainingWorkingDaysFromToday()

  // Filter advisors based on search term
  const filteredAdvisors = advisors.filter(advisor =>
    advisor.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Toggle advisor selection
  const toggleAdvisorSelection = (advisorName: string) => {
    setSelectedAdvisors(prev => 
      prev.includes(advisorName)
        ? prev.filter(name => name !== advisorName)
        : [...prev, advisorName]
    )
  }

  // Select all filtered advisors
  const selectAllFiltered = () => {
    const filteredNames = filteredAdvisors.map(a => a.name)
    setSelectedAdvisors(prev => {
      const newSelection = [...prev]
      filteredNames.forEach(name => {
        if (!newSelection.includes(name)) {
          newSelection.push(name)
        }
      })
      return newSelection
    })
  }

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedAdvisors([])
  }

  // Get advisors to display in table (selected ones or all if none selected)
  const displayAdvisors = selectedAdvisors.length > 0 
    ? advisors.filter(advisor => selectedAdvisors.includes(advisor.name))
    : advisors

  // Metrics configuration
  const metrics = [
    { key: "labour", label: "Labour", icon: "💼" },
    { key: "parts", label: "Parts", icon: "🔧" },
    { key: "totalVehicles", label: "Total Vehicles", icon: "🚗" },
    { key: "paidService", label: "Paid Service", icon: "💳" },
    { key: "freeService", label: "Free Service", icon: "🎁" },
    { key: "rr", label: "R&R", icon: "🔄" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pb-12">
      {/* Reduced container width */}
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <CheckCircle className="h-5 w-5" />
            <p>{successMessage}</p>
          </div>
        )}

        {/* Header Section - Made more compact */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">Advisor Targets & Performance</h1>
                <p className="text-blue-100 text-sm mt-1">Track and manage service advisor performance metrics</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Card - Made more compact */}
        <Card className="shadow-lg border border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-blue-100 p-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Performance Dashboard</CardTitle>
                  <CardDescription className="text-sm">Monitor target achievement and per-day performance rates</CardDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Remaining Days</p>
                <p className="text-xl font-bold text-blue-600">{remainingDays}</p>
              </div>
            </div>
            
            {/* Distribution Button */}
            {user?.role === "service_manager" && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <Button 
                  onClick={handleDistributeClick}
                  disabled={!cityTarget}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-md shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Users className="h-4 w-4" />
                  Distribute GM Targets to Advisors
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 mb-3">
                  <div className="animate-spin">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm">Loading advisor data...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-red-800 font-semibold text-sm">{error}</p>
                <p className="text-red-700 text-xs mt-1">Please upload RO Billing data to see advisors and their performance.</p>
              </div>
            ) : advisors.length === 0 ? (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-6 text-center">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-gray-800 font-semibold">No advisors found for your city</p>
                <p className="text-gray-600 text-sm mt-1">Please upload RO Billing data first to see advisors and their performance metrics.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Search and Selection Section */}
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search advisors by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                    />
                  </div>

                  {/* Selection Controls */}
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm text-gray-600">Select advisors to compare:</span>
                      {filteredAdvisors.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllFiltered}
                          className="text-xs h-7"
                        >
                          Select All ({filteredAdvisors.length})
                        </Button>
                      )}
                      {selectedAdvisors.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllSelections}
                          className="text-xs h-7"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedAdvisors.length > 0 ? (
                        <span>Showing {selectedAdvisors.length} selected advisors</span>
                      ) : (
                        <span>Showing all {advisors.length} advisors</span>
                      )}
                    </div>
                  </div>

                  {/* Selected Advisors Badges */}
                  {selectedAdvisors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedAdvisors.map(advisorName => (
                        <Badge 
                          key={advisorName} 
                          variant="secondary"
                          className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                          onClick={() => toggleAdvisorSelection(advisorName)}
                        >
                          {advisorName}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Advisor Selection List */}
                {searchTerm && filteredAdvisors.length > 0 && (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Click to select/deselect advisors:</p>
                    <div className="flex flex-wrap gap-2">
                      {filteredAdvisors.map(advisor => (
                        <Badge
                          key={advisor.name}
                          variant={selectedAdvisors.includes(advisor.name) ? "default" : "outline"}
                          className={`px-3 py-1 cursor-pointer transition-all ${
                            selectedAdvisors.includes(advisor.name)
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-white hover:bg-gray-100 text-gray-700"
                          }`}
                          onClick={() => toggleAdvisorSelection(advisor.name)}
                        >
                          {advisor.name}
                          {selectedAdvisors.includes(advisor.name) && (
                            <CheckCircle className="h-3 w-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Consolidated Table */}
                {displayAdvisors.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-indigo-600">
                          <th className="text-left py-3 px-3 font-bold text-white text-sm border-r border-blue-500 sticky left-0 bg-blue-600 z-10 w-32">
                            Metrics
                          </th>
                          {displayAdvisors.map((advisor, index) => (
                            <th 
                              key={advisor.name} 
                              className="text-center py-3 px-3 font-bold text-white text-sm border-r border-blue-500 last:border-r-0 min-w-[120px]"
                            >
                              {advisor.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((metric, metricIndex) => (
                          <tr 
                            key={metric.key}
                            className={`hover:bg-blue-50/50 transition-colors ${
                              metricIndex < metrics.length - 1 ? 'border-b border-gray-200' : ''
                            }`}
                          >
                            <td className="py-3 px-3 border-r border-gray-200 sticky left-0 bg-white z-10 w-32">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{metric.icon}</span>
                                <span className="font-semibold text-gray-900 text-sm">{metric.label}</span>
                              </div>
                            </td>
                            {displayAdvisors.map((advisor, advisorIndex) => {
                              const assign = assignments.find((as) => 
                                as.advisorName === advisor.name && as.city === user?.city
                              )
                              
                              const achieved = assign?.achieved || { 
                                labour: 0, parts: 0, totalVehicles: 0, paidService: 0, freeService: 0, rr: 0 
                              }
                              
                              const target = assign?.[metric.key] ?? 0
                              const ach = achieved[metric.key] ?? 0
                              const shortfall = Math.max(0, target - ach)
                              const perDay = Math.ceil(shortfall / Math.max(1, remainingDays))
                              
                              const cellId = `${advisor.name}-${metric.key}`
                              const isOpen = openCell === cellId
                              
                              return (
                                <td 
                                  key={cellId} 
                                  className="py-3 px-3 border-r border-gray-200 last:border-r-0 relative text-center min-w-[120px]"
                                >
                                  {/* Clickable cell content */}
                                  <div 
                                    className="cursor-pointer hover:bg-blue-50 rounded-md p-2 transition-colors"
                                    onClick={() => setOpenCell(isOpen ? null : cellId)}
                                  >
                                    {/* Main display - Achieved/Target format */}
                                    <div className="font-bold text-gray-900 text-sm flex items-center justify-center gap-1">
                                      {formatNumber(ach)}/{formatNumber(target)}
                                      {isOpen ? (
                                        <ChevronUp className="h-3 w-3 text-blue-600" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3 text-gray-400" />
                                      )}
                                    </div>
                                    
                                    {/* Shortfall indicator */}
                                    {shortfall > 0 && (
                                      <div className="text-xs text-orange-600 font-medium mt-1">
                                        Short: {formatNumber(shortfall)}
                                      </div>
                                    )}
                                    
                                    {/* Per day rate */}
                                    <div className="text-xs text-purple-600 font-medium mt-1">
                                      Per Day: {formatNumber(perDay)}
                                    </div>
                                  </div>
                                  
                                  {/* Click dropdown with all details */}
                                  <MetricDropdown 
                                    metric={metric.label}
                                    target={target}
                                    achieved={ach}
                                    shortfall={shortfall}
                                    perDay={perDay}
                                    isOpen={isOpen}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No advisors to display</p>
                    <p className="text-gray-500 text-sm mt-1">
                      {selectedAdvisors.length === 0 ? "Select some advisors to compare" : "No advisors match your criteria"}
                    </p>
                  </div>
                )}

                {/* Legend */}
                <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">How to use:</h4>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>• <strong>Search:</strong> Type to find advisors, then click to select/deselect</p>
                    <p>• <strong>Compare:</strong> Selected advisors will appear in the table</p>
                    <p>• <strong>Click:</strong> Click on any cell to view detailed breakdown (Target, Achieved, Shortfall, Per Day Rate)</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        {advisors.length > 0 && !error && !isLoading && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-blue-100 p-2">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Advisors</p>
                    <p className="text-lg font-bold text-gray-900">{advisors.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-emerald-100 p-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Selected</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedAdvisors.length > 0 ? `${selectedAdvisors.length} selected` : 'All'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-purple-100 p-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Days Remaining</p>
                    <p className="text-lg font-bold text-gray-900">{remainingDays}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Distribution Dialog */}
        <Dialog open={showDistributeDialog} onOpenChange={setShowDistributeDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Distribute Targets to Advisors</DialogTitle>
              <DialogDescription>
                Choose how to distribute the GM-assigned targets among your advisors
              </DialogDescription>
            </DialogHeader>

            {!distributionMode ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleAutomaticDistribution}>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">Automatic Distribution</h3>
                      <p className="text-sm text-muted-foreground">
                        Divide targets equally among all {advisors.length} advisors
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleManualDistribution}>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-2">Manual Distribution</h3>
                      <p className="text-sm text-muted-foreground">
                        Manually assign custom targets to each advisor
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : distributionMode === 'automatic' ? (
              <div className="space-y-4 py-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Targets will be divided equally among {advisors.length} advisors
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Advisor</th>
                        <th className="text-right py-2 px-2">Labour</th>
                        <th className="text-right py-2 px-2">Parts</th>
                        <th className="text-right py-2 px-2">Vehicles</th>
                        <th className="text-right py-2 px-2">Paid Svc</th>
                        <th className="text-right py-2 px-2">Free Svc</th>
                        <th className="text-right py-2 px-2">R&R</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advisorTargets.map((at, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-2 font-medium">{at.advisorName}</td>
                          <td className="text-right py-2 px-2">₹{at.labour.toLocaleString()}</td>
                          <td className="text-right py-2 px-2">₹{at.parts.toLocaleString()}</td>
                          <td className="text-right py-2 px-2">{at.totalVehicles}</td>
                          <td className="text-right py-2 px-2">{at.paidService}</td>
                          <td className="text-right py-2 px-2">{at.freeService}</td>
                          <td className="text-right py-2 px-2">{at.rr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setDistributionMode(null)}>
                    Back
                  </Button>
                  <Button onClick={handleSaveDistribution}>
                    Save Distribution
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Manually assign targets to each advisor. You can assign different targets based on their capacity.
                  </p>
                </div>

                {/* Add Target Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Advisor Target</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Select Advisor</Label>
                      <Select value={selectedAdvisorForManual} onValueChange={setSelectedAdvisorForManual}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an advisor" />
                        </SelectTrigger>
                        <SelectContent>
                          {getRemainingAdvisors().map((advisor) => (
                            <SelectItem key={advisor.name} value={advisor.name}>
                              {advisor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Labour (₹)</Label>
                        <Input
                          type="number"
                          value={manualTarget.labour}
                          onChange={(e) => setManualTarget({ ...manualTarget, labour: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Parts (₹)</Label>
                        <Input
                          type="number"
                          value={manualTarget.parts}
                          onChange={(e) => setManualTarget({ ...manualTarget, parts: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Total Vehicles</Label>
                        <Input
                          type="number"
                          value={manualTarget.totalVehicles}
                          onChange={(e) => setManualTarget({ ...manualTarget, totalVehicles: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Paid Service</Label>
                        <Input
                          type="number"
                          value={manualTarget.paidService}
                          onChange={(e) => setManualTarget({ ...manualTarget, paidService: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>Free Service</Label>
                        <Input
                          type="number"
                          value={manualTarget.freeService}
                          onChange={(e) => setManualTarget({ ...manualTarget, freeService: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label>R&R</Label>
                        <Input
                          type="number"
                          value={manualTarget.rr}
                          onChange={(e) => setManualTarget({ ...manualTarget, rr: Number(e.target.value) })}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <Button onClick={handleAddManualTarget} disabled={!selectedAdvisorForManual} className="w-full">
                      Add Target
                    </Button>
                  </CardContent>
                </Card>

                {/* Assigned Targets List */}
                {advisorTargets.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Assigned Targets</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2">Advisor</th>
                            <th className="text-right py-2 px-2">Labour</th>
                            <th className="text-right py-2 px-2">Parts</th>
                            <th className="text-right py-2 px-2">Vehicles</th>
                            <th className="text-right py-2 px-2">Paid Svc</th>
                            <th className="text-right py-2 px-2">Free Svc</th>
                            <th className="text-right py-2 px-2">R&R</th>
                          </tr>
                        </thead>
                        <tbody>
                          {advisorTargets.map((at, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="py-2 px-2 font-medium">{at.advisorName}</td>
                              <td className="text-right py-2 px-2">₹{at.labour.toLocaleString()}</td>
                              <td className="text-right py-2 px-2">₹{at.parts.toLocaleString()}</td>
                              <td className="text-right py-2 px-2">{at.totalVehicles}</td>
                              <td className="text-right py-2 px-2">{at.paidService}</td>
                              <td className="text-right py-2 px-2">{at.freeService}</td>
                              <td className="text-right py-2 px-2">{at.rr}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setDistributionMode(null)}>
                    Back
                  </Button>
                  <Button onClick={handleSaveDistribution} disabled={advisorTargets.length === 0}>
                    Save Distribution
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}