#!/usr/bin/env node

/**
 * Build Monitor - Phase 3 Build System Improvements
 * 
 * Monitors build process and reports metrics/errors.
 * This runs during build to capture performance and issues.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BuildMonitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      endTime: null,
      duration: null,
      bundleSize: {},
      errors: [],
      warnings: [],
      performance: {},
    };
  }

  async monitor() {
    console.log('📊 Build monitoring started...\n');

    try {
      // Run the actual build
      const buildStartTime = Date.now();
      
      execSync('next build', {
        stdio: 'inherit',
        env: {
          ...process.env,
          ANALYZE: 'true', // Enable bundle analysis
        },
      });

      const buildEndTime = Date.now();
      this.metrics.duration = buildEndTime - buildStartTime;

      // Analyze build output
      await this.analyzeBuildOutput();
      await this.checkBundleSize();
      await this.analyzePerformance();

      // Generate report
      this.generateReport();

    } catch (error) {
      this.metrics.errors.push({
        type: 'build-failure',
        message: error.message,
        stack: error.stack,
      });
      
      this.generateReport();
      process.exit(1);
    }
  }

  async analyzeBuildOutput() {
    const buildManifest = path.join('.next', 'build-manifest.json');
    
    if (fs.existsSync(buildManifest)) {
      const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf-8'));
      
      // Count pages and chunks
      this.metrics.performance.pageCount = Object.keys(manifest.pages || {}).length;
      this.metrics.performance.totalChunks = Object.keys(manifest.pages || {})
        .reduce((acc, page) => acc + (manifest.pages[page]?.length || 0), 0);
    }
  }

  async checkBundleSize() {
    const statsPath = path.join('.next', 'stats.json');
    
    if (fs.existsSync(statsPath)) {
      const stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
      
      // Calculate bundle sizes
      const assets = stats.assets || [];
      
      this.metrics.bundleSize = {
        totalSize: assets.reduce((sum, asset) => sum + asset.size, 0),
        jsSize: assets
          .filter(a => a.name.endsWith('.js'))
          .reduce((sum, asset) => sum + asset.size, 0),
        cssSize: assets
          .filter(a => a.name.endsWith('.css'))
          .reduce((sum, asset) => sum + asset.size, 0),
        largestAssets: assets
          .sort((a, b) => b.size - a.size)
          .slice(0, 5)
          .map(a => ({
            name: a.name,
            size: a.size,
            sizeKB: (a.size / 1024).toFixed(2),
          })),
      };

      // Check for oversized bundles
      const MAX_BUNDLE_SIZE = 500 * 1024; // 500KB
      const oversized = assets.filter(a => a.size > MAX_BUNDLE_SIZE);
      
      if (oversized.length > 0) {
        this.metrics.warnings.push({
          type: 'bundle-size',
          message: `${oversized.length} bundles exceed 500KB`,
          details: oversized.map(a => `${a.name}: ${(a.size / 1024).toFixed(2)}KB`),
        });
      }
    }
  }

  async analyzePerformance() {
    // Check for common performance issues
    const appDir = path.join('src', 'app');
    
    if (fs.existsSync(appDir)) {
      // Check for barrel imports
      const barrelImports = this.findPattern(appDir, /from ['"]@\//g);
      if (barrelImports > 50) {
        this.metrics.warnings.push({
          type: 'performance',
          message: 'High number of barrel imports detected',
          details: `Found ${barrelImports} barrel imports. Consider direct imports for better tree-shaking.`,
        });
      }

      // Check for large components
      const largeFiles = this.findLargeFiles(appDir, 300); // 300 lines
      if (largeFiles.length > 0) {
        this.metrics.warnings.push({
          type: 'code-quality',
          message: 'Large component files detected',
          details: largeFiles.map(f => `${f.file}: ${f.lines} lines`),
        });
      }
    }
  }

  findPattern(dir, pattern) {
    let count = 0;
    const files = this.getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx']);
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(pattern);
      count += matches ? matches.length : 0;
    });
    
    return count;
  }

  findLargeFiles(dir, maxLines) {
    const largeFiles = [];
    const files = this.getAllFiles(dir, ['.ts', '.tsx', '.js', '.jsx']);
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n').length;
      
      if (lines > maxLines) {
        largeFiles.push({
          file: path.relative(process.cwd(), file),
          lines,
        });
      }
    });
    
    return largeFiles;
  }

  getAllFiles(dir, extensions) {
    const files = [];
    
    const walk = (currentDir) => {
      const entries = fs.readdirSync(currentDir);
      
      entries.forEach(entry => {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
          walk(fullPath);
        } else if (stat.isFile() && extensions.some(ext => entry.endsWith(ext))) {
          files.push(fullPath);
        }
      });
    };
    
    walk(dir);
    return files;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${(this.metrics.duration / 1000).toFixed(2)}s`,
      bundleSize: {
        total: `${(this.metrics.bundleSize.totalSize / 1024 / 1024).toFixed(2)}MB`,
        js: `${(this.metrics.bundleSize.jsSize / 1024 / 1024).toFixed(2)}MB`,
        css: `${(this.metrics.bundleSize.cssSize / 1024).toFixed(2)}KB`,
      },
      performance: this.metrics.performance,
      errors: this.metrics.errors.length,
      warnings: this.metrics.warnings.length,
    };

    console.log('\n📊 Build Report\n');
    console.log('═══════════════════════════════════════\n');
    
    console.log(`⏱️  Build Duration: ${report.duration}`);
    console.log(`📦 Bundle Size: ${report.bundleSize.total}`);
    console.log(`   - JavaScript: ${report.bundleSize.js}`);
    console.log(`   - CSS: ${report.bundleSize.css}`);
    
    if (this.metrics.performance.pageCount) {
      console.log(`📄 Pages: ${this.metrics.performance.pageCount}`);
      console.log(`🧩 Chunks: ${this.metrics.performance.totalChunks}`);
    }

    if (this.metrics.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.metrics.warnings.forEach(warning => {
        console.log(`   - ${warning.message}`);
        if (warning.details) {
          if (Array.isArray(warning.details)) {
            warning.details.forEach(detail => console.log(`     • ${detail}`));
          } else {
            console.log(`     ${warning.details}`);
          }
        }
      });
    }

    if (this.metrics.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.metrics.errors.forEach(error => {
        console.log(`   - ${error.message}`);
      });
    }

    // Save detailed report
    const reportPath = path.join('.next', 'build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.metrics, null, 2));
    console.log(`\n📋 Detailed report saved to: ${reportPath}`);

    // Send to monitoring service in production
    if (process.env.CI || process.env.VERCEL) {
      this.sendToMonitoring(this.metrics);
    }
  }

  async sendToMonitoring(metrics) {
    // In production, send metrics to monitoring service
    console.log('\n📤 Sending metrics to monitoring service...');
    
    // This would integrate with your monitoring service
    // Example: DataDog, New Relic, custom endpoint, etc.
  }
}

// Run the monitor
const monitor = new BuildMonitor();
monitor.monitor();