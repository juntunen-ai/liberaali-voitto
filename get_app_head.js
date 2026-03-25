const fs = require('fs');
console.log(fs.readFileSync('src/App.tsx', 'utf8').split('\n').slice(0, 25).join('\n'));
