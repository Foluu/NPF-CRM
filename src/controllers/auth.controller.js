// src/controllers/auth.controller.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * @route   POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { username, password, role, name, department } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'officer',
        name: name || username,
        department: department || 'General',
        status: 'active'
      },
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        department: true,
        status: true,
        createdAt: true
      }
    });

    const token = generateToken(user.id);

    // Log activity
    await prisma.activitylog.create({
      data: {
        message: `New user ${user.username} registered`,
        action: 'register',
        userId: user.id
      }
    }).catch(err => console.error('Failed to log activity:', err));

    res.status(201).json({
      success: true,
      data: { user, token },
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Register error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 Login attempt for:', username);

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by username (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { username: username.trim() }
    });

    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    console.log('✓ User found:', user.username);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('Invalid password for:', username);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      console.log('Inactive user:', username);
      return res.status(401).json({
        success: false,
        error: 'User account is inactive',
        code: 'INACTIVE_USER'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Log activity - LOGIN ACTIVITY LOGGING
    await prisma.activitylog.create({
      data: {
        message: `${user.name || user.username} logged in`,
        action: 'login',
        userId: user.id
      }
    }).catch(err => console.error('Failed to log activity:', err));

    console.log('Login successful for:', user.username);

    res.json({
      success: true,
      data: {
        token,
        role: user.role,
        username: user.username,
        name: user.name,
        department: user.department,
        id: user.id
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
  try {
    res.json({ 
      success: true, 
      data: req.user 
    });
  } catch (error) {
    console.error('Get current user error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // Log activity
    await prisma.activitylog.create({
      data: {
        message: `${req.user.name || req.user.username} logged out`,
        action: 'logout',
        userId: req.user.id
      }
    }).catch(err => console.error('Failed to log activity:', err));

    res.json({ 
      success: true, 
      message: 'Logout successful' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password and new password are required', 
        code: 'MISSING_FIELDS' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'New password must be at least 6 characters', 
        code: 'WEAK_PASSWORD' 
      });
    }

    const user = await prisma.user.findUnique({ 
      where: { id: userId } 
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found', 
        code: 'USER_NOT_FOUND' 
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Current password is incorrect', 
        code: 'INVALID_PASSWORD' 
      });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({ 
      where: { id: userId }, 
      data: { password: hashedNewPassword } 
    });

    // Log activity
    await prisma.activitylog.create({
      data: {
        message: `${user.name || user.username} changed their password`,
        action: 'change_password',
        userId: user.id
      }
    }).catch(err => console.error('Failed to log activity:', err));

    console.log('Password changed for user:', user.username);

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Change password error:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
  changePassword
};