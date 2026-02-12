import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test loadConfig directly — it reads process.env on each call
import { loadConfig } from '../config.js';

describe('loadConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  function setRequiredEnv() {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    vi.stubEnv('API_KEY', 'test-key-123');
  }

  it('should parse valid configuration', () => {
    setRequiredEnv();

    const config = loadConfig();

    expect(config.databaseUrl).toBe('postgresql://localhost:5432/test');
    expect(config.apiKey).toBe('test-key-123');
    expect(config.port).toBe(3000);
    // vitest sets NODE_ENV=test
    expect(config.nodeEnv).toBe('test');
  });

  it('should throw on missing DATABASE_URL', () => {
    vi.stubEnv('API_KEY', 'test-key');
    delete process.env.DATABASE_URL;

    expect(() => loadConfig()).toThrow();
  });

  it('should throw on missing API_KEY', () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
    delete process.env.API_KEY;

    expect(() => loadConfig()).toThrow();
  });

  it('should default feature flags to false', () => {
    setRequiredEnv();

    const config = loadConfig();

    expect(config.features.dashboard).toBe(false);
    expect(config.features.publicTimeline).toBe(false);
    expect(config.features.telemetry).toBe(false);
  });

  it('should parse feature flags as true when set', () => {
    setRequiredEnv();
    vi.stubEnv('WATCHMYSAAS_FEATURE_DASHBOARD', 'true');
    vi.stubEnv('WATCHMYSAAS_TELEMETRY', 'true');

    const config = loadConfig();

    expect(config.features.dashboard).toBe(true);
    expect(config.features.telemetry).toBe(true);
  });

  it('should use custom port when provided', () => {
    setRequiredEnv();
    vi.stubEnv('PORT', '8080');

    const config = loadConfig();

    expect(config.port).toBe(8080);
  });
});
