/**
 * User Utilities
 * Helper functions for user management
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get or create default user for the system
 * Used when no userId is provided in requests
 */
async function getOrCreateDefaultUser() {
  const DEFAULT_EMAIL = 'system@prism.local';
  
  try {
    // Try to find existing default user
    let user = await prisma.user.findUnique({
      where: { email: DEFAULT_EMAIL }
    });
    
    // Create if doesn't exist
    if (!user) {
      console.log('[USER] Creating default system user...');
      user = await prisma.user.create({
        data: { email: DEFAULT_EMAIL }
      });
      console.log(`[USER] ✅ Default user created: ID ${user.id}`);
    }
    
    return user;
  } catch (error) {
    console.error('[USER] ❌ Failed to get/create default user:', error.message);
    throw error;
  }
}

/**
 * Get user by ID or return default user
 */
async function getUserOrDefault(userId) {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });
    
    if (user) {
      return user;
    }
    
    console.log(`[USER] ⚠️ User ID ${userId} not found, using default`);
  }
  
  return getOrCreateDefaultUser();
}

module.exports = {
  getOrCreateDefaultUser,
  getUserOrDefault
};
