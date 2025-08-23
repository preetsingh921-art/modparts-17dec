#!/usr/bin/env node

/**
 * Simple Security Test Script
 * Tests the honeypot protection and rate limiting on your live site
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const SITE_URL = 'https://www.partsformyrd350.com';
const API_BASE = `${SITE_URL}/api`;

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': options.userAgent || 'SecurityTestBot/1.0',
        ...options.headers
      }
    };

    const postData = options.body ? JSON.stringify(options.body) : '';
    if (postData) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: { message: data },
            raw: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

/**
 * Test 1: Speed Bot (submits too quickly)
 */
async function testSpeedBot() {
  console.log('\n🚀 TEST 1: Speed Bot Attack');
  console.log('Simulating extremely fast form submission...');
  
  const startTime = Date.now();
  
  try {
    const result = await makeRequest(`${API_BASE}/auth/login`, {
      body: {
        email: 'speedbot@test.com',
        password: 'password123'
      },
      userAgent: 'SpeedBot/1.0 (Ultra Fast)'
    });
    
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Submission time: ${duration}ms`);
    console.log(`📊 Status: ${result.status}`);
    console.log(`💬 Response: ${result.data.message || 'No message'}`);
    
    if (result.status === 400 || result.status === 429) {
      console.log('✅ GOOD: Speed bot was blocked!');
      return true;
    } else {
      console.log('⚠️  WARNING: Speed bot was not blocked');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 2: Honeypot Bot (fills hidden fields)
 */
async function testHoneypotBot() {
  console.log('\n🍯 TEST 2: Honeypot Bot Attack');
  console.log('Simulating bot that fills hidden honeypot field...');
  
  try {
    const result = await makeRequest(`${API_BASE}/auth/login`, {
      body: {
        email: 'honeypotbot@test.com',
        password: 'password123',
        website: 'http://spam-site.com' // This is the honeypot field
      },
      userAgent: 'HoneypotBot/1.0 (Form Filler)'
    });
    
    console.log(`📊 Status: ${result.status}`);
    console.log(`💬 Response: ${result.data.message || 'No message'}`);
    
    if (result.status === 400) {
      console.log('✅ GOOD: Honeypot bot was blocked!');
      return true;
    } else {
      console.log('⚠️  WARNING: Honeypot bot was not blocked');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 3: Rate Limiting (multiple rapid requests)
 */
async function testRateLimiting() {
  console.log('\n🔥 TEST 3: Rate Limiting Attack');
  console.log('Sending multiple rapid login attempts...');
  
  const results = [];
  const promises = [];
  
  // Send 8 requests rapidly
  for (let i = 0; i < 8; i++) {
    promises.push(
      makeRequest(`${API_BASE}/auth/login`, {
        body: {
          email: `ratetest${i}@test.com`,
          password: 'wrongpassword'
        },
        userAgent: `RateLimitBot/1.0 (Request ${i + 1})`
      })
    );
  }
  
  try {
    const allResults = await Promise.all(promises);
    
    let blockedCount = 0;
    allResults.forEach((result, index) => {
      console.log(`  Request ${index + 1}: Status ${result.status} - ${result.data.message || 'No message'}`);
      if (result.status === 429) {
        blockedCount++;
      }
    });
    
    console.log(`\n📊 Results: ${blockedCount}/${allResults.length} requests were rate limited`);
    
    if (blockedCount > 0) {
      console.log('✅ GOOD: Rate limiting is working!');
      return true;
    } else {
      console.log('⚠️  WARNING: Rate limiting may not be active');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 4: Registration Spam
 */
async function testRegistrationSpam() {
  console.log('\n📧 TEST 4: Registration Spam Attack');
  console.log('Testing spam registration with honeypot...');
  
  try {
    const result = await makeRequest(`${API_BASE}/auth/register`, {
      body: {
        email: 'spambot@fake-domain.com',
        password: 'password123',
        first_name: 'Spam',
        last_name: 'Bot',
        website: 'http://spam-site.com' // Honeypot field
      },
      userAgent: 'RegistrationSpamBot/1.0'
    });
    
    console.log(`📊 Status: ${result.status}`);
    console.log(`💬 Response: ${result.data.message || 'No message'}`);
    
    if (result.status === 400) {
      console.log('✅ GOOD: Registration spam was blocked!');
      return true;
    } else {
      console.log('⚠️  WARNING: Registration spam was not blocked');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Test 5: Legitimate User Simulation
 */
async function testLegitimateUser() {
  console.log('\n👤 TEST 5: Legitimate User Simulation');
  console.log('Testing normal user behavior (should work)...');
  
  // Wait 3 seconds to simulate human timing
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const result = await makeRequest(`${API_BASE}/auth/login`, {
      body: {
        email: 'legitimate@user.com',
        password: 'password123'
        // No honeypot field filled
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    console.log(`📊 Status: ${result.status}`);
    console.log(`💬 Response: ${result.data.message || 'No message'}`);
    
    // For legitimate users, we expect either success or "user not found" (not security blocks)
    if (result.status === 200 || (result.status === 400 && result.data.message && !result.data.message.includes('Security'))) {
      console.log('✅ GOOD: Legitimate user was not blocked by security!');
      return true;
    } else {
      console.log('⚠️  WARNING: Legitimate user may have been blocked');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

/**
 * Generate final report
 */
function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('🛡️  SECURITY TEST REPORT');
  console.log('='.repeat(60));
  
  const testNames = [
    'Speed Bot Protection',
    'Honeypot Protection', 
    'Rate Limiting',
    'Registration Spam Protection',
    'Legitimate User Access'
  ];
  
  let passedTests = 0;
  
  results.forEach((passed, index) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${testNames[index]}: ${status}`);
    if (passed) passedTests++;
  });
  
  console.log('\n📊 OVERALL SECURITY SCORE:');
  const score = Math.round((passedTests / results.length) * 100);
  console.log(`${passedTests}/${results.length} tests passed (${score}%)`);
  
  if (score >= 80) {
    console.log('🎉 EXCELLENT: Your security is working very well!');
  } else if (score >= 60) {
    console.log('⚠️  GOOD: Security is working but could be improved');
  } else {
    console.log('🚨 POOR: Security needs immediate attention');
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (!results[0]) console.log('- Consider adding timing-based protection');
  if (!results[1]) console.log('- Honeypot protection may need adjustment');
  if (!results[2]) console.log('- Rate limiting may not be configured properly');
  if (!results[3]) console.log('- Registration spam protection needs work');
  if (!results[4]) console.log('- Security may be too strict for legitimate users');
  
  console.log('\n🔗 Testing your live site: ' + SITE_URL);
}

/**
 * Main execution
 */
async function main() {
  console.log('🤖 SECURITY TESTING STARTING...');
  console.log(`🎯 Target: ${SITE_URL}`);
  console.log('🔍 Testing honeypot protection and rate limiting');
  
  const results = [];
  
  try {
    results.push(await testSpeedBot());
    results.push(await testHoneypotBot());
    results.push(await testRateLimiting());
    results.push(await testRegistrationSpam());
    results.push(await testLegitimateUser());
    
    generateReport(results);
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);
