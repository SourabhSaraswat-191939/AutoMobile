"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function UnauthorizedPage() {
  const { user, logout } = useAuth()
  const { permissions, isLoading: permissionsLoading, refetch, debug } = usePermissions()
  const router = useRouter()

  // If user has permissions, redirect back to dashboard
  useEffect(() => {
    if (!permissionsLoading && permissions.length > 0) {
      console.log('✅ User has permissions, redirecting to dashboard')
      router.push("/dashboard")
    }
  }, [permissions, permissionsLoading, router])

  const handleRefresh = async () => {
    await refetch()
    // Try to route again after refresh
    router.push("/dashboard")
  }

  // Don't show access denied if user has permissions (wait for redirect)
  if (!permissionsLoading && permissions.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-800">
            {permissions.length === 0 ? "Access Denied - No Permissions" : "Access Denied"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-700 font-medium">
              {permissions.length === 0 
                ? "You have no permissions assigned. Access denied." 
                : "You don't have permission to access this dashboard."}
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator to get the appropriate permissions assigned to your role.
            </p>
          </div>

          <div className={`${permissions.length === 0 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`h-5 w-5 ${permissions.length === 0 ? 'text-red-600' : 'text-yellow-600'} mt-0.5`} />
              <div className="space-y-2">
                <p className={`text-sm font-medium ${permissions.length === 0 ? 'text-red-800' : 'text-yellow-800'}`}>
                  User Information:
                </p>
                <div className={`text-xs space-y-1 ${permissions.length === 0 ? 'text-red-700' : 'text-yellow-700'}`}>
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Role:</strong> {user?.role || 'Not assigned'}</p>
                  <p><strong>Permissions:</strong> {permissions.length > 0 ? permissions.join(", ") : "0 (Access Denied)"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleRefresh} 
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Permissions
            </Button>
            
            <Button 
              onClick={() => debug()} 
              className="w-full"
              variant="outline"
              size="sm"
            >
              Debug Permissions (Check Console)
            </Button>
            
            <Button 
              onClick={logout} 
              className="w-full"
              variant="destructive"
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
