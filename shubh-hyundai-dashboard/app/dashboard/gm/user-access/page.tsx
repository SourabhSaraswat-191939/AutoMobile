"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth, getAllDemoUsers, type User as AuthUser } from "@/lib/auth-context"
import { usePermissions } from "@/hooks/usePermissions"
import { getApiUrl } from "@/lib/config"
import { formatTimestampForDisplay } from "@/lib/timeUtils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Shield, Trash2, UserCircle, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface Permission {
  _id: string
  permission_key: string
  name: string
}

interface Role {
  _id: string
  name: string
  desc: string
  permissions: Permission[]
}

interface User {
  _id: string
  name: string
  email: string
  phone: string
  username: string
  org_id: string
  roles: Role[]
}

const PREDEFINED_ROLES = [
  { value: "Service Manager", label: "Service Manager", key: "service_manager" },
  { value: "Service Advisor", label: "Service Advisor", key: "service_advisor" },
  { value: "General Manager", label: "General Manager", key: "general_manager" }
]

// Convert auth users to RBAC user format
const convertAuthUsersToRBACUsers = (authUsers: AuthUser[]): User[] => {
  return authUsers.map(authUser => ({
    _id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    phone: "",
    username: authUser.email.split('@')[0],
    org_id: authUser.org_id || "shubh_hyundai",
    roles: []
  }))
}


