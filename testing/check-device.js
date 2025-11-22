/**
 * Check if test device exists in database
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Device = require('../server/models/Device');

async function checkDevice() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hearttrack';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Find the test device
    const device = await Device.findOne({ deviceId: 'PHOTON_TEST_001' });
    
    if (device) {
      console.log('✅ Device found in database:');
      console.log(JSON.stringify(device, null, 2));
    } else {
      console.log('❌ Device NOT found in database');
      
      // List all devices
      const allDevices = await Device.find({});
      console.log(`\nTotal devices in database: ${allDevices.length}`);
      
      if (allDevices.length > 0) {
        console.log('\nAll devices:');
        allDevices.forEach(d => {
          console.log(`  - deviceId: "${d.deviceId}", name: "${d.name}"`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  }
}

checkDevice()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
