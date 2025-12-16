// Fake API for dummy data
export interface ServiceRecord {
  id: string
  date: string
  serviceType: string
  vehicleNumber: string
  customerName: string
  amount: number
  status: "completed" | "pending" | "in-progress"
  city: string
}

export interface CityStats {
  city: string
  totalServices: number
  totalRevenue: number
  completedServices: number
  pendingServices: number
  averageServiceValue: number
}

// New analytics data structures
export interface PerformanceMetrics {
  city: string
  serviceQuality: number
  customerSatisfaction: number
  efficiency: number
  profitability: number
  timeliness: number
}

export interface MonthlyTrend {
  month: string
  revenue: number
  services: number
  completionRate: number
}

export interface ServiceTypeAnalytics {
  serviceType: string
  count: number
  revenue: number
  averageTime: number
  profitMargin: number
}

// Target tracking data structures
export interface ServiceAdvisorTarget {
  id: string
  advisorId: string
  advisorName: string
  month: string
  targetRevenue: number
  achievedRevenue: number
  targetServices: number
  completedServices: number
  targetCustomerSatisfaction: number
  achievedCustomerSatisfaction: number
}

export interface AdvisorPerformance {
  advisorId: string
  advisorName: string
  city: string
  totalRevenue: number
  totalServices: number
  averageServiceValue: number
  completionRate: number
  customerSatisfaction: number
}

// Target assignment data structures
export interface TargetAssignment {
  id: string
  advisorId: string
  advisorName: string
  city: string
  month: string
  revenueTarget: number
  serviceTarget: number
  satisfactionTarget: number
  createdBy: string
  createdAt: string
  status: "active" | "completed" | "archived"
}

export interface ServiceAdvisor {
  id: string
  name: string
  email: string
  city: string
}

// Dummy data
const dummyData: ServiceRecord[] = [
  // Pune
  {
    id: "1",
    date: "2024-01-15",
    serviceType: "Regular Service",
    vehicleNumber: "MH02AB1234",
    customerName: "Rahul Patil",
    amount: 5000,
    status: "completed",
    city: "Pune",
  },
  {
    id: "2",
    date: "2024-01-16",
    serviceType: "Oil Change",
    vehicleNumber: "MH02CD5678",
    customerName: "Neha Sharma",
    amount: 2500,
    status: "completed",
    city: "Pune",
  },
  {
    id: "3",
    date: "2024-01-17",
    serviceType: "Brake Service",
    vehicleNumber: "MH02EF9012",
    customerName: "Arun Kumar",
    amount: 8000,
    status: "in-progress",
    city: "Pune",
  },
  {
    id: "4",
    date: "2024-01-18",
    serviceType: "AC Service",
    vehicleNumber: "MH02GH3456",
    customerName: "Priya Singh",
    amount: 3500,
    status: "pending",
    city: "Pune",
  },
  {
    id: "5",
    date: "2024-01-19",
    serviceType: "Regular Service",
    vehicleNumber: "MH02IJ7890",
    customerName: "Vikram Desai",
    amount: 5500,
    status: "completed",
    city: "Pune",
  },

  // Mumbai
  {
    id: "6",
    date: "2024-01-15",
    serviceType: "Regular Service",
    vehicleNumber: "MH01AB1111",
    customerName: "Amit Verma",
    amount: 5200,
    status: "completed",
    city: "Mumbai",
  },
  {
    id: "7",
    date: "2024-01-16",
    serviceType: "Engine Repair",
    vehicleNumber: "MH01CD2222",
    customerName: "Sneha Gupta",
    amount: 12000,
    status: "completed",
    city: "Mumbai",
  },
  {
    id: "8",
    date: "2024-01-17",
    serviceType: "Transmission Service",
    vehicleNumber: "MH01EF3333",
    customerName: "Rohan Patel",
    amount: 9500,
    status: "in-progress",
    city: "Mumbai",
  },
  {
    id: "9",
    date: "2024-01-18",
    serviceType: "Wheel Alignment",
    vehicleNumber: "MH01GH4444",
    customerName: "Divya Nair",
    amount: 4000,
    status: "completed",
    city: "Mumbai",
  },
  {
    id: "10",
    date: "2024-01-19",
    serviceType: "Battery Replacement",
    vehicleNumber: "MH01IJ5555",
    customerName: "Sanjay Rao",
    amount: 6000,
    status: "pending",
    city: "Mumbai",
  },

  // Nagpur
  {
    id: "11",
    date: "2024-01-15",
    serviceType: "Regular Service",
    vehicleNumber: "MH27AB6666",
    customerName: "Rajesh Singh",
    amount: 4800,
    status: "completed",
    city: "Nagpur",
  },
  {
    id: "12",
    date: "2024-01-16",
    serviceType: "Suspension Service",
    vehicleNumber: "MH27CD7777",
    customerName: "Anjali Sharma",
    amount: 7500,
    status: "completed",
    city: "Nagpur",
  },
  {
    id: "13",
    date: "2024-01-17",
    serviceType: "Electrical Service",
    vehicleNumber: "MH27EF8888",
    customerName: "Nikhil Joshi",
    amount: 5500,
    status: "in-progress",
    city: "Nagpur",
  },
  {
    id: "14",
    date: "2024-01-18",
    serviceType: "Paint Job",
    vehicleNumber: "MH27GH9999",
    customerName: "Pooja Reddy",
    amount: 15000,
    status: "pending",
    city: "Nagpur",
  },
  {
    id: "15",
    date: "2024-01-19",
    serviceType: "Regular Service",
    vehicleNumber: "MH27IJ0000",
    customerName: "Arjun Menon",
    amount: 5000,
    status: "completed",
    city: "Nagpur",
  },
]

