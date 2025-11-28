// src/controllers/user.controller.js

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate random password
 */
const generateRandomPassword = (length = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Private (Admin)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;

    // Build filter
    const where = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        name: true,
        department: true,
        status: true,
        lastLogin: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: users,
      total: users.length
    });

  } catch (error) {
    console.error('Get users error:', error);
    next(error);
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        name: true,
        department: true,
        status: true,
        lastLogin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/users
 * @desc    Create new user (Admin creates user with auto-generated password)
 * @access  Private (Admin)
 */
const createUser = async (req, res, next) => {
  try {
    const { username, email, role, name, department } = req.body;

    // Validation
    if (!username || !email) {
      return res.status(400).json({
        success: false,
        error: 'Username and email are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists',
        code: 'DUPLICATE_USERNAME'
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findFirst({
      where: { email }
    });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists',
        code: 'DUPLICATE_EMAIL'
      });
    }

    // Auto-generate password
    const generatedPassword = generateRandomPassword(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword, // Using 'password' field (not passwordHash)
        role: role || 'officer',
        name: name || username,
        department: department || 'General',
        status: 'active'
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        name: true,
        department: true,
        status: true,
        createdAt: true
      }
    });

    console.log('User created:', user.username);

    // Return user with the generated password (only shown once!)
    res.status(201).json({
      success: true,
      data: {
        ...user,
        generatedPassword  // This is shown ONCE to the admin
      },
      message: 'User created successfully. Please save the generated password - it will only be shown once!'
    });

  } catch (error) {
    console.error('Create user error:', error);
    next(error);
  }
};

/**
 * @route   PATCH /api/users/:id
 * @desc    Update user
 * @access  Private (Admin or Self)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { email, role, name, department, status, password } = req.body;

    // Check permissions
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this user',
        code: 'FORBIDDEN'
      });
    }

    // Build update data
    const data = {};
    if (email) data.email = email;
    if (name) data.name = name;
    if (department) data.department = department;
    
    // Only admin can change role and status
    if (req.user.role === 'admin') {
      if (role) data.role = role;
      if (status) data.status = status;
    }
    
    // Hash new password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters',
          code: 'WEAK_PASSWORD'
        });
      }
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        name: true,
        department: true,
        status: true,
        updatedAt: true
      }
    });

    console.log('User updated:', user.username);

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    next(error);
  }
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Prevent self-deletion
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        code: 'SELF_DELETE'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    await prisma.user.delete({
      where: { id: userId }
    });

    console.log('User deleted:', user?.username);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};