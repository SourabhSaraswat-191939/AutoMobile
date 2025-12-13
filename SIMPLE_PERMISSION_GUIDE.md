# Simple Permission Guide 🔐

## What are Permissions?
Permissions control **who can see what** in your dashboard. Think of it like keys to different rooms in a building.

## How It Works (Simple Steps)

### 1. User Logs In
```
User enters email/password → System checks their permissions → Shows correct dashboard
```

### 2. Three Types of Dashboards
- **GM Dashboard** 👨‍💼 - For managers (can see everything)
- **SM Dashboard** 🔧 - For service managers (can see service data)  
- **SA Dashboard** 📋 - For service advisors (basic access)

### 3. System Automatically Decides
The system looks at your permissions and automatically sends you to the right dashboard:

```
If you have GM permissions → GM Dashboard
If you have SM permissions → SM Dashboard
Otherwise → SA Dashboard
```

## Permission Examples

### GM (General Manager) Permissions
- `can_access_gm_dashboard` - Can see GM dashboard
- `manage_users` - Can add/remove users
- `can_assign_target_to_sm` - Can set targets for service managers

### SM (Service Manager) Permissions  
- `can_access_sm_dashboard` - Can see SM dashboard
- `ro_billing_dashboard` - Can see RO billing data
- `operations_dashboard` - Can see operations data
- `can_upload_ro_sheet` - Can upload Excel files

### SA (Service Advisor) Permissions
- `can_access_sa_dashboard` - Can see SA dashboard
- Basic viewing permissions only

## How to Use in Code (For Developers)

### 1. Hide/Show Components
```jsx
import { PermissionGate } from "@/components/PermissionGate"

// Only show upload button if user can upload
<PermissionGate permission="can_upload_ro_sheet">
  <UploadButton />
</PermissionGate>
```

### 2. Check Permissions in Code
```jsx
import { usePermissions } from "@/hooks/usePermissions"

function MyComponent() {
  const { hasPermission } = usePermissions()
  
  if (hasPermission('can_access_gm_dashboard')) {
    return <GMContent />
  }
  
  return <BasicContent />
}
```

### 3. Multiple Permissions
```jsx
// Show if user has ANY of these permissions
<PermissionGate permissions={["ro_billing_dashboard", "operations_dashboard"]}>
  <ReportsSection />
</PermissionGate>

// Show only if user has ALL permissions
<PermissionGate permissions={["admin", "super_admin"]} requireAll>
  <AdminPanel />
</PermissionGate>
```

## Key Files You Need to Know

### Frontend Files
```
hooks/usePermissions.ts          ← Main permission logic
components/PermissionGate.tsx    ← Protects UI components  
app/dashboard/page.tsx           ← Routes users to correct dashboard
```

### Backend APIs
```
/api/rbac/users/email/{email}/permissions  ← Get user permissions
/api/rbac/roles                            ← Manage roles
```

## Real Examples

### Example 1: Upload Button
```jsx
// Only show upload button to users who can upload
<PermissionGate permission="can_upload_ro_sheet">
  <button>Upload Excel File</button>
</PermissionGate>
```

### Example 2: Navigation Menu
```jsx
const { hasPermission } = usePermissions()

// Only show GM menu if user is GM
{hasPermission('can_access_gm_dashboard') && (
  <Link href="/dashboard/gm">GM Dashboard</Link>
)}
```

### Example 3: Page Protection
```jsx
// Protect entire page
export default function GMDashboard() {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission('can_access_gm_dashboard')) {
    return <div>Access Denied</div>
  }
  
  return <DashboardContent />
}
```

## How to Add New Permission

### Step 1: Add to Database
Go to GM Dashboard → User Access → Create new permission

### Step 2: Use in Code
```jsx
<PermissionGate permission="your_new_permission">
  <YourComponent />
</PermissionGate>
```

## Common Permission Patterns

### Pattern 1: Dashboard Access
```jsx
// Check if user can access specific dashboard
if (hasPermission('can_access_gm_dashboard')) {
  // Show GM features
}
```

### Pattern 2: Feature Access
```jsx
// Check if user can use specific feature
<PermissionGate permission="can_upload_ro_sheet">
  <UploadSection />
</PermissionGate>
```

### Pattern 3: Data Access
```jsx
// Check if user can see specific data
<PermissionGate permission="ro_billing_dashboard">
  <ROBillingTable />
</PermissionGate>
```

## Quick Reference

| Permission | What It Does |
|------------|--------------|
| `can_access_gm_dashboard` | Access GM dashboard |
| `can_access_sm_dashboard` | Access SM dashboard |
| `can_access_sa_dashboard` | Access SA dashboard |
| `can_upload_ro_sheet` | Upload Excel files |
| `ro_billing_dashboard` | View RO billing data |
| `operations_dashboard` | View operations data |
| `manage_users` | Add/remove users |

## Summary
1. **Permissions = Keys** to different parts of the app
2. **System automatically** routes users to correct dashboard
3. **Use PermissionGate** to hide/show components
4. **Use usePermissions** to check permissions in code
5. **Add new permissions** through GM Dashboard

That's it! The permission system keeps your app secure and shows users only what they're allowed to see. 🔒✨
