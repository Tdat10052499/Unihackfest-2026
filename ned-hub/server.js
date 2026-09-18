const express = require('express');
const { createServer } = require('http');
require('dotenv').config({ path: '.env.local' });
// Compile TS on the fly
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'node' } });

const handler = require('./api/transactions/sponsor.ts').default;

const app = express();
app.use(express.json());

app.all('/api/transactions/sponsor', async (req, res) => {
  // Mock VercelRequest and VercelResponse
  try {
    await handler(req, res);
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`Relayer Express server listening on port ${port}`);
});
