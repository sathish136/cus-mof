import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Creating HR Attendance Management System Portable Package...');

// Create dist directory structure
const distDir = './dist-package';
const appDir = path.join(distDir, 'HR-Attendance-App');

// Create directories
fs.mkdirSync(appDir, { recursive: true });
fs.mkdirSync(path.join(appDir, 'server'), { recursive: true });
fs.mkdirSync(path.join(appDir, 'shared'), { recursive: true });

// Copy essential files
console.log('Copying application files...');

// Copy server files
const serverFiles = [
  'server/index.ts',
  'server/db.ts', 
  'server/storage.ts',
  'server/routes.ts',
  'server/vite.ts',
  'server/attendanceCalculator.ts',
  'server/hrSettings.ts',
  'server/sessionManager.ts',
  'server/shortLeaveTracker.ts',
  'server/zkdevice.ts'
];

serverFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const destPath = path.join(appDir, file);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(file, destPath);
  }
});

// Copy shared schema
if (fs.existsSync('shared/schema.ts')) {
  fs.copyFileSync('shared/schema.ts', path.join(appDir, 'shared/schema.ts'));
}

// Copy data directory
if (fs.existsSync('server/data')) {
  execSync(`cp -r server/data ${path.join(appDir, 'server/')}`);
}

// Copy package.json
fs.copyFileSync('package.json', path.join(appDir, 'package.json'));

// Copy config files
const configFiles = ['drizzle.config.ts', 'tailwind.config.ts', 'vite.config.ts', 'postcss.config.js'];
configFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join(appDir, file));
  }
});

// Create startup script
const startupScript = `#!/bin/bash
echo "Starting HR Attendance Management System..."
echo "Installing dependencies..."
npm install
echo "Starting application..."
npm run dev
`;

fs.writeFileSync(path.join(appDir, 'start.sh'), startupScript);
fs.chmodSync(path.join(appDir, 'start.sh'), 0o755);

// Create Windows batch file
const windowsScript = `@echo off
echo Starting HR Attendance Management System...
echo Installing dependencies...
npm install
echo Starting application...
npm run dev
pause`;

fs.writeFileSync(path.join(appDir, 'start.bat'), windowsScript);

// Create README
const readme = `# HR Attendance Management System

## Installation Instructions

### Windows:
1. Ensure Node.js 18+ is installed
2. Double-click start.bat
3. Open browser to http://localhost:5000

### Linux/Mac:
1. Ensure Node.js 18+ is installed
2. Run: ./start.sh
3. Open browser to http://localhost:5000

## Requirements:
- Node.js 18 or higher
- PostgreSQL database (set DATABASE_URL environment variable)

## Default Login:
- Username: admin
- Password: admin123

## Support:
Contact Live U Pvt Ltd for technical support.
`;

fs.writeFileSync(path.join(appDir, 'README.md'), readme);

console.log('Package created successfully in:', appDir);
console.log('To distribute: zip the HR-Attendance-App folder');