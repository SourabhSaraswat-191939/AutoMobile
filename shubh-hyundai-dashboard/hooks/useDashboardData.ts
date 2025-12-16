"use client"

import { useCallback, useEffect, useRef } from 'react'
import { useDashboard, DataType, DashboardData } from '@/contexts/DashboardContext'
import { useAuth } from '@/lib/auth-context'
import { getApiUrl } from '@/lib/config'

interface UseDashboardDataOptions {
  dataType: DataType
  autoFetch?: boolean // Whether to auto-fetch on mount
  backgroundRevalidation?: boolean // Whether to revalidate in background
  summary?: boolean // If true, hit lightweight summary endpoint
}

interface UseDashboardDataReturn {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  hasData: boolean
  
  // Actions
  fetchData: (forceRefresh?: boolean) => Promise<void>
  refreshData: () => Promise<void>
  clearData: () => void
}

export const useDashboardData = (options: UseDashboardDataOptions): UseDashboardDataReturn => {
  const { dataType, autoFetch = true, backgroundRevalidation = true, summary = false } = options
  const { user } = useAuth()
  const {
    getData,
    setData,
    getLoadingState,
    setLoading,
    getError,
    setError,
    hasData: hasDataInState,
    needsRefresh,
    markForRefresh
  } = useDashboard()

  const fetchInProgressRef = useRef<Set<string>>(new Set())

  // Get current state
  const data = user?.email ? getData(user.email, dataType, user.city) : null
  const isLoading = user?.email ? getLoadingState(user.email, dataType, user.city) : false
  const error = user?.email ? getError(user.email, dataType, user.city) : null
  const hasData = user?.email ? hasDataInState(user.email, dataType, user.city) : false
  const shouldRefresh = user?.email ? needsRefresh(user.email, dataType, user.city) : false

  // Fetch data function
  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.email || !user?.city) {
      console.log('⏭️ Skipping fetch - no user data')
      return
    }

    const fetchKey = `${user.email}-${dataType}-${user.city}`
    
    // Prevent duplicate fetches
    if (fetchInProgressRef.current.has(fetchKey) && !forceRefresh) {
      console.log('⏭️ Skipping fetch - already in progress:', fetchKey)
      return
    }

    // Check if we need to fetch
    if (!forceRefresh && hasData && !shouldRefresh) {
      console.log('📦 Using existing data for:', dataType, '- No refresh needed')
      return
    }

    console.log('🚀 Fetching data for:', dataType, forceRefresh ? '(forced)' : shouldRefresh ? '(stale)' : '(first time)')
    
    fetchInProgressRef.current.add(fetchKey)
    
    // Only show loading if we don't have data or it's a forced refresh
    if (!hasData || forceRefresh) {
      setLoading(user.email, dataType, true, user.city)
    }
    
    setError(user.email, dataType, null, user.city)

    try {
      let apiUrl: string
      
      // Use specialized BookingList API for service_booking with VIN matching
      if (dataType === 'service_booking') {
        const userShowroomId = '64f8a1b2c3d4e5f6a7b8c9d1'
        apiUrl = getApiUrl(`/api/booking-list/dashboard?uploadedBy=${user.email}&city=${user.city}&showroom_id=${userShowroomId}`)
        console.log('🔗 Fetching BookingList with VIN matching:', dataType)
      } else {
        const summaryFlag = summary ? '&summary=true' : ''
        apiUrl = getApiUrl(`/api/service-manager/dashboard-data?uploadedBy=${user.email}&city=${user.city}&dataType=${dataType}${summaryFlag}`)
        console.log('🔗 Fetching:', dataType, summary ? '(summary)' : '')
      }
      
      const response = await fetch(apiUrl)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', response.status, errorText)
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.json()
      console.log('✅ Loaded:', dataType, '- Records:', responseData?.summary?.totalBookings || responseData?.count)
      
      // Ensure data has the correct structure
      const structuredData: DashboardData = {
        ...responseData,
        data: Array.isArray(responseData.data) ? responseData.data : []
      }

      // Save to global state
      setData(user.email, dataType, structuredData, user.city)
      
    } catch (err) {
      const errorMessage = "Failed to load data. Please try again."
      console.error('❌ Fetch error:', err)
      setError(user.email, dataType, errorMessage, user.city)
    } finally {
      setLoading(user.email, dataType, false, user.city)
      fetchInProgressRef.current.delete(fetchKey)
    }
  }, [user?.email, user?.city, dataType, hasData, shouldRefresh, setData, setLoading, setError])

  // Refresh data (always force refresh)
  const refreshData = useCallback(async () => {
    if (user?.email) {
      console.log('🔄 Manual refresh triggered for:', dataType)
      markForRefresh(user.email, dataType, user.city)
      await fetchData(true)
    }
  }, [user?.email, user?.city, dataType, fetchData, markForRefresh])

  // Clear data
  const clearData = useCallback(() => {
    if (user?.email) {
      console.log('🗑️ Clearing data for:', dataType)
      markForRefresh(user.email, dataType, user.city)
    }
  }, [user?.email, user?.city, dataType, markForRefresh])

  // Auto-fetch on mount or when dataType changes
  useEffect(() => {
    if (autoFetch && user?.email && user?.city) {
      fetchData()
    }
  }, [autoFetch, user?.email, user?.city, dataType, fetchData])

  // Background revalidation for stale data
  useEffect(() => {
    if (backgroundRevalidation && hasData && shouldRefresh && !isLoading) {
      console.log('🔄 Background revalidation for stale data:', dataType)
      fetchData() // This will fetch in background without showing loader
    }
  }, [backgroundRevalidation, hasData, shouldRefresh, isLoading, dataType, fetchData])

  return {
    data,
    isLoading,
    error,
    hasData,
    fetchData,
    refreshData,
    clearData
  }
}

// Hook for multiple data types (useful for dashboard overview)
export const useDashboardMultiData = (dataTypes: DataType[]) => {
  const { user } = useAuth()
  const dashboard = useDashboard()

  const results = dataTypes.map(dataType => {
    const data = user?.email ? dashboard.getData(user.email, dataType, user.city) : null
    const isLoading = user?.email ? dashboard.getLoadingState(user.email, dataType, user.city) : false
    const error = user?.email ? dashboard.getError(user.email, dataType, user.city) : null
    const hasData = user?.email ? dashboard.hasData(user.email, dataType, user.city) : false

    return {
      dataType,
      data,
      isLoading,
      error,
      hasData
    }
  })

  const isAnyLoading = results.some(r => r.isLoading)
  const hasAnyData = results.some(r => r.hasData)
  const hasAnyError = results.some(r => r.error)

  const fetchAll = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.email || !user?.city) return

    const fetchPromises = dataTypes.map(async (dataType) => {
      const shouldFetch = forceRefresh || 
        !dashboard.hasData(user.email, dataType, user.city) || 
        dashboard.needsRefresh(user.email, dataType, user.city)

      if (shouldFetch) {
        // Use the single data hook logic here
        const hook = useDashboardData({ dataType, autoFetch: false })
        return hook.fetchData(forceRefresh)
      }
    })

    await Promise.all(fetchPromises)
  }, [user?.email, user?.city, dataTypes, dashboard])

  return {
    results,
    isAnyLoading,
    hasAnyData,
    hasAnyError,
    fetchAll
  }
}
