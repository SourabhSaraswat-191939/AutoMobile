"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getRoBillingReports, getServiceBookingReports, getWarrantyReports } from "@/lib/api"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function remainingWorkingDaysFromToday(): number {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  const lastDay = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = today.getDate(); d <= lastDay; d++) {
    const dt = new Date(year, month, d)
    const day = dt.getDay()
    if (day !== 0) count++ // exclude Sunday (0)
  }
  return count
}

export default function AdvisorPage() {
  const { user } = useAuth()
  const params = useParams() as { advisor?: string }
  const advisorName = params?.advisor ? decodeURIComponent(params.advisor) : null
  const [target, setTarget] = useState<any | null>(null)
  const [achieved, setAchieved] = useState<any | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!advisorName || !user?.city) return

  // Load per-advisor assignment from localStorage
  const raw = localStorage.getItem("advisor_field_targets_v1")
  const advisorAssignList = raw ? JSON.parse(raw) : []
  const t = advisorAssignList.find((l: any) => l.advisorName === advisorName && l.city === user.city)
      if (t) setTarget(t)
      else {
        // fallback: read GM city target and divide equally by advisors in RO Billing
        const gmRaw = localStorage.getItem("gm_field_targets_v1")
        const gmList = gmRaw ? JSON.parse(gmRaw) : []
        const cityTarget = gmList.find((g: any) => g.city === user.city)
        if (cityTarget) {
          // estimate advisors count by unique serviceAdvisor in RO billing
          const ro = await getRoBillingReports(user.city)
          const advisors = Array.from(new Set(ro.map((r) => r.serviceAdvisor))).filter(Boolean)
          const per = (v: number) => Math.floor(v / Math.max(1, advisors.length))
          setTarget({
            advisorName,
            city: user.city,
            month: cityTarget.month || new Date().toLocaleString("default", { month: "long" }),
            labour: per(cityTarget.labour || 0),
            parts: per(cityTarget.parts || 0),
            totalVehicles: per(cityTarget.totalVehicles || 0),
            paidService: per(cityTarget.paidService || 0),
            freeService: per(cityTarget.freeService || 0),
            rr: per(cityTarget.rr || 0),
          })
        }
      }

      // try reading achieved snapshot from advisor assignments stored by RO Billing distribution
  const assRaw = localStorage.getItem("advisor_field_targets_v1")
  const assignsList = assRaw ? JSON.parse(assRaw) : []
  const my = assignsList.find((l: any) => l.advisorName === advisorName && l.city === user.city)
      if (my && my.achieved) {
        setAchieved({
          labour: my.achieved.labour || 0,
          parts: my.achieved.parts || 0,
          totalVehicles: my.achieved.totalVehicles || 0,
          paidService: my.achieved.paidService || 0,
          freeService: my.achieved.freeService || 0,
          rr: my.achieved.rr || 0,
        })
      } else {
        // fallback: compute values using RO Billing rows for this advisor (metric-specific)
        // prefer advisor-specific data from RO billing; if serviceAdvisor is not present in the
        // dataset, this will produce zeros and the UI will show target-only values.
        const roRecords = await getRoBillingReports(user.city)
        const myRows = roRecords.filter((r: any) => {
          const name = (r.serviceAdvisor || r.advisorName || "").toString()
          return name && advisorName && name.toLowerCase() === advisorName.toLowerCase()
        })

        const labour = myRows.reduce((s: number, r: any) => s + (Number(r.labourAmt || r.labourCost || r.labour || 0) || 0), 0)
        const parts = myRows.reduce((s: number, r: any) => s + (Number(r.partAmt || r.partsCost || r.parts || 0) || 0), 0)
        const totalVehicles = myRows.length
        const paidService = myRows.filter((r: any) => Number(r.totalAmount || r.total || 0) > 0).length
        const freeService = myRows.filter((r: any) => Number(r.totalAmount || r.total || 0) === 0).length
        const rr = myRows.filter((r: any) => {
          const wt = (r.workType || r.serviceType || "").toString().toLowerCase()
          return wt.includes("r&r") || wt.includes("r and r") || wt.includes("running repair") || wt.includes("rr")
        }).length

        setAchieved({ labour, parts, totalVehicles, paidService, freeService, rr })
      }
    }
    load()
  }, [advisorName, user?.city])

  const remainingDays = useMemo(() => remainingWorkingDaysFromToday(), [])

  if (user?.role !== "service_manager") {
    return (
      <div className="text-center py-12">
        <p className="text-lg">Advisor target view is for Service Managers</p>
      </div>
    )
  }

  if (!advisorName) {
    return <div className="text-center py-12">No advisor selected</div>
  }

  if (!target) {
    return <div className="text-center py-12">No target assigned to {advisorName} yet</div>
  }

  const metrics = [
    { key: "labour", label: "Labour (₹)" },
    { key: "parts", label: "Parts (₹)" },
    { key: "paidService", label: "Paid Service (count)" },
    { key: "rr", label: "Running Repair (count)" },
    { key: "freeService", label: "Free Service (count)" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Advisor: {advisorName}</h1>
        <p className="text-muted-foreground">City: {user.city} • Month: {target.month}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance vs Target</CardTitle>
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
                  <th className="text-right py-2 px-2">Per-Day Required</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => {
                  const targ = target[m.key] ?? 0
                  const ach = achieved ? achieved[m.key] ?? 0 : 0
                  const shortfall = Math.max(0, targ - ach)
                  const perDay = Math.ceil(shortfall / Math.max(1, remainingDays))
                  return (
                    <tr key={m.key} className="border-b">
                      <td className="py-2 px-2">{m.label}</td>
                      <td className="text-right py-2 px-2">{targ}</td>
                      <td className="text-right py-2 px-2">{ach}</td>
                      <td className="text-right py-2 px-2">{shortfall}</td>
                      <td className="text-right py-2 px-2">{perDay}</td>
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
