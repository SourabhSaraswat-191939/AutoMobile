import User from "../models/User.js";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import UserRoleMapping from "../models/UserRoleMapping.js";
import RolePermissionMapping from "../models/RolePermissionMapping.js";
import * as rbacService from "../services/rbacService.js";

// ==================== USER OPERATIONS ====================

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v").lean();
    
    // Get roles for each user
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roles = await rbacService.getUserRoles(user._id);
        return {
          ...user,
          roles: roles
        };
      })
    );

    res.status(200).json({
      success: true,
      data: usersWithRoles
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { phone, address, name, username, org_id, email } = req.body;

    const user = new User({
      phone,
      address,
      name,
      username,
      org_id,
      email
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const roles = await rbacService.getUserRoles(userId);
    const permissions = await rbacService.getUserPermissions(userId);

    res.status(200).json({
      success: true,
      data: {
        ...user,
        roles,
        permissions
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message
    });
  }
};

export const getUsersByOrganization = async (req, res) => {
  try {
    const { orgId } = req.params;

    const users = await User.find({ org_id: orgId }).select("-__v").lean();
    
    // Get roles for each user
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roles = await rbacService.getUserRoles(user._id);
        return {
          ...user,
          roles: roles
        };
      })
    );

    res.status(200).json({
      success: true,
      data: usersWithRoles
    });
  } catch (error) {
    console.error("Error fetching users by organization:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
};

// ==================== ROLE OPERATIONS ====================

export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().select("-__v").lean();

    // Get permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await rbacService.getRolePermissions(role._id);
        return {
          ...role,
          permissions
        };
      })
    );

    res.status(200).json({
      success: true,
      data: rolesWithPermissions
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles",
      error: error.message
    });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, desc, permissions } = req.body;

    // Create role
    const role = new Role({
      name,
      desc
    });

    await role.save();

    // Assign permissions if provided
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      const currentUserId = req.user?._id; // Assuming auth middleware sets req.user

      for (const permissionId of permissions) {
        await rbacService.assignPermissionToRole(
          role._id,
          permissionId,
          {},
          currentUserId
        );
      }
    }

    // Fetch role with permissions
    const rolePermissions = await rbacService.getRolePermissions(role._id);

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: {
        ...role.toObject(),
        permissions: rolePermissions
      }
    });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create role",
      error: error.message
    });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    // Delete role
    const role = await Role.findByIdAndDelete(roleId);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found"
      });
    }

    // Delete all user-role mappings
    await UserRoleMapping.deleteMany({ role_id: roleId });

    // Delete all role-permission mappings
    await RolePermissionMapping.deleteMany({ role_id: roleId });

    res.status(200).json({
      success: true,
      message: "Role deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete role",
      error: error.message
    });
  }
};

// ==================== PERMISSION OPERATIONS ====================

export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().select("-__v").lean();

    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permissions",
      error: error.message
    });
  }
};

export const createPermission = async (req, res) => {
  try {
    const { permission_key, name } = req.body;
    
    const permission = new Permission({
      permission_key,
      name
    });
    
    await permission.save();
    
    res.status(201).json({
      success: true,
      message: "Permission created successfully",
      data: permission
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to create permission",
      error: error.message
    });
  }
};

export const deletePermission = async (req, res) => {
  try {
    const { permissionId } = req.params;
    
    const permission = await Permission.findByIdAndDelete(permissionId);
    
    if (!permission) {
      return res.status(404).json({
        success: false,
        message: "Permission not found"
      });
    }
    
    res.json({
      success: true,
      message: "Permission deleted successfully",
      data: permission
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to delete permission",
      error: error.message
    });
  }
};

export const seedPermissions = async (req, res) => {
  try {
    const defaultPermissions = [
      // Main Dashboard Pages
      { permission_key: "dashboard", name: "Dashboard" },
      { permission_key: "overview", name: "Overview" },
      
      // Dashboard Views (for permission configuration, not sidebar display)
      { permission_key: "ro_billing_dashboard", name: "RO Billing Dashboard" },
      { permission_key: "operations_dashboard", name: "Operations Dashboard" },
      { permission_key: "warranty_dashboard", name: "Warranty Dashboard" },
      { permission_key: "service_booking_dashboard", name: "Service Booking Dashboard" },
      
      // Upload Permission (Single for all uploads - NO multiple uploads)
      { permission_key: "upload", name: "Upload" },
      
      // Report Permissions
      { permission_key: "ro_billing_report", name: "RO Billing Report" },
      { permission_key: "operations_report", name: "Operations Report" },
      { permission_key: "warranty_report", name: "Warranty Report" },
      { permission_key: "service_booking_report", name: "Service Booking Report" },
      { permission_key: "target_report", name: "Target Report" },
      
      // CRUD Permissions
      { permission_key: "create", name: "Create" },
      { permission_key: "read", name: "Read" },
      { permission_key: "update", name: "Update" },
      { permission_key: "delete", name: "Delete" },
      
      // Management Permissions
      { permission_key: "gm_targets", name: "GM Targets" },
      { permission_key: "manage_users", name: "Manage Users" },
      { permission_key: "manage_roles", name: "Manage Roles" },
      { permission_key: "export_data", name: "Export Data" },
      { permission_key: "import_data", name: "Import Data" }
    ];

    const createdPermissions = [];
    
    for (const permData of defaultPermissions) {
      try {
        // Check if permission already exists
        const existing = await Permission.findOne({ permission_key: permData.permission_key });
        if (!existing) {
          const permission = new Permission(permData);
          await permission.save();
          createdPermissions.push(permission);
        }
      } catch (error) {
        // Skip duplicates
        console.log(`Permission ${permData.permission_key} already exists`);
      }
    }

    res.status(200).json({
      success: true,
      message: `Seeded ${createdPermissions.length} permissions`,
      data: createdPermissions
    });
  } catch (error) {
    console.error("Error seeding permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seed permissions",
      error: error.message
    });
  }
};

