import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

interface BackfillStatus {
  projectId: string;
  status: 'listing' | 'enriching' | 'analyzing' | 'completed' | 'error';
  progress: {
    phase: string;
    processed: number;
    total: number;
    message: string;
  } | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

const PHASE_LABELS: Record<string, string> = {
  listing: 'Fetching commits from GitHub...',
  enriching: 'Enriching with file data...',
  analyzing: 'Running analysis...',
  completed: 'Backfill complete',
  error: 'Backfill failed',
};

export default function BackfillPage() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [enrich, setEnrich] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning = status?.status === 'listing' || status?.status === 'enriching' || status?.status === 'analyzing';

  const pollStatus = () => {
    if (!id) return;

    apiFetch<BackfillStatus>(`/projects/${id}/backfill/status`)
      .then((res) => {
        setStatus(res);
        if (res.status === 'completed' || res.status === 'error') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      })
      .catch(() => {
        // No status yet — that's fine
      });
  };

  useEffect(() => {
    pollStatus();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id]);

  const startBackfill = async () => {
    if (!id) return;

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/projects/${id}/backfill`, {
        method: 'POST',
        body: JSON.stringify({ enrich }),
      });

      // Start polling
      intervalRef.current = setInterval(pollStatus, 2000);
      pollStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start backfill');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = status?.progress && status.progress.total > 0
    ? Math.round((status.progress.processed / status.progress.total) * 100)
    : 0;

  return (
    <div>
      <div className="mb-6">
        <Link to={`/projects/${id}`} className="text-blue-600 hover:underline text-sm">
          &larr; Back to project
        </Link>
      </div>

      <h2 className="text-xl font-bold mb-6">Backfill</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!isRunning && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Fetch Historical Commits</h3>
          <p className="text-sm text-gray-600 mb-4">
            Import existing commit history from GitHub. This classifies each commit
            and populates your project's metrics.
          </p>

          <label className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              checked={enrich}
              onChange={(e) => setEnrich(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">
              Enrich with file data (slower, enables test-drift and ghost-churn detection)
            </span>
          </label>

          <button
            onClick={startBackfill}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Starting...' : 'Start Backfill'}
          </button>
        </div>
      )}

      {status && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              {PHASE_LABELS[status.status] ?? status.status}
            </h3>
            <StatusBadge status={status.status} />
          </div>

          {status.progress && status.progress.total > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{status.progress.message}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    status.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {status.startedAt && (
              <div>
                <p className="text-gray-500">Started</p>
                <p className="text-gray-900">{new Date(status.startedAt).toLocaleString()}</p>
              </div>
            )}
            {status.completedAt && (
              <div>
                <p className="text-gray-500">Completed</p>
                <p className="text-gray-900">{new Date(status.completedAt).toLocaleString()}</p>
              </div>
            )}
          </div>

          {status.error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700 text-sm">{status.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    listing: 'bg-blue-100 text-blue-800',
    enriching: 'bg-purple-100 text-purple-800',
    analyzing: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
