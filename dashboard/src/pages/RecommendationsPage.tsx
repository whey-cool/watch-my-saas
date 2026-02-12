import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import SeverityBadge from '../components/SeverityBadge';

type RecommendationPattern =
  | 'sprint-drift'
  | 'ghost-churn'
  | 'ai-handoff-cliff'
  | 'tool-transition'
  | 'test-drift'
  | 'changelog-silence'
  | 'workflow-breakthrough';

type RecommendationStatus = 'active' | 'acknowledged' | 'dismissed' | 'resolved';

type RecommendationSeverity = 'critical' | 'high' | 'medium' | 'low';

interface Recommendation {
  id: string;
  pattern: RecommendationPattern;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  evidence: {
    commits?: string[];
    files?: string[];
    metrics?: Record<string, unknown>;
  };
  nextSteps: string[];
  status: RecommendationStatus;
  detectedAt: string;
  acknowledgedAt: string | null;
  dismissedAt: string | null;
  resolvedAt: string | null;
}

const STATUS_TABS: RecommendationStatus[] = ['active', 'acknowledged', 'dismissed', 'resolved'];

const PATTERN_NAMES: Record<RecommendationPattern, string> = {
  'sprint-drift': 'Sprint-Drift Cycle',
  'ghost-churn': 'Ghost Churn',
  'ai-handoff-cliff': 'AI Handoff Cliff',
  'tool-transition': 'Tool Transition Spike',
  'test-drift': 'Test Coverage Drift',
  'changelog-silence': 'Changelog Silence',
  'workflow-breakthrough': 'Workflow Breakthrough',
};

export default function RecommendationsPage() {
  const { id } = useParams<{ id: string }>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RecommendationStatus>('active');
  const [expandedEvidence, setExpandedEvidence] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    apiFetch<{ data: Recommendation[] }>(`/projects/${id}/recommendations?status=${activeTab}`)
      .then((res) => setRecommendations(res.data))
      .catch((err) => setError(err.message));
  }, [id, activeTab]);

  const toggleEvidence = (recId: string) => {
    setExpandedEvidence((prev) => {
      const next = new Set(prev);
      if (next.has(recId)) {
        next.delete(recId);
      } else {
        next.add(recId);
      }
      return next;
    });
  };

  const updateStatus = async (recId: string, newStatus: 'acknowledged' | 'dismissed') => {
    if (!id) return;

    setUpdatingId(recId);
    try {
      await apiFetch(`/projects/${id}/recommendations/${recId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setRecommendations((prev) => prev.filter((r) => r.id !== recId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recommendation');
    } finally {
      setUpdatingId(null);
    }
  };

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

      <h2 className="text-xl font-bold mb-4">Recommendations</h2>

      <div className="flex gap-2 mb-6 border-b border-gray-200" role="tablist">
        {STATUS_TABS.map((status) => (
          <button
            key={status}
            role="tab"
            aria-selected={activeTab === status}
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === status
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {recommendations.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-6 text-center">
          <p className="text-gray-500">No {activeTab} recommendations.</p>
          {activeTab === 'active' && (
            <p className="text-gray-400 text-sm mt-1">
              Great! Your workflow is looking healthy. Check back as new patterns emerge.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={rec.severity} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{PATTERN_NAMES[rec.pattern]}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Detected {new Date(rec.detectedAt).toLocaleDateString()}
                </p>
              </div>

              <p className="text-gray-700 mb-4">{rec.description}</p>

              <div className="mb-4">
                <button
                  onClick={() => toggleEvidence(rec.id)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {expandedEvidence.has(rec.id) ? 'Hide evidence' : 'Show evidence'}
                </button>

                {expandedEvidence.has(rec.id) && (
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-4 text-sm">
                    {rec.evidence.commits && rec.evidence.commits.length > 0 && (
                      <div className="mb-3">
                        <p className="font-medium text-gray-700 mb-1">Commits:</p>
                        <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                          {rec.evidence.commits.map((sha) => (
                            <li key={sha} className="font-mono text-xs">
                              {sha}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rec.evidence.files && rec.evidence.files.length > 0 && (
                      <div className="mb-3">
                        <p className="font-medium text-gray-700 mb-1">Files:</p>
                        <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                          {rec.evidence.files.map((file) => (
                            <li key={file} className="font-mono text-xs">
                              {file}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {rec.evidence.metrics && Object.keys(rec.evidence.metrics).length > 0 && (
                      <div>
                        <p className="font-medium text-gray-700 mb-1">Metrics:</p>
                        <pre className="text-xs text-gray-600 font-mono">
                          {JSON.stringify(rec.evidence.metrics, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="font-medium text-gray-700 text-sm mb-2">Next steps:</p>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                  {rec.nextSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>

              {rec.status === 'active' && (
                <div className="flex gap-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => updateStatus(rec.id, 'acknowledged')}
                    disabled={updatingId === rec.id}
                    className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatingId === rec.id ? 'Updating...' : 'Acknowledge'}
                  </button>
                  <button
                    onClick={() => updateStatus(rec.id, 'dismissed')}
                    disabled={updatingId === rec.id}
                    className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatingId === rec.id ? 'Updating...' : 'Dismiss'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
