import { rmSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const buildDirectory = resolve(process.cwd(), '.next');
if (!buildDirectory.endsWith(`${sep}.next`)) {
  throw new Error(`Refusing to clean unexpected directory: ${buildDirectory}`);
}
rmSync(buildDirectory, { recursive: true, force: true });
