import axios from 'axios';
import { memoryLogger } from './src/utils/memory-logger';

const API_URL = 'http://localhost:3000/api';
const ITERATIONS = 100;
const DELAY_MS = 100;

interface TestResult {
  endpoint: string;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  responseTime: number;
  error?: string;
}

async function login(): Promise<string> {
  try {
    const response = await axios.post(`${API_URL}/auth/merchant/login`, {
      username: 'HAMILTON',
      password: 'demo123',
    });
    return response.data.accessToken;
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

async function testEndpoint(
  endpoint: string, 
  method: 'GET' | 'POST' = 'GET',
  data?: any,
  token?: string
): Promise<TestResult> {
  const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const memoryBefore = process.memoryUsage().heapUsed;
  const startTime = Date.now();

  try {
    if (method === 'GET') {
      await axios.get(`${API_URL}${endpoint}`, config);
    } else {
      await axios.post(`${API_URL}${endpoint}`, data, config);
    }

    const memoryAfter = process.memoryUsage().heapUsed;
    const responseTime = Date.now() - startTime;

    return {
      endpoint,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore,
      responseTime,
    };
  } catch (error) {
    return {
      endpoint,
      memoryBefore,
      memoryAfter: process.memoryUsage().heapUsed,
      memoryDelta: process.memoryUsage().heapUsed - memoryBefore,
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

async function stressTestEndpoint(
  endpoint: string,
  iterations: number,
  token?: string
): Promise<void> {
  console.log(`\n[STRESS TEST] Testing ${endpoint} with ${iterations} iterations`);
  
  const results: TestResult[] = [];
  const startMemory = process.memoryUsage().heapUsed;

  for (let i = 0; i < iterations; i++) {
    const result = await testEndpoint(endpoint, 'GET', null, token);
    results.push(result);

    if (i % 10 === 0) {
      const currentMemory = process.memoryUsage().heapUsed;
      const totalDelta = currentMemory - startMemory;
      console.log(`  Iteration ${i}: Memory delta: ${Math.round(totalDelta / 1024 / 1024)}MB`);
    }

    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }

  // Analyze results
  const totalMemoryDelta = results.reduce((sum, r) => sum + r.memoryDelta, 0);
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  const errors = results.filter(r => r.error).length;

  console.log(`\n[RESULTS] ${endpoint}:`);
  console.log(`  Total memory delta: ${Math.round(totalMemoryDelta / 1024 / 1024)}MB`);
  console.log(`  Average response time: ${Math.round(avgResponseTime)}ms`);
  console.log(`  Errors: ${errors}`);

  // Check for memory leak
  const finalMemory = process.memoryUsage().heapUsed;
  const leak = finalMemory - startMemory;
  if (leak > 50 * 1024 * 1024) { // 50MB threshold
    console.log(`  ⚠️  POSSIBLE MEMORY LEAK: ${Math.round(leak / 1024 / 1024)}MB growth`);
  }
}

async function main() {
  console.log('[MEMORY LEAK TEST] Starting...');
  memoryLogger.logMemory('Test Start');

  try {
    // Test public endpoints
    await stressTestEndpoint('/health', 50);
    
    // Login and test authenticated endpoints
    console.log('\n[AUTH] Logging in...');
    const token = await login();
    console.log('[AUTH] Login successful');

    // Test each module's endpoints
    const endpoints = [
      '/services',
      '/services/categories',
      '/customers',
      '/customers/search?query=test',
      '/bookings',
      '/bookings?date=2025-06-01',
      '/staff',
      '/loyalty/status/1',
      '/payments/recent',
    ];

    for (const endpoint of endpoints) {
      await stressTestEndpoint(endpoint, ITERATIONS, token);
      
      // Force GC if available
      if (global.gc) {
        console.log('\n[GC] Forcing garbage collection...');
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

  } catch (error) {
    console.error('[ERROR]', error);
  }

  memoryLogger.logMemory('Test Complete');
  console.log('\n[MEMORY LEAK TEST] Complete');
}

// Run with: NODE_OPTIONS='--expose-gc' ts-node test-memory-leak.ts
main();