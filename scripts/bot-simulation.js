#!/usr/bin/env node

/**
 * Bot Behavior Simulation Script
 * Tests honeypot protection by simulating various bot attack patterns
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// Test credentials
const TEST_CREDENTIALS = {
  email: 'test@example.com',
  password: 'password123'
};

// Bot simulation patterns
const BOT_PATTERNS = {
  SPEED_BOT: {
    name: 'Speed Bot',
    description: 'Submits forms extremely quickly (under 1 second)',
    delay: 100 // milliseconds
  },
  HONEYPOT_BOT: {
    name: 'Honeypot Bot',
    description: 'Fills hidden honeypot fields',
    fillHoneypot: true,
    delay: 3000
  },
  RAPID_FIRE_BOT: {
    name: 'Rapid Fire Bot',
    description: 'Multiple rapid requests to test rate limiting',
    requests: 10,
    delay: 500
  },
  CREDENTIAL_STUFFING_BOT: {
    name: 'Credential Stuffing Bot',
    description: 'Tests multiple username/password combinations',
    credentials: [
      { email: 'admin@test.com', password: 'admin' },
      { email: 'user@test.com', password: '123456' },
      { email: 'test@test.com', password: 'password' },
      { email: 'root@test.com', password: 'root' }
    ],
    delay: 1000
  },
  FORM_SPAMMER_BOT: {
    name: 'Form Spammer Bot',
    description: 'Spams registration forms with fake data',
    delay: 2000
  }
};

/**
 * Simulate login attempt
 */
async function simulateLogin(credentials, options = {}) {
  const startTime = performance.now();
  
  try {
    const payload = {
      email: credentials.email,
      password: credentials.password
    };

    // Add honeypot field if bot fills it
    if (options.fillHoneypot) {
      payload.website = 'http://spam-bot-site.com';
    }

    console.log(`🤖 Attempting login: ${credentials.email}`);
    
    const response = await axios.post(`${API_URL}/auth/login`, payload, {
      timeout: 10000,
      headers: {
        'User-Agent': options.userAgent || 'BotSimulator/1.0',
        'Content-Type': 'application/json'
      }
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      success: true,
      status: response.status,
      data: response.data,
      duration: Math.round(duration),
      credentials
    };

  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data?.message || error.message,
      duration: Math.round(duration),
      credentials
    };
  }
}

/**
 * Simulate registration attempt
 */
async function simulateRegistration(userData, options = {}) {
  const startTime = performance.now();
  
  try {
    const payload = {
      email: userData.email,
      password: userData.password,
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone || '',
      address: userData.address || ''
    };

    // Add honeypot field if bot fills it
    if (options.fillHoneypot) {
      payload.website = 'http://spam-bot-site.com';
    }

    console.log(`🤖 Attempting registration: ${userData.email}`);
    
    const response = await axios.post(`${API_URL}/auth/register`, payload, {
      timeout: 10000,
      headers: {
        'User-Agent': options.userAgent || 'BotSimulator/1.0',
        'Content-Type': 'application/json'
      }
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      success: true,
      status: response.status,
      data: response.data,
      duration: Math.round(duration),
      userData
    };

  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      success: false,
      status: error.response?.status || 0,
      error: error.response?.data?.message || error.message,
      duration: Math.round(duration),
      userData
    };
  }
}

/**
 * Generate fake user data
 */
function generateFakeUser(index) {
  return {
    email: `fakeuser${index}@spam-domain.com`,
    password: 'password123',
    first_name: `Fake${index}`,
    last_name: `User${index}`,
    phone: `555-000-${String(index).padStart(4, '0')}`,
    address: `${index} Fake Street, Bot City`
  };
}

/**
 * Sleep function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run Speed Bot simulation
 */
async function runSpeedBot() {
  console.log('\n🚀 Running Speed Bot Simulation...');
  console.log('Testing: Extremely fast form submissions (under 1 second)');
  
  const results = [];
  
  for (let i = 0; i < 3; i++) {
    await sleep(BOT_PATTERNS.SPEED_BOT.delay);
    const result = await simulateLogin(TEST_CREDENTIALS, {
      userAgent: 'SpeedBot/1.0 (Ultra Fast Submission)'
    });
    results.push(result);
    
    console.log(`  Attempt ${i + 1}: ${result.success ? '✅ SUCCESS' : '❌ BLOCKED'} (${result.duration}ms)`);
    if (!result.success) {
      console.log(`    Reason: ${result.error}`);
    }
  }
  
  return results;
}

/**
 * Run Honeypot Bot simulation
 */
async function runHoneypotBot() {
  console.log('\n🍯 Running Honeypot Bot Simulation...');
  console.log('Testing: Bot that fills hidden honeypot fields');
  
  const results = [];
  
  for (let i = 0; i < 2; i++) {
    await sleep(BOT_PATTERNS.HONEYPOT_BOT.delay);
    const result = await simulateLogin(TEST_CREDENTIALS, {
      fillHoneypot: true,
      userAgent: 'HoneypotBot/1.0 (Form Filler)'
    });
    results.push(result);
    
    console.log(`  Attempt ${i + 1}: ${result.success ? '✅ SUCCESS' : '❌ BLOCKED'} (${result.duration}ms)`);
    if (!result.success) {
      console.log(`    Reason: ${result.error}`);
    }
  }
  
  return results;
}

