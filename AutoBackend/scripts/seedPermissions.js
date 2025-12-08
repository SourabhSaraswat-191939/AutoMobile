import mongoose from "mongoose";
import dotenv from "dotenv";
import Permission from "../models/Permission.js";

dotenv.config();

const defaultPermissions = [
  // General Permissions
  { permission_key: "dashboard", name: "Dashboard" },
  { permission_key: "overview", name: "Overview" },
  
  // SM Module Dashboard Permissions
  { permission_key: "ro_billing_dashboard", name: "RO Billing Dashboard" },
  { permission_key: "operations_dashboard", name: "Operations Dashboard" },
  { permission_key: "warranty_dashboard", name: "Warranty Dashboard" },
  { permission_key: "service_booking_dashboard", name: "Service Booking Dashboard" },
  
  // Upload Module Permissions
  { permission_key: "ro_billing_upload", name: "RO Billing Upload" },
  { permission_key: "operations_upload", name: "Operations Upload" },
  { permission_key: "warranty_upload", name: "Warranty Upload" },
  { permission_key: "service_booking_upload", name: "Service Booking Upload" },
  { permission_key: "average_upload", name: "Average Upload" },
  
  // Report Module Permissions
  { permission_key: "ro_billing_report", name: "RO Billing Report" },
  { permission_key: "operations_report", name: "Operations Report" },
  { permission_key: "warranty_report", name: "Warranty Report" },
  { permission_key: "service_booking_report", name: "Service Booking Report" },
  { permission_key: "target_report", name: "Target Report" },
  
  // Legacy Permissions (kept for backward compatibility)
  { permission_key: "create", name: "Create" },
  { permission_key: "read", name: "Read" },
  { permission_key: "update", name: "Update" },
  { permission_key: "delete", name: "Delete" },
  { permission_key: "manage_users", name: "Manage Users" },
  { permission_key: "manage_roles", name: "Manage Roles" },
  { permission_key: "export_data", name: "Export Data" },
  { permission_key: "import_data", name: "Import Data" }
];

const seedPermissions = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Clear existing permissions (optional)
    // await Permission.deleteMany({});
    // console.log("🗑️  Cleared existing permissions");

    // Insert default permissions
    for (const perm of defaultPermissions) {
      const existing = await Permission.findOne({ permission_key: perm.permission_key });
      
      if (!existing) {
        await Permission.create(perm);
        console.log(`✅ Created permission: ${perm.name}`);
      } else {
        console.log(`⏭️  Permission already exists: ${perm.name}`);
      }
    }

    console.log("✅ Permissions seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding permissions:", error);
    process.exit(1);
  }
};

seedPermissions();
