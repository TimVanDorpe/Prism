/**
 * Auth Controller
 * Handles user registration and login.
 *
 * Flow:
 *   Register: receive email + password → hash password → save user → return JWT
 *   Login:    receive email + password → find user → compare hash → return JWT
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// How many times bcrypt "scrambles" the password before storing.
// 12 is a good balance between security and speed (~300ms per hash).
const SALT_ROUNDS = 12;

function generateToken(userId) {
  return jwt.sign(
    { userId },                          // payload stored inside the token
    process.env.JWT_SECRET,              // secret key used to sign it
    { expiresIn: '7d' }                  // token expires after 7 days
  );
}

/**
 * POST /auth/register
 * Body: { email, password }
 */
async function register(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Hash the password — bcryptjs automatically generates a salt and mixes it in.
    // The result looks like: $2a$12$... and is safe to store in the database.
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword },
      select: { id: true, email: true, createdAt: true } // never return the password hash
    });

    const token = generateToken(user.id);

    res.status(201).json({ user, token });
  } catch (error) {
    // Prisma error P2002 = unique constraint failed (duplicate email)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // We give the same error whether the email doesn't exist or the password is wrong.
    // This prevents attackers from discovering which emails are registered.
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // bcrypt.compare hashes the incoming password the same way and checks if they match.
    // We never "decrypt" — bcrypt is one-way.
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.json({
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = { register, login };
