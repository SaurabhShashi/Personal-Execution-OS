import type { Task, DailyMission, MissionTask, Sprint } from '../types';

const today = () => new Date().toISOString().split('T')[0];

/**
 * CORE ALGORITHM: Generate today's mission.
 *
 * 1. Start with spilled tasks (highest priority)
 * 2. Fill remaining daily capacity with next pending tasks in course order
 * 3. Return mission with total estimated minutes
 */
export function generateDailyMission(
  remainingTasks: Task[],
  dailyMinutes: number
): DailyMission {
  const missionTasks: MissionTask[] = [];
  let budgetLeft = dailyMinutes;
  const usedIds = new Set<string>();

  // Identify yesterday's spilled tasks
  const spilledIds: string[] = [];

  // Phase 1: Spilled tasks get priority
  const spilled = remainingTasks.filter(t => t.status === 'spilled');
  for (const task of spilled) {
    if (budgetLeft <= 0) break;
    missionTasks.push({ taskId: task.id, isSpillover: true });
    spilledIds.push(task.id);
    budgetLeft -= task.durationMinutes;
    usedIds.add(task.id);
  }

  // Phase 2: Fill with next pending tasks
  const pending = remainingTasks.filter(t => t.status === 'pending' && !usedIds.has(t.id));
  for (const task of pending) {
    if (budgetLeft <= 0) break;
    missionTasks.push({ taskId: task.id, isSpillover: false });
    budgetLeft -= task.durationMinutes;
    usedIds.add(task.id);
  }

  return {
    date: today(),
    tasks: missionTasks,
    totalMinutes: missionTasks.reduce((s, mt) => {
      const task = remainingTasks.find(t => t.id === mt.taskId);
      return s + (task?.durationMinutes || 0);
    }, 0),
    completedMinutes: 0,
    spilledFromYesterday: spilledIds,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * SPRINT GENERATOR: Create weekly sprints from remaining tasks.
 *
 * Distributes tasks into 7-day chunks based on daily hour budget.
 */
export function generateSprints(
  courseId: string,
  remainingTasks: Task[],
  dailyMinutes: number,
  startDate?: string
): Sprint[] {
  const sprints: Sprint[] = [];
  const weeklyMinutes = dailyMinutes * 7;
  let currentTasks: string[] = [];
  let currentMinutes = 0;
  let weekNum = 1;

  const start = startDate ? new Date(startDate) : new Date();
  // Align to Monday
  const day = start.getDay();
  const mondayOffset = day === 0 ? 1 : (day === 1 ? 0 : 8 - day);
  start.setDate(start.getDate() + mondayOffset);

  for (const task of remainingTasks) {
    currentTasks.push(task.id);
    currentMinutes += task.durationMinutes;

    if (currentMinutes >= weeklyMinutes) {
      const sprintStart = new Date(start);
      sprintStart.setDate(sprintStart.getDate() + (weekNum - 1) * 7);
      const sprintEnd = new Date(sprintStart);
      sprintEnd.setDate(sprintEnd.getDate() + 6);

      sprints.push({
        id: `sprint-${courseId}-${weekNum}`,
        courseId,
        weekNumber: weekNum,
        startDate: sprintStart.toISOString().split('T')[0],
        endDate: sprintEnd.toISOString().split('T')[0],
        taskIds: [...currentTasks],
        totalMinutes: currentMinutes,
        completedMinutes: 0,
        completedTasks: 0,
        totalTasks: currentTasks.length,
      });

      currentTasks = [];
      currentMinutes = 0;
      weekNum++;
    }
  }

  // Remaining tasks form final sprint
  if (currentTasks.length > 0) {
    const sprintStart = new Date(start);
    sprintStart.setDate(sprintStart.getDate() + (weekNum - 1) * 7);
    const sprintEnd = new Date(sprintStart);
    sprintEnd.setDate(sprintEnd.getDate() + 6);

    sprints.push({
      id: `sprint-${courseId}-${weekNum}`,
      courseId,
      weekNumber: weekNum,
      startDate: sprintStart.toISOString().split('T')[0],
      endDate: sprintEnd.toISOString().split('T')[0],
      taskIds: [...currentTasks],
      totalMinutes: currentMinutes,
      completedMinutes: 0,
      completedTasks: 0,
      totalTasks: currentTasks.length,
    });
  }

  return sprints;
}

/**
 * SPILLOVER: Process end-of-day. Mark incomplete mission tasks as spilled.
 */
export function processSpillover(
  missionTaskIds: string[],
  allTasks: Record<string, Task>
): string[] {
  const spilledIds: string[] = [];
  for (const taskId of missionTaskIds) {
    const task = allTasks[taskId];
    if (task && task.status !== 'completed' && task.status !== 'skipped') {
      spilledIds.push(taskId);
    }
  }
  return spilledIds;
}

/**
 * Estimate completion date given remaining minutes and daily budget.
 */
export function estimateCompletionDate(remainingMinutes: number, dailyMinutes: number): string {
  const daysNeeded = Math.ceil(remainingMinutes / dailyMinutes);
  const target = new Date();
  target.setDate(target.getDate() + daysNeeded);
  return target.toISOString().split('T')[0];
}
