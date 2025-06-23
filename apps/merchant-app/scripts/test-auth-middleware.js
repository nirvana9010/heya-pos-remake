#!/usr/bin/env node

/**
 * Test script to verify authentication middleware is working correctly
 * Run this before deploying to production!
 */

const axios = require('axios');
const chalk = require('chalk');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3002';

const tests = [
  {
    name: 'Static JS files should be accessible without auth',
    url: '/js/iclient-with-ui-v1.js',
    expectedStatus: 200,
    expectRedirect: false,
  },
  {
    name: 'Static CSS files should be accessible without auth',
    url: '/css/styles.css',
    expectedStatus: [200, 404], // 404 is OK if file doesn't exist
    expectRedirect: false,
  },
  {
    name: 'Images should be accessible without auth',
    url: '/images/logo.png',
    expectedStatus: [200, 404], // 404 is OK if file doesn't exist
    expectRedirect: false,
  },
  {
    name: 'Protected routes should redirect to login without auth',
    url: '/calendar',
    expectedStatus: [302, 307],
    expectRedirect: true,
    expectedLocation: '/login',
  },
  {
    name: 'Login page should be accessible without auth',
    url: '/login',
    expectedStatus: 200,
    expectRedirect: false,
  },
  {
    name: 'API routes should be accessible (they have their own auth)',
    url: '/api/v1/health',
    expectedStatus: [200, 404], // Depends on if health endpoint exists
    expectRedirect: false,
  },
];

async function runTests() {
  console.log(chalk.blue(`\nTesting auth middleware at ${BASE_URL}\n`));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const response = await axios.get(`${BASE_URL}${test.url}`, {
        maxRedirects: 0,
        validateStatus: () => true, // Don't throw on any status
        headers: {
          'User-Agent': 'AuthMiddlewareTest/1.0',
        },
      });
      
      const status = response.status;
      const location = response.headers.location;
      
      // Check status code
      const validStatus = Array.isArray(test.expectedStatus) 
        ? test.expectedStatus.includes(status)
        : status === test.expectedStatus;
      
      // Check redirect
      const hasRedirect = !!location;
      const redirectCorrect = !test.expectRedirect || 
        (hasRedirect && location.includes(test.expectedLocation));
      
      if (validStatus && (!test.expectRedirect || redirectCorrect)) {
        console.log(chalk.green(`✓ ${test.name}`));
        console.log(chalk.gray(`  Status: ${status}${location ? `, Location: ${location}` : ''}`));
        passed++;
      } else {
        console.log(chalk.red(`✗ ${test.name}`));
        console.log(chalk.gray(`  Expected: ${test.expectedStatus}, Got: ${status}`));
        if (test.expectRedirect && !redirectCorrect) {
          console.log(chalk.gray(`  Expected redirect to: ${test.expectedLocation}, Got: ${location || 'no redirect'}`));
        }
        failed++;
      }
    } catch (error) {
      console.log(chalk.red(`✗ ${test.name}`));
      console.log(chalk.gray(`  Error: ${error.message}`));
      failed++;
    }
  }
  
  console.log(chalk.blue(`\nTest Results: ${passed} passed, ${failed} failed\n`));
  
  if (failed > 0) {
    console.log(chalk.yellow('⚠️  Some tests failed. Fix these issues before deploying to production!'));
    process.exit(1);
  } else {
    console.log(chalk.green('✅ All tests passed! Safe to deploy to production.'));
  }
}

// Check if axios is installed
try {
  require.resolve('axios');
  require.resolve('chalk');
} catch (e) {
  console.log('Installing test dependencies...');
  require('child_process').execSync('npm install --no-save axios chalk', { stdio: 'inherit' });
}

runTests();