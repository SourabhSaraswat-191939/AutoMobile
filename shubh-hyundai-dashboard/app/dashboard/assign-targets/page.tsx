"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import {
  getAllServiceAdvisors,
  getTargetAssignments,
  assignTarget,
  type ServiceAdvisor,
  type TargetAssignment,
} from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Plus } from "lucide-react"

export default function AssignTargetsPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const [advisors, setAdvisors] = useState<ServiceAdvisor[]>([])
  const [assignments, setAssignments] = useState<TargetAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const [formData, setFormData] = useState({
    advisorId: "",
    month: new Date().toLocaleString("default", { month: "long" }),
    revenueTarget: "",
    serviceTarget: "",
    satisfactionTarget: "90",
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [advisorsData, assignmentsData] = await Promise.all([getAllServiceAdvisors(), getTargetAssignments()])
        setAdvisors(advisorsData)
        setAssignments(assignmentsData)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // ✅ UPDATED: Check target assignment permissions
  if (!hasPermission('gm_targets') && !hasPermission('target_report') && user?.role !== "general_manager") {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">You need target management permissions to assign targets</p>
        <p className="text-sm text-gray-500 mt-2">Required: gm_targets or target_report permission</p>
      </div>
    )
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const selectedAdvisor = advisors.find((a) => a.id === formData.advisorId)
    if (!selectedAdvisor) return

    try {
      await assignTarget({
        advisorId: formData.advisorId,
        advisorName: selectedAdvisor.name,
        city: selectedAdvisor.city,
        month: formData.month,
        revenueTarget: Number.parseInt(formData.revenueTarget),
        serviceTarget: Number.parseInt(formData.serviceTarget),
        satisfactionTarget: Number.parseInt(formData.satisfactionTarget),
        createdBy: user?.id || "1",
        status: "active",
      })

      setSuccessMessage(`Target assigned to ${selectedAdvisor.name} for ${formData.month}`)
      setFormData({
        advisorId: "",
        month: new Date().toLocaleString("default", { month: "long" }),
        revenueTarget: "",
        serviceTarget: "",
        satisfactionTarget: "90",
      })
      setShowForm(false)

      setTimeout(() => setSuccessMessage(""), 3000)

      // Reload assignments
      const updatedAssignments = await getTargetAssignments()
      setAssignments(updatedAssignments)
    } catch (error) {
      console.error("Error assigning target:", error)
    }
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Assign Targets</h1>
        <p className="text-muted-foreground mt-2">Set performance targets for service advisors</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle className="h-5 w-5" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* New Assignment Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus size={18} />
          {showForm ? "Cancel" : "New Target Assignment"}
        </Button>
      </div>

      {/* Assignment Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Target Assignment</CardTitle>
            <CardDescription>Assign performance targets to a service advisor</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Service Advisor Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Service Advisor</label>
                  <select
                    value={formData.advisorId}
                    onChange={(e) => setFormData({ ...formData, advisorId: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select an advisor</option>
                    {advisors.map((advisor) => (
                      <option key={advisor.id} value={advisor.id}>
                        {advisor.name} ({advisor.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Revenue Target */}
                <div>
                  <label className="block text-sm font-medium mb-2">Revenue Target (₹)</label>
                  <input
                    type="number"
                    value={formData.revenueTarget}
                    onChange={(e) => setFormData({ ...formData, revenueTarget: e.target.value })}
                    placeholder="e.g., 150000"
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Service Target */}
                <div>
                  <label className="block text-sm font-medium mb-2">Service Target (Count)</label>
                  <input
                    type="number"
                    value={formData.serviceTarget}
                    onChange={(e) => setFormData({ ...formData, serviceTarget: e.target.value })}
                    placeholder="e.g., 30"
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Satisfaction Target */}
                <div>
                  <label className="block text-sm font-medium mb-2">Customer Satisfaction Target (%)</label>
                  <input
                    type="number"
                    value={formData.satisfactionTarget}
                    onChange={(e) => setFormData({ ...formData, satisfactionTarget: e.target.value })}
                    placeholder="e.g., 90"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Assign Target</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle>Target Assignments</CardTitle>
          <CardDescription>All active and completed target assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Advisor</th>
                  <th className="text-left py-3 px-4 font-semibold">City</th>
                  <th className="text-left py-3 px-4 font-semibold">Month</th>
                  <th className="text-right py-3 px-4 font-semibold">Revenue Target</th>
                  <th className="text-right py-3 px-4 font-semibold">Service Target</th>
                  <th className="text-right py-3 px-4 font-semibold">Satisfaction</th>
                  <th className="text-center py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{assignment.advisorName}</td>
                    <td className="py-3 px-4">{assignment.city}</td>
                    <td className="py-3 px-4">{assignment.month}</td>
                    <td className="text-right py-3 px-4">₹{assignment.revenueTarget.toLocaleString()}</td>
                    <td className="text-right py-3 px-4">{assignment.serviceTarget}</td>
                    <td className="text-right py-3 px-4">{assignment.satisfactionTarget}%</td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          assignment.status === "active"
                            ? "bg-blue-100 text-blue-800"
                            : assignment.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {assignment.status}
                      </span>
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
