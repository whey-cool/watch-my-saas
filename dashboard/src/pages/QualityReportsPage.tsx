import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

interface QualityReport {
  id: string;
  type: 'weekly-digest' | 'sprint-retro' | 'alert';
  windowStart: string;
  windowEnd: string;
  data: Record<string, unknown>;
}

interface ReportsResponse {
  data: QualityReport[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

type ReportTypeFilter = 'all' | 'weekly-digest' | 'sprint-retro' | 'alert';

export default function QualityReportsPage() {
  const { id } = useParams<{ id: string }>();
  const [reports, setReports] = useState<QualityReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReportTypeFilter>('all');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

  const fetchReports = (nextCursor?: string) => {
    if (!id) return;

    const params = new URLSearchParams();
    if (nextCursor) {
      params.set('cursor', nextCursor);
    }

    apiFetch<ReportsResponse>(`/projects/${id}/reports?${params.toString()}`)
      .then((res) => {
        if (nextCursor) {
          setReports((prev) => [...prev, ...res.data]);
        } else {
          setReports(res.data);
        }
        setCursor(res.meta.nextCursor);
        setHasMore(res.meta.hasMore);
      })
      .catch((err) => setError(err.message));
  };

  useEffect(() => {
    fetchReports();
  }, [id]);

  const toggleExpand = (reportId: string) => {
    setExpandedReports((prev) => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'weekly-digest':
        return 'bg-blue-100 text-blue-700';
      case 'sprint-retro':
        return 'bg-purple-100 text-purple-700';
      case 'alert':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'weekly-digest':
        return 'Weekly Digest';
      case 'sprint-retro':
        return 'Sprint Retro';
      case 'alert':
        return 'Alert';
      default:
        return type;
    }
  };

  const filteredReports =
    filter === 'all' ? reports : reports.filter((r) => r.type === filter);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/projects/${id}`}
          className="text-sm text-blue-600 hover:underline mb-2 inline-block"
        >
          ← Back to project
        </Link>
        <h2 className="text-xl font-bold">Quality Reports</h2>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('weekly-digest')}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === 'weekly-digest'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Weekly Digest
        </button>
        <button
          onClick={() => setFilter('sprint-retro')}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === 'sprint-retro'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Sprint Retro
        </button>
        <button
          onClick={() => setFilter('alert')}
          className={`px-4 py-2 rounded text-sm font-medium transition ${
            filter === 'alert'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alert
        </button>
      </div>

      {/* Reports list */}
      {filteredReports.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No quality reports yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Reports will appear here as your project develops
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const isExpanded = expandedReports.has(report.id);
            return (
              <div
                key={report.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Report header */}
                <button
                  type="button"
                  className="w-full p-4 text-left cursor-pointer hover:bg-gray-50 transition bg-transparent border-none"
                  onClick={() => toggleExpand(report.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getTypeBadgeClass(
                            report.type
                          )}`}
                        >
                          {getTypeLabel(report.type)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(report.windowStart).toLocaleDateString()} -{' '}
                          {new Date(report.windowEnd).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="text-gray-400" aria-hidden="true">
                      {isExpanded ? (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      )}
                    </span>
                  </div>
                </button>

                {/* Report data (expandable) */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <div className="bg-gray-50 rounded p-3 mt-3">
                      <dl className="space-y-2">
                        {Object.entries(report.data).map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <dt className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                              {key}
                            </dt>
                            <dd className="text-sm text-gray-900 mt-1 font-mono">
                              {typeof value === 'object' && value !== null
                                ? JSON.stringify(value, null, 2)
                                : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Load more button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => fetchReports(cursor ?? undefined)}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
