import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const DEFAULT_DEST = '/Users/rogerjanusiak/Library/Application Support/Cryptomator/mnt/RJanusiakPersonal/Personal/Owen';

function buildTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

export async function runBackup(dest = DEFAULT_DEST) {
  try {
    await fs.access(dest);
  } catch {
    throw new Error(`Backup destination does not exist: ${dest}`);
  }

  const filename = `owen-backup-${buildTimestamp()}.sql`;
  const outputPath = path.join(dest, filename);

  const { stdout } = await execAsync('docker compose exec -T mysql mysqldump -u owen -powen owen');
  await fs.writeFile(outputPath, stdout);

  return filename;
}
