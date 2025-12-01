"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getRoBillingReports, getServiceBookingReports, getWarrantyReports, getAdvisorsByCity } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

type CityTarget = {
  id: string
  city: string
  month: string
  labour: number
  parts: number
  totalVehicles: number
  paidService: number
  freeService: number
  rr: number
  createdBy: string
  createdAt: string
}

const STORAGE_KEY = "gm_field_targets_v1"

export default function GMFieldTargetsPage() {
  const { user } = useAuth()
  const [city, setCity] = useState("Pune")
  const [month, setMonth] = useState(new Date().toLocaleString("default", { month: "long" }))
  const [targets, setTargets] = useState<CityTarget[]>([])
  const [form, setForm] = useState({ labour: "", parts: "", totalVehicles: "", paidService: "", freeService: "", rr: "" })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) setTargets(JSON.parse(raw))
  }, [])

  if (user?.role !== "general_manager") {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">Only General Managers can assign field-level targets</p>
      </div>
    )
  }

  const saveTargets = () => {
    const newTarget: CityTarget = {
      id: `ct-${Date.now()}`,
      city,
      month,
      labour: Number(form.labour) || 0,
      parts: Number(form.parts) || 0,
      totalVehicles: Number(form.totalVehicles) || 0,
      paidService: Number(form.paidService) || 0,
      freeService: Number(form.freeService) || 0,
      rr: Number(form.rr) || 0,
      createdBy: user?.id || "gm",
      createdAt: new Date().toISOString(),
    }

    const updated = [newTarget, ...targets]
    setTargets(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setForm({ labour: "", parts: "", totalVehicles: "", paidService: "", freeService: "", rr: "" })
  }

  const computeAchievement = async (t: CityTarget) => {
    setIsLoading(true)
    const ro = await getRoBillingReports(t.city)
    const bookings = await getServiceBookingReports(t.city)
    const warranty = await getWarrantyReports(t.city)

    const achievedLabour = ro.reduce((s, r) => s + (r.labourCost || 0), 0)
    const achievedParts = ro.reduce((s, r) => s + (r.partsCost || 0), 0)
    const achievedTotalVehicles = ro.length
    const achievedPaidService = ro.filter((r) => r.totalAmount > 0 && r.status === "completed").length
    const achievedFreeService = bookings.filter((b) => b.actualCost === 0).length
    const achievedRR = warranty.length

    setIsLoading(false)

    return {
      achievedLabour,
      achievedParts,
      achievedTotalVehicles,
      achievedPaidService,
      achievedFreeService,
      achievedRR,
    }
  }

  const daysInMonth = 30
  const today = new Date().getDate()
  const remainingDays = Math.max(1, daysInMonth - today)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">GM — Field Targets</h1>
        <p className="text-muted-foreground mt-2">Assign Labour / Parts / Vehicles / Service targets per city</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Target for City</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">City</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full p-2 border rounded">
                <option>Pune</option>
                <option>Mumbai</option>
                <option>Nagpur</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Month</label>
              <input value={month} onChange={(e) => setMonth(e.target.value)} className="w-full p-2 border rounded" />
            </div>

            <div className="flex items-end">
              <Button onClick={saveTargets}>Save Target</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <input
              type="number"
              placeholder="Labour"
              value={form.labour}
              onChange={(e) => setForm({ ...form, labour: e.target.value })}
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Parts"
              value={form.parts}
              onChange={(e) => setForm({ ...form, parts: e.target.value })}
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Total Vehicles"
              value={form.totalVehicles}
              onChange={(e) => setForm({ ...form, totalVehicles: e.target.value })}
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Paid Service"
              value={form.paidService}
              onChange={(e) => setForm({ ...form, paidService: e.target.value })}
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="Free Service"
              value={form.freeService}
              onChange={(e) => setForm({ ...form, freeService: e.target.value })}
              className="p-2 border rounded"
            />
            <input
              type="number"
              placeholder="R&R"
              value={form.rr}
              onChange={(e) => setForm({ ...form, rr: e.target.value })}
              className="p-2 border rounded"
            />
          </div>
        </CardContent>
      </Card>

      {/* List targets with computed achievement */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Field Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">City</th>
                  <th className="text-left py-2 px-2">Month</th>
                  <th className="text-right py-2 px-2">Labour (T/A)</th>
                  <th className="text-right py-2 px-2">Parts (T/A)</th>
                  <th className="text-right py-2 px-2">Total Veh (T/A)</th>
                  <th className="text-right py-2 px-2">Paid Svc (T/A)</th>
                  <th className="text-right py-2 px-2">Free Svc (T/A)</th>
                  <th className="text-right py-2 px-2">R&R (T/A)</th>
                  <th className="text-center py-2 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2">{t.city}</td>
                    <td className="py-2 px-2">{t.month}</td>
                    <td className="text-right py-2 px-2">{t.labour}</td>
                    <td className="text-right py-2 px-2">{t.parts}</td>
                    <td className="text-right py-2 px-2">{t.totalVehicles}</td>
                    <td className="text-right py-2 px-2">{t.paidService}</td>
                    <td className="text-right py-2 px-2">{t.freeService}</td>
                    <td className="text-right py-2 px-2">{t.rr}</td>
                    <td className="text-center py-2 px-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          const a = await computeAchievement(t)
                          alert(
                            `Achievements for ${t.city}:\nLabour ₹${a.achievedLabour}\nParts ₹${a.achievedParts}\nVehicles ${a.achievedTotalVehicles}\nPaid ${a.achievedPaidService}\nFree ${a.achievedFreeService}\nR&R ${a.achievedRR}`,
                          )
                        }}
                      >
                        View Achieved
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
