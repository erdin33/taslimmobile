const fs = require('fs');
const content = fs.readFileSync('swagger.js', 'utf8');
const startIdx = content.indexOf('"swaggerDoc":') + 13;
const endIdx = content.indexOf(',\n  "customOptions"');
const jsonStr = content.substring(startIdx, endIdx).trim();
const spec = JSON.parse(jsonStr);
const endpoints = Object.keys(spec.paths).filter(p => p.includes('recon'));
console.log(endpoints);
endpoints.forEach(p => console.log(JSON.stringify({[p]: spec.paths[p]}, null, 2)));
