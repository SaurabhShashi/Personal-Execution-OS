import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DailyMission, Sprint, DayReport, FocusSession, MissionTask } from '../types';
import { useCourseStore } from './courseStore';
import { generateDailyMission, generateSprints, processSpillover, estimateCompletionDate } from '../lib/engine';
import { v4 as uuid } from 'uuid';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

interface MissionStore {
  currentMission: DailyMission | null;
  sprints: Sprint[];
  dayReports: DayReport[];
  streak: number;
  longestStreak: number;
  lastCompletedDate: string | null;

  // Focus
  activeSession: FocusSession | null;
  elapsedSeconds: number;
  sessionHistory: FocusSession[];

  // Actions
  generateTodayMission: () => void;
  refreshSprints: () => void;
  completeTask: (taskId: string) => void;
  uncompleteTask: (taskId: string) => void;
  skipTask: (taskId: string) => void;
  addTaskToMission: (taskId: string) => void;
  removeTaskFromMission: (taskId: string) => void;
  startFromTask: (taskId: string) => void;
  _backfillMission: () => void;
  spillEndOfDay: () => void;
  getEstimatedCompletion: () => string;
  getCurrentSprint: () => Sprint | null;

  // Focus
  startFocus: (taskId: string) => void;
  tickFocus: () => void;
  pauseFocus: () => void;
  resumeFocus: () => void;
  completeFocus: () => void;
  abandonFocus: () => void;

  // Report
  generateDayReport: () => DayReport;
  updateStreak: (completed: boolean) => void;
}

