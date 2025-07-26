const { execSync } = require('child_process');
const path = require('path');

console.log('Building client...');
execSync('npx vite build', { cwd: path.join(__dirname), stdio: 'inherit' });
console.log('Client build completed.');
