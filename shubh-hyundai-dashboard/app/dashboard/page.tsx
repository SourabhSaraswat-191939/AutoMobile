"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { permissions, isLoading: permissionsLoading, hasPermission } = usePermissions()

  useEffect(() => {
    console.log('🔍 Dashboard routing debug:', {
      user: user?.email,
      role: user?.role,
      authLoading,
      permissionsLoading,
      permissionsCount: permissions.length,
      permissions: permissions.slice(0, 5) // Show first 5 permissions
    })

    if (!user) {
      console.log('❌ No user, redirecting to login')
      return
    }
    
    // Wait for both auth and permissions to be ready
    if (authLoading || permissionsLoading) {
      console.log('⏳ Still loading...', { authLoading, permissionsLoading })
      return
    }

    console.log('✅ Ready to route. User:', user.email, 'Permissions:', permissions.length)

    // Check if user has NO permissions assigned (except General Managers only)
    if (permissions.length === 0 && user.role !== "general_manager") {
      console.log('❌ No permissions and not GM, redirecting to Access Denied')
      router.push("/dashboard/unauthorized")
      return
    }

    // Smart routing using database permissions
    // Check for GM-level permissions OR general_manager role
    if (hasPermission('manage_users') || hasPermission('manage_roles') || hasPermission('target_report') || user.role === "general_manager") {
      console.log('🎯 Routing to GM dashboard')
      router.push("/dashboard/gm")
      return
    }
    
    // Check for SM-level permissions (any dashboard access)
    if (hasPermission('ro_billing_upload') || hasPermission('operations_upload') || 
        hasPermission('ro_billing_dashboard') || hasPermission('operations_dashboard') ||
        hasPermission('warranty_dashboard') || hasPermission('warranty_upload') ||
        hasPermission('service_booking_dashboard') || hasPermission('service_booking_upload')) {
      console.log('🎯 Routing to SM dashboard')
      router.push("/dashboard/sm")
      return
    }
    
    // Basic access - route to SA dashboard
    if (hasPermission('dashboard') || hasPermission('overview')) {
      console.log('🎯 Routing to SA dashboard')
      router.push("/dashboard/sa")
      return
    }

    // If we reach here, user has permissions loaded but doesn't match any dashboard criteria
    // Only use fallback role-based routing if user actually has some permissions
    if (permissions.length > 0) {
      console.log('🎯 Using fallback role-based routing for:', user.role)
      switch (user?.role as string) {
        case "general_manager":
          console.log('→ GM dashboard (fallback)')
          router.push("/dashboard/gm")
          break
        case "service_manager":
          console.log('→ SM dashboard (fallback)')
          router.push("/dashboard/sm")
          break
        default:
          console.log('→ SA dashboard (fallback)')
          router.push("/dashboard/sa")
          break
      }
    } else {
      // User has no permissions and no matching dashboard - should have been caught earlier, but double-check
      console.log('❌ No permissions and no matching dashboard criteria - redirecting to unauthorized')
      router.push("/dashboard/unauthorized")
    }

  }, [user, router, permissions, authLoading, permissionsLoading, hasPermission])

  const getLoadingMessage = () => {
    if (authLoading) return "Authenticating..."
    return "Setting up your dashboard..."
  }

  const getLoadingSubtext = () => {
    if (authLoading) return "Verifying your credentials"
    return "Preparing your workspace"
  }

  // Redirect to unauthorized page if no permissions (except General Managers)
  if (user && !authLoading && !permissionsLoading && permissions.length === 0 && user.role !== "general_manager") {
    router.push("/dashboard/unauthorized")
    return null
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {getLoadingMessage()}
        </h2>
        <p className="text-gray-600 mb-4">
          {getLoadingSubtext()}
        </p>
        <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-700">
            {user ? `Welcome, ${user.name}!` : "Preparing your workspace..."}
          </p>
          {permissionsLoading && (
            <p className="text-xs text-blue-600 mt-2">
              This will only take a moment while we configure your access rights.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