export async function getServiceRecords(city?: string): Promise<ServiceRecord[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  if (city) {
    return dummyData.filter((record) => record.city === city)
  }
  return dummyData
}

export async function getCityStats(): Promise<CityStats[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const cities = ["Pune", "Mumbai", "Nagpur"]
  return cities.map((city) => {
    const cityRecords = dummyData.filter((r) => r.city === city)
    const completed = cityRecords.filter((r) => r.status === "completed")
    const pending = cityRecords.filter((r) => r.status === "pending")
    const totalRevenue = cityRecords.reduce((sum, r) => sum + r.amount, 0)

    return {
      city,
      totalServices: cityRecords.length,
      totalRevenue,
      completedServices: completed.length,
      pendingServices: pending.length,
      averageServiceValue: Math.round(totalRevenue / cityRecords.length),
    }
  })
}

import { getApiUrl } from "@/lib/config"

export async function uploadServiceData(
  file: File,
  city: string,
  reportType: "ro_billing" | "operations" | "warranty" | "service_booking",
  uploadedBy: string,
  orgId: string,
  showroomId: string
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const formData = new FormData()
    formData.append('excelFile', file)
    formData.append('file_type', reportType === 'operations' ? 'operations_part' : reportType === 'service_booking' ? 'booking_list' : reportType)
    formData.append('uploaded_by', uploadedBy)
    formData.append('org_id', orgId)
    formData.append('showroom_id', showroomId)

    const response = await fetch(getApiUrl("/api/excel/upload"), {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        message: result.message || `${reportType.replace(/_/g, " ")} file uploaded successfully`,
        data: result.data
      }
    } else {
      return {
        success: false,
        message: result.error || 'Upload failed'
      }
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      message: 'Network error during upload'
    }
  }
}

// New analytics functions
export async function getPerformanceMetrics(): Promise<PerformanceMetrics[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const cities = ["Pune", "Mumbai", "Nagpur"]
  return cities.map((city) => ({
    city,
    serviceQuality: Math.floor(Math.random() * 30) + 70,
    customerSatisfaction: Math.floor(Math.random() * 25) + 75,
    efficiency: Math.floor(Math.random() * 35) + 65,
    profitability: Math.floor(Math.random() * 40) + 60,
    timeliness: Math.floor(Math.random() * 30) + 70,
  }))
}

