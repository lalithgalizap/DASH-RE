require('dotenv').config();
const mongoose = require('mongoose');
const { Permission, Role, RolePermission } = require('../models');

async function addProductsPermission() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pmo_db');
    console.log('✓ Connected to MongoDB');

    // Check if manage_products permission already exists
    let permission = await Permission.findOne({ permission_name: 'manage_products' });
    
    if (!permission) {
      // Create the manage_products permission
      permission = await Permission.create({
        permission_name: 'manage_products',
        description: 'Can create and delete global products'
      });
      console.log('✓ Created manage_products permission');
    } else {
      console.log('✓ manage_products permission already exists');
    }

    // Find all roles that have manage_clients permission
    const manageClientsPermission = await Permission.findOne({ permission_name: 'manage_clients' });
    
    if (manageClientsPermission) {
      const rolePermissions = await RolePermission.find({ 
        permission_id: manageClientsPermission._id 
      }).populate('role_id');

      console.log(`\n✓ Found ${rolePermissions.length} role(s) with manage_clients permission`);

      // Add manage_products permission to those roles
      for (const rp of rolePermissions) {
        const role = rp.role_id;
        
        // Check if this role already has manage_products
        const existingRolePermission = await RolePermission.findOne({
          role_id: role._id,
          permission_id: permission._id
        });

        if (!existingRolePermission) {
          await RolePermission.create({
            role_id: role._id,
            permission_id: permission._id
          });
          console.log(`  ✓ Added manage_products permission to role: ${role.role_name}`);
        } else {
          console.log(`  ✓ Role ${role.role_name} already has manage_products permission`);
        }
      }
    } else {
      console.log('\n⚠ manage_clients permission not found.');
      console.log('  You may need to manually assign manage_products to roles.');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Restart your server');
    console.log('  2. Refresh your browser');
    console.log('  3. Try creating a product again');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  }
}

// Run the migration
addProductsPermission();
