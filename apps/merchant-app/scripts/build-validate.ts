#!/usr/bin/env node

/**
 * Build Validation Script - Phase 3 Build System Improvements
 * 
 * This script runs various checks before allowing a production build
 * to ensure code quality and prevent runtime errors.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const chalk = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

class BuildValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  async validate(): Promise<ValidationResult> {
    console.log(chalk.blue(chalk.bold('\n🔍 Running build validation...\n')));

    // Run all validations
    await this.checkTypeScript();
    await this.checkESLint();
    await this.checkDependencies();
    await this.checkEnvironmentVariables();
    await this.checkApiEndpoints();
    await this.checkBundleSize();

    // Report results
    const passed = this.errors.length === 0;

    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'));
      this.warnings.forEach(w => console.log(chalk.yellow(`   - ${w}`)));
    }

    if (this.errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'));
      this.errors.forEach(e => console.log(chalk.red(`   - ${e}`)));
    }

    if (passed) {
      console.log(chalk.green('\n✅ Build validation passed!\n'));
    } else {
      console.log(chalk.red('\n❌ Build validation failed!\n'));
    }

    return {
      passed,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  private async checkTypeScript() {
    console.log('📝 Checking TypeScript...');
    try {
      // Use strict config for validation
      execSync('npx tsc --project tsconfig.strict.json --noEmit', { 
        stdio: 'pipe' 
      });
      console.log(chalk.green('   ✓ TypeScript check passed'));
    } catch (error: any) {
      const output = error.stdout?.toString() || error.message;
      const errorCount = (output.match(/error TS/g) || []).length;
      this.errors.push(`TypeScript found ${errorCount} type errors`);
      
      // Log first few errors for context
      const lines = output.split('\n').slice(0, 10);
      lines.forEach((line: string) => {
        if (line.includes('error TS')) {
          console.log(chalk.red(`     ${line.trim()}`));
        }
      });
    }
  }

  private async checkESLint() {
    console.log('🎨 Checking ESLint...');
    try {
      execSync('npx eslint . --ext .ts,.tsx --max-warnings 10', { 
        stdio: 'pipe' 
      });
      console.log(chalk.green('   ✓ ESLint check passed'));
    } catch (error: any) {
      const output = error.stdout?.toString() || error.message;
      const errorMatch = output.match(/(\d+) errors?/);
      const warningMatch = output.match(/(\d+) warnings?/);
      
      if (errorMatch && parseInt(errorMatch[1]) > 0) {
        this.errors.push(`ESLint found ${errorMatch[1]} errors`);
      }
      if (warningMatch && parseInt(warningMatch[1]) > 10) {
        this.warnings.push(`ESLint found ${warningMatch[1]} warnings (max 10 allowed)`);
      }
    }
  }

  private async checkDependencies() {
    console.log('📦 Checking dependencies...');
    
    // Check for missing dependencies
    try {
      const packageJson = JSON.parse(
        readFileSync(join(process.cwd(), 'package.json'), 'utf-8')
      );
      
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Check for specific required dependencies
      const required = ['react', 'react-dom', 'next', 'axios'];
      const missing = required.filter(dep => !deps[dep]);
      
      if (missing.length > 0) {
        this.errors.push(`Missing required dependencies: ${missing.join(', ')}`);
      } else {
        console.log(chalk.green('   ✓ All required dependencies found'));
      }

      // Check for duplicate React versions
      try {
        const output = execSync('npm ls react', { encoding: 'utf-8' });
        const reactVersions = output.match(/react@[\d.]+/g) || [];
        const uniqueVersions = new Set(reactVersions);
        
        if (uniqueVersions.size > 1) {
          this.warnings.push('Multiple React versions detected - this may cause issues');
        }
      } catch {
        // npm ls might fail if there are peer dep issues, ignore
      }
    } catch (error) {
      this.errors.push('Failed to read package.json');
    }
  }

  private async checkEnvironmentVariables() {
    console.log('🔑 Checking environment variables...');
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_API_URL',
    ];

    const envFiles = ['.env', '.env.local', '.env.production', '.env.production.local'];
    let foundVars = new Set<string>();

    // Check all env files
    for (const file of envFiles) {
      const path = join(process.cwd(), file);
      if (existsSync(path)) {
        const content = readFileSync(path, 'utf-8');
        const vars = content.match(/^[A-Z_]+(?==)/gm) || [];
        vars.forEach(v => foundVars.add(v));
      }
    }

    // Check process.env as well
    requiredEnvVars.forEach(varName => {
      if (process.env[varName]) {
        foundVars.add(varName);
      }
    });

    const missing = requiredEnvVars.filter(v => !foundVars.has(v));
    
    if (missing.length > 0) {
      this.warnings.push(`Missing environment variables: ${missing.join(', ')}`);
    } else {
      console.log(chalk.green('   ✓ All required environment variables found'));
    }
  }

  private async checkApiEndpoints() {
    console.log('🌐 Checking API endpoints...');
    
    // Check if API client is properly configured
    const apiClientPath = join(process.cwd(), 'src/lib/api-client.ts');
    if (existsSync(apiClientPath)) {
      const content = readFileSync(apiClientPath, 'utf-8');
      
      // Check for hardcoded localhost URLs
      if (content.includes('http://localhost') && !content.includes('process.env')) {
        this.warnings.push('Hardcoded localhost URL found in API client');
      }
      
      // Check for proper error handling
      if (!content.includes('try') || !content.includes('catch')) {
        this.warnings.push('API client may lack proper error handling');
      }
      
      console.log(chalk.green('   ✓ API client configuration checked'));
    } else {
      this.errors.push('API client not found at expected location');
    }
  }

  private async checkBundleSize() {
    console.log('📊 Checking bundle size...');
    
    // This is a simple check - in production you'd want more sophisticated analysis
    const nextConfigPath = join(process.cwd(), 'next.config.js');
    if (existsSync(nextConfigPath)) {
      const content = readFileSync(nextConfigPath, 'utf-8');
      
      // Check for bundle optimization settings
      if (!content.includes('swcMinify')) {
        this.warnings.push('SWC minification not enabled - bundles may be larger than necessary');
      }
      
      if (!content.includes('optimizePackageImports')) {
        this.warnings.push('Package imports not optimized - consider enabling optimizePackageImports');
      }
      
      console.log(chalk.green('   ✓ Bundle configuration checked'));
    }
  }
}

// Run validation
async function main() {
  const validator = new BuildValidator();
  const result = await validator.validate();
  
  // Exit with error code if validation failed
  if (!result.passed) {
    process.exit(1);
  }
}

// Only run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unexpected error:'), error);
    process.exit(1);
  });
}

export { BuildValidator };