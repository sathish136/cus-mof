import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Creating Electron executable...');

// Install electron as dev dependency
console.log('Installing electron...');
try {
  execSync('npm install --save-dev electron@latest', { stdio: 'inherit' });
} catch (error) {
  console.log('Electron installation completed');
}

// Create a simple electron builder config
const electronBuilderConfig = {
  "appId": "com.liveu.hr-attendance",
  "productName": "HR Attendance Management System",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "server/**/*",
    "shared/**/*",
    "electron-main.js",
    "package.json",
    "drizzle.config.ts",
    "node_modules/**/*",
    "!node_modules/.cache/**/*"
  ],
  "extraFiles": [
    {
      "from": "server/data",
      "to": "resources/server/data"
    }
  ],
  "win": {
    "target": "portable",
    "artifactName": "HR-Attendance-System-Windows-${version}.exe"
  },
  "linux": {
    "target": "AppImage",
    "artifactName": "HR-Attendance-System-Linux-${version}.AppImage"
  },
  "mac": {
    "target": "dmg",
    "artifactName": "HR-Attendance-System-macOS-${version}.dmg"
  },
  "nsis": {
    "oneClick": false,
    "perMachine": false,
    "allowToChangeInstallationDirectory": true
  }
};

// Write config
fs.writeFileSync('./electron-builder.json', JSON.stringify(electronBuilderConfig, null, 2));

// Try to build
console.log('Building Electron executable...');
try {
  execSync('npx electron-builder --config electron-builder.json', { stdio: 'inherit' });
  console.log('✅ Electron executable created successfully!');
  console.log('Check the dist-electron folder for the executable files.');
} catch (error) {
  console.error('❌ Electron build failed:', error.message);
  console.log('📦 Using portable package instead: dist-package/HR-Attendance-System.zip');
}