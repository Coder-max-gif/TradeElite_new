import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServerEntry } from './dist/server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the client build
app.use(express.static(path.join(__dirname, 'dist/client')));

// Handle SSR requests
app.all('*', async (req, res) => {
  try {
    const { handle } = await createServerEntry();
    await handle(req, res);
  } catch (error) {
    console.error('SSR Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`TradeElite Terminal running at http://localhost:${port}`);
});
