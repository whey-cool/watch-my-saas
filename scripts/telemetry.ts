/**
 * Telemetry CLI: npm run telemetry -- status|enable|disable
 *
 * Manages opt-in anonymous usage telemetry.
 * No PII is ever collected — only aggregate counts.
 */

import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILE = resolve(process.cwd(), '.env');

function readEnv(): Map<string, string> {
  const envMap = new Map<string, string>();
  if (!existsSync(ENV_FILE)) return envMap;

  const content = readFileSync(ENV_FILE, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1).replace(/^["']|["']$/g, '');
    envMap.set(key, value);
  }
  return envMap;
}

function writeEnv(envMap: Map<string, string>): void {
  const lines: string[] = [];
  for (const [key, value] of envMap) {
    lines.push(`${key}=${value}`);
  }
  writeFileSync(ENV_FILE, lines.join('\n') + '\n');
}

const command = process.argv[2];

switch (command) {
  case 'status': {
    const env = readEnv();
    const enabled = env.get('WATCHMYSAAS_TELEMETRY') === 'true';
    const instanceId = env.get('WATCHMYSAAS_INSTANCE_ID') ?? '';
    console.log(`Telemetry: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    if (instanceId) {
      console.log(`Instance ID: ${instanceId}`);
    }
    break;
  }

  case 'enable': {
    const env = readEnv();
    env.set('WATCHMYSAAS_TELEMETRY', 'true');
    if (!env.get('WATCHMYSAAS_INSTANCE_ID')) {
      env.set('WATCHMYSAAS_INSTANCE_ID', randomUUID());
    }
    writeEnv(env);
    console.log('Telemetry enabled.');
    console.log(`Instance ID: ${env.get('WATCHMYSAAS_INSTANCE_ID')}`);
    break;
  }

  case 'disable': {
    const env = readEnv();
    env.set('WATCHMYSAAS_TELEMETRY', 'false');
    writeEnv(env);
    console.log('Telemetry disabled.');
    break;
  }

  default:
    console.log('Usage: npm run telemetry -- status|enable|disable');
    process.exit(1);
}
