const fs = require('fs');
const content = fs.readFileSync('server/routes/provider-auth.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('pending') || line.includes('router.get')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
