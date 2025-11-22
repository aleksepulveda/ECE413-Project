/**
 * Setup Test Device
 * Adds a test device to the database for testing purposes
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const Device = require('../server/models/Device');
const User = require('../server/models/User');

// Test device configuration
const TEST_DEVICE = {
  deviceId: '0a10aced202194944a064ed4',
  name: 'Test Heart Monitor',
  description: 'Photon Prototype Device',
};

// Test user configuration (if device needs to be linked to a user)
const TEST_USER = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPassword123!',
};

async function setupTestDevice() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hearttrack';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if test device already exists
    let device = await Device.findOne({ deviceId: TEST_DEVICE.deviceId });
    
    if (device) {
      console.log('✅ Test device already exists:');
      console.log(`   Device ID: ${device.deviceId}`);
      console.log(`   Name: ${device.name}`);
      console.log(`   User ID: ${device.userId || 'Not linked to user'}`);
      console.log(`   Created: ${device.createdAt}\n`);
      return device;
    }

    // Check if we need to create/find a test user
    let user = await User.findOne({ email: TEST_USER.email });
    
    if (!user) {
      console.log('Creating test user...');
      // Hash the password
      const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
      
      user = await User.create({
        email: TEST_USER.email,
        passwordHash: passwordHash,
        name: TEST_USER.username,
      });
      console.log('✅ Test user created:');
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}\n`);
    } else {
      console.log('✅ Test user already exists:');
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}\n`);
    }

    // Create test device linked to test user
    console.log('Creating test device...');
    device = await Device.create({
      deviceId: TEST_DEVICE.deviceId,
      name: TEST_DEVICE.name,
      userId: user._id,
    });

    console.log('✅ Test device created successfully:');
    console.log(`   Device ID: ${device.deviceId}`);
    console.log(`   Name: ${device.name}`);
    console.log(`   User ID: ${device.userId}`);
    console.log(`   Created: ${device.createdAt}\n`);

    console.log('🎉 Setup complete! You can now run your tests.\n');
    
    return device;

  } catch (error) {
    console.error('❌ Error setting up test device:', error.message);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

// Run if called directly
if (require.main === module) {
  setupTestDevice()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = setupTestDevice;
