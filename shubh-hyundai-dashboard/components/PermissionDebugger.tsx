"use client"

import { usePermissions } from "@/hooks/usePermissions"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function PermissionDebugger() {
  const { user } = useAuth()
  const { permissions, isLoading, hasPermission, debug, testAPI, forceRefresh, clearCacheAndRefresh } = usePermissions()

  if (!user) return null

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto z-50 border-2 border-blue-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Permission Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs">
          <p><strong>User:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Loading:</strong> {isLoading ? "Yes" : "No"}</p>
          <p><strong>Permissions:</strong> {permissions.length}</p>
        </div>
        
        <div className="text-xs space-y-1">
          <p><strong>Dashboard Access:</strong></p>
          <p>GM: {hasPermission('manage_users') || hasPermission('manage_roles') ? "✅" : "❌"}</p>
          <p>SM: {hasPermission('ro_billing_dashboard') || hasPermission('operations_dashboard') ? "✅" : "❌"}</p>
          <p>SA: {hasPermission('dashboard') || hasPermission('overview') ? "✅" : "❌"}</p>
        </div>

        <div className="text-xs">
          <p><strong>All Permissions:</strong></p>
          <div className="max-h-20 overflow-auto bg-gray-100 p-1 rounded text-xs">
            {permissions.length > 0 ? permissions.join(", ") : "None"}
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          <Button size="sm" onClick={debug} className="text-xs">
            Debug Console
          </Button>
          <Button size="sm" onClick={testAPI} className="text-xs">
            Test API
          </Button>
          <Button size="sm" onClick={forceRefresh} className="text-xs">
            Force Refresh
          </Button>
          <Button size="sm" onClick={clearCacheAndRefresh} className="text-xs bg-red-600 hover:bg-red-700">
            Clear Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