export default function UserAccessRoleManagement() {
  const { user } = useAuth()
  const { permissions: userPermissions, hasPermission, debug } = usePermissions()
  
  // Debug permissions on component mount
  useEffect(() => {
    if (user) {
      console.log("🐛 User Access Page Debug:")
      console.log("- User:", user.email, "Role:", user.role)
      console.log("- User Permissions:", userPermissions)
      console.log("- Has Manage Users:", hasPermission('manage_users'))
      console.log("- Has Manage Roles:", hasPermission('manage_roles'))
      console.log("- Has GM Role:", user.role === 'general_manager')
      
      // Call debug function
      if (debug) debug()
    }
  }, [user, userPermissions, hasPermission, debug])
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedRole, setSelectedRole] = useState<string>("")
  
  // Configure Role Form State
  const [newRoleDescription, setNewRoleDescription] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [selectedPredefinedRole, setSelectedPredefinedRole] = useState<string>("")
  
  // Organization filter
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all")

  // Data states
  const [roles, setRoles] = useState<Role[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  
  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean
    type: 'success' | 'error' | 'warning'
    title: string
    message: string
  }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  })

  // Timeout ref for notifications
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean
    roleId: string
    roleName: string
  }>({
    show: false,
    roleId: '',
    roleName: ''
  })

  // Helper function to show notifications
  const showNotification = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
    // Clear any existing timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current)
    }
    
    setNotification({
      show: true,
      type,
      title,
      message
    })
    
    // Auto-hide after 5 seconds with fade-out
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 5000)
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Get demo users from auth context
      const demoUsers = getAllDemoUsers()
      
      // Get current user's org_id and showroom_id
      const userOrgId = user?.org_id || "shubh_hyundai"
      const userShowroomId = (user as any)?.showroom_id || "674c5b3b8f8a5c2d4e6f7891"
      setSelectedOrgId(userOrgId)

      // Test backend connectivity first
      console.log("🔗 Testing backend connectivity...")
      try {
        const healthCheck = await fetch(getApiUrl("/"))
        console.log("✅ Backend health check:", healthCheck.status)
        if (healthCheck.ok) {
          const healthData = await healthCheck.json()
          console.log("📊 Backend response:", healthData)
        }
      } catch (healthError) {
        console.error("❌ Backend connectivity test failed:", healthError)
        setError("Backend server is not accessible. Please ensure the server is running on port 5000.")
        return
      }

      // Fetch roles and permissions with enhanced error handling
      console.log("🔄 Fetching roles and permissions...")
      console.log("🌐 Roles URL:", getApiUrl("/api/rbac/roles"))
      console.log("🌐 Permissions URL:", getApiUrl("/api/rbac/permissions"))
      
      let rolesRes, permissionsRes
      
      try {
        [rolesRes, permissionsRes] = await Promise.all([
          fetch(getApiUrl(`/api/rbac/roles?showroom_id=${userShowroomId}`)),
          fetch(getApiUrl(`/api/rbac/permissions?showroom_id=${userShowroomId}`))
        ])
      } catch (fetchError) {
        console.error("❌ Network error during API calls:", fetchError)
        setError("Network error: Unable to connect to the backend server. Please check if the server is running.")
        return
      }

      console.log("📡 API responses:", {
        roles: rolesRes.status,
        permissions: permissionsRes.status
      })

      if (!rolesRes.ok) {
        console.error("❌ Roles fetch failed:", rolesRes.status, rolesRes.statusText)
        try {
          const errorText = await rolesRes.text()
          console.error("❌ Roles error details:", errorText)
        } catch (e) {
          console.error("❌ Could not read roles error response")
        }
      }
      if (!permissionsRes.ok) {
        console.error("❌ Permissions fetch failed:", permissionsRes.status, permissionsRes.statusText)
        try {
          const errorText = await permissionsRes.text()
          console.error("❌ Permissions error details:", errorText)
        } catch (e) {
          console.error("❌ Could not read permissions error response")
        }
      }

      const rolesData = rolesRes.ok ? await rolesRes.json() : { data: [] }
      const permissionsData = permissionsRes.ok ? await permissionsRes.json() : { data: [] }

      console.log("Demo users:", demoUsers)
      console.log("Fetched roles:", rolesData.data)
      console.log("Fetched permissions (raw):", permissionsData.data)

      // ✅ UPDATED: Show all permissions - let users decide what they need
      // Only filter out truly deprecated permissions
      const unwantedPermissions = [
        'assign_targets'  // Replaced with gm_targets
      ]
      
      const filteredPermissions = permissionsData.data?.filter((p: any) => 
        !unwantedPermissions.includes(p.permission_key)
      ) || []
      
      console.log("Filtered permissions:", filteredPermissions)

      // If no permissions found, try to seed them automatically
      if (!permissionsData.data || permissionsData.data.length === 0) {
        console.log("No permissions found, attempting to seed...")
        try {
          const seedResponse = await fetch(getApiUrl("/api/rbac/seed-permissions"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ showroom_id: userShowroomId })
          })
          
          if (seedResponse.ok) {
            // Refetch permissions after seeding
            const newPermissionsRes = await fetch(getApiUrl(`/api/rbac/permissions?showroom_id=${userShowroomId}`))
            if (newPermissionsRes.ok) {
              const newPermissionsData = await newPermissionsRes.json()
              permissionsData.data = newPermissionsData.data
              console.log("Permissions seeded successfully:", newPermissionsData.data)
              
              // Update filtered permissions after seeding
              const newFilteredPermissions = newPermissionsData.data?.filter((p: any) => 
                !unwantedPermissions.includes(p.permission_key)
              ) || []
              console.log("Filtered permissions after seeding:", newFilteredPermissions)
              
              // Update the filteredPermissions variable for use later
              filteredPermissions.length = 0
              filteredPermissions.push(...newFilteredPermissions)
            }
          }
        } catch (seedError) {
          console.error("Failed to seed permissions:", seedError)
        }
      } else {
        // Check if any critical permissions are missing and re-seed if needed
        const criticalPermissions = [
          'repair_order_list_dashboard',
          'ro_billing_dashboard',
          'operations_dashboard',
          'warranty_dashboard',
          'service_booking_dashboard',
          'repair_order_list_upload',
          'ro_billing_upload',
          'operations_upload',
          'warranty_upload',
          'service_booking_upload',
          'average_upload'
        ]
        
        const missingPermissions = criticalPermissions.filter(permKey => 
          !permissionsData.data.some((p: any) => p.permission_key === permKey)
        )
        
        if (missingPermissions.length > 0) {
          console.log(`Missing permissions detected: ${missingPermissions.join(', ')}, re-seeding...`)
          try {
            const seedResponse = await fetch(getApiUrl("/api/rbac/seed-permissions"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ showroom_id: userShowroomId })
            })
            
            if (seedResponse.ok) {
              // Refetch permissions after seeding
              const newPermissionsRes = await fetch(getApiUrl(`/api/rbac/permissions?showroom_id=${userShowroomId}`))
              if (newPermissionsRes.ok) {
                const newPermissionsData = await newPermissionsRes.json()
                permissionsData.data = newPermissionsData.data
                console.log("Permissions re-seeded successfully:", newPermissionsData.data)
                
                // Update filtered permissions after re-seeding
                const newFilteredPermissions = newPermissionsData.data?.filter((p: any) => 
                  !unwantedPermissions.includes(p.permission_key)
                ) || []
                console.log("Filtered permissions after re-seeding:", newFilteredPermissions)
                
                // Update the filteredPermissions variable for use later
                filteredPermissions.length = 0
                filteredPermissions.push(...newFilteredPermissions)
              }
            }
          } catch (seedError) {
            console.error("Failed to re-seed permissions:", seedError)
          }
        }
      }

      // Get user roles from new summary API
      console.log("Fetching user-roles summary...")
      let mergedUsers = []
      
      try {
        const userRolesSummaryRes = await fetch(getApiUrl("/api/rbac/user-roles-summary"))
        
        if (userRolesSummaryRes.ok) {
          const summaryData = await userRolesSummaryRes.json()
          console.log("User-roles summary:", summaryData.data.summary)
          
          // Use the users from the API, but merge with demo users for complete list
          const dbUsers = summaryData.data.allUsers || []
          
          // Create merged list: demo users with their database roles if they exist
          mergedUsers = demoUsers.map(demoUser => {
            const dbUser = dbUsers.find((u: any) => u.email === demoUser.email)
            
            return {
              _id: dbUser?._id || demoUser.id,
              name: dbUser?.name || demoUser.name,
              email: demoUser.email,
              phone: dbUser?.phone || "",
              username: dbUser?.username || demoUser.email.split('@')[0],
              org_id: dbUser?.org_id || demoUser.org_id || "shubh_hyundai",
              roles: dbUser?.roles || []
            }
          })
          
          console.log(`Merged ${mergedUsers.length} users, ${mergedUsers.filter(u => u.roles.length > 0).length} have roles`)
          
          // Debug: Log each user's roles
          mergedUsers.forEach(user => {
            if (user.roles && user.roles.length > 0) {
              console.log(`✅ User ${user.name} (${user.email}) has roles:`, user.roles.map((r: Role) => r.name))
            } else {
              console.log(`❌ User ${user.name} (${user.email}) has no roles`)
            }
          })
          
        } else {
          console.log("User-roles summary API failed, using demo users only")
          // Fallback to demo users without roles
          mergedUsers = demoUsers.map(demoUser => ({
            _id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            phone: "",
            username: demoUser.email.split('@')[0],
            org_id: demoUser.org_id || "shubh_hyundai",
            roles: []
          }))
        }
        
      } catch (err) {
        console.error("Error fetching user-roles summary:", err)
        // Fallback to demo users without roles
        mergedUsers = demoUsers.map(demoUser => ({
          _id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          phone: "",
          username: demoUser.email.split('@')[0],
          org_id: demoUser.org_id || "shubh_hyundai",
          roles: []
        }))
      }

      // Store all roles for dropdown and show all roles with permissions in Available Roles
      const allRolesData = rolesData.data || []
      const predefinedRoleNames = PREDEFINED_ROLES.map(r => r.value)
      
      // Create default roles if they don't exist
      const missingRoles = PREDEFINED_ROLES.filter(predefinedRole => 
        !allRolesData.some((role: Role) => role.name === predefinedRole.value)
      )
      
      // Add missing default roles to display (they will be created when configured)
      const defaultRolesToShow = missingRoles.map(role => ({
        _id: `default_${role.key}`,
        name: role.value,
        desc: `${role.value} role (not configured yet)`,
        permissions: []
      }))
      
      // Show all roles that have permissions + default roles
      const rolesToShow = [
        ...allRolesData.filter((role: Role) => role.permissions && role.permissions.length > 0),
        ...defaultRolesToShow
      ]

      console.log("All roles for dropdown:", allRolesData)
      console.log("Roles to show in Available Roles:", rolesToShow)
      console.log("Merged users with roles:", mergedUsers)
      
      // Debug: Log each user's roles
      mergedUsers.forEach(user => {
        if (user.roles && user.roles.length > 0) {
          console.log(`User ${user.name} (${user.email}) has roles:`, user.roles.map((r: Role) => r.name))
        }
      })

      setAllRoles(allRolesData) // All roles for dropdown
      setRoles(rolesToShow) // Roles to show in Available Roles section
      setUsers(mergedUsers)
      setPermissions(filteredPermissions)
    } catch (err) {
      console.error("Error fetching data:", err)
      setError("Failed to load data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    )
  }

  const handleAddRole = async () => {
    if (!selectedPredefinedRole.trim()) {
      showNotification('warning', 'Role Name Required', 'Please enter a role name')
      return
    }

    if (selectedPermissions.length === 0) {
      showNotification('warning', 'Permissions Required', 'Please select at least one permission')
      return
    }

    try {
      console.log("Configuring role:", {
        name: selectedPredefinedRole,
        desc: newRoleDescription || `${selectedPredefinedRole} role with configured permissions`,
        permissions: selectedPermissions
      })

      let roleId
      
      if (editingRole) {
        // We're editing an existing role
        console.log("Editing existing role:", editingRole._id)
        roleId = editingRole._id
        
        // Note: Role description update not supported by current API
        // Only permissions will be updated
      } else {
        // Check if role already exists (for new role creation)
        const existingRolesResponse = await fetch(getApiUrl("/api/rbac/roles"))
        let existingRole = null
        
        if (existingRolesResponse.ok) {
          const existingRolesData = await existingRolesResponse.json()
          existingRole = existingRolesData.data.find((r: any) => r.name === selectedPredefinedRole)
        }

        if (existingRole) {
          // Role exists, use its ID
          console.log("Role already exists:", existingRole._id)
          roleId = existingRole._id
        } else {
          // Create new role first (without permissions)
          console.log("Creating new role")
          const roleResponse = await fetch(getApiUrl("/api/rbac/roles"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: selectedPredefinedRole,
              desc: newRoleDescription || `${selectedPredefinedRole} role with configured permissions`,
              permissions: [] // No permissions in role creation
            })
          })

          if (!roleResponse.ok) {
            const errorData = await roleResponse.json()
            console.error("Role creation error:", errorData)
            throw new Error(errorData.message || "Failed to create role")
          }

          const roleResult = await roleResponse.json()
          roleId = roleResult.data._id
        }
      }

      // Now assign permissions to the role
      console.log("Assigning permissions to role:", roleId)
      
      // If editing an existing role, first remove all existing permissions
      if (editingRole && editingRole.permissions && editingRole.permissions.length > 0) {
        console.log("Removing existing permissions for role:", editingRole.permissions.length)
        
        const removePromises = editingRole.permissions.map(permission => 
          fetch(getApiUrl(`/api/rbac/role-permissions/${roleId}/${permission._id}`), {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
          })
        )
        
        const removeResults = await Promise.all(removePromises)
        const failedRemovals = removeResults.filter(res => !res.ok)
        
        if (failedRemovals.length > 0) {
          console.warn("Some permission removals failed:", failedRemovals.length)
        } else {
          console.log("All existing permissions removed successfully")
        }
      }

      // Then add the selected permissions
      const permissionPromises = selectedPermissions.map(permissionId => 
        fetch(getApiUrl("/api/rbac/role-permissions"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleId: roleId,
            permissionId: permissionId
          })
        })
      )

      const permissionResults = await Promise.all(permissionPromises)
      
      // Check if all permission assignments succeeded
      const failedAssignments = permissionResults.filter(res => !res.ok)
      if (failedAssignments.length > 0) {
        console.error("Some permission assignments failed:", failedAssignments.length)
      }

      console.log("Permissions assigned successfully")
      console.log(`Assigned ${selectedPermissions.length} permissions to role ${selectedPredefinedRole}`)

      // Refresh roles list without full page reload
      const rolesRes = await fetch(getApiUrl("/api/rbac/roles"))
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        const allRolesData = rolesData.data || []
        
        // Update both all roles and display roles
        setAllRoles(allRolesData)
        
        const defaultRolesToShow = PREDEFINED_ROLES
          .filter(predefinedRole => !allRolesData.some((role: Role) => role.name === predefinedRole.value))
          .map(role => ({
            _id: `default_${role.key}`,
            name: role.value,
            desc: `${role.value} role (not configured yet)`,
            permissions: []
          }))
        
        const rolesToShow = [
          ...allRolesData.filter((role: Role) => role.permissions && role.permissions.length > 0),
          ...defaultRolesToShow
        ]
        
        setRoles(rolesToShow)
      }
      
      // Reset form
      setNewRoleDescription("")
      setSelectedPermissions([])
      setSelectedPredefinedRole("")
      setEditingRole(null)
      setIsAddRoleOpen(false)
      
      showNotification('success', 'Role Configured Successfully', `Role "${selectedPredefinedRole}" ${editingRole ? 'updated' : 'configured'} successfully with ${selectedPermissions.length} permissions! All users with this role will automatically get these permissions.`)
    } catch (err: any) {
      console.error("Error configuring role:", err)
      showNotification('error', 'Configuration Failed', err.message || "Failed to configure role. Please try again.")
    }
  }

  const handleDeleteRole = (roleId: string, roleName: string) => {
    setDeleteConfirmation({
      show: true,
      roleId,
      roleName
    })
  }

  const confirmDeleteRole = async () => {
    const { roleId, roleName } = deleteConfirmation

    try {
      const response = await fetch(getApiUrl(`/api/rbac/roles/${roleId}`), {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete role")
      }

      // Update roles without full page reload
      const rolesRes = await fetch(getApiUrl("/api/rbac/roles"))
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        const allRolesData = rolesData.data || []
        
        setAllRoles(allRolesData)
        
        const defaultRolesToShow = PREDEFINED_ROLES
          .filter(predefinedRole => !allRolesData.some((role: Role) => role.name === predefinedRole.value))
          .map(role => ({
            _id: `default_${role.key}`,
            name: role.value,
            desc: `${role.value} role (not configured yet)`,
            permissions: []
          }))
        
        const rolesToShow = [
          ...allRolesData.filter((role: Role) => role.permissions && role.permissions.length > 0),
          ...defaultRolesToShow
        ]
        
        setRoles(rolesToShow)
      }
      
      // Refresh user roles
      const demoUsers = getAllDemoUsers()
      const mergedUsers = await Promise.all(demoUsers.map(async (demoUser) => {
        try {
          const userRolesRes = await fetch(getApiUrl(`/api/rbac/users/email/${encodeURIComponent(demoUser.email)}/roles`))
          let userRoles = []
          if (userRolesRes.ok) {
            const userRolesData = await userRolesRes.json()
            userRoles = userRolesData.data || []
          }
          
          return {
            _id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            phone: "",
            username: demoUser.email.split('@')[0],
            org_id: demoUser.org_id || "shubh_hyundai",
            roles: userRoles
          }
        } catch (err) {
          return {
            _id: demoUser.id,
            name: demoUser.name,
            email: demoUser.email,
            phone: "",
            username: demoUser.email.split('@')[0],
            org_id: demoUser.org_id || "shubh_hyundai",
            roles: []
          }
        }
      }))
      
      setUsers(mergedUsers)
      showNotification('success', 'Role Deleted Successfully', `Role "${roleName}" deleted successfully! Users are preserved but no longer have this role.`)
    } catch (err) {
      console.error("Error deleting role:", err)
      showNotification('error', 'Delete Failed', "Failed to delete role. Please try again.")
    } finally {
      // Close the confirmation modal
      setDeleteConfirmation({ show: false, roleId: '', roleName: '' })
    }
  }

  const cancelDeleteRole = () => {
    setDeleteConfirmation({ show: false, roleId: '', roleName: '' })
  }

  const handleAssignRoleToUser = async () => {
    if (!selectedUser || !selectedRole) {
      showNotification('warning', 'Selection Required', 'Please select both user and role')
      return
    }

    try {
      // Find the selected user from demo users
      const selectedUserData = users.find(u => u._id === selectedUser)
      if (!selectedUserData) {
        throw new Error("Selected user not found")
      }

      // First, create or get the user in MongoDB
      let mongoUserId = selectedUserData._id
      
      // Try to get all users and find by email (more reliable than ID)
      const allUsersResponse = await fetch(getApiUrl("/api/rbac/users"))
      let existingUser = null
      
      if (allUsersResponse.ok) {
        const allUsersData = await allUsersResponse.json()
        existingUser = allUsersData.data.find((u: any) => u.email === selectedUserData.email)
      }
      
      if (existingUser) {
        // User exists, use their MongoDB ID
        mongoUserId = existingUser._id
      } else {
        // User doesn't exist in MongoDB, create it
        const createUserResponse = await fetch(getApiUrl("/api/rbac/users"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: selectedUserData.phone || `${Date.now()}`, // Generate unique phone if empty
            address: selectedUserData.org_id || "",
            name: selectedUserData.name,
            username: `${selectedUserData.email.split('@')[0]}_${Date.now()}`, // Make username unique with timestamp
            org_id: selectedUserData.org_id,
            email: selectedUserData.email
          })
        })

        if (createUserResponse.ok) {
          const userData = await createUserResponse.json()
          mongoUserId = userData.data._id
        } else {
          const errorData = await createUserResponse.json()
          console.error("User creation error:", errorData)
          throw new Error(errorData.message || "Failed to create user in database")
        }
      }

      // Check if role exists in database (skip default placeholder roles)
      let role = null
      
      // First, try to find the role in allRoles (which contains actual database roles)
      role = allRoles.find(r => r.name === selectedRole)
      
      if (!role) {
        // Try to fetch all roles again to see if it exists in DB
        const allRolesResponse = await fetch(getApiUrl("/api/rbac/roles"))
        if (allRolesResponse.ok) {
          const allRolesData = await allRolesResponse.json()
          role = allRolesData.data.find((r: Role) => r.name === selectedRole)
        }
        
        // If still not found, create it
        if (!role) {
          console.log(`Creating new role: ${selectedRole}`)
          const createRoleResponse = await fetch(getApiUrl("/api/rbac/roles"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: selectedRole,
              desc: `${selectedRole} role (permissions to be configured)`,
              permissions: []
            })
          })

          if (createRoleResponse.ok) {
            const roleData = await createRoleResponse.json()
            role = roleData.data
            console.log(`Role created successfully:`, role)
          } else {
            const errorData = await createRoleResponse.json()
            console.error("Role creation error:", errorData)
            throw new Error(errorData.message || "Failed to create role")
          }
        }
      }

      // Assign the role to the user
      if (!role) {
        throw new Error("Failed to create or find role")
      }

      const response = await fetch(getApiUrl("/api/rbac/user-roles"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: mongoUserId,
          roleId: role._id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to assign role")
      }

      // Refresh data with a small delay to ensure database is updated
      console.log("Role assigned successfully, refreshing data...")
      setTimeout(async () => {
        await fetchAllData()
      }, 1000) // Wait 1 second for database to update
      
      // Reset selection
      setSelectedUser("")
      setSelectedRole("")
      
      showNotification('success', 'Role Assigned Successfully', `Role "${selectedRole}" assigned successfully to ${selectedUserData.name}! Refreshing data...`)
    } catch (err: any) {
      console.error("Error assigning role:", err)
      showNotification('error', 'Assignment Failed', err.message || "Failed to assign role. Please try again.")
    }
  }

  // ✅ UPDATED: Check permissions OR general_manager role (they assign permissions to others)
  if (!hasPermission('manage_users') && !hasPermission('manage_roles') && user?.role !== "general_manager") {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-muted-foreground">Currently, you have not been assigned any role.</p>
        <p className="text-sm text-gray-500 mt-2">Please contact your admin for role assignment.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="ml-4 text-gray-600">Loading data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={fetchAllData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">User Access Role Management</h1>
        <p className="text-gray-500">
          Manage roles and assign them to users
          {selectedOrgId && selectedOrgId !== "all" && (
            <span className="ml-2 text-blue-600 font-medium">
              (Organization: {selectedOrgId})
            </span>
          )}
        </p>
        <p className="text-sm text-gray-400">
          Showing {users.length} user(s) and {roles.length} role(s)
        </p>
        {(roles.length === 0 || permissions.length === 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <p className="text-sm text-amber-800 font-medium mb-2">⚠️ Setup Required:</p>
            <ul className="text-sm text-amber-700 space-y-1 ml-4 list-disc">
              {roles.length === 0 && <li>No roles found. Please create the three predefined roles (Service Manager, Service Advisor, General Manager) using the "+ Add Role" button.</li>}
              {permissions.length === 0 && <li>No permissions found. Run the seed script: <code className="bg-amber-100 px-1 rounded">node scripts/seedPermissions.js</code></li>}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assign Role to User */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-xl">Assign Role to User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="select-user">
                <UserCircle className="h-4 w-4 inline mr-1" />
                Select User
              </Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger id="select-user">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      No users available
                    </div>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user._id} value={user._id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {users.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No demo users loaded. Please refresh the page.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="select-role">
                <Shield className="h-4 w-4 inline mr-1" />
                Select Role
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="select-role">
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_ROLES.map((role) => (
                    <SelectItem key={role.key} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                  {allRoles
                    .filter(role => !PREDEFINED_ROLES.some(pr => pr.value === role.name))
                    .map((role) => (
                      <SelectItem key={role._id} value={role.name}>
                        {role.name} (Custom)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Select from predefined roles: Service Manager, Service Advisor, or General Manager
              </p>
            </div>

            <Button 
              onClick={handleAssignRoleToUser}
              disabled={!selectedUser || !selectedRole}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Save Role Assignment
            </Button>
            {roles.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">
                No configured roles available. Please configure role permissions first using the "+ Configure Role" button on the right.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Available Roles */}
        <Card className="border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Available Roles</CardTitle>
              <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setEditingRole(null)
                      setSelectedPredefinedRole("")
                      setNewRoleDescription("")
                      setSelectedPermissions([])
                    }}
                  >
                    + Create Role
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingRole ? 'Edit Role Permissions' : 'Create New Role'}</DialogTitle>
                    <DialogDescription>
                      {editingRole ? 'Modify permissions for this role.' : 'Create a new role or configure a predefined role. All users with this role will automatically get these permissions.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="role-name">Role Name</Label>
                      <Input
                        id="role-name"
                        placeholder="Enter role name or select predefined"
                        value={selectedPredefinedRole}
                        onChange={(e) => setSelectedPredefinedRole(e.target.value)}
                        disabled={!!editingRole}
                      />
                      {!editingRole && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <p className="text-xs text-gray-500 w-full mb-1">Quick select:</p>
                          {PREDEFINED_ROLES.map((role) => (
                            <button
                              key={role.key}
                              type="button"
                              onClick={() => setSelectedPredefinedRole(role.value)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              {role.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role-description">Description</Label>
                      <Textarea
                        id="role-description"
                        placeholder="Enter role description"
                        value={newRoleDescription}
                        onChange={(e) => setNewRoleDescription(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-1 gap-2 border rounded-lg p-4 bg-gray-50 max-h-80 overflow-y-auto">
                        {permissions.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500">No permissions available.</p>
                            <p className="text-xs text-amber-600 mt-1">
                              Run: <code className="bg-gray-100 px-1 rounded">node scripts/seedPermissions.js</code>
                            </p>
                          </div>
                        ) : (
                          permissions.map((permission) => (
                            <div key={permission._id} className="flex items-center space-x-2">
                              <Checkbox
                                id={permission._id}
                                checked={selectedPermissions.includes(permission._id)}
                                onCheckedChange={() => handlePermissionToggle(permission._id)}
                              />
                              <label
                                htmlFor={permission._id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {permission.name}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Available: {permissions.length} permission(s) | Selected: {selectedPermissions.length} permission(s)
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddRoleOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRole} className="bg-blue-600 hover:bg-blue-700">
                      Configure Role
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No roles available. Create one to get started.</p>
            ) : (
              roles.map((role) => (
                <div key={role._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-lg">{role.name}</h3>
                      {role._id.startsWith('default_') && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">Not Configured</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!role._id.startsWith('default_') && role.permissions.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingRole(role)
                            setSelectedPredefinedRole(role.name)
                            setNewRoleDescription(role.desc)
                            setSelectedPermissions(role.permissions.map(p => p._id))
                            setIsAddRoleOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </Button>
                      )}
                      {!role._id.startsWith('default_') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(role._id, role.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{role.desc}</p>
                  
                  {/* Permissions */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Permissions:</p>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions && role.permissions.length > 0 ? (
                        role.permissions.map((permission) => (
                          <span
                            key={permission._id}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md"
                          >
                            {permission.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">No permissions assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Assigned Users */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Assigned Users:</p>
                    <div className="space-y-2">
                      {(() => {
                        const assignedUsers = users.filter(user => 
                          user.roles && user.roles.length > 0 && 
                          user.roles.some(r => r.name === role.name || r.name?.toLowerCase() === role.name?.toLowerCase())
                        )
                        console.log(`Users for role ${role.name}:`, assignedUsers)
                        return assignedUsers.length > 0 ? (
                          assignedUsers.map((user) => (
                            <div key={user._id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                              <UserCircle className="h-4 w-4 text-gray-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-500 italic">No users assigned to this role yet</p>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* User-Role Assignment Table - Always show if GM has permissions */}
      {hasPermission('can_access_gm_dashboard') && (
        <Card className="border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Assigned User Roles
                </CardTitle>
                <CardDescription>
                  Users who have been assigned roles through the role management system
                </CardDescription>
              </div>
              <Button 
                onClick={fetchAllData} 
                variant="outline" 
                size="sm"
                className="ml-4"
              >
                🔄 Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const usersWithRoles = users.filter(u => u.roles && u.roles.length > 0)
              console.log("🔍 Table check - Total users:", users.length)
              console.log("🔍 Table check - Users with roles:", usersWithRoles.length)
              console.log("🔍 Table check - Users with roles data:", usersWithRoles.map(u => ({name: u.name, email: u.email, roles: u.roles.map((r: Role) => r.name)})))
              
              return usersWithRoles.length > 0
            })() ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold">User</th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Email</th>
                        <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Assigned Roles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u => u.roles && u.roles.length > 0) // Only show users with assigned roles
                        .map((user) => {
                          console.log("Rendering user in table:", user.name, "Roles:", user.roles)
                          return (
                            <tr key={user._id} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <UserCircle className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <span className="font-medium">{user.name}</span>
                                </div>
                              </td>
                              <td className="border border-gray-300 px-4 py-3 text-sm text-gray-600">
                                {user.email}
                              </td>
                              <td className="border border-gray-300 px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {user.roles.map((role) => (
                                    <span key={role._id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                      {role.name}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
                
                {/* Simple Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{users.filter(u => u.roles && u.roles.length > 0).length}</strong> users have been assigned roles through the system
                  </p>
                </div>
              </>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  No role assignments found. Assign roles to users above to see them here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Notification Popup */}
      {notification.show && (
        <div className="fixed top-6 right-6 z-50 max-w-sm animate-in slide-in-from-right-full duration-300">
          <div className={`relative overflow-hidden rounded-xl shadow-2xl backdrop-blur-sm border ${
            notification.type === 'success' 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-300' :
            notification.type === 'error' 
              ? 'bg-gradient-to-r from-red-500 to-rose-600 border-red-300' :
              'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-300'
          }`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            
            {/* Content */}
            <div className="relative p-4">
              <div className="flex items-start space-x-3">
                {/* Icon with animated background */}
                <div className={`flex-shrink-0 p-2 rounded-full ${
                  notification.type === 'success' ? 'bg-white/20' :
                  notification.type === 'error' ? 'bg-white/20' :
                  'bg-white/20'
                }`}>
                  {notification.type === 'success' && <CheckCircle className="h-6 w-6 text-white animate-pulse" />}
                  {notification.type === 'error' && <XCircle className="h-6 w-6 text-white animate-pulse" />}
                  {notification.type === 'warning' && <AlertCircle className="h-6 w-6 text-white animate-pulse" />}
                </div>
                
                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white mb-1">
                    {notification.title}
                  </p>
                  <p className="text-sm text-white/90 leading-relaxed">
                    {notification.message}
                  </p>
                </div>
                
                {/* Close Button */}
                <button
                  className="flex-shrink-0 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                  onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                >
                  <XCircle className="h-5 w-5 text-white" />
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white/60 rounded-full animate-pulse"
                  style={{
                    animation: 'progress 5s linear forwards'
                  }}
                ></div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirm Delete</h3>
                  <p className="text-sm text-white/90">This action cannot be undone</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete the role <span className="font-semibold text-red-600">"{deleteConfirmation.roleName}"</span>?
              </p>
              <p className="text-sm text-gray-500">
                This will remove the role from all users but will NOT delete the users themselves.
              </p>
            </div>
            
            {/* Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={cancelDeleteRole}
                className="hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteRole}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for progress animation */}
      <style jsx>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-in {
          animation: slideInFromRight 0.3s ease-out forwards;
        }
      `}</style>

    </div>
  )
}
