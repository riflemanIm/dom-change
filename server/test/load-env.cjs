const { existsSync, readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');

try {
  const localEnv = resolve(__dirname, '../../.env');
  const exampleEnv = resolve(__dirname, '../../.env.example');
  const values = parseEnv(readFileSync(existsSync(localEnv) ? localEnv : exampleEnv, 'utf8'));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
} catch (error) {
  if (!process.env.DATABASE_URL) throw error;
}