export async function getMonthlyTrends(): Promise<MonthlyTrend[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  return [
    { month: "Jan", revenue: 145000, services: 28, completionRate: 92 },
    { month: "Feb", revenue: 168000, services: 32, completionRate: 94 },
    { month: "Mar", revenue: 152000, services: 29, completionRate: 91 },
    { month: "Apr", revenue: 189000, services: 35, completionRate: 95 },
    { month: "May", revenue: 201000, services: 38, completionRate: 96 },
    { month: "Jun", revenue: 178000, services: 33, completionRate: 93 },
  ]
}

export async function getServiceTypeAnalytics(): Promise<ServiceTypeAnalytics[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  return [
    { serviceType: "Regular Service", count: 45, revenue: 225000, averageTime: 2, profitMargin: 35 },
    { serviceType: "Oil Change", count: 38, revenue: 95000, averageTime: 1, profitMargin: 40 },
    { serviceType: "Brake Service", count: 22, revenue: 176000, averageTime: 3, profitMargin: 38 },
    { serviceType: "AC Service", count: 28, revenue: 98000, averageTime: 2, profitMargin: 42 },
    { serviceType: "Engine Repair", count: 15, revenue: 180000, averageTime: 4, profitMargin: 32 },
    { serviceType: "Transmission Service", count: 12, revenue: 114000, averageTime: 5, profitMargin: 30 },
  ]
}

// Target tracking functions
export async function getAdvisorTargets(advisorId?: string): Promise<ServiceAdvisorTarget[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const targets: ServiceAdvisorTarget[] = [
    {
      id: "t1",
      advisorId: "5",
      advisorName: "Deepak Patel",
      month: "January",
      targetRevenue: 150000,
      achievedRevenue: 142000,
      targetServices: 30,
      completedServices: 28,
      targetCustomerSatisfaction: 90,
      achievedCustomerSatisfaction: 88,
    },
    {
      id: "t2",
      advisorId: "5",
      advisorName: "Deepak Patel",
      month: "February",
      targetRevenue: 160000,
      achievedRevenue: 168000,
      targetServices: 32,
      completedServices: 34,
      targetCustomerSatisfaction: 90,
      achievedCustomerSatisfaction: 92,
    },
    {
      id: "t3",
      advisorId: "5",
      advisorName: "Deepak Patel",
      month: "March",
      targetRevenue: 155000,
      achievedRevenue: 152000,
      targetServices: 31,
      completedServices: 29,
      targetCustomerSatisfaction: 90,
      achievedCustomerSatisfaction: 87,
    },
    {
      id: "t4",
      advisorId: "6",
      advisorName: "Kavya Nair",
      month: "January",
      targetRevenue: 140000,
      achievedRevenue: 148000,
      targetServices: 28,
      completedServices: 30,
      targetCustomerSatisfaction: 90,
      achievedCustomerSatisfaction: 91,
    },
    {
      id: "t5",
      advisorId: "6",
      advisorName: "Kavya Nair",
      month: "February",
      targetRevenue: 150000,
      achievedRevenue: 155000,
      targetServices: 30,
      completedServices: 31,
      targetCustomerSatisfaction: 90,
      achievedCustomerSatisfaction: 89,
    },
    {
      id: "t6",
      advisorId: "6",
      advisorName: "Kavya Nair",
      month: "March",
      targetRevenue: 160000,
      achievedRevenue: 165000,
      targetServices: 32,
      completedServices: 33,
      targetCustomerSatisfaction: 90,
      achievedCustomerSatisfaction: 93,
    },
  ]

  if (advisorId) {
    return targets.filter((t) => t.advisorId === advisorId)
  }
  return targets
}

