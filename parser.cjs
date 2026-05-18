const fs = require('fs');
const rawText = fs.readFileSync('raw.txt', 'utf8');

function parseCourseData(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const course = {
    courseName: "AlgoZenith Curriculum",
    dailyHours: 2, 
    tracks: []
  };

  let currentTrack = null;
  let currentTask = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect track header
    if (line.startsWith('TASK ') && line.includes('Completed')) {
      currentTrack = {
        name: lines[i + 1],
        tasks: []
      };
      course.tracks.push(currentTrack);
      i++; // skip track name
      continue;
    }

    if (currentTrack) {
        const lLine = line.toLowerCase();
        
        // Ignore garbage
        if (
            lLine.includes('badge icon') || 
            lLine.includes('exclamation icon') ||
            lLine.includes('no due date') ||
            lLine.startsWith('due on') ||
            lLine.startsWith('completed on')
        ) {
            if (lLine.startsWith('completed on') && currentTask) {
                currentTask.completed = true;
            }
            continue;
        }

        // Time format (HH:MM:SS) or single numbers
        if (line.match(/^\d+:\d+:\d+$/) || line.match(/^\d+$/)) {
            continue;
        }
        
        // Ignore "URL" lines from CSES or similar
        if (line === 'URL' || line.includes('CSES')) {
            continue;
        }

        // Everything else is a task title
        currentTask = {
            title: line,
            durationMinutes: 30, // Default duration
            completed: false
        };
        currentTrack.tasks.push(currentTask);
    }
  }
  
  return course;
}

const result = parseCourseData(rawText);
fs.writeFileSync('parsed_course.json', JSON.stringify(result, null, 2));
console.log('Successfully parsed tracks: ' + result.tracks.length);
