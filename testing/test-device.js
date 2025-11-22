/**
 * Test script for simulating IoT device POST and GET requests
 * Tests the /api/measurements/device endpoint
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000';  // Change this to your server URL
const API_KEY = 'dev-device-key-123';      // Must match server's IOT_API_KEY
const DEVICE_ID = 'PHOTON_TEST_001';       // Your test device ID

// Test user credentials (created by setup-test-device.js)
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'TestPassword123!';

// Test data samples
const testMeasurements = [
  { heartRate: 72, spo2: 98 },
  { heartRate: 75, spo2: 97 },
  { heartRate: 68, spo2: 99 },
  { heartRate: 80, spo2: 96 },
  { heartRate: 70, spo2: 98 },
];

/**
 * Helper function to make HTTP requests
 */
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = client.request(requestOptions, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
          };
          resolve(response);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Login and get JWT token
 */
async function loginUser(email, password) {
  const url = `${BASE_URL}/api/auth/login`;
  
  const payload = {
    email: email,
    password: password,
  };

  console.log(`\n🔐 Logging in as ${email}...`);

  try {
    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, payload);

    if (response.statusCode === 200) {
      const token = response.body.token;
      console.log(`   ✅ Login successful!`);
      console.log(`   Token: ${token ? token.substring(0, 20) + '...' : 'No token received'}`);
      return token;
    } else {
      console.log(`   ❌ Login failed! Status: ${response.statusCode}`);
      console.log(`   Response:`, response.body);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Request failed:`, error.message);
    return null;
  }
}

/**
 * Simulate device posting measurement data
 */
async function postMeasurement(deviceId, heartRate, spo2) {
  const url = `${BASE_URL}/api/measurements/device`;
  
  const payload = {
    deviceId: deviceId,
    heartRate: heartRate,
    spo2: spo2,
    takenAt: new Date().toISOString(),
  };

  console.log(`\n📤 Posting measurement:`);
  console.log(`   Device: ${deviceId}`);
  console.log(`   Heart Rate: ${heartRate} BPM`);
  console.log(`   SpO2: ${spo2}%`);

  try {
    const response = await makeRequest(url, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }, payload);

    if (response.statusCode === 201) {
      console.log(`   ✅ Success! Status: ${response.statusCode}`);
      console.log(`   Response:`, JSON.stringify(response.body, null, 2));
      return true;
    } else {
      console.log(`   ❌ Error! Status: ${response.statusCode}`);
      console.log(`   Response:`, response.body);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Request failed:`, error.message);
    return false;
  }
}

/**
 * Get measurements (requires JWT token for authenticated user)
 */
async function getMeasurements(authToken = null) {
  const url = `${BASE_URL}/api/measurements`;
  
  const headers = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  console.log(`\n📥 Getting measurements...`);

  try {
    const response = await makeRequest(url, {
      method: 'GET',
      headers: headers,
    });

    if (response.statusCode === 200) {
      const data = response.body;
      console.log(`   ✅ Success! Found ${data.length} measurements`);
      
      if (data.length > 0) {
        console.log('\n   Recent measurements:');
        data.slice(0, 5).forEach((measurement, i) => {
          console.log(`   ${i + 1}. HR: ${measurement.heartRate} BPM, ` +
                     `SpO2: ${measurement.spo2}%, ` +
                     `Time: ${measurement.takenAt}`);
        });
      }
      return data;
    } else {
      console.log(`   ❌ Error! Status: ${response.statusCode}`);
      console.log(`   Response:`, response.body);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Request failed:`, error.message);
    return null;
  }
}

/**
 * Test posting a single measurement
 */
async function testPostSingle() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Single Measurement POST');
  console.log('='.repeat(60));
  
  const result = await postMeasurement(DEVICE_ID, 72, 98);
  return ['TEST 1: Single Measurement POST', result];
}

/**
 * Test posting multiple measurements with delay
 */
async function testPostMultiple() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Multiple Measurements POST (simulating device)');
  console.log('='.repeat(60));
  
  let successCount = 0;
  
  for (let i = 0; i < testMeasurements.length; i++) {
    const data = testMeasurements[i];
    console.log(`\n[${i + 1}/${testMeasurements.length}]`);
    
    if (await postMeasurement(DEVICE_ID, data.heartRate, data.spo2)) {
      successCount++;
    }
    
    // Wait 1 second between posts
    if (i < testMeasurements.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n✅ Successfully posted ${successCount}/${testMeasurements.length} measurements`);
  const passed = successCount === testMeasurements.length;
  return ['TEST 2: Multiple Measurements POST', passed];
}

/**
 * Test with invalid API key
 */
async function testInvalidApiKey() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Invalid API Key (should fail)');
  console.log('='.repeat(60));
  
  const url = `${BASE_URL}/api/measurements/device`;
  
  const payload = {
    deviceId: DEVICE_ID,
    heartRate: 72,
    spo2: 98,
  };

  console.log(`\n📤 Posting with wrong API key...`);
  
  const response = await makeRequest(url, {
    method: 'POST',
    headers: {
      'X-API-Key': 'wrong-key',
      'Content-Type': 'application/json',
    },
  }, payload);

  if (response.statusCode === 401) {
    console.log(`   ✅ Correctly rejected! Status: ${response.statusCode}`);
    return ['TEST 3: Invalid API Key', true];
  } else {
    console.log(`   ❌ Unexpected response! Status: ${response.statusCode}`);
    return ['TEST 3: Invalid API Key', false];
  }
}

