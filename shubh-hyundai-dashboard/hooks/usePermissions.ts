"use client"

import { useState, useEffect, useCallback } from "react"
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

  const fetchUserPermissions = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      // Check for valid cache
      const cachedPermissions = localStorage.getItem(`permissions_${user.email}`)
      if (cachedPermissions) {
        const parsed = JSON.parse(cachedPermissions)
        const cacheAge = Date.now() - parsed.timestamp
        
        // Use cache if less than 5 minutes old
        if (cacheAge < 300000) {
          setPermissions(parsed.permissions)
          setLastFetchedEmail(user.email)
          setIsLoading(false)
          return
        }
      }

      // Set role permissions for recognized roles
      const rolePermissions = getWorkingRoleBasedPermissions(user.role)
      
      if (rolePermissions.length > 0) {
        setPermissions(rolePermissions)
        setLastFetchedEmail(user.email)
      }
      // For custom roles, don't set empty permissions yet - wait for database API

      // Try to enhance with database permissions (optional)
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
              setLastFetchedEmail(user.email)
              localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
                permissions: directPermissionKeys,
                timestamp: Date.now()
              }))
              setIsLoading(false)
              return
            } else {
              console.log("⚠️ Permission keys are empty after extraction")
            }
          } else {
            console.log("⚠️ Database returned 0 permissions for user:", user.email)
            // Database returned no permissions - only set empty if role is also unrecognized
            if (rolePermissions.length === 0) {
              console.log("🚫 Setting empty permissions - custom role with no database permissions")
              setPermissions([])
              localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
                permissions: [],
                timestamp: Date.now()
              }))
            } else {
              console.log("✅ Keeping role-based permissions:", rolePermissions)
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
            console.log("⚠️ User has no roles assigned in database")
            // ✅ NEW: If user exists in database but has no roles, give them NO permissions
            // This forces them to contact admin for proper role assignment
            console.log("🚫 Setting empty permissions - user needs admin to assign roles")
            setPermissions([])
            localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
              permissions: [],
              timestamp: Date.now()
            }))
          }
        } else {
          console.log("📊 User not found in database")
          // ✅ NEW: If user is not in database at all, check if they have a valid role
          // Only give role-based permissions if they have a recognized role
          if (user.role === "general_manager") {
            console.log("✅ User is GM but not in database, giving role-based permissions")
            // Cache the role-based result
            localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
              permissions: rolePermissions,
              timestamp: Date.now()
            }))
          } else {
            console.log("🚫 User not in database and not GM - setting empty permissions")
            setPermissions([])
            localStorage.setItem(`permissions_${user.email}`, JSON.stringify({
              permissions: [],
              timestamp: Date.now()
            }))
          }
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
      setLastFetchedEmail(user.email)
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
        return []
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
      localStorage.removeItem(`permissions_${user.email}`)
      setLastFetchedEmail(null)
      await fetchUserPermissions()
    }
  }, [user, fetchUserPermissions])

  const debugPermissions = () => {
    console.log("🐛 Permission Debug Info:")
    console.log("- User:", user?.email, "Role:", user?.role)
    console.log("- Permissions:", permissions)
    console.log("- Permission Count:", permissions.length)
    console.log("- Is Loading:", isLoading)
    console.log("- Last Fetched Email:", lastFetchedEmail)
    console.log("- Has GM Permissions:", hasPermission('manage_users') || hasPermission('manage_roles'))
    console.log("- Has SM Permissions:", hasPermission('ro_billing_dashboard') || hasPermission('operations_dashboard'))
    console.log("- Has SA Permissions:", hasPermission('dashboard') || hasPermission('overview'))
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

  // Clear old cached permissions on component mount (once)
  useEffect(() => {
    const allKeys = Object.keys(localStorage)
    allKeys.forEach(key => {
      if (key.startsWith('permissions_')) {
        const cached = localStorage.getItem(key)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            const cacheAge = Date.now() - parsed.timestamp
            // Clear cache older than 5 minutes OR if permissions are empty
            if (cacheAge > 300000 || (parsed.permissions && parsed.permissions.length === 0)) {
              console.log("🗑️ Clearing stale/empty permission cache:", key)
              localStorage.removeItem(key)
            }
          } catch (e) {
            // Invalid cache, remove it
            localStorage.removeItem(key)
          }
        }
      }
    })
  }, [])

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
    
    // Clear ALL permission caches to be safe
    const allKeys = Object.keys(localStorage)
    let clearedCount = 0
    
    allKeys.forEach(key => {
      if (key.startsWith('permissions_')) {
        localStorage.removeItem(key)
        clearedCount++
        console.log("🗑️ Cleared cache:", key)
      }
    })
    
    console.log(`✅ Cleared ${clearedCount} permission cache entries`)
    
    // Reset state completely
    setLastFetchedEmail("")
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
