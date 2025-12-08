"use client"

import { usePermissions } from "@/hooks/usePermissions"
import { ReactNode } from "react"

interface PermissionGateProps {
  children: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  fallback?: ReactNode
}

export function PermissionGate({ 
  children, 
  permission, 
  permissions = [], 
  requireAll = false,
  fallback = null 
}: PermissionGateProps) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions()

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
  }

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions.length > 0) {
    if (requireAll) {
      hasAccess = permissions.every(p => hasPermission(p))
    } else {
      hasAccess = hasAnyPermission(permissions)
    }
  } else {
    // No permissions specified, allow access
    hasAccess = true
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Convenience components for common use cases
export function DashboardGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate permission="dashboard">
      {children}
    </PermissionGate>
  )
}

export function OverviewGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate permission="overview">
      {children}
    </PermissionGate>
  )
}

export function ROBillingGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate permissions={["ro_billing_dashboard", "ro_billing_upload", "ro_billing_report"]}>
      {children}
    </PermissionGate>
  )
}

export function OperationsGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate permissions={["operations_dashboard", "operations_upload", "operations_report"]}>
      {children}
    </PermissionGate>
  )
}

export function WarrantyGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate permissions={["warranty_dashboard", "warranty_upload", "warranty_report"]}>
      {children}
    </PermissionGate>
  )
}

export function ServiceBookingGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate permissions={["service_booking_dashboard", "service_booking_upload", "service_booking_report"]}>
      {children}
    </PermissionGate>
  )
}
