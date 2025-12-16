"use client"

import type React from "react"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { DashboardProvider } from "@/contexts/DashboardContext"
import { GlobalApiProvider } from "@/contexts/GlobalApiContext"
import { Sidebar } from "@/components/sidebar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { usePermissions } from "@/hooks/usePermissions"

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const { permissions, isLoading: permissionsLoading } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  // Don't auto-redirect - let individual pages handle their own access control
  // The layout should only block rendering, not redirect

  // Show loading while auth or permissions are loading
  if (isLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  // Only block access AFTER permissions have finished loading and confirmed user has NO permissions
  // Don't block if permissions are still loading or if user is GM
  // FIX: Added null/undefined check for permissions before accessing length
  if (!permissionsLoading && permissions?.length === 0 && user.role !== "general_manager") {
    // Only show access denied if we're on a protected dashboard page
    // Allow access to /dashboard/unauthorized page itself
    if (window.location.pathname === "/dashboard/unauthorized") {
      return (
        <div className="flex">
          <Sidebar />
          <main className="flex-1 md:ml-64 min-h-screen bg-background">
            <div className="p-4 md:p-8">{children}</div>
          </main>
        </div>
      )
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center max-w-lg mx-auto p-8">
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V9m0 0V7m0 2h2m-2 0H10M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-red-800 mb-4">
            Access Denied
          </h2>
          <p className="text-lg text-red-700 mb-6">
            You have no permissions assigned. Access denied.
          </p>
          <p className="text-sm text-red-600 mb-6">
            Please contact your administrator to get the appropriate permissions assigned to your role.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 min-h-screen bg-background">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GlobalApiProvider>
        <DashboardProvider>
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </DashboardProvider>
      </GlobalApiProvider>
    </AuthProvider>
  )
}