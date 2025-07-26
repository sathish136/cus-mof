const { execSync } = require('child_process');
const path = require('path');

console.log('Building client...');
execSync('npm run build:client', { cwd: path.join(__dirname, 'client'), stdio: 'inherit' });
console.log('Client build completed.');