export async function getAdvisorPerformance(advisorId?: string): Promise<AdvisorPerformance[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const performance: AdvisorPerformance[] = [
    {
      advisorId: "5",
      advisorName: "Deepak Patel",
      city: "Pune",
      totalRevenue: 462000,
      totalServices: 91,
      averageServiceValue: 5077,
      completionRate: 95,
      customerSatisfaction: 89,
    },
    {
      advisorId: "6",
      advisorName: "Kavya Nair",
      city: "Mumbai",
      totalRevenue: 468000,
      totalServices: 93,
      averageServiceValue: 5032,
      completionRate: 97,
      customerSatisfaction: 91,
    },
  ]

  if (advisorId) {
    return performance.filter((p) => p.advisorId === advisorId)
  }
  return performance
}

// Target assignment functions
export async function getAllServiceAdvisors(): Promise<ServiceAdvisor[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  return [
    { id: "5", name: "Deepak Patel", email: "sa.pune@shubh.com", city: "Pune" },
    { id: "6", name: "Kavya Nair", email: "sa.mumbai@shubh.com", city: "Mumbai" },
  ]
}

export async function getAdvisorsByCity(city: string): Promise<ServiceAdvisor[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const advisors: ServiceAdvisor[] = [
    { id: "5", name: "Deepak Patel", email: "sa.pune@shubh.com", city: "Pune" },
    { id: "6", name: "Kavya Nair", email: "sa.mumbai@shubh.com", city: "Mumbai" },
  ]

  return advisors.filter((a) => a.city === city)
}

