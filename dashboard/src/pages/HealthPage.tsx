import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

interface HealthData {
  status: 'ok' | 'degraded';
  version: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<HealthData>('/health')
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <h2 className="text-red-800 font-semibold">API Unreachable</h2>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (!health) {
    return <p className="text-gray-500">Loading...</p>;
  }

  const isOk = health.status === 'ok';

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">System Health</h2>
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-lg p-4 ${isOk ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <p className="text-sm text-gray-600">Status</p>
          <p className={`text-lg font-semibold ${isOk ? 'text-green-700' : 'text-yellow-700'}`}>
            {health.status.toUpperCase()}
          </p>
        </div>
        <div className="rounded-lg p-4 bg-white border border-gray-200">
          <p className="text-sm text-gray-600">Version</p>
          <p className="text-lg font-semibold">{health.version}</p>
        </div>
        <div className={`rounded-lg p-4 ${health.database === 'connected' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className="text-sm text-gray-600">Database</p>
          <p className={`text-lg font-semibold ${health.database === 'connected' ? 'text-green-700' : 'text-red-700'}`}>
            {health.database}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4">Last checked: {new Date(health.timestamp).toLocaleString()}</p>
    </div>
  );
}
