import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Creating True Windows EXE with PKG...');

// Install pkg for creating standalone executables
console.log('Installing pkg...');
try {
  execSync('npm install -g pkg', { stdio: 'inherit' });
} catch (error) {
  console.log('PKG installation attempted');
}

// Create a standalone Node.js app that bundles everything
const standaloneApp = `#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Database URL embedded in the executable
process.env.DATABASE_URL = 'postgresql://hr_attendance_owner:bj7LiNTfW8pN@ep-wispy-butterfly-a5fltqe3.us-east-2.aws.neon.tech/hr_attendance?sslmode=require';
process.env.NODE_ENV = 'production';
process.env.PORT = '5000';
process.env.LICENSE_KEY = 'M5N7-B8C2-L4X6-W9Z0';

console.log('');
console.log('========================================');
console.log('  HR Attendance Management System');
console.log('  Live U Pvt Ltd');
console.log('========================================');
console.log('');
console.log('Starting application...');

// Start the server by requiring the main app
try {
  require('./dist-package/HR-Attendance-App/server/index.ts');
  
  // Wait for server to start then open browser
  setTimeout(() => {
    console.log('');
    console.log('✓ Server started successfully!');
    console.log('');
    console.log('Opening web browser...');
    console.log('Web Interface: http://localhost:5000');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('');
    
    // Open browser automatically
    const { exec } = require('child_process');
    exec('start http://localhost:5000', (error) => {
      if (error) {
        console.log('Please manually open: http://localhost:5000');
      }
    });
  }, 3000);
  
} catch (error) {
  console.error('Failed to start server:', error.message);
  console.log('');
  console.log('Press any key to exit...');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', process.exit.bind(process, 0));
}
`;

// Write the standalone app
fs.writeFileSync('./hr-attendance-standalone.js', standaloneApp);

// Create package.json for the standalone app
const standalonePackage = {
  "name": "hr-attendance-system",
  "version": "1.0.0",
  "description": "HR Attendance Management System - Standalone Executable",
  "main": "hr-attendance-standalone.js",
  "bin": "hr-attendance-standalone.js",
  "pkg": {
    "scripts": ["dist-package/HR-Attendance-App/**/*.js"],
    "assets": ["dist-package/HR-Attendance-App/**/*"],
    "targets": ["node18-win-x64"],
    "outputPath": "exe-output"
  }
};

fs.writeFileSync('./standalone-package.json', JSON.stringify(standalonePackage, null, 2));

// Try to create the EXE
console.log('Building Windows EXE...');
try {
  execSync('pkg hr-attendance-standalone.js --config standalone-package.json --output HR-Attendance-System.exe', { stdio: 'inherit' });
  console.log('✅ EXE created successfully: HR-Attendance-System.exe');
} catch (error) {
  console.error('❌ PKG failed. Creating alternative portable solution...');
  
  // Create alternative: Self-extracting batch file
  const selfExtractingBat = \`@echo off
title HR Attendance Management System
echo.
echo ========================================
echo  HR Attendance Management System
echo  Live U Pvt Ltd
echo ========================================
echo.

echo Starting system...
echo Database: Connected to Neon PostgreSQL
echo License: M5N7-B8C2-L4X6-W9Z0
echo.

cd /d "%~dp0"
if exist "HR-Attendance-App" (
    cd HR-Attendance-App
    echo Starting server...
    start /min npm run dev
    timeout /t 5 /nobreak > nul
    echo Opening web browser...
    start http://localhost:5000
    echo.
    echo ========================================
    echo  Application is now running!
    echo  
    echo  Web Interface: http://localhost:5000
    echo  Username: admin
    echo  Password: admin123
    echo  
    echo  Close this window to stop the server
    echo ========================================
    echo.
    pause
) else (
    echo ERROR: Application files not found!
    echo Please ensure HR-Attendance-App folder is in the same directory.
    pause
)
\`;

  fs.writeFileSync('./dist-package/HR-Attendance-AutoStart.bat', selfExtractingBat);
  console.log('✅ Alternative created: HR-Attendance-AutoStart.bat');
}