export async function assignTarget(assignment: Omit<TargetAssignment, "id" | "createdAt">): Promise<TargetAssignment> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const newAssignment: TargetAssignment = {
    ...assignment,
    id: `ta-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }

  return newAssignment
}

export async function getTargetAssignments(advisorId?: string): Promise<TargetAssignment[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))

  const assignments: TargetAssignment[] = [
    {
      id: "ta1",
      advisorId: "5",
      advisorName: "Deepak Patel",
      city: "Pune",
      month: "January",
      revenueTarget: 150000,
      serviceTarget: 30,
      satisfactionTarget: 90,
      createdBy: "1",
      createdAt: "2024-01-01",
      status: "completed",
    },
    {
      id: "ta2",
      advisorId: "5",
      advisorName: "Deepak Patel",
      city: "Pune",
      month: "February",
      revenueTarget: 160000,
      serviceTarget: 32,
      satisfactionTarget: 90,
      createdBy: "1",
      createdAt: "2024-02-01",
      status: "completed",
    },
    {
      id: "ta3",
      advisorId: "5",
      advisorName: "Deepak Patel",
      city: "Pune",
      month: "March",
      revenueTarget: 155000,
      serviceTarget: 31,
      satisfactionTarget: 90,
      createdBy: "1",
      createdAt: "2024-03-01",
      status: "active",
    },
    {
      id: "ta4",
      advisorId: "6",
      advisorName: "Kavya Nair",
      city: "Mumbai",
      month: "January",
      revenueTarget: 140000,
      serviceTarget: 28,
      satisfactionTarget: 90,
      createdBy: "1",
      createdAt: "2024-01-01",
      status: "completed",
    },
    {
      id: "ta5",
      advisorId: "6",
      advisorName: "Kavya Nair",
      city: "Mumbai",
      month: "February",
      revenueTarget: 150000,
      serviceTarget: 30,
      satisfactionTarget: 90,
      createdBy: "1",
      createdAt: "2024-02-01",
      status: "completed",
    },
    {
      id: "ta6",
      advisorId: "6",
      advisorName: "Kavya Nair",
      city: "Mumbai",
      month: "March",
      revenueTarget: 160000,
      serviceTarget: 32,
      satisfactionTarget: 90,
      createdBy: "1",
      createdAt: "2024-03-01",
      status: "active",
    },
  ]

  if (advisorId) {
    return assignments.filter((a) => a.advisorId === advisorId)
  }
  return assignments
}

export async function updateTargetAssignment(
  id: string,
  updates: Partial<TargetAssignment>,
): Promise<TargetAssignment> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const assignments = await getTargetAssignments()
  const assignment = assignments.find((a) => a.id === id)

  if (!assignment) {
    throw new Error("Target assignment not found")
  }

  return { ...assignment, ...updates }
}

// New report data structures
export interface ROBillingReport {
  id: string
  date: string
  roNumber: string
  vehicleNumber: string
  customerName: string
  labourCost: number
  partsCost: number
  totalAmount: number
  status: "completed" | "pending" | "in-progress"
  city: string
}

export interface OperationsReport {
  id: string
  date: string
  vehicleNumber: string
  serviceType: string
  technician: string
  startTime: string
  endTime: string
  hoursSpent: number
  status: "completed" | "pending"
  city: string
}

export interface WarrantyReport {
  id: string
  date: string
  vehicleNumber: string
  customerName: string
  warrantyType: string
  claimAmount: number
  status: "approved" | "rejected" | "pending"
  city: string
}

export interface ServiceBookingReport {
  id: string
  bookingDate: string
  serviceDate: string
  vehicleNumber: string
  customerName: string
  serviceType: string
  estimatedCost: number
  actualCost: number
  status: "completed" | "cancelled" | "scheduled"
  city: string
}

// Dummy data for each report type
const roBillingData: ROBillingReport[] = [
  {
    id: "ro1",
    date: "2024-01-15",
    roNumber: "RO-2024-001",
    vehicleNumber: "MH02AB1234",
    customerName: "Rahul Patil",
    labourCost: 2000,
    partsCost: 3000,
    totalAmount: 5000,
    status: "completed",
    city: "Pune",
  },
  {
    id: "ro2",
    date: "2024-01-16",
    roNumber: "RO-2024-002",
    vehicleNumber: "MH02CD5678",
    customerName: "Neha Sharma",
    labourCost: 1500,
    partsCost: 1000,
    totalAmount: 2500,
    status: "completed",
    city: "Pune",
  },
  {
    id: "ro3",
    date: "2024-01-17",
    roNumber: "RO-2024-003",
    vehicleNumber: "MH02EF9012",
    customerName: "Arun Kumar",
    labourCost: 4000,
    partsCost: 4000,
    totalAmount: 8000,
    status: "in-progress",
    city: "Pune",
  },
]

const operationsData: OperationsReport[] = [
  {
    id: "op1",
    date: "2024-01-15",
    vehicleNumber: "MH02AB1234",
    serviceType: "Regular Service",
    technician: "Rajesh Kumar",
    startTime: "09:00",
    endTime: "11:00",
    hoursSpent: 2,
    status: "completed",
    city: "Pune",
  },
  {
    id: "op2",
    date: "2024-01-16",
    vehicleNumber: "MH02CD5678",
    serviceType: "Oil Change",
    technician: "Vikram Singh",
    startTime: "10:00",
    endTime: "10:45",
    hoursSpent: 0.75,
    status: "completed",
    city: "Pune",
  },
  {
    id: "op3",
    date: "2024-01-17",
    vehicleNumber: "MH02EF9012",
    serviceType: "Brake Service",
    technician: "Priya Desai",
    startTime: "08:00",
    endTime: "11:30",
    hoursSpent: 3.5,
    status: "completed",
    city: "Pune",
  },
]

const warrantyData: WarrantyReport[] = [
  {
    id: "war1",
    date: "2024-01-15",
    vehicleNumber: "MH02AB1234",
    customerName: "Rahul Patil",
    warrantyType: "Engine Warranty",
    claimAmount: 15000,
    status: "approved",
    city: "Pune",
  },
  {
    id: "war2",
    date: "2024-01-16",
    vehicleNumber: "MH02CD5678",
    customerName: "Neha Sharma",
    warrantyType: "Transmission Warranty",
    claimAmount: 25000,
    status: "pending",
    city: "Pune",
  },
  {
    id: "war3",
    date: "2024-01-17",
    vehicleNumber: "MH02EF9012",
    customerName: "Arun Kumar",
    warrantyType: "Electrical Warranty",
    claimAmount: 8000,
    status: "approved",
    city: "Pune",
  },
]

const serviceBookingData: ServiceBookingReport[] = [
  {
    id: "sb1",
    bookingDate: "2024-01-10",
    serviceDate: "2024-01-15",
    vehicleNumber: "MH02AB1234",
    customerName: "Rahul Patil",
    serviceType: "Regular Service",
    estimatedCost: 5000,
    actualCost: 5000,
    status: "completed",
    city: "Pune",
  },
  {
    id: "sb2",
    bookingDate: "2024-01-12",
    serviceDate: "2024-01-16",
    vehicleNumber: "MH02CD5678",
    customerName: "Neha Sharma",
    serviceType: "Oil Change",
    estimatedCost: 2500,
    actualCost: 2500,
    status: "completed",
    city: "Pune",
  },
  {
    id: "sb3",
    bookingDate: "2024-01-14",
    serviceDate: "2024-01-20",
    vehicleNumber: "MH02GH3456",
    customerName: "Priya Singh",
    serviceType: "AC Service",
    estimatedCost: 3500,
    actualCost: 0,
    status: "scheduled",
    city: "Pune",
  },
]

// Excel Upload Management Functions
export interface UploadHistory {
  _id: string
  db_file_name: string
  uploaded_file_name: string
  rows_count: number
  uploaded_by: string
  uploaded_at: string
  file_type: string
  file_size: number
  processing_status: string
  error_message?: string
}

export interface UploadStats {
  _id: string
  totalFiles: number
  totalRows: number
  successfulUploads: number
  failedUploads: number
  lastUpload: string
}

export async function getUploadHistory(showroomId: string, fileType?: string): Promise<UploadHistory[]> {
  try {
    let url = getApiUrl(`/api/excel/history/${showroomId}`)
    if (fileType) {
      const urlObj = new URL(url)
      urlObj.searchParams.append('fileType', fileType)
      url = urlObj.toString()
    }
    
    const response = await fetch(url)
    const result = await response.json()
    
    if (result.success) {
      return result.data
    } else {
      console.error('Failed to fetch upload history:', result.error)
      return []
    }
  } catch (error) {
    console.error('Error fetching upload history:', error)
    return []
  }
}

export async function getUploadStats(showroomId: string, fileType?: string): Promise<UploadStats[]> {
  try {
    let url = getApiUrl(`/api/excel/stats/${showroomId}`)
    if (fileType) {
      const urlObj = new URL(url)
      urlObj.searchParams.append('fileType', fileType)
      url = urlObj.toString()
    }
    
    const response = await fetch(url)
    const result = await response.json()
    
    if (result.success) {
      return result.data
    } else {
      console.error('Failed to fetch upload stats:', result.error)
      return []
    }
  } catch (error) {
    console.error('Error fetching upload stats:', error)
    return []
  }
}

// Functions to get reports by type and city
export async function getRoBillingReports(city?: string): Promise<ROBillingReport[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  if (city) {
    return roBillingData.filter((r) => r.city === city)
  }
  return roBillingData
}

export async function getOperationsReports(city?: string): Promise<OperationsReport[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  if (city) {
    return operationsData.filter((r) => r.city === city)
  }
  return operationsData
}

export async function getWarrantyReports(city?: string): Promise<WarrantyReport[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  if (city) {
    return warrantyData.filter((r) => r.city === city)
  }
  return warrantyData
}

export async function getServiceBookingReports(city?: string): Promise<ServiceBookingReport[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  if (city) {
    return serviceBookingData.filter((r) => r.city === city)
  }
  return serviceBookingData
}
