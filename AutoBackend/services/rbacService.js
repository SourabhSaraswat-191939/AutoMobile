import User from "../models/User.js";
import Role from "../models/Role.js";
import Permission from "../models/Permission.js";
import UserRoleMapping from "../models/UserRoleMapping.js";
import RolePermissionMapping from "../models/RolePermissionMapping.js";

/**
 * Get all permissions for a user by traversing the RBAC chain
 * User → User_Role_Mapping → Roles → Role_Permission_Mapping → Permissions
 */
export const getUserPermissions = async (userId) => {
  try {
    // Step 1: Get all roles assigned to the user
    const userRoles = await UserRoleMapping.find({ user_id: userId })
      .populate("role_id")
      .lean();

    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.role_id._id);

    // Step 2: Get all permissions for these roles
    const rolePermissions = await RolePermissionMapping.find({
      role_id: { $in: roleIds }
    })
      .populate("permission_id")
      .lean();

    // Step 3: Extract unique permissions with meta data
    const permissionsMap = new Map();

    rolePermissions.forEach((rp) => {
      const permissionKey = rp.permission_id.permission_key;
      
      if (!permissionsMap.has(permissionKey)) {
        permissionsMap.set(permissionKey, {
          id: rp.permission_id._id,
          permission_key: rp.permission_id.permission_key,
          name: rp.permission_id.name,
          meta: [rp.meta]
        });
      } else {
        // If permission exists from another role, merge meta
        const existing = permissionsMap.get(permissionKey);
        existing.meta.push(rp.meta);
      }
    });

    return Array.from(permissionsMap.values());
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    throw error;
  }
};

/**
 * Get all roles for a user
 */
export const getUserRoles = async (userId) => {
  try {
    const userRoles = await UserRoleMapping.find({ user_id: userId })
      .populate("role_id")
      .lean();

    return userRoles.map((ur) => ur.role_id);
  } catch (error) {
    console.error("Error fetching user roles:", error);
    throw error;
  }
};

/**
 * Assign a role to a user
 */
export const assignRoleToUser = async (userId, roleId, assignedBy) => {
  try {
    // Check if mapping already exists
    const existing = await UserRoleMapping.findOne({
      user_id: userId,
      role_id: roleId
    });

    if (existing) {
      throw new Error("Role already assigned to user");
    }

    const mapping = new UserRoleMapping({
      user_id: userId,
      role_id: roleId,
      created_by: assignedBy,
      updated_by: assignedBy
    });

    await mapping.save();
    return mapping;
  } catch (error) {
    console.error("Error assigning role to user:", error);
    throw error;
  }
};

/**
 * Remove a role from a user
 */
export const removeRoleFromUser = async (userId, roleId) => {
  try {
    const result = await UserRoleMapping.findOneAndDelete({
      user_id: userId,
      role_id: roleId
    });

    if (!result) {
      throw new Error("Role assignment not found");
    }

    return result;
  } catch (error) {
    console.error("Error removing role from user:", error);
    throw error;
  }
};

/**
 * Assign a permission to a role
 */
export const assignPermissionToRole = async (roleId, permissionId, meta = {}, assignedBy) => {
  try {
    // Check if mapping already exists
    const existing = await RolePermissionMapping.findOne({
      role_id: roleId,
      permission_id: permissionId
    });

    if (existing) {
      // Update meta if exists
      existing.meta = meta;
      existing.updated_by = assignedBy;
      await existing.save();
      return existing;
    }

    const mapping = new RolePermissionMapping({
      role_id: roleId,
      permission_id: permissionId,
      meta: meta,
      created_by: assignedBy,
      updated_by: assignedBy
    });

    await mapping.save();
    return mapping;
  } catch (error) {
    console.error("Error assigning permission to role:", error);
    throw error;
  }
};

/**
 * Remove a permission from a role
 */
export const removePermissionFromRole = async (roleId, permissionId) => {
  try {
    const result = await RolePermissionMapping.findOneAndDelete({
      role_id: roleId,
      permission_id: permissionId
    });

    if (!result) {
      throw new Error("Permission assignment not found");
    }

    return result;
  } catch (error) {
    console.error("Error removing permission from role:", error);
    throw error;
  }
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = async (roleId) => {
  try {
    const rolePermissions = await RolePermissionMapping.find({ role_id: roleId })
      .populate("permission_id")
      .lean();

    return rolePermissions.map((rp) => ({
      ...rp.permission_id,
      meta: rp.meta
    }));
  } catch (error) {
    console.error("Error fetching role permissions:", error);
    throw error;
  }
};

/**
 * Check if user has a specific permission
 */
export const userHasPermission = async (userId, permissionKey) => {
  try {
    const permissions = await getUserPermissions(userId);
    return permissions.some((p) => p.permission_key === permissionKey);
  } catch (error) {
    console.error("Error checking user permission:", error);
    throw error;
  }
};
