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
    if (!user) return
    
    // Wait for both auth and permissions to be ready
    if (authLoading || permissionsLoading) return

    console.log("🚀 Dashboard routing - User:", user.email, "Role:", user.role, "Permissions:", permissions.length)
    console.log("📋 Available permissions:", permissions)

    // Smart routing - permissions are available immediately (role-based first)
    if (hasPermission('can_access_gm_dashboard')) {
      console.log("✅ Found GM permission, routing to GM Dashboard")
      router.push("/dashboard/gm")
      return
    }
    
    if (hasPermission('can_access_sm_dashboard')) {
      console.log("✅ Found SM permission, routing to SM Dashboard")
      router.push("/dashboard/sm")
      return
    }
    
    if (hasPermission('can_access_sa_dashboard')) {
      console.log("✅ Found SA permission, routing to SA Dashboard")
      router.push("/dashboard/sa")
      return
    }

    // Fallback - user is authenticated, route based on role
    console.log("→ Fallback routing based on role:", user.role)
    if (user?.role === "general_manager") {
      router.push("/dashboard/gm")
    } else if (user?.role === "service_manager") {
      router.push("/dashboard/sm")
    } else {
      router.push("/dashboard/sa")
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