// ==================== USER-ROLE MAPPING ====================

export const assignRoleToUser = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    const currentUserId = req.user?._id;

    const mapping = await rbacService.assignRoleToUser(userId, roleId, currentUserId);

    res.status(201).json({
      success: true,
      message: "Role assigned to user successfully",
      data: mapping
    });
  } catch (error) {
    console.error("Error assigning role to user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign role to user",
      error: error.message
    });
  }
};

export const removeRoleFromUser = async (req, res) => {
  try {
    const { userId, roleId } = req.params;

    await rbacService.removeRoleFromUser(userId, roleId);

    res.status(200).json({
      success: true,
      message: "Role removed from user successfully"
    });
  } catch (error) {
    console.error("Error removing role from user:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove role from user",
      error: error.message
    });
  }
};

// ==================== ROLE-PERMISSION MAPPING ====================

export const assignPermissionToRole = async (req, res) => {
  try {
    const { roleId, permissionId, meta } = req.body;
    const currentUserId = req.user?._id;

    const mapping = await rbacService.assignPermissionToRole(
      roleId,
      permissionId,
      meta || {},
      currentUserId
    );

    res.status(201).json({
      success: true,
      message: "Permission assigned to role successfully",
      data: mapping
    });
  } catch (error) {
    console.error("Error assigning permission to role:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to assign permission to role",
      error: error.message
    });
  }
};

export const removePermissionFromRole = async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;

    await rbacService.removePermissionFromRole(roleId, permissionId);

    res.status(200).json({
      success: true,
      message: "Permission removed from role successfully"
    });
  } catch (error) {
    console.error("Error removing permission from role:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to remove permission from role",
      error: error.message
    });
  }
};

// ==================== UTILITY ====================

export const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const permissions = await rbacService.getUserPermissions(userId);

    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user permissions",
      error: error.message
    });
  }
};

export const checkUserPermission = async (req, res) => {
  try {
    const { userId, permissionKey } = req.params;

    const hasPermission = await rbacService.userHasPermission(userId, permissionKey);

    res.status(200).json({
      success: true,
      data: {
        hasPermission
      }
    });
  } catch (error) {
    console.error("Error checking user permission:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check user permission",
      error: error.message
    });
  }
};

// ==================== USER PERMISSIONS BY EMAIL ====================

export const getUserPermissionsByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`Fetching permissions for user email: ${email}`);

    // Find user by email
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get user permissions using the RBAC service
    const permissions = await rbacService.getUserPermissions(user._id);
    
    console.log(`Found ${permissions.length} permissions for user ${email}`);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email
        },
        permissions: permissions
      }
    });

  } catch (error) {
    console.error('Error fetching user permissions by email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user permissions',
      error: error.message
    });
  }
};

// ==================== USER ROLES BY EMAIL ====================

export const getUserRolesByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`Fetching roles for user email: ${email}`);

    // Find user by email
    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Get user roles using the RBAC service
    const roles = await rbacService.getUserRoles(user._id);
    
    console.log(`Found ${roles.length} roles for user ${email}`);
    
    res.status(200).json({
      success: true,
      data: roles
    });

  } catch (error) {
    console.error('Error fetching user roles by email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user roles',
      error: error.message
    });
  }
};

// ==================== USER-ROLES SUMMARY ====================

export const getUserRolesSummary = async (req, res) => {
  try {
    console.log('Fetching user-roles summary...');
    
    // Get all users with their roles
    const users = await User.find().select("-__v").lean();
    
    // Get roles for each user
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roles = await rbacService.getUserRoles(user._id);
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          username: user.username || '',
          org_id: user.org_id || '',
          roles: roles || []
        };
      })
    );

    // Filter to only include users who have roles assigned
    const usersWithAssignedRoles = usersWithRoles.filter(user => user.roles.length > 0);
    
    console.log(`Found ${users.length} total users, ${usersWithAssignedRoles.length} have roles assigned`);
    
    res.status(200).json({
      success: true,
      data: {
        allUsers: usersWithRoles,
        usersWithRoles: usersWithAssignedRoles,
        summary: {
          totalUsers: usersWithRoles.length,
          usersWithRoles: usersWithAssignedRoles.length,
          usersWithoutRoles: usersWithRoles.length - usersWithAssignedRoles.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user-roles summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user-roles summary',
      error: error.message
    });
  }
};
