/**
 * User Controller
 * Handles all user-related CRUD operations
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * CREATE User
 * POST /users
 */
async function createUser(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const user = await prisma.user.create({
      data: { email }
    });
    
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * READ all Users
 * GET /users
 */
async function getAllUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * READ User by ID with articles
 * GET /users/:id
 */
async function getUserById(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { 
        articles: { 
          include: { result: true },
          orderBy: { id: 'desc' }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * UPDATE User
 * PUT /users/:id
 */
async function updateUser(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { email },
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });
    
    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(400).json({ error: error.message });
  }
}

/**
 * DELETE User
 * DELETE /users/:id
 * Note: This will CASCADE delete all articles and results!
 */
async function deleteUser(req, res) {
  try {
    const user = await prisma.user.delete({
      where: { id: parseInt(req.params.id) }
    });
    
    res.json({ 
      message: 'User deleted successfully (including all articles and results)', 
      user 
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(400).json({ error: error.message });
  }
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
