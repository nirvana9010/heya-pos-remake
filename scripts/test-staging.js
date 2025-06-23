#!/usr/bin/env node

/**
 * Staging Environment Test Suite
 * 
 * This script validates that the staging environment
 * exactly mirrors production behavior.
 */

const axios = require('axios');
const chalk = require('chalk');

const STAGING_MERCHANT_URL = process.env.STAGING_MERCHANT_URL || 'https://heya-pos-staging-merchant-app.vercel.app';
const STAGING_API_URL = process.env.STAGING_API_URL || 'https://heya-pos-staging-api.vercel.app';

const tests = [
  {
    name: 'Static JS files accessible',
    test: async () => {
      const res = await axios.get(`${STAGING_MERCHANT_URL}/js/iclient-with-ui-v1.js`, {
        validateStatus: () => true,
        maxRedirects: 0
      });
      return {
        pass: res.status === 200 && res.headers['content-type']?.includes('javascript'),
        message: `Status: ${res.status}, Content-Type: ${res.headers['content-type'] || 'none'}`
      };
    }
  },
  {
    name: 'Protected routes redirect to login',
    test: async () => {
      const res = await axios.get(`${STAGING_MERCHANT_URL}/calendar`, {
        validateStatus: () => true,
        maxRedirects: 0
      });
      return {
        pass: [302, 307].includes(res.status) && res.headers.location?.includes('/login'),
        message: `Status: ${res.status}, Location: ${res.headers.location || 'none'}`
      };
    }
  },
  {
    name: 'Login page accessible',
    test: async () => {
      const res = await axios.get(`${STAGING_MERCHANT_URL}/login`, {
        validateStatus: () => true
      });
      return {
        pass: res.status === 200,
        message: `Status: ${res.status}`
      };
    }
  },
  {
    name: 'API health check',
    test: async () => {
      const res = await axios.get(`${STAGING_API_URL}/api/v1/health`, {
        validateStatus: () => true
      });
      return {
        pass: res.status === 200,
        message: `Status: ${res.status}`
      };
    }
  },
  {
    name: 'Login with email works',
    test: async () => {
      const res = await axios.post(`${STAGING_API_URL}/api/v1/auth/merchant/login`, {
        username: 'admin@hamiltonbeauty.com',  // API still expects username field
        password: 'demo123'
      }, {
        validateStatus: () => true
      });
      return {
        pass: res.status === 200 && res.data.token,
        message: `Status: ${res.status}, Has Token: ${!!res.data?.token}`
      };
    }
  },
  {
    name: 'Cookie cleanup page accessible',
    test: async () => {
      const res = await axios.get(`${STAGING_MERCHANT_URL}/clear-old-cookies.html`, {
        validateStatus: () => true
      });
      return {
        pass: res.status === 200,
        message: `Status: ${res.status}`
      };
    }
  },
  {
    name: 'Middleware excludes public assets',
    test: async () => {
      const paths = ['/favicon.ico', '/robots.txt', '/images/test.png', '/css/test.css'];
      const results = await Promise.all(
        paths.map(path => 
          axios.get(`${STAGING_MERCHANT_URL}${path}`, {
            validateStatus: () => true,
            maxRedirects: 0
          })
        )
      );
      const allPass = results.every(res => res.status !== 302 && res.status !== 307);
      return {
        pass: allPass,
        message: `Tested ${paths.length} paths, all excluded from auth: ${allPass}`
      };
    }
  }
];

async function runTests() {
  console.log(chalk.blue(`\nTesting Staging Environment`));
  console.log(chalk.gray(`Merchant App: ${STAGING_MERCHANT_URL}`));
  console.log(chalk.gray(`API: ${STAGING_API_URL}\n`));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result.pass) {
        console.log(chalk.green(`✓ ${test.name}`));
        console.log(chalk.gray(`  ${result.message}`));
        passed++;
      } else {
        console.log(chalk.red(`✗ ${test.name}`));
        console.log(chalk.gray(`  ${result.message}`));
        failed++;
      }
    } catch (error) {
      console.log(chalk.red(`✗ ${test.name}`));
      console.log(chalk.gray(`  Error: ${error.message}`));
      failed++;
    }
  }
  
  console.log(chalk.blue(`\nResults: ${passed} passed, ${failed} failed\n`));
  
  if (failed > 0) {
    console.log(chalk.yellow('⚠️  Staging environment has issues!'));
    console.log(chalk.yellow('Do not promote to production until all tests pass.\n'));
    process.exit(1);
  } else {
    console.log(chalk.green('✅ Staging environment is ready!'));
    console.log(chalk.green('Safe to promote to production.\n'));
  }
}

// Check dependencies
async function checkDependencies() {
  try {
    require.resolve('axios');
    require.resolve('chalk');
  } catch (e) {
    console.log('Installing test dependencies...');
    require('child_process').execSync('npm install --no-save axios chalk', { stdio: 'inherit' });
  }
}

// Main
(async () => {
  await checkDependencies();
  await runTests();
})();