import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react';
import { useCourseStore } from '../stores/courseStore';
import { useMissionStore } from '../stores/missionStore';
import type { CourseInput } from '../types';

const presetModules = import.meta.glob('../data/*.json', { eager: true });
const presets = Object.entries(presetModules).map(([path, mod]: [string, any]) => {
  const data = mod.default || mod;
  return {
    id: path,
    name: data.courseName || path.split('/').pop()?.replace('.json', '') || 'Unknown Course',
    data: data as CourseInput
  };
});

const exampleJson = `{
  "courseName": "System Design Masterclass",
  "dailyHours": 2,
  "tracks": [
    {
      "name": "Fundamentals",
      "tasks": [
        { "title": "Network Protocols (TCP/UDP)", "durationMinutes": 45 },
        { "title": "Load Balancing Strategies", "durationMinutes": 60 }
      ]
    },
    {
      "name": "Data Storage",
      "tasks": [
        { "title": "Relational vs NoSQL", "durationMinutes": 90 },
        { "title": "Database Sharding", "durationMinutes": 60 }
      ]
    }
  ]
}`;

export default function CourseImport() {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const importCourse = useCourseStore(s => s.importCourse);
  const generateTodayMission = useMissionStore(s => s.generateTodayMission);
  const refreshSprints = useMissionStore(s => s.refreshSprints);
  const nav = useNavigate();

  const handleImport = () => {
    try {
      setError(null);
      const parsed = JSON.parse(jsonText) as CourseInput;
      
      // Basic validation
      if (!parsed.courseName || !parsed.tracks || !Array.isArray(parsed.tracks)) {
        throw new Error('Invalid schema: Must contain courseName and tracks array.');
      }
      
      importCourse(parsed);
      refreshSprints();
      generateTodayMission(); // Generate immediate mission if needed
      
      setSuccess(true);
      setTimeout(() => nav('/'), 1500);
      
    } catch (err: any) {
      setError(err.message || 'Invalid JSON format');
    }
  };

  const loadExample = () => setJsonText(exampleJson);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-wide text-peos-text">IMPORT COURSE ROADMAP</h2>
        <p className="text-xs text-peos-text-dim mt-1">Paste a structured JSON roadmap, or load a preset from the codebase.</p>
      </div>

      {presets.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="text-[10px] font-bold tracking-widest text-peos-text-dim mb-3">AVAILABLE PRESETS</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map(preset => (
              <button
                key={preset.id}
                onClick={() => setJsonText(JSON.stringify(preset.data, null, 2))}
                className="px-4 py-2 bg-peos-surface-2 text-peos-text text-xs rounded border border-peos-border hover:bg-peos-surface-3 transition font-bold"
              >
                {preset.name}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-peos-text-dim mt-3 italic">
            Save any JSON file to `src/data/` in the codebase to make it appear here automatically.
          </p>
        </div>
      )}

      {success && (
        <div className="glass-panel p-4 border-l-4 border-l-peos-green flex items-center gap-3 bg-peos-green/10">
          <CheckCircle2 className="w-5 h-5 text-peos-green" />
          <p className="text-sm font-bold text-peos-green">Course imported successfully! Initializing sprints and daily mission...</p>
        </div>
      )}

      {error && (
        <div className="glass-panel p-4 border-l-4 border-l-peos-red flex items-center gap-3 bg-peos-red/10">
          <AlertTriangle className="w-5 h-5 text-peos-red" />
          <p className="text-sm font-bold text-peos-red">{error}</p>
        </div>
      )}

      <div className="glass-panel p-1 rounded-lg">
        <div className="flex items-center justify-between px-4 py-2 border-b border-peos-border/50 bg-peos-surface-2/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-peos-text-dim" />
            <span className="text-[10px] font-mono text-peos-text-dim tracking-widest">ROADMAP.JSON</span>
          </div>
          <button onClick={loadExample} className="text-[10px] text-peos-blue hover:text-peos-blue/80 font-mono underline decoration-peos-blue/30 underline-offset-4 transition">
            Load Example
          </button>
        </div>
        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          className="w-full h-[400px] bg-peos-bg/50 p-4 font-mono text-sm text-peos-text placeholder:text-peos-text-dim/30 focus:outline-none resize-none"
          placeholder="Paste JSON here..."
          spellCheck="false"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleImport}
          disabled={!jsonText.trim() || success}
          className="flex items-center gap-2 px-8 py-3 bg-peos-green/20 text-peos-green border border-peos-green/30 rounded-lg font-bold text-sm tracking-wider hover:bg-peos-green/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" /> IMPORT ROADMAP
        </button>
      </div>
    </div>
  );
}
