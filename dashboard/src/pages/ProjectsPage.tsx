import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

interface Project {
  id: string;
  name: string;
  repoFullName: string;
  commitCount: number;
  lastCommitAt: string | null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: Project[] }>('/projects')
      .then((res) => setProjects(res.data))
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Connected Projects</h2>
      {projects.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-6 text-center">
          <p className="text-gray-500">No projects connected yet.</p>
          <p className="text-gray-400 text-sm mt-1">Set up a GitHub webhook to get started.</p>
        </div>
      ) : (
        <table className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Repository</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Commits</th>
              <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">Last Commit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    to={`/projects/${project.id}/commits`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {project.repoFullName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">{project.commitCount}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {project.lastCommitAt
                    ? new Date(project.lastCommitAt).toLocaleDateString()
                    : 'No commits'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
