"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle, FileText, DollarSign, CheckCircle, Trash2, Eye, Search, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getApiUrl } from "@/lib/config"
import { Badge } from "@/components/ui/badge"

interface AdvisorOperation {
  advisorName: string
  fileName?: string
  uploadDate?: string
  dataDate?: string
  totalMatchedAmount: number
  matchedOperations?: Array<{
    operation: string
    amount: number
  }>
}

export default function OperationsPage() {
  const { user } = useAuth()
  const [advisors, setAdvisors] = useState<string[]>([])
  const [operationsData, setOperationsData] = useState<AdvisorOperation[]>([])
  const [roData, setRoData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingAdvisor, setUploadingAdvisor] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'cumulative' | 'specific'>('cumulative')
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  // Fetch unique advisors from RO Billing
  useEffect(() => {
    const loadAdvisors = async () => {
      if (!user?.email || !user?.city) return

      setIsLoading(true)
      setError(null)

      try {
        // Fetch RO Billing data to get unique advisors
        const response = await fetch(
          getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=ro_billing`)
        )

        if (!response.ok) {
          throw new Error("Failed to fetch RO Billing data")
        }

        const result = await response.json()
        const roBillingData = Array.isArray(result.data) ? result.data : []

        // Store RO Billing data for calculating Overall Labour Amount
        setRoData(roBillingData)

        // Extract unique advisors
        const uniqueAdvisorNames = Array.from(
          new Set(roBillingData.map((r: any) => r.serviceAdvisor).filter(Boolean))
        ) as string[]

        setAdvisors(uniqueAdvisorNames.sort())
      } catch (err) {
        console.error("Error loading advisors:", err)
        setError("Failed to load advisors. Please ensure RO Billing data is uploaded.")
      } finally {
        setIsLoading(false)
      }
    }

    loadAdvisors()
  }, [user?.email, user?.city])

  // Fetch existing operations data
  useEffect(() => {
    const loadOperationsData = async () => {
      if (!user?.email || !user?.city) return

      try {
        const response = await fetch(
          getApiUrl(`/api/service-manager/advisor-operations?uploadedBy=${user.email}&city=${user.city}&dataDate=${selectedDate}&viewMode=${viewMode}`)
        )

        if (response.ok) {
          const result = await response.json()
          setOperationsData(result.data || [])
        }
      } catch (err) {
        console.error("Error loading operations data:", err)
      }
    }

    loadOperationsData()
  }, [user?.email, user?.city, selectedDate, viewMode])

  const handleFileUpload = async (advisorName: string, file: File) => {
    if (!user?.email || !user?.city) return

    setUploadingAdvisor(advisorName)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("advisorName", advisorName)
      formData.append("uploadedBy", user.email)
      formData.append("city", user.city)
      // Use the currently selected date
      formData.append("dataDate", selectedDate)

      const response = await fetch(
        getApiUrl("/api/service-manager/advisor-operations/upload"),
        {
          method: "POST",
          body: formData,
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Upload failed")
      }

      const result = await response.json()

      alert(`✅ Upload successful!\n\nAdvisor: ${advisorName}\nDate: ${selectedDate}\nMatched Operations: ${result.matchedCount}\nTotal Amount: ₹${result.totalMatchedAmount.toLocaleString()}`)

      // Reset file input
      if (fileInputRefs.current[advisorName]) {
        fileInputRefs.current[advisorName]!.value = ""
      }

      // Reload operations data from server to get updated data
      const refreshResponse = await fetch(
        getApiUrl(`/api/service-manager/advisor-operations?uploadedBy=${user.email}&city=${user.city}&dataDate=${selectedDate}&viewMode=${viewMode}`)
      )

      if (refreshResponse.ok) {
        const refreshResult = await refreshResponse.json()
        setOperationsData(refreshResult.data || [])
      }
    } catch (err: any) {
      console.error("Upload error:", err)
      alert(`❌ Upload failed: ${err.message}`)
    } finally {
      setUploadingAdvisor(null)
    }
  }

  const handleFileChange = (advisorName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(advisorName, file)
    }
  }

  const getAdvisorData = (advisorName: string): AdvisorOperation | undefined => {
    return operationsData.find((op) => op.advisorName === advisorName)
  }

  // Calculate Overall Labour Amount for an advisor (same logic as SM dashboard)
  const getOverallLabourAmount = (advisorName: string): number => {
    return roData
      .filter((r: any) => r.serviceAdvisor === advisorName)
      .reduce((sum: number, r: any) => sum + (Number(r.labourAmt) || 0), 0)
  }

  // Calculate Without VAS = VAS Amount - Overall Labour Amount
  const getWithoutVAS = (advisorName: string): number => {
    const overallLabour = getOverallLabourAmount(advisorName)
    const advisorData = getAdvisorData(advisorName)
    const vasAmount = advisorData?.totalMatchedAmount || 0
    return vasAmount - overallLabour
  }

  // Filter advisors based on search
  const filteredAdvisors = advisors.filter((advisor) =>
    advisor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (user?.role !== "service_manager") {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">Only Service Managers can access this page</p>
      </div>
    )
  }

  const totalVAS = operationsData.reduce((sum, op) => sum + (op.totalMatchedAmount || 0), 0)
  // Only calculate Without VAS for advisors who have uploaded files
  const totalWithoutVAS = advisors.reduce((sum, advisor) => {
    const advisorData = getAdvisorData(advisor)
    if (advisorData) {
      return sum + getWithoutVAS(advisor)
    }
    return sum
  }, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 p-6 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white drop-shadow-lg">Advisor Operations</h1>
                  <p className="text-green-100 text-sm mt-1">Upload and track advisor-specific operation files</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-100">Total VAS</p>
                <p className="text-2xl font-bold text-white">₹{totalVAS.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg border border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-gray-900">Advisor Operations Upload</CardTitle>
                <CardDescription>Upload Excel files for each advisor to calculate matched operation amounts</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {advisors.length} Advisors
              </Badge>
            </div>

            {/* Date Filter and View Mode */}
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    Select Date:
                  </label>
                  <Input
                    type="date"
                    value={selectedDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    View Mode:
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setViewMode('cumulative')}
                      className={`flex-1 ${
                        viewMode === 'cumulative'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      size="sm"
                    >
                      Cumulative
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setViewMode('specific')}
                      className={`flex-1 ${
                        viewMode === 'specific'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      size="sm"
                    >
                      Date-Specific
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-gray-700">
                  {viewMode === 'cumulative' ? (
                    <>
                      <strong>Cumulative Mode:</strong> Showing sum of all data from start up to{' '}
                      <strong>{new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                    </>
                  ) : (
                    <>
                      <strong>Date-Specific Mode:</strong> Showing data only for{' '}
                      <strong>{new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search advisors by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                  <div className="animate-spin">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-gray-600">Loading advisors...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-300 rounded-lg p-6 text-center">
                <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-3" />
                <p className="text-red-800 font-semibold">{error}</p>
                <p className="text-red-700 text-sm mt-2">Please upload RO Billing data first to see advisors.</p>
              </div>
            ) : advisors.length === 0 ? (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <p className="text-gray-800 font-semibold text-lg">No advisors found</p>
                <p className="text-gray-600 text-sm mt-2">Please upload RO Billing data first to see advisors and their operations.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Table Header */}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-green-600 to-emerald-600">
                        <th className="text-left py-4 px-4 font-bold text-white border-r border-green-500 w-1/4">
                          Advisor Name
                        </th>
                        <th className="text-left py-4 px-4 font-bold text-white border-r border-green-500 w-1/4">
                          Upload Excel File
                        </th>
                        <th className="text-right py-4 px-4 font-bold text-white border-r border-green-500 w-1/4">
                          VAS
                        </th>
                        <th className="text-right py-4 px-4 font-bold text-white w-1/4">
                          Without VAS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdvisors.map((advisor, index) => {
                        const advisorData = getAdvisorData(advisor)
                        const isUploading = uploadingAdvisor === advisor

                        return (
                          <tr
                            key={advisor}
                            className={`border-b hover:bg-green-50/50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            {/* Column 1: Advisor Name */}
                            <td className="py-4 px-4 border-r border-gray-200">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                  <span className="text-green-700 font-bold text-sm">
                                    {advisor.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-semibold text-gray-900">{advisor}</span>
                              </div>
                            </td>

                            {/* Column 2: Upload Excel File */}
                            <td className="py-4 px-4 border-r border-gray-200">
                              <div className="space-y-2">
                                <input
                                  type="file"
                                  ref={(el) => {
                                    fileInputRefs.current[advisor] = el
                                  }}
                                  accept=".xlsx,.xls"
                                  onChange={(e) => handleFileChange(advisor, e)}
                                  disabled={isUploading}
                                  className="hidden"
                                  id={`file-${advisor}`}
                                />
                                <label htmlFor={`file-${advisor}`}>
                                  <Button
                                    type="button"
                                    onClick={() => fileInputRefs.current[advisor]?.click()}
                                    disabled={isUploading}
                                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                                    size="sm"
                                  >
                                    {isUploading ? (
                                      <>
                                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        Uploading...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        {advisorData ? "Re-upload" : "Upload"}
                                      </>
                                    )}
                                  </Button>
                                </label>
                                {advisorData?.fileName && (
                                  <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    <span className="truncate">{advisorData.fileName}</span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Column 3: VAS (renamed from Total Matched Amount) */}
                            <td className="py-4 px-4 border-r border-gray-200 text-right">
                              {advisorData ? (
                                <div className="space-y-1">
                                  <div className="text-xl font-bold text-green-700">
                                    ₹{advisorData.totalMatchedAmount.toLocaleString()}
                                  </div>
                                  {advisorData.dataDate && (
                                    <div className="text-xs text-gray-500">
                                      Data: {new Date(advisorData.dataDate).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">No data</span>
                              )}
                            </td>

                            {/* Column 4: Without VAS (VAS - Overall Labour) */}
                            <td className="py-4 px-4 text-right">
                              {advisorData ? (
                                (() => {
                                  const overallLabour = getOverallLabourAmount(advisor)
                                  const withoutVAS = getWithoutVAS(advisor)
                                  
                                  return (
                                    <div className="space-y-1">
                                      <div className="text-xl font-bold text-blue-700">
                                        ₹{withoutVAS.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Labour: ₹{overallLabour.toLocaleString()}
                                      </div>
                                    </div>
                                  )
                                })()
                              ) : (
                                <span className="text-gray-400 text-sm">No data</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-green-100 p-2">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total Advisors</p>
                          <p className="text-2xl font-bold text-gray-900">{advisors.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-blue-100 p-2">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Uploaded</p>
                          <p className="text-2xl font-bold text-gray-900">{operationsData.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-emerald-100 p-2">
                          <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total VAS</p>
                          <p className="text-2xl font-bold text-gray-900">₹{totalVAS.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-purple-100 p-2">
                          <DollarSign className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total Without VAS</p>
                          <p className="text-2xl font-bold text-gray-900">₹{totalWithoutVAS.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
