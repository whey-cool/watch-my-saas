import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HealthPage from './pages/HealthPage';
import ProjectsPage from './pages/ProjectsPage';
import CommitsPage from './pages/CommitsPage';
import ProjectOverviewPage from './pages/ProjectOverviewPage';
import RecommendationsPage from './pages/RecommendationsPage';
import QualityReportsPage from './pages/QualityReportsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/health" replace />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectOverviewPage />} />
        <Route path="/projects/:id/commits" element={<CommitsPage />} />
        <Route path="/projects/:id/recommendations" element={<RecommendationsPage />} />
        <Route path="/projects/:id/reports" element={<QualityReportsPage />} />
      </Route>
    </Routes>
  );
}
