"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getApiUrl } from "@/lib/config"

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
  const [lastFetchedEmail, setLastFetchedEmail] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      // Check if we already cached permissions for this user
      if (lastFetchedEmail === user.email && permissions.length > 0) {
        console.log("Using cached permissions for:", user.email)
        setIsLoading(false)
        return
      }
      fetchUserPermissions()
    } else {
      setPermissions([])
      setIsLoading(false)
      setLastFetchedEmail(null)
    }
  }, [user])

  const fetchUserPermissions = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      // Check localStorage cache first (5 minute cache)
      const cachedPermissions = localStorage.getItem(`permissions_${user.email}`)
      if (cachedPermissions) {
        const parsed = JSON.parse(cachedPermissions)
        const cacheAge = Date.now() - parsed.timestamp
        if (cacheAge < 300000) {
          console.log("✅ Using cached permissions for:", user.email)
          setPermissions(parsed.permissions)
          setLastFetchedEmail(user.email)
          setIsLoading(false)
          return
        }
      }

      // ROLE-FIRST APPROACH: Set role permissions immediately, then enhance with API if available
      console.log("🎯 Starting with role-based permissions for:", user.role)
      const rolePermissions = getWorkingRoleBasedPermissions(user.role)
      
      // ALWAYS set role permissions immediately for instant access
      setPermissions(rolePermissions)
      setLastFetchedEmail(user.email)
      console.log("✅ Role-based permissions set immediately:", rolePermissions.length, "permissions")
      console.log("📋 Permissions:", rolePermissions)

      // Try to enhance with database permissions (optional)
      console.log("🔄 Checking for database permission enhancements...")
      
      // DIRECT API CALL: Try the direct permissions API first
      console.log("🎯 Trying direct permissions API first...")
      try {
        const directApiUrl = getApiUrl(`/api/rbac/users/email/${encodeURIComponent(user.email)}/permissions`)
        console.log("🌐 Direct API URL:", directApiUrl)
        
        const directResponse = await fetch(directApiUrl)
        console.log("📡 Direct API Response Status:", directResponse.status)
        
        if (directResponse.ok) {
          const directData = await directResponse.json()
          console.log("📦 Direct API Response Data:", directData)
          
          const directPermissions = directData.data?.permissions || directData.permissions || []
          console.log("🔍 Raw direct permissions:", directPermissions)
          console.log("🔍 Direct permissions type:", typeof directPermissions)
          console.log("🔍 Direct permissions length:", directPermissions.length)
          
          if (directPermissions.length > 0) {
            // Convert to permission keys array
            const directPermissionKeys = directPermissions.map((p: any) => {
              console.log("🔍 Processing permission object:", p)
              return p.permission_key || p.permissionKey || p.key || p
            })
            console.log("✅ Direct API permissions:", directPermissionKeys)
            console.log("🔍 Permission keys length:", directPermissionKeys.length)
            
            if (directPermissionKeys.length > 0 && directPermissionKeys[0]) {
              console.log("✅ Using direct API permissions")
              
              // Smart dashboard detection based on permissions
              const hasDashboardPermission = directPermissionKeys.some(p => 
                p && p.includes('can_access_') && p.includes('dashboard')
              )
              console.log("🔍 Has dashboard permission:", hasDashboardPermission)
              
              if (!hasDashboardPermission) {
                console.log("⚠️ No dashboard access permissions found, detecting appropriate dashboard...")
                
                // Determine appropriate dashboard based on assigned permissions
                let dashboardToAdd = null
                
                // Check for GM-level permissions
                const gmPermissions = [
                  'can_assign_target_to_sm', 'manage_users', 'can_access_bodyshop',
                  'gm_targets', 'user_access', 'role_management'
                ]
                const hasGMPermissions = gmPermissions.some(p => directPermissionKeys.includes(p))
                console.log("🔍 Has GM permissions:", hasGMPermissions)
                
                // Check for SM-level permissions  
                const smPermissions = [
                  'can_upload_ro_sheet', 'ro_billing_dashboard', 'operations_dashboard',
                  'warranty_dashboard', 'service_booking_dashboard', 'target_report'
                ]
                const hasSMPermissions = smPermissions.some(p => directPermissionKeys.includes(p))
                console.log("🔍 Has SM permissions:", hasSMPermissions)
                
                // Check for SA-level permissions
                const saPermissions = [
                  'can_access_overview', 'view_profile', 'basic_access'
                ]
                const hasSAPermissions = saPermissions.some(p => directPermissionKeys.includes(p))
                console.log("🔍 Has SA permissions:", hasSAPermissions)
                
                // Determine dashboard based on permission level (highest first)
                if (hasGMPermissions) {
                  dashboardToAdd = 'can_access_gm_dashboard'
                  console.log("🎯 Detected GM-level permissions, adding GM dashboard access")
                } else if (hasSMPermissions) {
                  dashboardToAdd = 'can_access_sm_dashboard'
                  console.log("🎯 Detected SM-level permissions, adding SM dashboard access")
                } else if (hasSAPermissions || directPermissionKeys.length > 0) {
                  dashboardToAdd = 'can_access_sa_dashboard'
                  console.log("🎯 Detected basic permissions, adding SA dashboard access")
                } else {
                  // Fallback to role-based detection
                  if (user.role === 'general_manager') {
                    dashboardToAdd = 'can_access_gm_dashboard'
                  } else if (user.role === 'service_manager') {
                    dashboardToAdd = 'can_access_sm_dashboard'
                  } else {
                    dashboardToAdd = 'can_access_sa_dashboard'
                  }
                  console.log("🎯 Using role-based fallback for dashboard access")
                }
                
                if (dashboardToAdd) {
                  directPermissionKeys.push(dashboardToAdd)
                  console.log("✅ Added dashboard permission:", dashboardToAdd)
                }
              }
              
              console.log("🎯 Final permissions to set:", directPermissionKeys)
              setPermissions(directPermissionKeys)
              
              // Cache the result
              localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
                permissions: directPermissionKeys,
                timestamp: Date.now()
              }))
              console.log("✅ Permissions set and cached successfully")
              return // Exit early - we found permissions
            } else {
              console.log("⚠️ No valid permission keys found")
            }
          } else {
            console.log("⚠️ No permissions in direct API response")
          }
        } else {
          console.log("⚠️ Direct API failed:", directResponse.status)
        }
      } catch (directErr) {
        console.log("⚠️ Direct API error:", directErr)
      }
      
      // FALLBACK: Try summary API
      console.log("🔄 Trying summary API as fallback...")
      
      try {
        const summaryResponse = await fetch(getApiUrl("/api/rbac/user-roles-summary"))
        console.log("📡 Summary API Response Status:", summaryResponse.status)
        
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
              console.log("📊 Comparing permissions:")
              console.log("   Role-based:", rolePermissions)
              console.log("   Database:", allPermissions)
              
              if (allPermissions.length >= rolePermissions.length) {
                console.log("✅ Using enhanced database permissions")
                setPermissions(allPermissions)
                
                // Cache the enhanced result
                localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
                  permissions: allPermissions,
                  timestamp: Date.now()
                }))
              } else {
                console.log("📊 Role-based permissions are better, keeping them")
                // Cache the role-based result
                localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
                  permissions: rolePermissions,
                  timestamp: Date.now()
                }))
              }
            } else {
              console.log("⚠️ No permissions found in database roles")
              // Cache the role-based result
              localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
                permissions: rolePermissions,
                timestamp: Date.now()
              }))
            }
          } else {
            console.log("⚠️ User has no roles assigned")
            // Cache the role-based result
            localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
              permissions: rolePermissions,
              timestamp: Date.now()
            }))
          }
        } else {
          console.log("📊 User not found in database, keeping role-based permissions")
          // Cache the role-based result
          localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
            permissions: rolePermissions,
            timestamp: Date.now()
          }))
        }
        } else {
          console.log("⚠️ Summary API failed, keeping role-based permissions")
          // Cache the role-based result
          localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
            permissions: rolePermissions,
            timestamp: Date.now()
          }))
        }
      } catch (summaryErr) {
        console.log("⚠️ Summary API error, keeping role-based permissions:", summaryErr)
        // Cache the role-based result
        localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
          permissions: rolePermissions,
          timestamp: Date.now()
        }))
      }

    } catch (err) {
      console.error("❌ Error in permission fetching:", err)
      // Always fallback to some permissions
      const fallbackPermissions = getWorkingRoleBasedPermissions(user.role)
      const finalFallback = fallbackPermissions.length > 0 ? fallbackPermissions : getBasicPermissions()
      setPermissions(finalFallback)
      setLastFetchedEmail(user.email)
    } finally {
      setIsLoading(false)
    }
  }

  // Old method removed - using simplified single API approach

  const getBasicPermissions = (): string[] => {
    // Provide basic permissions for any authenticated user
    // This allows access to basic features without role restrictions
    return [
      "can_access_overview",
      "can_view_profile"
    ]
  }

  const getWorkingRoleBasedPermissions = (role: string): string[] => {
    // Working role-based permissions that actually provide access
    console.log("🎯 Getting permissions for role:", role)
    switch (role) {
      case "general_manager":
        return [
          "can_access_gm_dashboard",
          "can_access_overview",
          "can_access_bodyshop", 
          "can_upload_ro_sheet",
          "can_assign_target_to_sm",
          "ro_billing_dashboard",
          "operations_dashboard",
          "warranty_dashboard",
          "service_booking_dashboard"
        ]
      case "service_manager":
        return [
          "can_access_sm_dashboard",
          "can_access_overview",
          "can_upload_ro_sheet",
          "ro_billing_dashboard",
          "operations_dashboard",
          "warranty_dashboard",
          "service_booking_dashboard"
        ]
      case "service_advisor":
        return [
          "can_access_sa_dashboard",
          "can_access_overview"
        ]
      default:
        console.log("🔧 Custom role detected:", role, "- will use database permissions only")
        // For custom roles, return empty array - let database permissions take precedence
        // This ensures custom role permissions from database are not overridden
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

  const hasPermission = (permissionKey: string): boolean => {
    return permissions.includes(permissionKey)
  }

  const hasAnyPermission = (permissionKeys: string[]): boolean => {
    return permissionKeys.some(key => hasPermission(key))
  }

  const refetchPermissions = async () => {
    // Clear cache and refetch
    if (user) {
      localStorage.removeItem(`permissions_${user.email}`)
      setLastFetchedEmail(null)
      await fetchUserPermissions()
    }
  }

  const debugPermissions = () => {
    console.log("🐛 Permission Debug Info:")
    console.log("- User:", user?.email, "Role:", user?.role)
    console.log("- Permissions:", permissions)
    console.log("- Permission Count:", permissions.length)
    console.log("- Is Loading:", isLoading)
    console.log("- Last Fetched Email:", lastFetchedEmail)
    console.log("- Has GM Dashboard:", hasPermission('can_access_gm_dashboard'))
    console.log("- Has SM Dashboard:", hasPermission('can_access_sm_dashboard'))
    console.log("- Has SA Dashboard:", hasPermission('can_access_sa_dashboard'))
    console.log("- Cache Check:")
    const cached = localStorage.getItem(`permissions_${user?.email}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      console.log("  - Cached permissions:", parsed.permissions)
      console.log("  - Cache age:", (Date.now() - parsed.timestamp) / 1000, "seconds")
    } else {
      console.log("  - No cache found")
    }
    
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
      localStorage.removeItem(`permissions_${user.email}`)
      setPermissions([])
      setLastFetchedEmail(null)
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

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    refetch: refetchPermissions,
    debug: debugPermissions,
    testAPI: testRBACAPI,
    forceRefresh
  }
}
