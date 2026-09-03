const fs = require('fs');
const content = fs.readFileSync('swagger.js', 'utf8');
const startIdx = content.indexOf('"swaggerDoc":') + 13;
const endIdx = content.indexOf(',\n  "customOptions"');
const jsonStr = content.substring(startIdx, endIdx).trim();
const spec = JSON.parse(jsonStr);
console.log('USERS POST:', JSON.stringify(spec.paths['/users']?.post, null, 2));
console.log('USERS PUT:', JSON.stringify(spec.paths['/users/{id}']?.put, null, 2));
