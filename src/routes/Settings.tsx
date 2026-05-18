import { useCourseStore } from '../stores/courseStore';
import { Trash2, AlertTriangle, BookOpen, Download, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings() {
  const courses = useCourseStore(s => s.courses);
  const deleteCourse = useCourseStore(s => s.deleteCourse);

  const handleClearData = () => {
    if (confirm('This will wipe ALL PEOS data (courses, missions, streaks). Irreversible. Are you absolutely sure?')) {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const handleDeleteCourse = (id: string, name: string) => {
    if (confirm(`Delete course "${name}" and all its tasks?`)) {
      deleteCourse(id);
    }
  };

  const handleExportData = () => {
    const data = {
      courses: localStorage.getItem('peos-courses'),
      missions: localStorage.getItem('peos-missions')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peos-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.courses) localStorage.setItem('peos-courses', data.courses);
        if (data.missions) localStorage.setItem('peos-missions', data.missions);
        alert('Data imported successfully. The app will now reload.');
        window.location.href = '/';
      } catch (err) {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-wide text-peos-text">SETTINGS</h2>
        <p className="text-[11px] text-peos-text-dim mt-1">Manage loaded courses and system data.</p>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-xs font-bold tracking-widest font-mono text-peos-text-dim mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> LOADED COURSES ({courses.length})
        </h3>
        
        {courses.length === 0 ? (
          <p className="text-sm text-peos-text-dim">No courses loaded.</p>
        ) : (
          <div className="space-y-3">
            {courses.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-peos-surface-2 rounded-lg border border-peos-border/50">
                <div>
                  <p className="text-sm font-bold text-peos-text">{c.name}</p>
                  <p className="text-[10px] text-peos-text-dim mt-0.5 font-mono">
                    {c.totalTasks} tasks · {c.dailyHours}h/day budget
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteCourse(c.id, c.name)}
                  className="p-2 text-peos-text-dim hover:text-peos-red hover:bg-peos-red/10 rounded transition"
                  title="Delete Course"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-xs font-bold tracking-widest font-mono text-peos-text-dim mb-4 flex items-center gap-2">
          <Download className="w-4 h-4" /> DATA MANAGEMENT
        </h3>
        <p className="text-[11px] text-peos-text-dim mb-4">
          Export your data to backup or transfer it to another browser/device.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleExportData}
            className="px-4 py-2 bg-peos-surface-3 text-peos-text border border-peos-border/50 rounded text-xs font-bold tracking-wider hover:bg-peos-surface-3/80 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> EXPORT BACKUP
          </button>
          
          <label className="px-4 py-2 bg-peos-blue/10 text-peos-blue border border-peos-blue/30 rounded text-xs font-bold tracking-wider hover:bg-peos-blue/20 transition flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" /> IMPORT BACKUP
            <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
          </label>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-6 border-l-4 border-peos-red bg-peos-red/5">
        <h3 className="text-xs font-bold tracking-widest font-mono text-peos-red mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> DANGER ZONE
        </h3>
        <p className="text-[11px] text-peos-text-dim mb-4">
          Wipe all local storage data. This deletes courses, active missions, sprints, and history.
        </p>
        <button 
          onClick={handleClearData}
          className="px-4 py-2 bg-peos-red/20 text-peos-red border border-peos-red/30 rounded text-xs font-bold tracking-wider hover:bg-peos-red/30 transition"
        >
          NUKE ALL DATA
        </button>
      </motion.div>
    </div>
  );
}
