const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');

try {
  const values = parseEnv(readFileSync(resolve(__dirname, '../../.env'), 'utf8'));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
} catch (error) {
  if (!process.env.DATABASE_URL) throw error;
}
