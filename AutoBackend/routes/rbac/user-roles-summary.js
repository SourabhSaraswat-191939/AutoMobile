const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Role = require('../../models/Role');

// GET /api/rbac/user-roles-summary - Get all users with their assigned roles
router.get('/', async (req, res) => {
  try {
    console.log('Fetching user-roles summary...');
    
    // Get all users with their roles populated
    const users = await User.find({})
      .populate({
        path: 'roles',
        select: 'name desc _id'
      })
      .select('name email phone username org_id roles')
      .lean();

    console.log(`Found ${users.length} users in database`);
    
    // Format the response to show users with their roles
    const userRolesSummary = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      username: user.username || '',
      org_id: user.org_id || '',
      roles: user.roles || []
    }));

    // Filter to only include users who have roles assigned
    const usersWithRoles = userRolesSummary.filter(user => user.roles.length > 0);
    
    console.log(`${usersWithRoles.length} users have roles assigned`);
    
    res.json({
      success: true,
      data: {
        allUsers: userRolesSummary,
        usersWithRoles: usersWithRoles,
        summary: {
          totalUsers: userRolesSummary.length,
          usersWithRoles: usersWithRoles.length,
          usersWithoutRoles: userRolesSummary.length - usersWithRoles.length
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
});

module.exports = router;