export const useMissionStore = create<MissionStore>()(
  persist(
    (set, get) => ({
      currentMission: null,
      sprints: [],
      dayReports: [],
      streak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      activeSession: null,
      elapsedSeconds: 0,
      sessionHistory: [],

      generateTodayMission: () => {
        const courseStore = useCourseStore.getState();
        const courses = courseStore.courses;
        if (courses.length === 0) return;

        const totalDailyMinutes = courses.reduce((s, c) => s + c.dailyHours * 60, 0);
        const remainingTasks = courseStore.getRemainingTasks();

        const mission = generateDailyMission(remainingTasks, totalDailyMinutes);
        set({ currentMission: mission });
      },

      refreshSprints: () => {
        const courseStore = useCourseStore.getState();
        const allSprints: Sprint[] = [];
        for (const course of courseStore.courses) {
          const remaining = courseStore.getRemainingTasks(course.id);
          const sprints = generateSprints(course.id, remaining, course.dailyHours * 60);
          allSprints.push(...sprints);
        }
        set({ sprints: allSprints });
      },

      // ─── COMPLETE: mark done, pull next task into mission ───
      completeTask: (taskId) => {
        const courseStore = useCourseStore.getState();
        const task = courseStore.getTask(taskId);
        courseStore.markTaskComplete(taskId);

        set(s => {
          if (!s.currentMission) return s;
          return {
            currentMission: {
              ...s.currentMission,
              completedMinutes: s.currentMission.completedMinutes + (task?.durationMinutes || 0),
            },
          };
        });

        // Auto-backfill next task
        get()._backfillMission();
      },

      // ─── UNCOMPLETE: toggle back to pending ───
      uncompleteTask: (taskId) => {
        const courseStore = useCourseStore.getState();
        const task = courseStore.getTask(taskId);
        courseStore.markTaskPending(taskId);

        set(s => {
          if (!s.currentMission) return s;
          return {
            currentMission: {
              ...s.currentMission,
              completedMinutes: Math.max(0, s.currentMission.completedMinutes - (task?.durationMinutes || 0)),
            },
          };
        });
      },

      // ─── SKIP: move to backlog (skipped status), pull next ───
      skipTask: (taskId) => {
        const courseStore = useCourseStore.getState();
        courseStore.markTask(taskId, 'skipped');

        // Remove from mission
        set(s => {
          if (!s.currentMission) return s;
          const task = courseStore.getTask(taskId);
          return {
            currentMission: {
              ...s.currentMission,
              tasks: s.currentMission.tasks.filter(mt => mt.taskId !== taskId),
              totalMinutes: s.currentMission.totalMinutes - (task?.durationMinutes || 0),
            },
          };
        });

        // Auto-backfill
        get()._backfillMission();
      },

      // ─── ADD TO MISSION: manually add any task ───
      addTaskToMission: (taskId) => {
        const courseStore = useCourseStore.getState();
        const task = courseStore.getTask(taskId);
        if (!task || task.status === 'completed') return;

        // Mark it as pending if it was skipped (re-activate)
        if (task.status === 'skipped') {
          courseStore.markTask(taskId, 'pending');
        }

        set(s => {
          const mission = s.currentMission || {
            date: today(),
            tasks: [],
            totalMinutes: 0,
            completedMinutes: 0,
            spilledFromYesterday: [],
            generatedAt: new Date().toISOString(),
          };

          // Don't add duplicates
          if (mission.tasks.some(mt => mt.taskId === taskId)) return s;

          return {
            currentMission: {
              ...mission,
              tasks: [...mission.tasks, { taskId, isSpillover: false }],
              totalMinutes: mission.totalMinutes + (task?.durationMinutes || 0),
            },
          };
        });
      },

      // ─── REMOVE from mission (without skipping globally) ───
      removeTaskFromMission: (taskId) => {
        const courseStore = useCourseStore.getState();
        const task = courseStore.getTask(taskId);

        set(s => {
          if (!s.currentMission) return s;
          return {
            currentMission: {
              ...s.currentMission,
              tasks: s.currentMission.tasks.filter(mt => mt.taskId !== taskId),
              totalMinutes: s.currentMission.totalMinutes - (task?.durationMinutes || 0),
            },
          };
        });
      },

      // ─── START FROM TASK: rebuild mission starting from a specific task ───
      startFromTask: (taskId) => {
        const courseStore = useCourseStore.getState();
        const courses = courseStore.courses;
        const totalDailyMinutes = courses.reduce((s, c) => s + c.dailyHours * 60, 0);

        const clickedTask = courseStore.getTask(taskId);
        if (!clickedTask) return;

        // Get ALL tasks sorted by order
        const allTasks = Object.values(courseStore.tasks)
          .filter(t => t.courseId === clickedTask.courseId)
          .sort((a, b) => a.order - b.order);

        // Find the clicked task's position
        const startIndex = allTasks.findIndex(t => t.id === taskId);
        if (startIndex === -1) return;

        // Skip all earlier pending tasks that were in the mission
        const mission = get().currentMission;
        if (mission) {
          for (const mt of mission.tasks) {
            const t = courseStore.getTask(mt.taskId);
            if (t && t.status !== 'completed' && t.order < clickedTask.order) {
              courseStore.markTask(mt.taskId, 'skipped');
            }
          }
        }

        // Build new mission: start from clicked task, fill forward
        const newMissionTasks: MissionTask[] = [];
        let budgetUsed = 0;

        for (let i = startIndex; i < allTasks.length; i++) {
          const t = allTasks[i];
          if (t.status === 'completed' || t.status === 'skipped') continue;
          if (budgetUsed >= totalDailyMinutes) break;
          newMissionTasks.push({ taskId: t.id, isSpillover: false });
          budgetUsed += t.durationMinutes;
        }

        courseStore.scheduleTasksFrom(today(), taskId);

        set({
          currentMission: {
            date: today(),
            tasks: newMissionTasks,
            totalMinutes: budgetUsed,
            completedMinutes: 0,
            spilledFromYesterday: [],
            generatedAt: new Date().toISOString(),
          },
        });
      },

      // ─── BACKFILL: pull next pending task to fill daily budget ───
      _backfillMission: () => {
        const courseStore = useCourseStore.getState();
        const courses = courseStore.courses;
        const totalDailyMinutes = courses.reduce((s, c) => s + c.dailyHours * 60, 0);

        const mission = get().currentMission;
        if (!mission) return;

        // Calculate how many minutes are currently in the active mission
        const currentActiveMinutes = mission.tasks.reduce((sum, mt) => {
          const t = courseStore.getTask(mt.taskId);
          if (!t || t.status === 'completed' || t.status === 'skipped') return sum;
          return sum + t.durationMinutes;
        }, 0);

        if (currentActiveMinutes >= totalDailyMinutes) return; // Already full

        // Get remaining tasks not already in mission
        const missionTaskIds = new Set(mission.tasks.map(mt => mt.taskId));
        const remaining = courseStore.getRemainingTasks().filter(
          t => !missionTaskIds.has(t.id) && t.status === 'pending'
        );

        let budgetLeft = totalDailyMinutes - currentActiveMinutes;
        const newTasks: MissionTask[] = [];

        for (const task of remaining) {
          if (budgetLeft <= 0) break;
          newTasks.push({ taskId: task.id, isSpillover: false });
          budgetLeft -= task.durationMinutes;
        }

        if (newTasks.length > 0) {
          set(s => {
            if (!s.currentMission) return s;
            return {
              currentMission: {
                ...s.currentMission,
                tasks: [...s.currentMission.tasks, ...newTasks],
                totalMinutes: s.currentMission.totalMinutes + newTasks.reduce((sum, mt) => {
                  const t = courseStore.getTask(mt.taskId);
                  return sum + (t?.durationMinutes || 0);
                }, 0),
              },
            };
          });
        }
      },

      spillEndOfDay: () => {
        const { currentMission } = get();
        if (!currentMission) return;

        const courseStore = useCourseStore.getState();
        const spilledIds = processSpillover(
          currentMission.tasks.map(t => t.taskId),
          courseStore.tasks
        );

        spilledIds.forEach(id => courseStore.spillTask(id));

        const report = get().generateDayReport();
        set(s => ({
          dayReports: [...s.dayReports, report].slice(-90),
        }));

        const completionRate = currentMission.totalMinutes > 0
          ? currentMission.completedMinutes / currentMission.totalMinutes
          : 0;
        get().updateStreak(completionRate >= 0.5);
      },

      getEstimatedCompletion: () => {
        const courseStore = useCourseStore.getState();
        const courses = courseStore.courses;
        if (courses.length === 0) return '—';
        const totalRemaining = courses.reduce((s, c) => s + (c.totalMinutes - c.completedMinutes), 0);
        const totalDaily = courses.reduce((s, c) => s + c.dailyHours * 60, 0);
        if (totalDaily === 0) return '—';
        return estimateCompletionDate(totalRemaining, totalDaily);
      },

      getCurrentSprint: () => {
        const todayStr = today();
        return get().sprints.find(s => s.startDate <= todayStr && s.endDate >= todayStr) || get().sprints[0] || null;
      },

      // ─── Focus Timer ────────────────────────────────────────
      startFocus: (taskId) => {
        const courseStore = useCourseStore.getState();
        const task = courseStore.getTask(taskId);
        const durationMinutes = task ? task.durationMinutes : 25;

        set({
          activeSession: {
            id: uuid(),
            taskId,
            startedAt: new Date().toISOString(),
            plannedSeconds: durationMinutes * 60,
            actualSeconds: 0,
            status: 'running',
          },
          elapsedSeconds: 0,
        });
      },

      tickFocus: () => {
        const { activeSession, elapsedSeconds } = get();
        if (!activeSession || activeSession.status !== 'running') return;
        const next = elapsedSeconds + 1;
        if (next >= activeSession.plannedSeconds) {
          get().completeFocus();
          return;
        }
        set({ elapsedSeconds: next });
      },

      pauseFocus: () => {
        set(s => ({
          activeSession: s.activeSession ? { ...s.activeSession, status: 'paused' as const } : null,
        }));
      },

      resumeFocus: () => {
        set(s => ({
          activeSession: s.activeSession ? { ...s.activeSession, status: 'running' as const } : null,
        }));
      },

      completeFocus: () => {
        set(s => {
          if (!s.activeSession) return s;
          const done: FocusSession = {
            ...s.activeSession,
            status: 'completed',
            endedAt: new Date().toISOString(),
            actualSeconds: s.elapsedSeconds,
          };
          return {
            activeSession: null,
            elapsedSeconds: 0,
            sessionHistory: [...s.sessionHistory, done].slice(-500),
          };
        });
      },

      abandonFocus: () => {
        set(s => ({
          activeSession: null,
          elapsedSeconds: 0,
          sessionHistory: s.activeSession
            ? [...s.sessionHistory, { ...s.activeSession, status: 'abandoned' as const, endedAt: new Date().toISOString(), actualSeconds: s.elapsedSeconds }].slice(-500)
            : s.sessionHistory,
        }));
      },

      // ─── Report ─────────────────────────────────────────────
      generateDayReport: () => {
        const { currentMission, sessionHistory, streak } = get();
        const todayStr = today();
        const todaySessions = sessionHistory.filter(s => s.startedAt.startsWith(todayStr) && s.status === 'completed');
        const courseStore = useCourseStore.getState();

        const missionTasks = currentMission?.tasks || [];
        const completed = missionTasks.filter(mt => {
          const t = courseStore.getTask(mt.taskId);
          return t?.status === 'completed';
        }).length;
        const spilled = missionTasks.length - completed;

        return {
          date: todayStr,
          tasksCompleted: completed,
          tasksSpilled: spilled,
          focusSessions: todaySessions.length,
          focusMinutes: Math.round(todaySessions.reduce((s, sess) => s + sess.actualSeconds, 0) / 60),
          missionCompletionRate: missionTasks.length > 0 ? completed / missionTasks.length : 0,
          sprintProgress: 0,
          streak,
        };
      },

      updateStreak: (completed) => {
        set(s => {
          if (completed) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const isConsecutive = s.lastCompletedDate === yesterday || s.streak === 0;
            const newStreak = isConsecutive ? s.streak + 1 : 1;
            return {
              streak: newStreak,
              longestStreak: Math.max(s.longestStreak, newStreak),
              lastCompletedDate: today(),
            };
          }
          return { streak: 0 };
        });
      },
    }),
    {
      name: 'peos-missions',
      partialize: (state) => ({
        currentMission: state.currentMission,
        sprints: state.sprints,
        dayReports: state.dayReports,
        streak: state.streak,
        longestStreak: state.longestStreak,
        lastCompletedDate: state.lastCompletedDate,
        sessionHistory: state.sessionHistory,
      }),
    }
  )
);
