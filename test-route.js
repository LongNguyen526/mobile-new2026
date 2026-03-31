const https = require('https');

const data = JSON.stringify({
  StartAddress: "Phường Bến Nghé, Hồ Chí Minh",
  EndAddress: "Phường Tân Định, Hồ Chí Minh",
  TravelMode: "Driving",
  FloodRadiusMeters: 300
});

const options = {
  hostname: 'floodleveliot-be.onrender.com',
  path: '/api/Maps/route-avoid-flood',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log("RESPONSE:", body);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
