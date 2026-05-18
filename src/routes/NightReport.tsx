import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Clock, Play } from 'lucide-react';
import { useMissionStore } from '../stores/missionStore';

export default function NightReport() {
  const dayReports = useMissionStore(s => s.dayReports);
  const spillEndOfDay = useMissionStore(s => s.spillEndOfDay);
  const currentMission = useMissionStore(s => s.currentMission);
  
  const [generated, setGenerated] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayReport = useMemo(() => dayReports.find(r => r.date === todayStr), [dayReports, todayStr]);

  const handleGenerate = () => {
    spillEndOfDay(); // Marks uncompleted tasks as spilled, updates streak, generates report
    setGenerated(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-wide text-peos-text">NIGHT REPORT</h2>
          <p className="text-[11px] text-peos-text-dim mt-1 font-mono">{todayStr}</p>
        </div>
        {!todayReport && !generated && (
          <button 
            onClick={handleGenerate}
            disabled={!currentMission}
            className="px-5 py-2.5 bg-peos-blue/20 text-peos-blue border border-peos-blue/30 rounded-lg text-xs font-bold tracking-wider hover:bg-peos-blue/30 transition disabled:opacity-50"
          >
            END DAY + SPILLOVER
          </button>
        )}
      </div>

      {!todayReport && !generated ? (
        <div className="glass-panel p-10 text-center">
          <Clock className="w-8 h-8 text-peos-text-dim mx-auto mb-3" />
          <p className="text-sm text-peos-text">Day is still active.</p>
          <p className="text-xs text-peos-text-dim mt-2">Click 'End Day + Spillover' to finalize today's execution and roll unfinished tasks to tomorrow.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Hero Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="glass-panel-strong p-6 text-center border-t-4 border-peos-green">
              <p className="text-[10px] text-peos-text-dim tracking-widest mb-2">MISSION COMPLETION</p>
              <p className="text-5xl font-mono font-bold text-peos-green">
                {Math.round((todayReport?.missionCompletionRate || 0) * 100)}%
              </p>
              <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-peos-text-dim">
                <CheckCircle2 className="w-3 h-3 text-peos-green" /> {todayReport?.tasksCompleted || 0} tasks done
              </div>
            </div>
            <div className="glass-panel-strong p-6 text-center border-t-4 border-peos-amber">
              <p className="text-[10px] text-peos-text-dim tracking-widest mb-2">TASKS SPILLED</p>
              <p className="text-5xl font-mono font-bold text-peos-amber">
                {todayReport?.tasksSpilled || 0}
              </p>
              <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-peos-text-dim">
                <AlertTriangle className="w-3 h-3 text-peos-amber" /> Moved to tomorrow
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
             <div className="glass-panel p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5 text-peos-blue" />
                  <div>
                    <p className="text-[10px] text-peos-text-dim tracking-widest">FOCUS SESSIONS</p>
                    <p className="text-xl font-mono font-bold text-peos-text">{todayReport?.focusSessions || 0}</p>
                  </div>
                </div>
             </div>
             <div className="glass-panel p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-peos-blue" />
                  <div>
                    <p className="text-[10px] text-peos-text-dim tracking-widest">FOCUS TIME</p>
                    <p className="text-xl font-mono font-bold text-peos-text">{todayReport?.focusMinutes || 0}m</p>
                  </div>
                </div>
             </div>
          </div>

          <div className="glass-panel p-5 text-center mt-6">
            <p className="text-sm text-peos-text-dim italic">
              "Tomorrow's mission will automatically incorporate today's spillover."
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
