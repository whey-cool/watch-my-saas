import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import PhaseBadge from '../components/PhaseBadge';
import MetricCard from '../components/MetricCard';

interface PhaseIndicator {
  phase: string;
  confidence: number;
  signals: string[];
  guidance: string;
}

interface MetricTrend {
  current: number;
  previous: number;
  direction: 'up' | 'stable' | 'down';
  changePercent: number;
}

interface ProjectOverview {
  id: string;
  name: string;
  repoFullName: string;
  phase: PhaseIndicator;
  aiRatio: MetricTrend;
  velocity: MetricTrend;
  qualitySignal: MetricTrend;
  stabilityIndex: MetricTrend;
  activeRecommendations: number;
  commitCount: number;
  lastCommitAt: string | null;
  lastAnalyzedAt: string | null;
}

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!id) return;

    apiFetch<{ data: ProjectOverview }>(`/projects/${id}`)
      .then((res) => setProject(res.data))
      .catch((err) => setError(err.message));
  }, [id]);

  const triggerAnalysis = async () => {
    if (!id) return;

    setAnalyzing(true);
    try {
      await apiFetch(`/projects/${id}/analyze`, { method: 'POST' });
      // Refetch project data after analysis
      const res = await apiFetch<{ data: ProjectOverview }>(`/projects/${id}`);
      setProject(res.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  if (!project) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Phase banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <PhaseBadge phase={project.phase} />
          <div className="flex-1">
            <p className="text-gray-700 mb-2">{project.phase.guidance}</p>
            <p className="text-sm text-gray-500">
              Confidence: {(project.phase.confidence * 100).toFixed(0)}%
            </p>
            {project.phase.signals.length > 0 && (
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {project.phase.signals.map((signal, idx) => (
                  <li key={idx}>{signal}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="AI Ratio" trend={project.aiRatio} format="percent" />
        <MetricCard label="Velocity" trend={project.velocity} format="number" />
        <MetricCard label="Quality Signal" trend={project.qualitySignal} format="percent" />
        <MetricCard
          label="Stability Index"
          trend={{
            ...project.stabilityIndex,
            // Invert direction for display: lower stability = less churn = good
            direction:
              project.stabilityIndex.direction === 'up'
                ? 'down'
                : project.stabilityIndex.direction === 'down'
                  ? 'up'
                  : 'stable',
          }}
          format="percent"
        />
      </div>

      {/* Quick links */}
      <div className="flex gap-4">
        <Link
          to={`/projects/${project.id}/recommendations`}
          className="text-blue-600 hover:underline font-medium"
        >
          {project.activeRecommendations} active recommendation
          {project.activeRecommendations !== 1 ? 's' : ''}
        </Link>
        <Link
          to={`/projects/${project.id}/commits`}
          className="text-blue-600 hover:underline font-medium"
        >
          View commits ({project.commitCount})
        </Link>
      </div>

      {/* Trigger analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <button
          onClick={triggerAnalysis}
          disabled={analyzing}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {analyzing ? 'Analyzing...' : 'Trigger Analysis'}
        </button>
      </div>

      {/* Footer info */}
      <div className="text-sm text-gray-500">
        <p>
          Last analyzed:{' '}
          {project.lastAnalyzedAt
            ? new Date(project.lastAnalyzedAt).toLocaleString()
            : 'Never'}
        </p>
      </div>
    </div>
  );
}
