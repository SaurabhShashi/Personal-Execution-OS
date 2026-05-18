import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './routes/Dashboard';
import CourseImport from './routes/CourseImport';
import SprintView from './routes/SprintView';
import NightReport from './routes/NightReport';
import Settings from './routes/Settings';
import { useEffect } from 'react';
import { useMissionStore } from './stores/missionStore';

export default function App() {
  const activeSession = useMissionStore(s => s.activeSession);
  const tickFocus = useMissionStore(s => s.tickFocus);

  // Global focus timer
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'running') return;
    const interval = setInterval(tickFocus, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.status, tickFocus]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/import" element={<CourseImport />} />
          <Route path="/sprints" element={<SprintView />} />
          <Route path="/report" element={<NightReport />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
