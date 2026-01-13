const http = require('http');

http.get('http://localhost:3001/api/shifts', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Shifts:', data);
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
