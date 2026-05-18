import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Play, Pause, RotateCcw, Clock, Flame, Target, CalendarDays, AlertTriangle, ChevronDown, ChevronRight, ListChecks, Layers, SkipForward, Plus, X, Pencil } from 'lucide-react';
import { useMissionStore } from '../stores/missionStore';
import { useCourseStore } from '../stores/courseStore';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

type DashTab = 'mission' | 'tasks' | 'sprints';

export default function Dashboard() {
  const nav = useNavigate();
  const courses = useCourseStore(s => s.courses);
  const tasks = useCourseStore(s => s.tasks);
  const getTask = useCourseStore(s => s.getTask);
  const updateTaskDuration = useCourseStore(s => s.updateTaskDuration);
  const mission = useMissionStore(s => s.currentMission);
  const generateMission = useMissionStore(s => s.generateTodayMission);
  const completeTask = useMissionStore(s => s.completeTask);
  const uncompleteTask = useMissionStore(s => s.uncompleteTask);
  const skipTask = useMissionStore(s => s.skipTask);
  const addTaskToMission = useMissionStore(s => s.addTaskToMission);
  const removeTaskFromMission = useMissionStore(s => s.removeTaskFromMission);
  const startFromTask = useMissionStore(s => s.startFromTask);
  const streak = useMissionStore(s => s.streak);
  const estCompletion = useMissionStore(s => s.getEstimatedCompletion);
  const currentSprint = useMissionStore(s => s.getCurrentSprint);
  const sprints = useMissionStore(s => s.sprints);
  const refreshSprints = useMissionStore(s => s.refreshSprints);

  // Focus
  const activeSession = useMissionStore(s => s.activeSession);
  const elapsed = useMissionStore(s => s.elapsedSeconds);
  const startFocus = useMissionStore(s => s.startFocus);
  const pauseFocus = useMissionStore(s => s.pauseFocus);
  const resumeFocus = useMissionStore(s => s.resumeFocus);
  const completeFocus = useMissionStore(s => s.completeFocus);

  const [activeTab, setActiveTab] = useState<DashTab>('mission');
  const [expandedTracks, setExpandedTracks] = useState<Record<string, boolean>>({});

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  useEffect(() => {
    if (courses.length > 0 && (!mission || mission.date !== todayStr)) {
      generateMission();
      refreshSprints();
    }
  }, [courses.length]);

  if (courses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center glass-panel-strong p-10 max-w-md">
          <Target className="w-10 h-10 text-peos-text-dim mx-auto mb-4" />
          <h2 className="text-lg font-bold text-peos-text mb-2">NO COURSES LOADED</h2>
          <p className="text-sm text-peos-text-dim mb-6">Import a course roadmap to get started.</p>
          <button onClick={() => nav('/import')} className="px-6 py-3 bg-peos-green/20 text-peos-green border border-peos-green/30 rounded-lg font-bold text-sm tracking-wider hover:bg-peos-green/30 transition">
            IMPORT COURSE →
          </button>
        </div>
      </div>
    );
  }

  // Mission stats — only count non-skipped, non-completed active tasks
  const missionTasks = mission?.tasks || [];
  const missionTasksWithData = missionTasks.map(mt => ({ ...mt, task: getTask(mt.taskId) })).filter(mt => mt.task);
  const completedCount = missionTasksWithData.filter(mt => mt.task!.status === 'completed').length;
  const activeCount = missionTasksWithData.filter(mt => mt.task!.status !== 'completed' && mt.task!.status !== 'skipped').length;
  const totalCount = missionTasksWithData.length;
  const missionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Which task IDs are in today's mission
  const missionTaskIds = new Set(missionTasks.map(mt => mt.taskId));

  const sprint = currentSprint();
  const sprintTasksDone = sprint ? sprint.taskIds.filter(id => tasks[id]?.status === 'completed').length : 0;
  const sprintPct = sprint && sprint.totalTasks > 0 ? Math.round((sprintTasksDone / sprint.totalTasks) * 100) : 0;

  const totalRemaining = courses.reduce((s, c) => s + (c.totalMinutes - c.completedMinutes), 0);
  const totalAll = courses.reduce((s, c) => s + c.totalMinutes, 0);
  const coursePct = totalAll > 0 ? Math.round((1 - totalRemaining / totalAll) * 100) : 0;

  const allTasks = Object.values(tasks);
  const allCompleted = allTasks.filter(t => t.status === 'completed').length;
  const allSkipped = allTasks.filter(t => t.status === 'skipped').length;

  const toggleTrack = (trackName: string) => {
    setExpandedTracks(p => ({ ...p, [trackName]: !p[trackName] }));
  };

  const tabs: { key: DashTab; label: string; icon: any }[] = [
    { key: 'mission', label: "TODAY'S MISSION", icon: Target },
    { key: 'tasks', label: `ALL TASKS (${allCompleted}/${allTasks.length})`, icon: ListChecks },
    { key: 'sprints', label: `SPRINTS (${sprints.length})`, icon: Layers },
  ];

  return (
    <div className="space-y-5">
      {/* ── Top stats bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-wide text-peos-text">COMMAND CENTER</h2>
          <p className="text-[11px] text-peos-text-dim font-mono mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Stat icon={Flame} value={streak} label="STREAK" color={streak > 0 ? '#FF6B35' : '#555'} />
          <Stat icon={CalendarDays} value={`${coursePct}%`} label="OVERALL" color="#00B4FF" />
          <Stat icon={Clock} value={estCompletion()} label="EST." color="#8B5CF6" />
        </div>
      </div>

      {/* ── Course summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {courses.map(c => {
          const pct = c.totalMinutes > 0 ? Math.round(c.completedMinutes / c.totalMinutes * 100) : 0;
          const hoursLeft = Math.round((c.totalMinutes - c.completedMinutes) / 60);
          return (
            <div key={c.id} className="glass-panel p-3">
              <p className="text-xs font-bold text-peos-text truncate">{c.name}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1 bg-peos-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-peos-green rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-mono text-peos-green">{pct}%</span>
              </div>
              <p className="text-[9px] text-peos-text-dim mt-1">{hoursLeft}h left · {c.dailyHours}h/day</p>
            </div>
          );
        })}
      </div>

      {/* ── Focus Timer (always visible when active) ── */}
      {activeSession && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 glow-green">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <p className="text-[10px] font-mono text-peos-green tracking-widest mb-1">
                {activeSession.status === 'running' ? '● FOCUSING' : '◯ PAUSED'}
              </p>
              <p className="text-sm text-peos-text truncate max-w-xs">{getTask(activeSession.taskId)?.title}</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <span className="text-3xl font-mono font-bold text-peos-text">{fmt(activeSession.plannedSeconds - elapsed)}</span>
              <div className="flex gap-2">
                {activeSession.status === 'running' ? (
                  <button onClick={pauseFocus} className="w-10 h-10 rounded-full bg-peos-surface-2 border border-peos-border flex items-center justify-center hover:bg-peos-surface-3 transition">
                    <Pause className="w-4 h-4 text-peos-text" />
                  </button>
                ) : (
                  <button onClick={resumeFocus} className="w-10 h-10 rounded-full bg-peos-green/20 border border-peos-green/30 flex items-center justify-center hover:bg-peos-green/30 transition">
                    <Play className="w-4 h-4 text-peos-green" />
                  </button>
                )}
                <button onClick={completeFocus} className="px-3 py-2 bg-peos-green/10 text-peos-green text-[10px] font-bold rounded-lg border border-peos-green/20 hover:bg-peos-green/20 transition">
                  DONE
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Tab switcher ── */}
      <div className="flex flex-col sm:flex-row gap-1 bg-peos-surface/80 p-1 rounded-lg border border-peos-border/50">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[11px] font-bold tracking-wider transition-all ${
              activeTab === tab.key
                ? 'bg-peos-green/10 text-peos-green border border-peos-green/20'
                : 'text-peos-text-dim hover:text-peos-text hover:bg-peos-surface-2'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════ TODAY'S MISSION ══════════ */}
      {activeTab === 'mission' && (
        <motion.div key="mission" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {mission && mission.spilledFromYesterday.length > 0 && (
            <div className="glass-panel p-3 border-l-4 border-l-peos-amber flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-peos-amber flex-shrink-0" />
              <span className="text-xs text-peos-amber">{mission.spilledFromYesterday.length} task(s) carried over from yesterday.</span>
            </div>
          )}

          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-peos-text-dim tracking-widest">
                {completedCount} DONE · {activeCount} ACTIVE · {mission?.totalMinutes || 0} MIN PLANNED
              </span>
              <span className="text-[10px] font-mono text-peos-green">{missionPct}%</span>
            </div>
            <div className="w-full h-1.5 bg-peos-surface-3 rounded-full overflow-hidden mb-5">
              <motion.div className="h-full bg-peos-green rounded-full" animate={{ width: `${missionPct}%` }} transition={{ duration: 0.4 }} />
            </div>

            <div className="space-y-1.5">
              {missionTasksWithData.map((mt) => {
                const task = mt.task!;
                const done = task.status === 'completed';
                const skipped = task.status === 'skipped';
                if (skipped) return null; // Don't show skipped tasks in mission

                return (
                  <div key={mt.taskId} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${done ? 'bg-peos-green/5' : 'bg-peos-surface-2/40 hover:bg-peos-surface-2'}`}>
                    {/* Complete / Uncomplete toggle */}
                    <button onClick={() => done ? uncompleteTask(mt.taskId) : completeTask(mt.taskId)} className="flex-shrink-0" title={done ? "Undo completion" : "Mark complete"}>
                      {done ? <CheckCircle2 className="w-5 h-5 text-peos-green hover:text-peos-amber transition" /> : <Circle className="w-5 h-5 text-peos-text-dim hover:text-peos-green transition" />}
                    </button>

                    {/* Task info */}
                    {(() => {
                      const estDate = task.targetDate;
                      const isOverdue = estDate && estDate < todayStr && !done;
                      return (
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${done ? 'text-peos-text-dim line-through' : 'text-peos-text'}`}>{task.title}</p>
                          <p className="text-[10px] text-peos-text-dim mt-0.5 flex items-center gap-1.5">
                            {task.trackName} · <EditableDuration minutes={task.durationMinutes} onSave={(m) => { updateTaskDuration(task.id, m); refreshSprints(); }} />
                            {estDate && !done && (
                              <span className={`font-mono ${isOverdue ? 'text-red-400 font-bold' : 'text-peos-text-dim'}`}>
                                · est. {estDate}
                              </span>
                            )}
                            {isOverdue && (
                              <span className="text-[8px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded font-mono font-bold">OVERDUE</span>
                            )}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Action buttons */}
                    {!done && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {mt.isSpillover && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-peos-amber/10 text-peos-amber rounded font-mono">SPILL</span>
                        )}
                        {!activeSession && (
                          <button onClick={() => startFocus(mt.taskId)} className="px-2.5 py-1.5 bg-peos-green/10 text-peos-green rounded text-[10px] font-bold hover:bg-peos-green/20 transition flex items-center gap-1" title="Start focus timer">
                            <Play className="w-3 h-3" /> FOCUS
                          </button>
                        )}
                        <button onClick={() => skipTask(mt.taskId)} className="px-2 py-1.5 bg-peos-surface-3 text-peos-text-dim rounded text-[10px] font-bold hover:bg-peos-amber/10 hover:text-peos-amber transition flex items-center gap-1" title="Skip — moves to backlog, next task fills in">
                          <SkipForward className="w-3 h-3" /> SKIP
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {activeCount === 0 && completedCount > 0 && (
              <div className="text-center py-6 border-t border-peos-border/30 mt-4">
                <p className="text-sm text-peos-green font-bold">🎯 All tasks completed for today!</p>
              </div>
            )}

            {totalCount === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-peos-text-dim">No tasks for today.</p>
                <button onClick={generateMission} className="mt-3 px-4 py-2 bg-peos-surface-2 text-peos-text-dim text-xs rounded-lg hover:text-peos-text transition">
                  <RotateCcw className="w-3 h-3 inline mr-1" /> REGENERATE
                </button>
              </div>
            )}
          </div>

          {/* Backlog indicator */}
          {allSkipped > 0 && (
            <div className="glass-panel p-3 flex items-center justify-between">
              <span className="text-[10px] font-mono text-peos-text-dim">{allSkipped} task(s) in backlog (skipped)</span>
              <button onClick={() => setActiveTab('tasks')} className="text-[10px] text-peos-blue hover:text-peos-blue/80 font-mono">
                View in All Tasks →
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* ══════════ ALL TASKS ══════════ */}
      {activeTab === 'tasks' && (
        <motion.div key="tasks" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="glass-panel p-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-mono text-peos-green">✓ {allCompleted} DONE</span>
              <span className="text-[10px] font-mono text-peos-amber">○ {allTasks.length - allCompleted - allSkipped} PENDING</span>
              {allSkipped > 0 && <span className="text-[10px] font-mono text-peos-text-dim">⊘ {allSkipped} SKIPPED</span>}
            </div>
            <span className="text-[10px] font-mono text-peos-text-dim">{allTasks.length} TOTAL</span>
          </div>

          {courses.map(course => (
            <div key={course.id} className="space-y-1">
              {course.tracks.map(track => {
                const trackTasks = track.taskIds.map(id => tasks[id]).filter(Boolean);
                const trackDone = trackTasks.filter(t => t.status === 'completed').length;
                const trackTotal = trackTasks.length;
                const trackPct = trackTotal > 0 ? Math.round((trackDone / trackTotal) * 100) : 0;
                const isExpanded = expandedTracks[track.name] ?? false;
                const allDone = trackDone === trackTotal;

                return (
                  <div key={track.name} className="glass-panel overflow-hidden">
                    <button
                      onClick={() => toggleTrack(track.name)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-peos-surface-2/50 transition"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-peos-text-dim flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-peos-text-dim flex-shrink-0" />}
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-xs font-bold ${allDone ? 'text-peos-text-dim' : 'text-peos-text'}`}>{track.name}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-16 h-1 bg-peos-surface-3 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${allDone ? 'bg-peos-green' : 'bg-peos-blue'}`} style={{ width: `${trackPct}%` }} />
                        </div>
                        <span className={`text-[10px] font-mono ${allDone ? 'text-peos-green' : 'text-peos-text-dim'}`}>{trackDone}/{trackTotal}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-peos-border/30 px-3 pb-2">
                        {trackTasks.map(task => {
                          const done = task.status === 'completed';
                          const skipped = task.status === 'skipped';
                          const inMission = missionTaskIds.has(task.id);

                          return (
                            <div key={task.id} className={`flex items-center gap-3 py-2 px-2 ${done ? 'opacity-60' : skipped ? 'opacity-40' : ''}`}>
                              {/* Toggle checkbox */}
                              <button
                                onClick={() => {
                                  if (done) uncompleteTask(task.id);
                                  else if (skipped) { /* handled by UNSKIP button */ }
                                  else completeTask(task.id);
                                }}
                                className="flex-shrink-0"
                                title={done ? "Undo completion" : "Mark complete"}
                              >
                                {done ? <CheckCircle2 className="w-4 h-4 text-peos-green hover:text-peos-amber transition" /> : skipped ? <SkipForward className="w-4 h-4 text-peos-text-dim" /> : <Circle className="w-4 h-4 text-peos-text-dim hover:text-peos-green transition" />}
                              </button>
                              {(() => {
                                const estDate = task.targetDate;
                                const isOverdue = estDate && estDate < todayStr && !done && !skipped;
                                return (
                                  <>
                                    <p className={`text-xs flex-1 ${done ? 'line-through text-peos-text-dim' : skipped ? 'line-through text-peos-text-dim' : 'text-peos-text'}`}>{task.title}</p>
                                    <EditableDuration minutes={task.durationMinutes} onSave={(m) => { updateTaskDuration(task.id, m); refreshSprints(); }} />
                                    {estDate && !done && !skipped && (
                                      <span className={`text-[8px] font-mono ${isOverdue ? 'text-red-400 font-bold' : 'text-peos-text-dim'}`}>
                                        {estDate}
                                      </span>
                                    )}
                                    {isOverdue && (
                                      <span className="text-[7px] px-1 py-0.5 bg-red-500/15 text-red-400 rounded font-mono font-bold">OVERDUE</span>
                                    )}
                                  </>
                                );
                              })()}

                              {/* Status badges */}
                              {skipped && (
                                <button
                                  onClick={() => { useCourseStore.getState().markTask(task.id, 'pending'); }}
                                  className="text-[8px] px-1.5 py-0.5 bg-peos-surface-3 text-peos-text-dim rounded font-mono hover:bg-peos-amber/10 hover:text-peos-amber transition"
                                  title="Unskip — move back to pending"
                                >
                                  SKIPPED ↩
                                </button>
                              )}
                              {inMission && !done && !skipped && (
                                <span className="text-[8px] px-1.5 py-0.5 bg-peos-green/10 text-peos-green rounded font-mono">IN MISSION</span>
                              )}

                              {/* START HERE — rebuild mission from this task */}
                              {!done && !skipped && !inMission && (
                                <button
                                  onClick={() => { startFromTask(task.id); setActiveTab('mission'); }}
                                  className="px-2 py-1 bg-peos-amber/10 text-peos-amber rounded text-[9px] font-bold hover:bg-peos-amber/20 transition flex items-center gap-1"
                                  title="Start mission from this task — earlier pending tasks get skipped"
                                >
                                  ▶ START HERE
                                </button>
                              )}

                              {/* Add to Mission button */}
                              {!done && !skipped && !inMission && (
                                <button
                                  onClick={() => addTaskToMission(task.id)}
                                  className="px-2 py-1 bg-peos-blue/10 text-peos-blue rounded text-[9px] font-bold hover:bg-peos-blue/20 transition flex items-center gap-1"
                                  title="Add this task to today's mission"
                                >
                                  <Plus className="w-3 h-3" /> ADD
                                </button>
                              )}

                              {/* Remove from mission */}
                              {inMission && !done && !skipped && (
                                <button
                                  onClick={() => removeTaskFromMission(task.id)}
                                  className="p-1 text-peos-text-dim hover:text-peos-red hover:bg-peos-red/10 rounded transition"
                                  title="Remove from today's mission"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </motion.div>
      )}

      {/* ══════════ SPRINTS ══════════ */}
      {activeTab === 'sprints' && (
        <motion.div key="sprints" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {sprint && (
            <div className="glass-panel-strong p-5 border-l-4 border-peos-blue">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-peos-blue" />
                <span className="text-xs font-bold font-mono tracking-widest text-peos-text">ACTIVE — WEEK {sprint.weekNumber}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-[9px] text-peos-text-dim tracking-widest">DATE RANGE</p>
                  <p className="text-xs font-mono mt-0.5">{sprint.startDate} → {sprint.endDate}</p>
                </div>
                <div>
                  <p className="text-[9px] text-peos-text-dim tracking-widest">TASKS</p>
                  <p className="text-xs font-mono mt-0.5">{sprintTasksDone}/{sprint.totalTasks}</p>
                </div>
                <div>
                  <p className="text-[9px] text-peos-text-dim tracking-widest">ESTIMATED</p>
                  <p className="text-xs font-mono mt-0.5">{Math.round(sprint.totalMinutes / 60)}h {sprint.totalMinutes % 60}m</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-peos-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-peos-blue rounded-full transition-all" style={{ width: `${sprintPct}%` }} />
                </div>
                <span className="text-[10px] font-mono text-peos-blue">{sprintPct}%</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {sprints.map((s) => {
              const isCurrent = sprint?.id === s.id;
              const sDone = s.taskIds.filter(id => tasks[id]?.status === 'completed').length;
              const sPct = s.totalTasks > 0 ? Math.round((sDone / s.totalTasks) * 100) : 0;
              const isPast = new Date(s.endDate) < new Date();

              return (
                <div key={s.id} className={`glass-panel p-3 ${isCurrent ? 'border-peos-blue/40 bg-peos-blue/5' : isPast ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold font-mono text-peos-text">WEEK {s.weekNumber}</span>
                    {isCurrent && <span className="text-[8px] px-1.5 py-0.5 bg-peos-blue/20 text-peos-blue rounded-full font-mono">NOW</span>}
                  </div>
                  <p className="text-[9px] font-mono text-peos-text-dim">{s.startDate} — {s.endDate}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1 bg-peos-surface-3 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isCurrent ? 'bg-peos-blue' : 'bg-peos-green'}`} style={{ width: `${sPct}%` }} />
                    </div>
                    <span className="text-[9px] font-mono text-peos-text-dim">{sDone}/{s.totalTasks}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {sprints.length === 0 && (
            <div className="glass-panel p-8 text-center">
              <p className="text-sm text-peos-text-dim">No sprints generated yet.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, value, label, color }: { icon: any; value: any; label: string; color: string }) {
  return (
    <div className="glass-panel px-3 py-2 flex items-center gap-2">
      <Icon className="w-3.5 h-3.5" style={{ color }} />
      <span className="font-mono font-bold text-xs" style={{ color }}>{value}</span>
      <span className="text-[9px] text-peos-text-dim">{label}</span>
    </div>
  );
}

function EditableDuration({ minutes, onSave }: { minutes: number; onSave: (m: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(minutes));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1) {
      onSave(n);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <input
          ref={inputRef}
          type="number"
          min={1}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="w-12 px-1 py-0.5 bg-peos-surface-3 border border-peos-green/30 rounded text-[10px] font-mono text-peos-text text-center outline-none focus:border-peos-green"
        />
        <span className="text-[9px] text-peos-text-dim">min</span>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setVal(String(minutes)); setEditing(true); }}
      className="inline-flex items-center gap-0.5 text-[9px] font-mono text-peos-text-dim hover:text-peos-blue transition cursor-pointer group"
      title="Click to edit duration"
    >
      {minutes}m
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition" />
    </button>
  );
}
