"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { getApiUrl } from "@/lib/config"

type UploadType = "ro_billing" | "operations" | "warranty" | "service_booking" | "repair_order_list"

interface UploadSection {
  type: UploadType
  title: string
  description: string
  color: string
}

const uploadSections: UploadSection[] = [
  {
    type: "ro_billing",
    title: "RO Billing",
    description: "Upload Repair Order billing details with labour and parts cost. Required: R/O No or RO_No",
    color: "blue",
  },
  {
    type: "operations",
    title: "Operations/Part",
    description: "Upload operations data with car model counts. Required: OP/Part Code column",
    color: "green",
  },
  {
    type: "warranty",
    title: "Warranty",
    description: "Upload warranty claims and approval records. Required: R/O No or RO_No",
    color: "purple",
  },
  {
    type: "service_booking",
    title: "Booking List",
    description: "Upload service bookings and scheduling information. Required: Reg. No or Reg_No",
    color: "orange",
  },
  {
    type: "repair_order_list",
    title: "Repair Order List",
    description: "Upload repair order list with VIN details. Required: R/O No, VIN. Columns: Svc Adv, Work Type, Model, Reg No, R/O Status, R/O Date, R/O No, VIN",
    color: "indigo",
  },
]

export default function ServiceManagerUploadPage() {
  const { user } = useAuth()
  const { hasPermission } = usePermissions()
  const router = useRouter()
  const [files, setFiles] = useState<Record<UploadType, File | null>>({
    ro_billing: null,
    operations: null,
    warranty: null,
    service_booking: null,
    repair_order_list: null,
  })
  const [isLoading, setIsLoading] = useState<Record<UploadType, boolean>>({
    ro_billing: false,
    operations: false,
    warranty: false,
    service_booking: false,
    repair_order_list: false,
  })
  const [messages, setMessages] = useState<Record<UploadType, { type: "success" | "error"; text: string } | null>>({
    ro_billing: null,
    operations: null,
    warranty: null,
    service_booking: null,
    repair_order_list: null,
  })

  const handleFileChange = (type: UploadType, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFiles((prev) => ({ ...prev, [type]: file }))
      setMessages((prev) => ({ ...prev, [type]: null }))
    }
  }

  const handleUpload = async (type: UploadType) => {
    const file = files[type]
    if (!file || !user?.city || !user?.email) {
      setMessages((prev) => ({
        ...prev,
        [type]: { type: "error", text: "Please select a file and ensure you are logged in" },
      }))
      return
    }

    setIsLoading((prev) => ({ ...prev, [type]: true }))
    setMessages((prev) => ({ ...prev, [type]: null }))

    try {
      const formData = new FormData()
      formData.append("excelFile", file) // Changed from "file" to "excelFile"
      formData.append("uploaded_by", user.email) // For excel controller
      formData.append("org_id", "64f8a1b2c3d4e5f6a7b8c9d0") // Demo org ID
      formData.append("showroom_id", "64f8a1b2c3d4e5f6a7b8c9d1") // Demo showroom ID
      
      // Map upload types to backend file types
      const fileTypeMapping: Record<UploadType, string> = {
        ro_billing: "ro_billing",
        operations: "operations_part",
        warranty: "warranty", 
        service_booking: "booking_list",
        repair_order_list: "repair_order_list"
      }
      formData.append("file_type", fileTypeMapping[type])

      // Use different API endpoints based on type
      let apiEndpoint = "http://localhost:5000/api/excel/upload"
      if (type === "repair_order_list") {
        apiEndpoint = "http://localhost:5000/api/service-manager/repair-order-list/upload"
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        const uploadInfo = data.data ? ` (${data.data.totalProcessed} rows processed using ${data.data.uploadCase})` : ''
        setMessages((prev) => ({
          ...prev,
          [type]: { type: "success", text: `✅ ${data.message}${uploadInfo}` },
        }))
        setFiles((prev) => ({ ...prev, [type]: null }))
        // Reset file input
        const fileInput = document.getElementById(`file-${type}`) as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        setMessages((prev) => ({
          ...prev,
          [type]: { type: "error", text: data.error || "Upload failed" },
        }))
      }
    } catch (error) {
      console.error('Upload error:', error)
      setMessages((prev) => ({
        ...prev,
        [type]: { type: "error", text: "Network error. Please check if the server is running." },
      }))
    } finally {
      setIsLoading((prev) => ({ ...prev, [type]: false }))
    }
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; hover: string }> = {
      blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        hover: "hover:bg-blue-100",
      },
      green: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        hover: "hover:bg-green-100",
      },
      purple: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-700",
        hover: "hover:bg-purple-100",
      },
      orange: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
        hover: "hover:bg-orange-100",
      },
      indigo: {
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-700",
        hover: "hover:bg-indigo-100",
      },
    }
    return colors[color] || colors.blue
  }

  // ✅ Check upload permissions
  if (!hasPermission('ro_billing_upload') && !hasPermission('operations_upload') && 
      !hasPermission('warranty_upload') && !hasPermission('service_booking_upload') && 
      !hasPermission('repair_order_list_upload') && !hasPermission('upload') && user?.role !== "service_manager") {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">You need upload permissions to access this page</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Upload Data</h1>
          <p className="text-gray-500">
            Upload Excel files for {user?.city} Service Center • Only you can view your uploaded data
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/sm")}
          variant="outline"
          className="border-gray-300"
        >
          View Dashboard
        </Button>
      </div>

      {/* Upload Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {uploadSections.map((section) => {
          const colors = getColorClasses(section.color)
          const message = messages[section.type]
          const isUploading = isLoading[section.type]
          const selectedFile = files[section.type]

          return (
            <Card
              key={section.type}
              className={`border-2 ${colors.border} ${colors.bg} transition-all duration-300 hover:shadow-lg`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className={`text-xl ${colors.text}`}>{section.title}</CardTitle>
                    <CardDescription className="text-gray-600">{section.description}</CardDescription>
                  </div>
                  <div className={`p-3 ${colors.bg} rounded-lg border ${colors.border}`}>
                    <FileText className={`h-6 w-6 ${colors.text}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Input */}
                <div className="space-y-2">
                  <label
                    htmlFor={`file-${section.type}`}
                    className={`flex items-center justify-center w-full px-4 py-8 border-2 border-dashed ${colors.border} rounded-lg cursor-pointer ${colors.hover} transition-colors`}
                  >
                    <div className="text-center space-y-2">
                      <Upload className={`mx-auto h-8 w-8 ${colors.text}`} />
                      <div className="text-sm">
                        <span className={`font-semibold ${colors.text}`}>Click to upload</span>
                        <span className="text-gray-500"> or drag and drop</span>
                      </div>
                      <p className="text-xs text-gray-500">Excel files only (.xlsx, .xls)</p>
                    </div>
                    <input
                      id={`file-${section.type}`}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileChange(section.type, e)}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  {selectedFile && (
                    <p className="text-sm text-gray-700 font-medium">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                {/* Upload Button */}
                <Button
                  onClick={() => handleUpload(section.type)}
                  disabled={!selectedFile || isUploading}
                  className={`w-full ${colors.text} ${colors.bg} border ${colors.border} ${colors.hover} font-semibold`}
                  variant="outline"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload File
                    </>
                  )}
                </Button>

                {/* Message */}
                {message && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-lg border ${
                      message.type === "success"
                        ? "bg-green-50 border-green-200 text-green-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    )}
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info Section */}
      <Card className="border-gray-200 bg-gradient-to-br from-gray-50 to-white">
        <CardHeader>
          <CardTitle className="text-lg">Upload Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <ul className="list-disc list-inside space-y-2">
            <li><strong>File Format:</strong> Only Excel files (.xlsx or .xls) are accepted, maximum 50MB</li>
            <li><strong>Smart Column Mapping:</strong> System automatically maps common column variations (R/O No → RO_No, Reg. No → Reg_No, etc.)</li>
            <li><strong>Supported Formats:</strong> Works with standard Hyundai service center Excel exports</li>
            <li><strong>Required Columns:</strong> 
              <ul className="ml-4 mt-1">
                <li>• RO Billing: "R/O No" or "RO_No"</li>
                <li>• Warranty: "R/O No" or "RO_No"</li>
                <li>• Booking List: "Reg. No" or "Reg_No"</li>
                <li>• Operations: "OP/Part Code" or "OP_Part_Code"</li>
              </ul>
            </li>
            <li><strong>Smart Processing:</strong> Automatically detects new, updated, or mixed data uploads</li>
            <li><strong>Strict Validation:</strong> 
              <ul className="ml-4 mt-1">
                <li>• <strong>No Duplicates Allowed:</strong> Files with duplicate unique keys will be rejected</li>
                <li>• <strong>No Empty Fields:</strong> All required fields must have valid values</li>
                <li>• <strong>No Invalid Codes:</strong> Codes like "0" or empty values are not allowed</li>
                <li>• <strong>Clean Your Data:</strong> Fix all issues in Excel before uploading</li>
              </ul>
            </li>
            <li><strong>Database Handling:</strong> Updates existing records or inserts new ones based on unique keys</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
