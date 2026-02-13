import { z } from 'zod';

const booleanString = z
  .string()
  .optional()
  .transform((val) => val === 'true');

const configSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  API_KEY: z.string().min(1, 'API_KEY is required'),
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 3000)),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .optional()
    .default('development'),
  GITHUB_TOKEN: z.string().optional(),
  WATCHMYSAAS_FEATURE_DASHBOARD: booleanString,
  WATCHMYSAAS_FEATURE_PUBLIC_TIMELINE: booleanString,
  WATCHMYSAAS_TELEMETRY: booleanString,
  WATCHMYSAAS_INSTANCE_ID: z.string().optional().default(''),
});

export interface AppConfig {
  readonly databaseUrl: string;
  readonly apiKey: string;
  readonly port: number;
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly githubToken: string | undefined;
  readonly instanceId: string;
  readonly features: {
    readonly dashboard: boolean;
    readonly publicTimeline: boolean;
    readonly telemetry: boolean;
  };
}

export function loadConfig(): AppConfig {
  const parsed = configSchema.parse(process.env);

  return {
    databaseUrl: parsed.DATABASE_URL,
    apiKey: parsed.API_KEY,
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    githubToken: parsed.GITHUB_TOKEN,
    instanceId: parsed.WATCHMYSAAS_INSTANCE_ID,
    features: {
      dashboard: parsed.WATCHMYSAAS_FEATURE_DASHBOARD,
      publicTimeline: parsed.WATCHMYSAAS_FEATURE_PUBLIC_TIMELINE,
      telemetry: parsed.WATCHMYSAAS_TELEMETRY,
    },
  };
}
