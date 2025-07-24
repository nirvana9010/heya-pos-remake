#!/usr/bin/env node

/**
 * Performance Log Analyzer for Order/Payment Processing
 * 
 * Usage:
 *   pm2 logs api --nostream --lines 1000 | grep "[PERF]" > perf-logs.txt
 *   node scripts/analyze-performance-logs.js perf-logs.txt
 * 
 * Or pipe directly:
 *   pm2 logs api --nostream --lines 1000 | grep "[PERF]" | node scripts/analyze-performance-logs.js
 */

const fs = require('fs');
const readline = require('readline');

class PerformanceAnalyzer {
  constructor() {
    this.operations = new Map();
    this.sessions = new Map();
    this.patterns = {
      // Main operations
      prepareOrderStart: /\[PERF\] prepareOrderForPayment - start.*userId: ([\w-]+)/,
      prepareOrderComplete: /\[PERF\] prepareOrderForPayment completed in (\d+)ms/,
      
      // Sub-operations
      paymentGateway: /\[PERF\] Payment gateway fetch took (\d+)ms/,
      merchantFetch: /\[PERF\] Merchant fetch took (\d+)ms/,
      locationFetch: /\[PERF\] Location fetch took (\d+)ms/,
      preFetch: /\[PERF\] Pre-fetch completed in (\d+)ms/,
      
      // Order operations
      existingOrderFetch: /\[PERF\] Existing order fetch took (\d+)ms/,
      bookingOrderCheck: /\[PERF\] Existing booking order check took (\d+)ms/,
      bookingDetailsFetch: /\[PERF\] Booking details fetch took (\d+)ms/,
      orderCreate: /\[PERF\] Order create took (\d+)ms/,
      orderCreationTx: /\[PERF\] Order creation transaction took (\d+)ms/,
      
      // Item operations
      itemsAdd: /\[PERF\] Adding (\d+) items took (\d+)ms/,
      itemsCreateMany: /\[PERF\] OrderItem createMany took (\d+)ms for (\d+) items/,
      itemsFetch: /\[PERF\] OrderItem fetch took (\d+)ms/,
      
      // Calculation operations
      recalcStart: /\[PERF\] RecalculateTotals/,
      recalcComplete: /\[PERF\] RecalculateTotals completed in (\d+)ms/,
      recalcOrderFetch: /\[PERF\] Recalc order fetch took (\d+)ms/,
      calculations: /\[PERF\] Calculations took (\d+)ms/,
      parallelUpdates: /\[PERF\] Parallel updates took (\d+)ms \((\d+) items, (\d+) modifiers/,
      
      // Other operations
      modifierCreation: /\[PERF\] Order modifier creation took (\d+)ms/,
      orderRecalc: /\[PERF\] Order totals recalculation took (\d+)ms/,
      finalOrderFetch: /\[PERF\] Final order fetch took (\d+)ms/,
    };
  }

  parseLine(line) {
    // Extract timestamp if present
    const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z?)/);
    const timestamp = timestampMatch ? new Date(timestampMatch[1]) : new Date();

