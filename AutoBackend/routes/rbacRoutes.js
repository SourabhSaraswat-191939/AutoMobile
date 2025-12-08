import express from "express";
import * as rbacController from "../controllers/rbacController.js";

const router = express.Router();

// ==================== USER ROUTES ====================
router.get("/users", rbacController.getAllUsers);
router.post("/users", rbacController.createUser);
router.get("/users/:userId", rbacController.getUserById);
router.get("/organizations/:orgId/users", rbacController.getUsersByOrganization);

// ==================== ROLE ROUTES ====================
router.get("/roles", rbacController.getAllRoles);
router.post("/roles", rbacController.createRole);
router.delete("/roles/:roleId", rbacController.deleteRole);

// ==================== PERMISSION ROUTES ====================
router.get("/permissions", rbacController.getAllPermissions);
router.post("/permissions", rbacController.createPermission);
router.delete("/permissions/:permissionId", rbacController.deletePermission);
router.post("/seed-permissions", rbacController.seedPermissions);

// ==================== USER-ROLE MAPPING ====================
router.post("/user-roles", rbacController.assignRoleToUser);
router.delete("/user-roles/:userId/:roleId", rbacController.removeRoleFromUser);

// ==================== ROLE-PERMISSION MAPPING ====================
router.post("/role-permissions", rbacController.assignPermissionToRole);
router.delete("/role-permissions/:roleId/:permissionId", rbacController.removePermissionFromRole);

// ==================== UTILITY ROUTES ====================
router.get("/users/:userId/permissions", rbacController.getUserPermissions);
router.get("/users/:userId/permissions/:permissionKey", rbacController.checkUserPermission);
router.get("/users/email/:email/permissions", rbacController.getUserPermissionsByEmail);
router.get("/users/email/:email/roles", rbacController.getUserRolesByEmail);
router.get("/user-roles-summary", rbacController.getUserRolesSummary);

export default router;
