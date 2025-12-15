"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl } from "@/lib/config"
import { useUserApiData } from "@/hooks/useGlobalApiData"

interface Permission {
  id: string
  permission_key: string
  name: string
}

export function usePermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      // ✅ IMMEDIATE ACCESS: Set role-based permissions synchronously first for GMs / role-based flows
      const rolePermissions = getWorkingRoleBasedPermissions(user.role)
      if (rolePermissions.length > 0) {
        setPermissions(rolePermissions)
      }
      
      // Then enhance with **fresh** database permissions asynchronously
      // (No long-lived cache so new permissions apply immediately after GM updates)
      fetchUserPermissions()
    } else {
      setPermissions([])
      setIsLoading(false)
    }
  }, [user])

  const fetchUserPermissions = useCallback(async () => {
    if (!user) return

    try {
      // Always show a quick loading state when re-fetching from backend
      setIsLoading(true)
      setError(null)

      // Role permissions may already be set in useEffect for immediate access
      // This function enhances/replaces them with latest database permissions

      // Try to enhance with database permissions (primary path)
      try {
        const directApiUrl = getApiUrl(`/api/rbac/users/email/${encodeURIComponent(user.email)}/permissions`)
        console.log("🔍 Fetching permissions for:", user.email, "Role:", user.role)
        console.log("🌐 API URL:", directApiUrl)
        const directResponse = await fetch(directApiUrl, { cache: 'no-cache' })
        console.log("📡 API Response Status:", directResponse.status)
        
        if (directResponse.ok) {
          const directData = await directResponse.json()
          console.log("📦 Full API Response:", JSON.stringify(directData, null, 2))
          
          // Try multiple ways to extract permissions
          let directPermissions = directData.data?.permissions || directData.permissions || directData.data || []
          
          // If it's an object with a permissions property, extract it
          if (directPermissions && typeof directPermissions === 'object' && !Array.isArray(directPermissions)) {
            directPermissions = directPermissions.permissions || []
          }
          
          console.log("📋 Extracted permissions array:", directPermissions)
          console.log("🔢 Permissions count:", Array.isArray(directPermissions) ? directPermissions.length : 0)
          
          if (Array.isArray(directPermissions) && directPermissions.length > 0) {
            const directPermissionKeys = directPermissions.map((p: any) => {
              // Handle different permission formats
              if (typeof p === 'string') return p
              if (typeof p === 'object') {
                return p.permission_key || p.permissionKey || p.key || p.name || null
              }
              return null
            }).filter(Boolean) // Remove null/undefined values
            
            console.log("🔑 Extracted permission keys:", directPermissionKeys)
            
            if (directPermissionKeys.length > 0) {
              console.log("✅ Setting", directPermissionKeys.length, "permissions from database:", directPermissionKeys)
              setPermissions(directPermissionKeys)
              setIsLoading(false)
              return
            } else {
              console.log("⚠️ Permission keys are empty after extraction")
            }
          } else {
            console.log("⚠️ Database returned 0 permissions for user:", user.email)
            // Database returned no permissions - get current role permissions
            const currentRolePermissions = getWorkingRoleBasedPermissions(user.role)
            if (currentRolePermissions.length === 0) {
              console.log("🚫 Setting empty permissions - custom role with no database permissions")
              setPermissions([])
            } else {
              console.log("✅ Keeping role-based permissions:", currentRolePermissions)
            }
            return
          }
        }
      } catch (directErr) {
        console.error("❌ Direct API error:", directErr)
        // Try fallback
      }
      
      // FALLBACK: Try summary API
      try {
        const summaryResponse = await fetch(getApiUrl("/api/rbac/user-roles-summary"))
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json()
          console.log("📦 Summary API Response Data:", summaryData)
          
          // Use usersWithRoles specifically for users who have permissions assigned
          const usersWithRoles = summaryData.usersWithRoles || summaryData.data?.usersWithRoles || []
          const allUsers = summaryData.allUsers || summaryData.data?.allUsers || []
          
          console.log("👥 Total users:", allUsers.length)
          console.log("👥 Users with roles:", usersWithRoles.length)
          
          // First try to find user in usersWithRoles (users with assigned permissions)
          let currentUser = usersWithRoles.find((u: any) => u.email === user.email)
          
          if (!currentUser) {
            // Fallback: try to find in allUsers
            currentUser = allUsers.find((u: any) => u.email === user.email)
            console.log("🔍 User not found in usersWithRoles, checking allUsers")
          }
          
          console.log("🔍 Looking for user:", user.email)
          console.log("👤 Current user found:", currentUser ? "Yes" : "No")
          
          if (currentUser) {
            console.log("📋 Full user object:", JSON.stringify(currentUser, null, 2))
            console.log("🔍 User roles:", currentUser.roles)
            console.log("🔍 User assignedRoles:", currentUser.assignedRoles)
            console.log("🔍 User userRoles:", currentUser.userRoles)
            
            // Try different possible role field names
            const userRoles = currentUser.roles || currentUser.assignedRoles || currentUser.userRoles || []
            
            if (userRoles && userRoles.length > 0) {
              console.log("✅ Found user with database roles:", userRoles.map((r: any) => r.name || r.roleName || r))
              
              // Get all permissions from all roles
              let allPermissions: string[] = []
              for (const role of userRoles) {
                console.log("🔍 Processing role:", JSON.stringify(role, null, 2))
                
                if (role.permissions) {
                  const rolePerms = role.permissions.map((p: any) => p.permission_key || p.permissionKey || p.key || p)
                  allPermissions = [...allPermissions, ...rolePerms]
                  console.log(`📋 Role "${role.name || role.roleName || 'Unknown'}" permissions:`, rolePerms)
                } else if (role.rolePermissions) {
                  const rolePerms = role.rolePermissions.map((p: any) => p.permission_key || p.permissionKey || p.key || p)
                  allPermissions = [...allPermissions, ...rolePerms]
                  console.log(`📋 Role "${role.name || role.roleName || 'Unknown'}" rolePermissions:`, rolePerms)
                } else {
                  console.log(`⚠️ Role "${role.name || role.roleName || 'Unknown'}" has no permissions field`)
                  console.log("🔍 Available fields in role:", Object.keys(role))
                }
              }
            
            // Remove duplicates
            allPermissions = [...new Set(allPermissions)]
            
            if (allPermissions.length > 0) {
              // Only update if database permissions are different/better
              const currentRolePermissions = getWorkingRoleBasedPermissions(user.role)
              console.log("📊 Comparing permissions:")
              console.log("   Role-based:", currentRolePermissions)
              console.log("   Database:", allPermissions)
              
              if (allPermissions.length >= currentRolePermissions.length) {
                console.log("✅ Using enhanced database permissions")
                setPermissions(allPermissions)
              } else {
                console.log("📊 Role-based permissions are better, keeping them")
              }
            } else {
              console.log("⚠️ No permissions found in database roles")
              const currentRolePermissions = getWorkingRoleBasedPermissions(user.role)
            }
          } else {
            console.log("⚠️ User has no roles assigned in database")
            // ✅ NEW: If user exists in database but has no roles, give them NO permissions
            // This forces them to contact admin for proper role assignment
            console.log("🚫 Setting empty permissions - user needs admin to assign roles")
            setPermissions([])
          }
        } else {
          console.log("📊 User not found in database")
          // ✅ NEW: If user is not in database at all, check if they have a valid role
          // Only give role-based permissions if they have a recognized role
          if (user.role === "general_manager") {
            console.log("✅ User is GM but not in database, giving role-based permissions")
            const currentRolePermissions = getWorkingRoleBasedPermissions(user.role)
          } else {
            console.log("🚫 User not in database and not GM - setting empty permissions")
            setPermissions([])
          }
        }
        } else {
          console.log("⚠️ Summary API failed, keeping role-based permissions")
          const currentRolePermissions = getWorkingRoleBasedPermissions(user.role)
        }
      } catch (summaryErr) {
        console.log("⚠️ Summary API error, keeping role-based permissions:", summaryErr)
        const currentRolePermissions = getWorkingRoleBasedPermissions(user.role)
      }

    } catch (err) {
      console.error("❌ Error in permission fetching:", err)
      // ✅ UPDATED: Only fallback to role permissions for general managers
      // Service managers and others need database permissions
      if (user.role === "general_manager") {
        console.log("✅ Error occurred but user is GM, giving role-based permissions")
        const fallbackPermissions = getWorkingRoleBasedPermissions(user.role)
        const finalFallback = fallbackPermissions.length > 0 ? fallbackPermissions : getBasicPermissions()
        setPermissions(finalFallback)
      } else {
        console.log("🚫 Error occurred - only GMs get fallback permissions, setting empty permissions")
        setPermissions([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Old method removed - using simplified single API approach

  const getBasicPermissions = (): string[] => {
    // ✅ UPDATED: Provide basic database permissions for any authenticated user
    // This allows access to basic features without role restrictions
    return [
      "overview",
      "dashboard"
    ]
  }

  const getWorkingRoleBasedPermissions = (role: string): string[] => {
    switch (role) {
      case "general_manager":
        return [
          "dashboard",
          "overview",
          "ro_billing_dashboard",
          "operations_dashboard",
          "warranty_dashboard",
          "service_booking_dashboard",
          "manage_users",
          "manage_roles",
          "ro_billing_upload",
          "operations_upload",
          "warranty_upload",
          "service_booking_upload",
          "ro_billing_report",
          "operations_report",
          "warranty_report",
          "service_booking_report",
          "target_report"
        ]
      case "service_manager":
        return [
          "dashboard",
          "ro_billing_dashboard",
          "operations_dashboard", 
          "warranty_dashboard",
          "service_booking_dashboard",
          "ro_billing_upload",
          "operations_upload",
          "warranty_upload",
          "service_booking_upload"
        ]
      case "service_advisor":
        return [
          "dashboard",
          "overview"
        ]
      default:
        return []
    }
  }

  const getRoleBasedPermissions = (role: string): string[] => {
    // DEPRECATED: This method is no longer used
    // The system now relies on database-driven permissions
    // Keeping for backward compatibility only
    console.warn("getRoleBasedPermissions is deprecated - use database permissions instead")
    return getBasicPermissions()
  }

  const hasPermission = useCallback((permissionKey: string): boolean => {
    return permissions.includes(permissionKey)
  }, [permissions])

  const hasAnyPermission = useCallback((permissionKeys: string[]): boolean => {
    return permissionKeys.some(key => hasPermission(key))
  }, [hasPermission])

  const refetchPermissions = useCallback(async () => {
    // Clear cache and refetch
    if (user) {
      await fetchUserPermissions()
    }
  }, [user, fetchUserPermissions])

  const debugPermissions = () => {
    console.log("🐛 Permission Debug Info:")
    console.log("- User:", user?.email, "Role:", user?.role)
    console.log("- Permissions:", permissions)
    console.log("- Permission Count:", permissions.length)
    console.log("- Is Loading:", isLoading)
    console.log("- Has GM Permissions:", hasPermission('manage_users') || hasPermission('manage_roles'))
    console.log("- Has SM Permissions:", hasPermission('ro_billing_dashboard') || hasPermission('operations_dashboard'))
    console.log("- Has SA Permissions:", hasPermission('dashboard') || hasPermission('overview'))
    // Test direct API call
    if (user?.email) {
      console.log("🧪 Testing direct API call...")
      fetch(getApiUrl(`/api/rbac/users/email/${encodeURIComponent(user.email)}/permissions`))
        .then(response => {
          console.log("📡 Direct API test status:", response.status)
          return response.json()
        })
        .then(data => {
          console.log("📦 Direct API test data:", data)
        })
        .catch(err => {
          console.log("❌ Direct API test error:", err)
        })
    }
  }

  // Force refresh permissions and clear cache
  const forceRefresh = async () => {
    if (user?.email) {
      console.log("🔄 Force refreshing permissions...")
      setPermissions([])
      await fetchUserPermissions()
    }
  }

  const testRBACAPI = async () => {
    if (!user) return
    
    console.log("🧪 Testing RBAC API...")
    const testUrl = getApiUrl(`/api/rbac/users/email/${encodeURIComponent(user.email)}/permissions`)
    console.log("🌐 Test URL:", testUrl)
    
    try {
      const response = await fetch(testUrl)
      console.log("📡 Test Response Status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("✅ Test Response Data:", data)
      } else {
        const errorText = await response.text()
        console.log("❌ Test Error:", errorText)
      }
    } catch (error) {
      console.log("❌ Test Failed:", error)
    }
  }

  const clearCacheAndRefresh = () => {
    if (!user) return
    
    console.log("🧹 Clearing cache and forcing refresh for user:", user.email)
    
    // Reset state completely
    setPermissions([])
    setIsLoading(true)
    setError(null)
    
    // Force refetch with delay
    setTimeout(() => {
      console.log("🔄 Forcing fresh permission fetch...")
      refetchPermissions()
    }, 200)
  }

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    refetch: refetchPermissions,
    debug: debugPermissions,
    testAPI: testRBACAPI,
    forceRefresh,
    clearCacheAndRefresh
  }
}
