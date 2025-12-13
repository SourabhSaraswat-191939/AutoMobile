"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { getRoBillingReports, getServiceBookingReports, getWarrantyReports } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Users, CheckCircle } from "lucide-react"
import { getApiUrl } from "@/lib/config"

const STORAGE_KEY = "gm_field_targets_v1"

interface Advisor {
  name: string
  email?: string
}

interface AdvisorTarget {
  advisorName: string
  labour: number
  parts: number
  totalVehicles: number
  paidService: number
  freeService: number
  rr: number
}

export default function SMTargetsPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [target, setTarget] = useState<any | null>(null)
  const [achieved, setAchieved] = useState<any | null>(null)
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [showDistributeDialog, setShowDistributeDialog] = useState(false)
  const [distributionMode, setDistributionMode] = useState<'automatic' | 'manual' | null>(null)
  const [advisorTargets, setAdvisorTargets] = useState<AdvisorTarget[]>([])
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('')
  const [manualTarget, setManualTarget] = useState({
    labour: 0,
    parts: 0,
    totalVehicles: 0,
    paidService: 0,
    freeService: 0,
    rr: 0
  })
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!user?.city || !user?.email) return
      const raw = localStorage.getItem(STORAGE_KEY)
      const list = raw ? JSON.parse(raw) : []
      const latest = list.find((l: any) => l.city === user.city)
      setTarget(latest || null)

      if (latest) {
        const ro = await getRoBillingReports(user.city)
        const bookings = await getServiceBookingReports(user.city)
        const warranty = await getWarrantyReports(user.city)

        const achievedLabour = ro.reduce((s, r) => s + (r.labourCost || 0), 0)
        const achievedParts = ro.reduce((s, r) => s + (r.partsCost || 0), 0)
        const achievedTotalVehicles = ro.length
        const achievedPaidService = ro.filter((r) => r.totalAmount > 0 && r.status === "completed").length
        const achievedFreeService = bookings.filter((b) => b.actualCost === 0).length
        const achievedRR = warranty.length

        setAchieved({ achievedLabour, achievedParts, achievedTotalVehicles, achievedPaidService, achievedFreeService, achievedRR })
      }

      // Fetch advisors from RO Billing data
      try {
        const response = await fetch(
          getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=ro_billing`)
        )
        if (response.ok) {
          const result = await response.json()
          const roBillingData = Array.isArray(result.data) ? result.data : []
          const uniqueAdvisors = Array.from(
            new Set(roBillingData.map((r: any) => r.serviceAdvisor).filter(Boolean))
          ).map((name) => ({ name: name as string }))
          setAdvisors(uniqueAdvisors)
        }
      } catch (err) {
        console.error('Error loading advisors:', err)
      }
    }
    load()
  }, [user?.city, user?.email])

  if (user?.role !== "service_manager") {
    return (
      <div className="text-center py-12">
        <p className="text-lg">This page is for Service Managers</p>
      </div>
    )
  }

  const handleDistributeClick = () => {
    if (!target) return
    setShowDistributeDialog(true)
    setDistributionMode(null)
    setAdvisorTargets([])
    setSelectedAdvisor('')
  }

  const handleAutomaticDistribution = () => {
    if (!target || advisors.length === 0) return
    
    const count = advisors.length
    const distributed: AdvisorTarget[] = advisors.map((advisor) => ({
      advisorName: advisor.name,
      labour: Math.round(target.labour / count),
      parts: Math.round(target.parts / count),
      totalVehicles: Math.round(target.totalVehicles / count),
      paidService: Math.round(target.paidService / count),
      freeService: Math.round(target.freeService / count),
      rr: Math.round(target.rr / count)
    }))
    
    setAdvisorTargets(distributed)
    setDistributionMode('automatic')
  }

  const handleManualDistribution = () => {
    setDistributionMode('manual')
    setAdvisorTargets([])
  }

  const handleAddManualTarget = () => {
    if (!selectedAdvisor) return
    
    const newTarget: AdvisorTarget = {
      advisorName: selectedAdvisor,
      ...manualTarget
    }
    
    setAdvisorTargets([...advisorTargets, newTarget])
    setSelectedAdvisor('')
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
    // Save to localStorage or send to backend
    const storageKey = `sm_advisor_targets_${user?.city}_${target.month}`
    localStorage.setItem(storageKey, JSON.stringify(advisorTargets))
    
    setSuccessMessage('Targets distributed successfully!')
    setShowDistributeDialog(false)
    setTimeout(() => setSuccessMessage(''), 3000)
  }

  const getRemainingAdvisors = () => {
    const assigned = advisorTargets.map(t => t.advisorName)
    return advisors.filter(a => !assigned.includes(a.name))
  }

  if (!target) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-semibold">No field targets assigned for your city yet</p>
        <p className="text-sm text-muted-foreground mt-2">Please contact your GM to assign targets</p>
      </div>
    )
  }

  const shortfall = {
    labour: Math.max(0, target.labour - (achieved?.achievedLabour || 0)),
    parts: Math.max(0, target.parts - (achieved?.achievedParts || 0)),
    totalVehicles: Math.max(0, target.totalVehicles - (achieved?.achievedTotalVehicles || 0)),
    paidService: Math.max(0, target.paidService - (achieved?.achievedPaidService || 0)),
    freeService: Math.max(0, target.freeService - (achieved?.achievedFreeService || 0)),
    rr: Math.max(0, target.rr - (achieved?.achievedRR || 0)),
  }

  const daysInMonth = 30
  const today = new Date().getDate()
  const remainingDays = Math.max(1, daysInMonth - today)

  // ✅ Check target management permissions
  if (!hasPermission('target_report') && !hasPermission('gm_targets') && 
      !hasPermission('ro_billing_dashboard') && user?.role !== "service_manager") {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">You need target or dashboard permissions to manage targets</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle className="h-5 w-5" />
          <p>{successMessage}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Targets — {user.city}</h1>
          <p className="text-muted-foreground">Assigned by GM • Month: {target.month}</p>
        </div>
        <Button
          onClick={handleDistributeClick}
          className="gap-2"
          disabled={!target}
        >
          <Users className="h-4 w-4" />
          Distribute GM Targets to Advisors
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Field Targets & Achievement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Metric</th>
                  <th className="text-right py-2 px-2">Target</th>
                  <th className="text-right py-2 px-2">Achieved</th>
                  <th className="text-right py-2 px-2">Shortfall</th>
                  <th className="text-right py-2 px-2">Per-day Required</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 px-2">Labour (₹)</td>
                  <td className="text-right py-2 px-2">{target.labour}</td>
                  <td className="text-right py-2 px-2">{achieved?.achievedLabour ?? 0}</td>
                  <td className="text-right py-2 px-2">{shortfall.labour}</td>
                  <td className="text-right py-2 px-2">{Math.ceil(shortfall.labour / remainingDays)}</td>
                </tr>

                <tr className="border-b">
                  <td className="py-2 px-2">Parts (₹)</td>
                  <td className="text-right py-2 px-2">{target.parts}</td>
                  <td className="text-right py-2 px-2">{achieved?.achievedParts ?? 0}</td>
                  <td className="text-right py-2 px-2">{shortfall.parts}</td>
                  <td className="text-right py-2 px-2">{Math.ceil(shortfall.parts / remainingDays)}</td>
                </tr>

                <tr className="border-b">
                  <td className="py-2 px-2">Total Vehicles</td>
                  <td className="text-right py-2 px-2">{target.totalVehicles}</td>
                  <td className="text-right py-2 px-2">{achieved?.achievedTotalVehicles ?? 0}</td>
                  <td className="text-right py-2 px-2">{shortfall.totalVehicles}</td>
                  <td className="text-right py-2 px-2">{Math.ceil(shortfall.totalVehicles / remainingDays)}</td>
                </tr>

                <tr className="border-b">
                  <td className="py-2 px-2">Paid Service (count)</td>
                  <td className="text-right py-2 px-2">{target.paidService}</td>
                  <td className="text-right py-2 px-2">{achieved?.achievedPaidService ?? 0}</td>
                  <td className="text-right py-2 px-2">{shortfall.paidService}</td>
                  <td className="text-right py-2 px-2">{Math.ceil(shortfall.paidService / remainingDays)}</td>
                </tr>

                <tr className="border-b">
                  <td className="py-2 px-2">Free Service (count)</td>
                  <td className="text-right py-2 px-2">{target.freeService}</td>
                  <td className="text-right py-2 px-2">{achieved?.achievedFreeService ?? 0}</td>
                  <td className="text-right py-2 px-2">{shortfall.freeService}</td>
                  <td className="text-right py-2 px-2">{Math.ceil(shortfall.freeService / remainingDays)}</td>
                </tr>

                <tr className="border-b">
                  <td className="py-2 px-2">R&R (count)</td>
                  <td className="text-right py-2 px-2">{target.rr}</td>
                  <td className="text-right py-2 px-2">{achieved?.achievedRR ?? 0}</td>
                  <td className="text-right py-2 px-2">{shortfall.rr}</td>
                  <td className="text-right py-2 px-2">{Math.ceil(shortfall.rr / remainingDays)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
                    <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
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

                  <Button onClick={handleAddManualTarget} disabled={!selectedAdvisor} className="w-full">
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
  )
}
