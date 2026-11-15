const storageKey = 'schoolsidekick.saved.v1';
const calendarKey = 'schoolsidekick.calendar.v1';
const samples = [
  { id: 'sample-hint', label: 'Sample hint', title: 'Comparing fractions', answer: 'Start with 1/2 and 3/8. Rewrite 1/2 with a denominator of 8. With matching denominators, which numerator is larger?' },
  { id: 'sample-lesson', label: 'Sample lesson', title: 'Drawing the water cycle', answer: 'Goal: Explain where water goes as it moves through the water cycle.\n\nSketch the cycle as a class for 8 minutes, label a diagram in pairs for 12 minutes, and use a 5-minute exit question about condensation. Review the draft before teaching.' },
];

function readSaved() {
  const stored = localStorage.getItem(storageKey);
  if (stored === null) return samples;
  const items = JSON.parse(stored);
  if (!Array.isArray(items)) throw new Error('Saved work could not be read');
  return items;
}

export function loadSaved(workspace) {
  return readSaved().filter((item) => {
    const role = item.workspace ?? (['Lesson', 'Sample lesson'].includes(item.label) ? 'teacher' : 'student');
    return role === workspace;
  });
}

export function saveAnswer(item) {
  localStorage.setItem(storageKey, JSON.stringify([item, ...readSaved()]));
}

export function removeAnswer(id) {
  localStorage.setItem(storageKey, JSON.stringify(readSaved().filter((item) => item.id !== id)));
}

export function loadEvents() {
  const events = JSON.parse(localStorage.getItem(calendarKey) ?? '[]');
  if (!Array.isArray(events)) throw new Error('Calendar could not be read');
  return events;
}

export function addEvent(event) {
  localStorage.setItem(calendarKey, JSON.stringify([...loadEvents(), event]));
}

export function removeEvent(id) {
  localStorage.setItem(calendarKey, JSON.stringify(loadEvents().filter((event) => event.id !== id)));
}
