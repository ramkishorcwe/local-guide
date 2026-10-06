import { createServer } from 'node:http';
import { config } from 'dotenv';
import { chatHTTP, bookingHTTP } from './http.js';
config({ path: '.env.local' });
config({ path: '.env' });
createServer((req, res) => {
  if (req.url === '/api/chat') void chatHTTP(req, res);
  else if (req.url === '/api/bookings') void bookingHTTP(req, res);
  else { res.writeHead(404); res.end(); }
}).listen(3001, '127.0.0.1', () => console.log('Local Guide API: http://127.0.0.1:3001'));
