import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { Course, Task, CourseInput, TaskStatus } from '../types';

interface CourseStore {
  courses: Course[];
  tasks: Record<string, Task>; // taskId → Task

  importCourse: (input: CourseInput, startDate?: string) => string; // returns courseId
  deleteCourse: (courseId: string) => void;
  getCourseTasks: (courseId: string) => Task[];
  getRemainingTasks: (courseId?: string) => Task[];
  markTask: (taskId: string, status: TaskStatus) => void;
  markTaskComplete: (taskId: string) => void;
  markTaskPending: (taskId: string) => void;
  spillTask: (taskId: string) => void;
  updateTaskDuration: (taskId: string, minutes: number) => void;
  bulkSetDuration: (minutes: number) => void;
  updateDailyHours: (courseId: string, hours: number) => void;
  skipAllBefore: (taskId: string) => void;
  scheduleTasksFrom: (startDate: string, startTaskId?: string, overwrite?: boolean) => void;
  getTask: (taskId: string) => Task | undefined;
  getCourse: (courseId: string) => Course | undefined;
  recalcCourse: (courseId: string) => void;
}

export const useCourseStore = create<CourseStore>()(
  persist(
    (set, get) => ({
      courses: [],
      tasks: {},

      importCourse: (input, startDate) => {
        const courseId = uuid();
        const allTasks: Record<string, Task> = {};
        const tracks: Course['tracks'] = [];
        let order = 0;

        for (const track of input.tracks) {
          const taskIds: string[] = [];
          for (const t of track.tasks) {
            const taskId = uuid();
            allTasks[taskId] = {
              id: taskId,
              courseId,
              trackName: track.name,
              title: t.title,
              durationMinutes: t.durationMinutes,
              status: t.completed ? 'completed' : 'pending',
              completedAt: t.completedAt || (t.completed ? new Date().toISOString() : undefined),
              targetDate: t.targetDate,
              spillCount: 0,
              order: order++,
            };
            taskIds.push(taskId);
          }
          tracks.push({ name: track.name, taskIds });
        }

        const taskList = Object.values(allTasks);
        const course: Course = {
          id: courseId,
          name: input.courseName,
          dailyHours: input.dailyHours,
          tracks,
          totalTasks: taskList.length,
          completedTasks: taskList.filter(t => t.status === 'completed').length,
          totalMinutes: taskList.reduce((s, t) => s + t.durationMinutes, 0),
          completedMinutes: taskList.filter(t => t.status === 'completed').reduce((s, t) => s + t.durationMinutes, 0),
          createdAt: new Date().toISOString(),
        };

        set(s => ({
          courses: [...s.courses, course],
          tasks: { ...s.tasks, ...allTasks },
        }));

        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        get().scheduleTasksFrom(startDate || todayStr, undefined, false);

        return courseId;
      },

      deleteCourse: (courseId) => {
        set(s => {
          const newTasks = { ...s.tasks };
          Object.keys(newTasks).forEach(id => {
            if (newTasks[id].courseId === courseId) delete newTasks[id];
          });
          return {
            courses: s.courses.filter(c => c.id !== courseId),
            tasks: newTasks,
          };
        });
      },

      getCourseTasks: (courseId) => {
        return Object.values(get().tasks)
          .filter(t => t.courseId === courseId)
          .sort((a, b) => a.order - b.order);
      },

      getRemainingTasks: (courseId) => {
        let tasks = Object.values(get().tasks).filter(
          t => t.status === 'pending' || t.status === 'spilled'
        );
        if (courseId) tasks = tasks.filter(t => t.courseId === courseId);
        // Spilled tasks first, then by order
        return tasks.sort((a, b) => {
          if (a.status === 'spilled' && b.status !== 'spilled') return -1;
          if (b.status === 'spilled' && a.status !== 'spilled') return 1;
          return a.order - b.order;
        });
      },

      markTask: (taskId, status) => {
        set(s => {
          const task = s.tasks[taskId];
          if (!task) return s;
          const updated = {
            ...task,
            status,
            completedAt: status === 'completed' ? (task.completedAt || new Date().toISOString()) : (status === 'pending' ? undefined : task.completedAt),
          };
          if (status === 'skipped' || status === 'completed') {
            updated.targetDate = undefined;
          }
          return { tasks: { ...s.tasks, [taskId]: updated } };
        });
        get().recalcCourse(get().tasks[taskId]?.courseId || '');
      },

      markTaskComplete: (taskId) => get().markTask(taskId, 'completed'),
      markTaskPending: (taskId: string) => get().markTask(taskId, 'pending'),

      spillTask: (taskId) => {
        set(s => {
          const task = s.tasks[taskId];
          if (!task) return s;
          return {
            tasks: {
              ...s.tasks,
              [taskId]: { ...task, status: 'spilled', spillCount: task.spillCount + 1 },
            },
          };
        });
      },

      updateTaskDuration: (taskId, minutes) => {
        const task = get().tasks[taskId];
        if (!task || minutes < 1) return;
        set(s => ({
          tasks: {
            ...s.tasks,
            [taskId]: { ...s.tasks[taskId], durationMinutes: minutes },
          },
        }));
        get().recalcCourse(task.courseId);
      },

      bulkSetDuration: (minutes) => {
        set(s => {
          const updated = { ...s.tasks };
          for (const id of Object.keys(updated)) {
            updated[id] = { ...updated[id], durationMinutes: minutes };
          }
          return { tasks: updated };
        });
        // Recalc all courses
        get().courses.forEach(c => get().recalcCourse(c.id));
      },

      updateDailyHours: (courseId, hours) => {
        set(s => ({
          courses: s.courses.map(c =>
            c.id === courseId ? { ...c, dailyHours: hours } : c
          ),
        }));
      },

      skipAllBefore: (taskId) => {
        const target = get().tasks[taskId];
        if (!target) return;
        set(s => {
          const updated = { ...s.tasks };
          for (const id of Object.keys(updated)) {
            const t = updated[id];
            if (t.courseId === target.courseId && t.order < target.order && t.status !== 'completed') {
              updated[id] = { ...t, status: 'skipped' };
            }
          }
          return { tasks: updated };
        });
        get().recalcCourse(target.courseId);
      },

      scheduleTasksFrom: (startDate, startTaskId, overwrite = true) => {
        set(s => {
          const courses = s.courses;
          const updatedTasks = { ...s.tasks };

          for (const course of courses) {
            const dailyMinutes = course.dailyHours * 60;
            let pending = Object.values(updatedTasks)
              .filter(t => t.courseId === course.id && t.status !== 'completed' && t.status !== 'skipped')
              .sort((a, b) => a.order - b.order);

            if (startTaskId) {
              const startTask = pending.find(t => t.id === startTaskId);
              if (startTask) {
                pending = pending.filter(t => t.order >= startTask.order);
              }
            }

            let dayOffset = 0;
            let minutesUsedOnDay = 0;
            const start = new Date(startDate);

            for (const task of pending) {
              if (minutesUsedOnDay + task.durationMinutes > dailyMinutes && minutesUsedOnDay > 0) {
                dayOffset++;
                minutesUsedOnDay = 0;
              }
              const target = new Date(start);
              target.setDate(target.getDate() + dayOffset);
              
              const year = target.getFullYear();
              const month = String(target.getMonth() + 1).padStart(2, '0');
              const day = String(target.getDate()).padStart(2, '0');
              
              if (overwrite || !task.targetDate) {
                updatedTasks[task.id] = { ...task, targetDate: `${year}-${month}-${day}` };
              }
              minutesUsedOnDay += task.durationMinutes;
            }
          }
          return { tasks: updatedTasks };
        });
      },

      getTask: (taskId) => get().tasks[taskId],
      getCourse: (courseId) => get().courses.find(c => c.id === courseId),

      recalcCourse: (courseId) => {
        set(s => {
          const course = s.courses.find(c => c.id === courseId);
          if (!course) return s;
          const courseTasks = Object.values(s.tasks).filter(t => t.courseId === courseId);
          const completed = courseTasks.filter(t => t.status === 'completed');
          return {
            courses: s.courses.map(c =>
              c.id === courseId
                ? {
                    ...c,
                    totalMinutes: courseTasks.reduce((sum, t) => sum + t.durationMinutes, 0),
                    completedTasks: completed.length,
                    completedMinutes: completed.reduce((sum, t) => sum + t.durationMinutes, 0),
                  }
                : c
            ),
          };
        });
      },
    }),
    { name: 'peos-courses' }
  )
);
