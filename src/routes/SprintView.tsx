import { useMissionStore } from '../stores/missionStore';
import { useCourseStore } from '../stores/courseStore';
import { CalendarDays, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SprintView() {
  const sprints = useMissionStore(s => s.sprints);
  const currentSprint = useMissionStore(s => s.getCurrentSprint());
  const courses = useCourseStore(s => s.courses);

  if (courses.length === 0 || sprints.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-peos-text-dim">No sprints available. Import a course first.</p>
      </div>
    );
  }

  // Group sprints by course
  const sprintsByCourse = sprints.reduce((acc, sprint) => {
    if (!acc[sprint.courseId]) acc[sprint.courseId] = [];
    acc[sprint.courseId].push(sprint);
    return acc;
  }, {} as Record<string, typeof sprints>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-wide text-peos-text">WEEKLY SPRINTS</h2>
        <p className="text-[11px] text-peos-text-dim mt-1">Automatically generated execution blocks based on your daily capacity.</p>
      </div>

      {currentSprint && (
        <div className="glass-panel-strong p-6 border-l-4 border-peos-blue">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-peos-blue" />
            <h3 className="text-sm font-bold font-mono tracking-widest text-peos-text">CURRENT SPRINT (WEEK {currentSprint.weekNumber})</h3>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-[10px] text-peos-text-dim tracking-widest mb-1">DATE RANGE</p>
              <p className="text-sm font-mono">{currentSprint.startDate} → {currentSprint.endDate}</p>
            </div>
            <div>
              <p className="text-[10px] text-peos-text-dim tracking-widest mb-1">TOTAL TASKS</p>
              <p className="text-sm font-mono">{currentSprint.totalTasks}</p>
            </div>
            <div>
              <p className="text-[10px] text-peos-text-dim tracking-widest mb-1">ESTIMATED TIME</p>
              <p className="text-sm font-mono">{Math.round(currentSprint.totalMinutes / 60)}h {(currentSprint.totalMinutes % 60)}m</p>
            </div>
          </div>
        </div>
      )}

      {Object.entries(sprintsByCourse).map(([courseId, courseSprints]) => {
        const course = courses.find(c => c.id === courseId);
        if (!course) return null;

        return (
          <div key={courseId} className="space-y-4 pt-4">
            <h3 className="text-xs font-bold text-peos-text-dim uppercase tracking-wider">{course.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courseSprints.map((sprint, i) => {
                const isCurrent = currentSprint?.id === sprint.id;
                const isPast = new Date(sprint.endDate) < new Date();
                
                return (
                  <motion.div 
                    key={sprint.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-panel p-4 ${isCurrent ? 'border-peos-blue/50 bg-peos-blue/5' : isPast ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold font-mono tracking-wider text-peos-text">WEEK {sprint.weekNumber}</span>
                      {isCurrent && <span className="text-[9px] px-2 py-0.5 bg-peos-blue/20 text-peos-blue rounded-full font-mono">ACTIVE</span>}
                      {isPast && <span className="text-[9px] text-peos-text-dim font-mono">COMPLETED</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-peos-text-dim font-mono mb-3">
                      <CalendarDays className="w-3 h-3" /> {sprint.startDate} — {sprint.endDate}
                    </div>
                    
                    <div className="flex justify-between items-end border-t border-peos-border/50 pt-3">
                      <div>
                        <p className="text-[9px] text-peos-text-dim tracking-widest mb-0.5">TASKS</p>
                        <p className="text-xs font-mono">{sprint.totalTasks}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-peos-text-dim tracking-widest mb-0.5">DURATION</p>
                        <p className="text-xs font-mono">{Math.round(sprint.totalMinutes / 60)}h {(sprint.totalMinutes % 60)}m</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
