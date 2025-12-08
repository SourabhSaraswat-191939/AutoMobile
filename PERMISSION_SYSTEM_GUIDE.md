# Permission System Guide - Shubh Hyundai Dashboard

## Overview
This guide explains how the permission system works, which files are involved, and how to use permission-based routing.

## How Permissions Work

### 1. Permission Flow
```
User Login → Get Permissions from Database → Auto-detect Dashboard → Route User
```

### 2. Smart Dashboard Detection
- **GM Dashboard**: Users with management permissions (`manage_users`, `can_assign_target_to_sm`)
- **SM Dashboard**: Users with service permissions (`ro_billing_dashboard`, `operations_dashboard`)  
- **SA Dashboard**: Users with basic permissions or any other permissions

### 3. Permission Sources
1. **Database Roles** (Primary) - Custom roles created by owner
2. **Hardcoded Roles** (Fallback) - GM, SM, SA system roles
3. **Basic Permissions** (Ultimate fallback) - Minimal access

## Frontend Files & Folders

### Core Permission Files
```
hooks/
├── usePermissions.ts          # Main permission hook - handles all permission logic
```

### Permission Components
```
components/
├── PermissionGate.tsx         # Protects UI components based on permissions
├── sidebar.tsx                # Navigation with permission checks
└── PermissionDebugger.tsx     # Debug tool (for development)
```

### Dashboard Pages (Protected)
```
app/dashboard/
├── page.tsx                   # Main routing - redirects based on permissions
├── gm/page.tsx               # GM Dashboard - requires can_access_gm_dashboard
├── sm/page.tsx               # SM Dashboard - requires can_access_sm_dashboard
├── sa/page.tsx               # SA Dashboard - requires can_access_sa_dashboard
└── unauthorized/page.tsx      # Access denied page
```

### Auth Context
```
lib/
├── auth-context.tsx          # User authentication and role management
└── config.ts                 # API configuration
```

## Backend API Endpoints

### Permission APIs
```
GET /api/rbac/users/email/{email}/permissions    # Get user permissions directly
GET /api/rbac/user-roles-summary                 # Get all users with roles
GET /api/rbac/users/email/{email}/roles          # Get user's assigned roles
```

### Role Management APIs
```
GET /api/rbac/roles                              # Get all available roles
POST /api/rbac/roles                             # Create new role
PUT /api/rbac/roles/{roleId}                     # Update role
DELETE /api/rbac/roles/{roleId}                  # Delete role
GET /api/rbac/roles/{roleId}/permissions         # Get role permissions
```

### User Management APIs
```
GET /api/rbac/users                              # Get all users
POST /api/rbac/users/{userId}/assign-role        # Assign role to user
DELETE /api/rbac/users/{userId}/roles/{roleId}   # Remove role from user
```

## How to Use Permission-Based Routing

### 1. Protect Components with PermissionGate
```jsx
import { PermissionGate } from "@/components/PermissionGate"

// Single permission
<PermissionGate permission="can_access_gm_dashboard">
  <GMDashboard />
</PermissionGate>

// Multiple permissions (any)
<PermissionGate permissions={["ro_billing_dashboard", "operations_dashboard"]}>
  <ReportsSection />
</PermissionGate>

// Multiple permissions (all required)
<PermissionGate permissions={["admin", "super_admin"]} requireAll>
  <AdminPanel />
</PermissionGate>

// With fallback
<PermissionGate permission="can_upload_ro_sheet" fallback={<AccessDenied />}>
  <UploadSection />
</PermissionGate>
```

### 2. Check Permissions in Components
```jsx
import { usePermissions } from "@/hooks/usePermissions"

function MyComponent() {
  const { hasPermission, hasAnyPermission, permissions } = usePermissions()

  // Single permission check
  if (hasPermission('can_access_gm_dashboard')) {
    return <GMContent />
  }

  // Multiple permission check
  if (hasAnyPermission(['ro_billing_dashboard', 'operations_dashboard'])) {
    return <ReportsContent />
  }

  // Get all permissions
  console.log('User permissions:', permissions)
  
  return <BasicContent />
}
```

### 3. Conditional Navigation
```jsx
// In sidebar.tsx
const { hasPermission } = usePermissions()

const navItems = [
  {
    label: "GM Dashboard",
    href: "/dashboard/gm", 
    show: hasPermission('can_access_gm_dashboard')
  },
  {
    label: "Reports",
    href: "/reports",
    show: hasPermission('ro_billing_dashboard')
  }
]
```

### 4. Page-Level Protection
```jsx
// In dashboard pages
import { usePermissions } from "@/hooks/usePermissions"

export default function GMDashboard() {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission('can_access_gm_dashboard')) {
    return <AccessDenied />
  }
  
  return <DashboardContent />
}
```

## Available Permissions

### Dashboard Access
- `can_access_gm_dashboard` - GM Dashboard access
- `can_access_sm_dashboard` - SM Dashboard access  
- `can_access_sa_dashboard` - SA Dashboard access

### Feature Permissions
- `can_upload_ro_sheet` - RO Sheet upload
- `can_assign_target_to_sm` - Target assignment
- `manage_users` - User management
- `can_access_bodyshop` - Bodyshop access

### Module Permissions
- `ro_billing_dashboard` - RO Billing module
- `operations_dashboard` - Operations module
- `warranty_dashboard` - Warranty module
- `service_booking_dashboard` - Service Booking module
- `target_report` - Target reports
- `warranty_report` - Warranty reports
- `ro_billing_report` - RO Billing reports

## File Structure Summary

```
Frontend (Next.js):
├── hooks/usePermissions.ts           # Permission logic
├── components/PermissionGate.tsx     # UI protection
├── app/dashboard/                    # Protected pages
├── lib/auth-context.tsx             # Authentication
└── components/sidebar.tsx           # Navigation

Backend APIs:
├── /api/rbac/users/                 # User management
├── /api/rbac/roles/                 # Role management
└── /api/rbac/permissions/           # Permission management
```

## Quick Start

### 1. Create Custom Role (Owner)
1. Go to GM Dashboard → User Access
2. Create new role with permissions
3. Assign role to users

### 2. Check Permissions (Developer)
```jsx
const { hasPermission } = usePermissions()
if (hasPermission('your_permission')) {
  // Show content
}
```

### 3. Protect Routes (Developer)
```jsx
<PermissionGate permission="your_permission">
  <YourComponent />
</PermissionGate>
```

## Key Features
- ✅ **Auto-dashboard detection** - System automatically assigns appropriate dashboard
- ✅ **Unlimited custom roles** - Owner can create any role with any permissions
- ✅ **Smart caching** - 5-minute cache for better performance
- ✅ **Fallback system** - Always provides some level of access
- ✅ **Single API call** - Optimized for performance

This permission system provides secure, flexible access control for the entire application!
