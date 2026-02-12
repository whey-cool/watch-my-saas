import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp({ apiKey: config.apiKey });

serve(
  {
    fetch: app.fetch,
    port: config.port,
  },
  (info) => {
    console.log(`Watch My SaaS API running on http://localhost:${info.port}`);
    console.log(`Dashboard: ${config.features.dashboard ? 'enabled' : 'disabled'}`);
    console.log(`Telemetry: ${config.features.telemetry ? 'enabled' : 'disabled'}`);
  },
);
