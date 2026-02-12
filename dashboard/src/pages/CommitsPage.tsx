import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import AuthorBadge from '../components/AuthorBadge';

interface Commit {
  id: string;
  sha: string;
  message: string;
  authorName: string;
  authorType: 'human' | 'ai' | 'bot';
  aiTool: string | null;
  category: string;
  filesChanged: number;
  timestamp: string;
}

interface CommitsResponse {
  data: Commit[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export default function CommitsPage() {
  const { id } = useParams<{ id: string }>();
  const [commits, setCommits] = useState<Commit[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<CommitsResponse>(`/projects/${id}/commits`)
      .then((res) => setCommits(res.data))
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Recent Commits</h2>
      {commits.length === 0 ? (
        <p className="text-gray-500">No commits recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {commits.map((commit) => (
            <div
              key={commit.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm truncate">{commit.message.split('\n')[0]}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-mono">{commit.sha.slice(0, 7)}</span>
                  {' by '}
                  {commit.authorName}
                  {' · '}
                  {new Date(commit.timestamp).toLocaleDateString()}
                  {' · '}
                  {commit.filesChanged} file{commit.filesChanged !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <AuthorBadge authorType={commit.authorType} aiTool={commit.aiTool} />
                <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  {commit.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
