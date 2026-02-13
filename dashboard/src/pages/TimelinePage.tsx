import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import TimelineEvent from '../components/TimelineEvent';

interface TimelineEventData {
  id: string;
  type: 'recommendation' | 'milestone' | 'report' | 'phase-change';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const LIMIT_OPTIONS = [10, 25, 50];

export default function TimelinePage() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<TimelineEventData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(25);

  useEffect(() => {
    if (!id) return;

    apiFetch<{ data: TimelineEventData[] }>(`/projects/${id}/timeline?limit=${limit}`)
      .then((res) => setEvents(res.data))
      .catch((err) => setError(err.message));
  }, [id, limit]);

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

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Timeline</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="timeline-limit" className="text-sm text-gray-600">Show:</label>
          <select
            id="timeline-limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} events</option>
            ))}
          </select>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-6 text-center">
          <p className="text-gray-500">No timeline events yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Events will appear here as recommendations, milestones, and reports are created.
          </p>
        </div>
      ) : (
        <div>
          {events.map((event) => (
            <TimelineEvent key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