/**
 * Run Rapid Fire Bot simulation
 */
async function runRapidFireBot() {
  console.log('\n🔥 Running Rapid Fire Bot Simulation...');
  console.log('Testing: Multiple rapid requests to trigger rate limiting');
  
  const results = [];
  const promises = [];
  
  // Fire multiple requests simultaneously
  for (let i = 0; i < BOT_PATTERNS.RAPID_FIRE_BOT.requests; i++) {
    promises.push(simulateLogin({
      email: `rapidfire${i}@test.com`,
      password: 'password123'
    }, {
      userAgent: 'RapidFireBot/1.0 (Mass Requests)'
    }));
  }
  
  const allResults = await Promise.all(promises);
  results.push(...allResults);
  
  allResults.forEach((result, index) => {
    console.log(`  Request ${index + 1}: ${result.success ? '✅ SUCCESS' : '❌ BLOCKED'} (${result.duration}ms)`);
    if (!result.success) {
      console.log(`    Reason: ${result.error}`);
    }
  });
  
  return results;
}

/**
 * Run Credential Stuffing Bot simulation
 */
async function runCredentialStuffingBot() {
  console.log('\n🔐 Running Credential Stuffing Bot Simulation...');
  console.log('Testing: Multiple username/password combinations');
  
  const results = [];
  
  for (const creds of BOT_PATTERNS.CREDENTIAL_STUFFING_BOT.credentials) {
    await sleep(BOT_PATTERNS.CREDENTIAL_STUFFING_BOT.delay);
    const result = await simulateLogin(creds, {
      userAgent: 'CredentialStuffingBot/1.0 (Dictionary Attack)'
    });
    results.push(result);
    
    console.log(`  ${creds.email}: ${result.success ? '✅ SUCCESS' : '❌ BLOCKED'} (${result.duration}ms)`);
    if (!result.success) {
      console.log(`    Reason: ${result.error}`);
    }
  }
  
  return results;
}

/**
 * Run Form Spammer Bot simulation
 */
async function runFormSpammerBot() {
  console.log('\n📧 Running Form Spammer Bot Simulation...');
  console.log('Testing: Spam registration attempts');
  
  const results = [];
  
  for (let i = 0; i < 3; i++) {
    await sleep(BOT_PATTERNS.FORM_SPAMMER_BOT.delay);
    const fakeUser = generateFakeUser(i);
    const result = await simulateRegistration(fakeUser, {
      fillHoneypot: i === 1, // Fill honeypot on second attempt
      userAgent: 'FormSpammerBot/1.0 (Mass Registration)'
    });
    results.push(result);
    
    console.log(`  ${fakeUser.email}: ${result.success ? '✅ SUCCESS' : '❌ BLOCKED'} (${result.duration}ms)`);
    if (!result.success) {
      console.log(`    Reason: ${result.error}`);
    }
  }
  
  return results;
}

/**
 * Generate summary report
 */
function generateReport(allResults) {
  console.log('\n📊 SECURITY TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const totalAttempts = allResults.length;
  const blockedAttempts = allResults.filter(r => !r.success).length;
  const successfulAttempts = allResults.filter(r => r.success).length;
  
  console.log(`Total Attack Attempts: ${totalAttempts}`);
  console.log(`Blocked by Security: ${blockedAttempts} (${Math.round(blockedAttempts/totalAttempts*100)}%)`);
  console.log(`Successful Attacks: ${successfulAttempts} (${Math.round(successfulAttempts/totalAttempts*100)}%)`);
  
  console.log('\n🛡️ SECURITY EFFECTIVENESS:');
  if (blockedAttempts / totalAttempts >= 0.8) {
    console.log('✅ EXCELLENT - Security is working very well!');
  } else if (blockedAttempts / totalAttempts >= 0.6) {
    console.log('⚠️ GOOD - Security is working but could be improved');
  } else {
    console.log('❌ POOR - Security needs improvement');
  }
  
  console.log('\n🔍 BLOCKED ATTACK TYPES:');
  const blockedResults = allResults.filter(r => !r.success);
  const errorTypes = {};
  
  blockedResults.forEach(result => {
    const error = result.error || 'Unknown error';
    errorTypes[error] = (errorTypes[error] || 0) + 1;
  });
  
  Object.entries(errorTypes).forEach(([error, count]) => {
    console.log(`  ${error}: ${count} attempts`);
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 BOT BEHAVIOR SIMULATION STARTING...');
  console.log(`Target: ${BASE_URL}`);
  console.log('Testing honeypot protection and rate limiting\n');
  
  const allResults = [];
  
  try {
    // Run all bot simulations
    const speedResults = await runSpeedBot();
    const honeypotResults = await runHoneypotBot();
    const rapidFireResults = await runRapidFireBot();
    const credentialStuffingResults = await runCredentialStuffingBot();
    const formSpammerResults = await runFormSpammerBot();
    
    allResults.push(
      ...speedResults,
      ...honeypotResults,
      ...rapidFireResults,
      ...credentialStuffingResults,
      ...formSpammerResults
    );
    
    // Generate final report
    generateReport(allResults);
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  simulateLogin,
  simulateRegistration,
  runSpeedBot,
  runHoneypotBot,
  runRapidFireBot,
  runCredentialStuffingBot,
  runFormSpammerBot
};
