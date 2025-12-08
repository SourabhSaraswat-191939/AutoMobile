"use client"

import { useAuth } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

export default function UnauthorizedPage() {
  const { user, logout } = useAuth()
  const { permissions, refetch, debug } = usePermissions()
  const router = useRouter()

  const handleRefresh = async () => {
    await refetch()
    // Try to route again after refresh
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-800">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-700">
              You don't have permission to access any dashboard.
            </p>
            <p className="text-sm text-gray-500">
              Contact your administrator to get the appropriate permissions assigned to your role.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-yellow-800">
                  User Information:
                </p>
                <div className="text-xs text-yellow-700 space-y-1">
                  <p><strong>Email:</strong> {user?.email}</p>
                  <p><strong>Role:</strong> {user?.role}</p>
                  <p><strong>Permissions:</strong> {permissions.length > 0 ? permissions.join(", ") : "None"}</p>
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