    // Check each pattern
    for (const [name, pattern] of Object.entries(this.patterns)) {
      const match = line.match(pattern);
      if (match) {
        return { name, match, timestamp, line };
      }
    }
    return null;
  }

  recordOperation(name, duration, metadata = {}) {
    if (!this.operations.has(name)) {
      this.operations.set(name, {
        count: 0,
        total: 0,
        min: Infinity,
        max: 0,
        avg: 0,
        samples: []
      });
    }

    const op = this.operations.get(name);
    const durationNum = parseInt(duration);
    
    op.count++;
    op.total += durationNum;
    op.min = Math.min(op.min, durationNum);
    op.max = Math.max(op.max, durationNum);
    op.avg = Math.round(op.total / op.count);
    
    // Keep last 10 samples for distribution analysis
    op.samples.push({ duration: durationNum, ...metadata });
    if (op.samples.length > 10) {
      op.samples.shift();
    }
  }

  analyzeLog(input) {
    const lines = input.trim().split('\n');
    let currentSession = null;

    lines.forEach(line => {
      const parsed = this.parseLine(line);
      if (!parsed) return;

      const { name, match } = parsed;

      switch (name) {
        case 'prepareOrderStart':
          currentSession = {
            userId: match[1],
            startTime: parsed.timestamp,
            operations: []
          };
          break;

        case 'prepareOrderComplete':
          if (currentSession) {
            currentSession.totalDuration = parseInt(match[1]);
            this.recordOperation('prepareOrderForPayment_total', match[1]);
            this.sessions.set(`${currentSession.startTime.getTime()}_${currentSession.userId}`, currentSession);
            currentSession = null;
          }
          break;

        case 'paymentGateway':
        case 'merchantFetch':
        case 'locationFetch':
        case 'preFetch':
        case 'existingOrderFetch':
        case 'bookingOrderCheck':
        case 'bookingDetailsFetch':
        case 'orderCreate':
        case 'orderCreationTx':
        case 'modifierCreation':
        case 'orderRecalc':
        case 'finalOrderFetch':
        case 'recalcOrderFetch':
        case 'calculations':
          this.recordOperation(name, match[1]);
          if (currentSession) {
            currentSession.operations.push({ name, duration: parseInt(match[1]) });
          }
          break;

        case 'itemsAdd':
          this.recordOperation(name, match[2], { itemCount: parseInt(match[1]) });
          break;

        case 'itemsCreateMany':
          this.recordOperation(name, match[1], { itemCount: parseInt(match[2]) });
          break;

        case 'parallelUpdates':
          this.recordOperation(name, match[1], { 
            itemCount: parseInt(match[2]), 
            modifierCount: parseInt(match[3]) 
          });
          break;

        case 'recalcComplete':
          this.recordOperation('recalculateOrderTotals_total', match[1]);
          break;
      }
    });
  }

  generateReport() {
    console.log('\n=== PERFORMANCE ANALYSIS REPORT ===\n');
    
    // Sort operations by average duration (slowest first)
    const sortedOps = Array.from(this.operations.entries())
      .sort((a, b) => b[1].avg - a[1].avg);

    console.log('OPERATION SUMMARY (sorted by avg duration):');
    console.log('─'.repeat(80));
    console.log('Operation'.padEnd(35) + 'Count'.padEnd(8) + 'Avg'.padEnd(10) + 'Min'.padEnd(10) + 'Max'.padEnd(10) + 'Total');
    console.log('─'.repeat(80));

    let totalTime = 0;
    sortedOps.forEach(([name, stats]) => {
      console.log(
        name.padEnd(35) +
        stats.count.toString().padEnd(8) +
        `${stats.avg}ms`.padEnd(10) +
        `${stats.min}ms`.padEnd(10) +
        `${stats.max}ms`.padEnd(10) +
        `${stats.total}ms`
      );
      totalTime += stats.total;
    });
    console.log('─'.repeat(80));

    // Identify bottlenecks (operations over 1 second)
    const bottlenecks = sortedOps.filter(([_, stats]) => stats.avg > 1000);
    if (bottlenecks.length > 0) {
      console.log('\n⚠️  BOTTLENECKS (avg > 1000ms):');
      console.log('─'.repeat(80));
      bottlenecks.forEach(([name, stats]) => {
        console.log(`• ${name}: avg ${stats.avg}ms, max ${stats.max}ms (${stats.count} samples)`);
      });
    }

    // Show slowest individual operations
    console.log('\n🐌 SLOWEST INDIVIDUAL OPERATIONS:');
    console.log('─'.repeat(80));
    const allSamples = [];
    sortedOps.forEach(([name, stats]) => {
      stats.samples.forEach(sample => {
        allSamples.push({ name, ...sample });
      });
    });
    allSamples.sort((a, b) => b.duration - a.duration).slice(0, 10).forEach(sample => {
      console.log(`• ${sample.name}: ${sample.duration}ms`);
    });

    // Breakdown of prepareOrderForPayment if available
    const mainOp = this.operations.get('prepareOrderForPayment_total');
    if (mainOp && mainOp.count > 0) {
      console.log('\n📊 BREAKDOWN OF prepareOrderForPayment:');
      console.log('─'.repeat(80));
      
      // Calculate what percentage of time each sub-operation takes
      const subOps = [
        'preFetch',
        'bookingOrderCheck',
        'bookingDetailsFetch',
        'orderCreationTx',
        'orderRecalc',
        'finalOrderFetch'
      ];

      subOps.forEach(opName => {
        const op = this.operations.get(opName);
        if (op && op.count > 0) {
          const percentage = Math.round((op.avg / mainOp.avg) * 100);
          console.log(`• ${opName}: ${op.avg}ms (${percentage}% of total)`);
        }
      });
    }

    // Performance recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('─'.repeat(80));
    
    if (this.operations.get('preFetch')?.avg > 500) {
      console.log('• Pre-fetch operations are slow. Consider caching merchant/location data.');
    }
    
    if (this.operations.get('bookingOrderCheck')?.avg > 200) {
      console.log('• Booking order checks are slow. Ensure Order.bookingId index exists.');
    }
    
    if (this.operations.get('orderCreationTx')?.avg > 500) {
      console.log('• Order creation transactions are slow. Consider reducing transaction scope.');
    }
    
    if (this.operations.get('orderRecalc')?.avg > 500) {
      console.log('• Order recalculation is slow. Check for missing indexes on OrderItem/OrderModifier.');
    }
    
    if (this.operations.get('parallelUpdates')?.avg > 1000) {
      console.log('• Parallel updates are slow. May indicate connection pool exhaustion.');
    }

    const totalAvg = mainOp ? mainOp.avg : 0;
    if (totalAvg > 5000) {
      console.log(`\n⚠️  CRITICAL: Average total time is ${totalAvg}ms (${(totalAvg/1000).toFixed(1)}s)`);
      console.log('   Target should be under 2000ms for good user experience.');
    }
  }
}

// Main execution
async function main() {
  const analyzer = new PerformanceAnalyzer();
  
  // Check if input file is provided
  const inputFile = process.argv[2];
  
  if (inputFile && fs.existsSync(inputFile)) {
    // Read from file
    const content = fs.readFileSync(inputFile, 'utf8');
    analyzer.analyzeLog(content);
    analyzer.generateReport();
  } else if (!process.stdin.isTTY) {
    // Read from stdin
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    let buffer = '';
    rl.on('line', (line) => {
      buffer += line + '\n';
    });

    rl.on('close', () => {
      analyzer.analyzeLog(buffer);
      analyzer.generateReport();
    });
  } else {
    console.log('Usage:');
    console.log('  pm2 logs api --nostream --lines 1000 | grep "[PERF]" > perf-logs.txt');
    console.log('  node scripts/analyze-performance-logs.js perf-logs.txt');
    console.log('\nOr pipe directly:');
    console.log('  pm2 logs api --nostream --lines 1000 | grep "[PERF]" | node scripts/analyze-performance-logs.js');
  }
}

main().catch(console.error);