/**
 * Test with missing required fields
 */
async function testMissingFields() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Missing Required Fields (should fail)');
  console.log('='.repeat(60));
  
  const url = `${BASE_URL}/api/measurements/device`;
  
  // Missing spo2
  const payload = {
    deviceId: DEVICE_ID,
    heartRate: 72,
  };

  console.log(`\n📤 Posting without SpO2 field...`);
  
  const response = await makeRequest(url, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  }, payload);

  if (response.statusCode === 400) {
    console.log(`   ✅ Correctly rejected! Status: ${response.statusCode}`);
    console.log(`   Response:`, response.body);
    return ['TEST 4: Missing Required Fields', true];
  } else {
    console.log(`   ❌ Unexpected response! Status: ${response.statusCode}`);
    return ['TEST 4: Missing Required Fields', false];
  }
}

/**
 * Test GET without authentication (should fail)
 */
async function testGetWithoutAuth() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: GET without Authentication (should fail)');
  console.log('='.repeat(60));
  
  const result = await getMeasurements();
  // Should return null (401 error) to pass this test
  const passed = result === null;
  return ['TEST 5: GET without Authentication', passed];
}

/**
 * Test GET with valid JWT token (should succeed)
 */
async function testGetWithAuth() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 6: GET with Valid JWT Token (should succeed)');
  console.log('='.repeat(60));
  
  // Login to get token
  const token = await loginUser(TEST_USER_EMAIL, TEST_USER_PASSWORD);
  
  if (!token) {
    console.log('   ❌ Cannot test - login failed');
    return ['TEST 6: GET with Valid JWT Token', false];
  }
  
  // Use token to get measurements
  const measurements = await getMeasurements(token);
  
  if (measurements !== null) {
    console.log('   ✅ Successfully retrieved measurements with JWT token');
    return ['TEST 6: GET with Valid JWT Token', true];
  } else {
    console.log('   ❌ Failed to retrieve measurements');
    return ['TEST 6: GET with Valid JWT Token', false];
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '🧪 ' + '='.repeat(58));
  console.log('IoT Device API Testing Suite');
  console.log('='.repeat(60));
  console.log(`Server: ${BASE_URL}`);
  console.log(`Device ID: ${DEVICE_ID}`);
  console.log('='.repeat(60));

  // Check if server is running
  try {
    const response = await makeRequest(BASE_URL, { method: 'GET' });
    console.log('✅ Server is reachable');
  } catch (error) {
    console.log('❌ Cannot reach server. Make sure it\'s running!');
    console.log(`   Error: ${error.message}`);
    return;
  }

  // Run all tests and collect results
  const results = [];
  results.push(await testPostSingle());
  results.push(await testPostMultiple());
  results.push(await testInvalidApiKey());
  results.push(await testMissingFields());
  results.push(await testGetWithoutAuth());
  results.push(await testGetWithAuth());

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passedTests = [];
  const failedTests = [];
  
  results.forEach(([testName, passed]) => {
    if (passed) {
      passedTests.push(testName);
      console.log(`✅ ${testName}`);
    } else {
      failedTests.push(testName);
      console.log(`❌ ${testName}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.length} tests | Passed: ${passedTests.length} | Failed: ${failedTests.length}`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach(testName => {
      console.log(`   - ${testName}`);
    });
  } else {
    console.log('\n🎉 All tests passed!');
  }
  
  console.log('='.repeat(60));
}

// Main execution
if (require.main === module) {
  // You can run individual tests or all tests
  
  // Uncomment the test you want to run:
  
  runAllTests();           // Run all tests
  // testPostSingle();        // Just test one POST
  // testPostMultiple();      // Simulate multiple device readings
  // testInvalidApiKey();     // Test authentication
  // testGetWithoutAuth();    // Test GET endpoint
}

module.exports = {
  loginUser,
  postMeasurement,
  getMeasurements,
  testPostSingle,
  testPostMultiple,
  testInvalidApiKey,
  testMissingFields,
  testGetWithoutAuth,
  testGetWithAuth,
  runAllTests,
};
