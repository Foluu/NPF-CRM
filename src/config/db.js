// src/config/db.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

/**
 * Connect to database
 */
const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from database
 */
const disconnectDB = async () => {
  await prisma.$disconnect();
  console.log('Database disconnected');
};

module.exports = { prisma, connectDB, disconnectDB };