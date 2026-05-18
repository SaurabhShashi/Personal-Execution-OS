// ─── Course Schema (what user uploads) ─────────────────────

export interface CourseInput {
  courseName: string;
  dailyHours: number;
  tracks: TrackInput[];
}

export interface TrackInput {
  name: string;
  tasks: TaskInput[];
}

export interface TaskInput {
  title: string;
  durationMinutes: number;
  completed?: boolean;
}

// ─── Internal Models ────────────────────────────────────────

export type TaskStatus = 'pending' | 'active' | 'completed' | 'spilled' | 'skipped' | 'blocked';

export interface Task {
  id: string;
  courseId: string;
  trackName: string;
  title: string;
  durationMinutes: number;
  status: TaskStatus;
  completedAt?: string;
  targetDate?: string; // Hardcoded assigned date
  spillCount: number; // how many times this task spilled
  order: number;      // global order within course
}

export interface Course {
  id: string;
  name: string;
  dailyHours: number;
  tracks: { name: string; taskIds: string[] }[];
  totalTasks: number;
  completedTasks: number;
  totalMinutes: number;
  completedMinutes: number;
  createdAt: string;
}

export interface DailyMission {
  date: string;
  tasks: MissionTask[];
  totalMinutes: number;
  completedMinutes: number;
  spilledFromYesterday: string[]; // task IDs
  generatedAt: string;
}

export interface MissionTask {
  taskId: string;
  isSpillover: boolean;
}

export interface Sprint {
  id: string;
  courseId: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  taskIds: string[];
  totalMinutes: number;
  completedMinutes: number;
  completedTasks: number;
  totalTasks: number;
}

export interface FocusSession {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt?: string;
  plannedSeconds: number;
  actualSeconds: number;
  status: 'running' | 'paused' | 'completed' | 'abandoned';
}

export interface DayReport {
  date: string;
  tasksCompleted: number;
  tasksSpilled: number;
  focusSessions: number;
  focusMinutes: number;
  missionCompletionRate: number;
  sprintProgress: number;
  streak: number;
}
