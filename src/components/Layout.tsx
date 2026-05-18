import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Upload, CalendarDays, FileText, Settings, Flame, Target } from 'lucide-react';
import { useMissionStore } from '../stores/missionStore';
import { useCourseStore } from '../stores/courseStore';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'DASHBOARD' },
  { to: '/import', icon: Upload, label: 'IMPORT COURSE' },
  { to: '/sprints', icon: CalendarDays, label: 'SPRINTS' },
  { to: '/report', icon: FileText, label: 'NIGHT REPORT' },
  { to: '/settings', icon: Settings, label: 'SETTINGS' },
];

export default function Layout() {
  const loc = useLocation();
  const streak = useMissionStore(s => s.streak);
  const courses = useCourseStore(s => s.courses);
  const totalPct = courses.length > 0
    ? Math.round(courses.reduce((s, c) => s + c.completedMinutes, 0) / Math.max(courses.reduce((s, c) => s + c.totalMinutes, 0), 1) * 100)
    : 0;

  return (
    <div className="min-h-screen flex bg-peos-bg">
      <aside className="w-56 border-r border-peos-border flex flex-col bg-peos-surface/50 backdrop-blur-xl">
        <div className="p-4 border-b border-peos-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-peos-green/20 to-peos-blue/20 border border-peos-green/30 flex items-center justify-center">
              <Target className="w-4 h-4 text-peos-green" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-[0.2em] text-peos-text font-mono">PEOS</h1>
              <p className="text-[9px] text-peos-text-dim tracking-wider">EXECUTION PLANNER</p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="px-4 py-3 border-b border-peos-border flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" style={{ color: streak > 0 ? '#FF6B35' : '#555' }} />
            <span className="text-xs font-mono font-bold" style={{ color: streak > 0 ? '#FF6B35' : '#555' }}>{streak}</span>
          </div>
          <div className="flex-1 h-1.5 bg-peos-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-peos-green rounded-full transition-all duration-500" style={{ width: `${totalPct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-peos-text-dim">{totalPct}%</span>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map(item => {
            const active = loc.pathname === item.to;
            return (
              <NavLink key={item.to} to={item.to}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] tracking-wider transition-all ${
                  active ? 'bg-peos-green/10 text-peos-green border border-peos-green/20' : 'text-peos-text-dim hover:text-peos-text hover:bg-peos-surface-2'
                }`}>
                <item.icon className="w-3.5 h-3.5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-peos-border">
          <p className="text-[9px] text-peos-text-dim/40 text-center">
            {courses.length} course{courses.length !== 1 ? 's' : ''} loaded
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="p-5 max-w-5xl mx-auto">
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
