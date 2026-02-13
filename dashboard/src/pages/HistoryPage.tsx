import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

interface MetricWindow {
  windowStart: string;
  windowEnd: string;
  totalCommits: number;
  aiCommits: number;
  humanCommits: number;
  aiRatio: number;
  testRatio: number;
  totalFilesChanged: number;
  totalTestFilesTouched: number;
  uniqueAiTools: string[];
}

export default function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [windows, setWindows] = useState<MetricWindow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    apiFetch<{ data: MetricWindow[] }>(`/projects/${id}/metrics/history`)
      .then((res) => setWindows(res.data))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link to={`/projects/${id}`} className="text-blue-600 hover:underline text-sm">
          &larr; Back to project
        </Link>
      </div>

      <h2 className="text-xl font-bold mb-6">History</h2>

      {windows.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-6 text-center">
          <p className="text-gray-500">No historical data yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Run a backfill to populate historical metrics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              label="Total Weeks"
              value={String(windows.length)}
            />
            <SummaryCard
              label="Latest AI Ratio"
              value={`${(windows[windows.length - 1].aiRatio * 100).toFixed(0)}%`}
            />
            <SummaryCard
              label="Total Commits"
              value={String(windows.reduce((sum, w) => sum + w.totalCommits, 0))}
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Week</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Commits</th>
                  <th className="px-4 py-3 font-medium text-gray-700">AI Ratio</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Test Ratio</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Files Changed</th>
                  <th className="px-4 py-3 font-medium text-gray-700">AI Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {windows.map((w, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {new Date(w.windowStart).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-900">{w.totalCommits}</span>
                      <span className="text-gray-400 ml-1 text-xs">
                        ({w.aiCommits} AI / {w.humanCommits} human)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${w.aiRatio * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-700">{(w.aiRatio * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {(w.testRatio * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-gray-700">{w.totalFilesChanged}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {w.uniqueAiTools.join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
