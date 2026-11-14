const storageKey = 'schoolsidekick.saved.v1';
const samples = [
  { id: 'sample-hint', label: 'Sample hint', title: 'Comparing fractions', answer: 'Start with 1/2 and 3/8. Rewrite 1/2 with a denominator of 8. With matching denominators, which numerator is larger?' },
  { id: 'sample-lesson', label: 'Sample lesson', title: 'Drawing the water cycle', answer: 'Goal: Explain where water goes as it moves through the water cycle.\n\nSketch the cycle as a class for 8 minutes, label a diagram in pairs for 12 minutes, and use a 5-minute exit question about condensation. Review the draft before teaching.' },
];

export function loadSaved() {
  const stored = localStorage.getItem(storageKey);
  if (stored === null) return samples;
  const items = JSON.parse(stored);
  if (!Array.isArray(items)) throw new Error('Saved work could not be read');
  return items;
}

export function saveAnswer(item) {
  localStorage.setItem(storageKey, JSON.stringify([item, ...loadSaved()]));
}

export function removeAnswer(id) {
  localStorage.setItem(storageKey, JSON.stringify(loadSaved().filter((item) => item.id !== id)));
}
