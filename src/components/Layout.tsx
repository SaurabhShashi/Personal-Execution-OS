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
    <div className="min-h-screen flex flex-col md:flex-row bg-peos-bg pb-16 md:pb-0">
      <aside className="fixed bottom-0 w-full z-50 md:static md:w-56 border-t md:border-t-0 md:border-r border-peos-border flex md:flex-col bg-peos-surface/90 backdrop-blur-xl">
        <div className="hidden md:block p-4 border-b border-peos-border">
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
        <div className="hidden md:flex px-4 py-3 border-b border-peos-border items-center gap-3">
          <div className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" style={{ color: streak > 0 ? '#FF6B35' : '#555' }} />
            <span className="text-xs font-mono font-bold" style={{ color: streak > 0 ? '#FF6B35' : '#555' }}>{streak}</span>
          </div>
          <div className="flex-1 h-1.5 bg-peos-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-peos-green rounded-full transition-all duration-500" style={{ width: `${totalPct}%` }} />
          </div>
          <span className="text-[10px] font-mono text-peos-text-dim">{totalPct}%</span>
        </div>

        <nav className="flex-1 flex md:flex-col p-2 md:space-y-0.5 justify-between md:justify-start">
          {nav.map(item => {
            const active = loc.pathname === item.to;
            return (
              <NavLink key={item.to} to={item.to}
                className={`flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-2.5 px-3 py-2 rounded-lg text-[10px] md:text-[11px] tracking-wider transition-all flex-1 md:flex-none ${
                  active ? 'bg-peos-green/10 text-peos-green border border-peos-green/20' : 'text-peos-text-dim hover:text-peos-text hover:bg-peos-surface-2'
                }`}>
                <item.icon className="w-4 h-4 md:w-3.5 md:h-3.5" />
                <span className="font-medium hidden md:block">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="hidden md:block p-3 border-t border-peos-border">
          <p className="text-[9px] text-peos-text-dim/40 text-center">
            {courses.length} course{courses.length !== 1 ? 's' : ''} loaded
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto w-full">
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="p-4 md:p-5 max-w-5xl mx-auto w-full">
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
