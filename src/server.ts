import express from 'express';

const app = express();
const DEFAULT_PORT = 3000;
const PORT = process.env['PORT'] ?? DEFAULT_PORT;

app.get('/', (_req, res) => {
  res.json({ message: 'MCP Server Platform' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
