// Keep replies as text for saving and compatibility with older saved work.
// Only known headings get layout; AI text is never treated as HTML.
export function splitHint(text) {
  const matches = [...text.matchAll(/^(Hint|Example|Visual|Your turn):?[ \t]*\r?$/gm)];
  if (matches.length < 3 || matches[0][1] !== 'Hint'
    || !['Hint,Example,Your turn', 'Hint,Example,Visual,Your turn'].includes(matches.map((m) => m[1]).join(','))) {
    return null;
  }
  const sections = matches.map((match, index) => ({
    title: match[1],
    text: text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length).trim(),
  }));
  if (!sections.every((section) => section.text)) return null;
  const introduction = text.slice(0, matches[0].index).trim();
  return introduction ? [{ title: '', text: introduction }, ...sections] : sections;
}

export function fractionBar(line) {
  const match = /^BAR ([^|\n]{1,60})\s*\|\s*(\d{1,2})\/(\d{1,2})\s*$/.exec(line);
  if (!match) return null;
  const numerator = Number(match[2]);
  const denominator = Number(match[3]);
  return denominator >= 2 && denominator <= 24 && numerator <= denominator
    ? { label: match[1].trim(), numerator, denominator } : null;
}

function renderVisual(container, text) {
  const hasBars = text.split(/\r?\n/).some((line) => fractionBar(line));
  let lines = [];
  const flush = () => {
    if (!lines.length) return;
    const diagram = document.createElement(hasBars ? 'p' : 'pre');
    diagram.className = hasBars ? 'visual-caption' : 'visual-diagram';
    diagram.textContent = lines.join('\n');
    container.append(diagram);
    lines = [];
  };
  for (const line of text.split(/\r?\n/)) {
    const bar = fractionBar(line);
    if (!bar) { lines.push(line); continue; }
    flush();
    const figure = document.createElement('figure');
    figure.className = 'fraction-figure';
    const caption = document.createElement('figcaption');
    caption.textContent = bar.label;
    const pieces = document.createElement('div');
    pieces.className = 'fraction-bar';
    pieces.setAttribute('role', 'img');
    pieces.setAttribute('aria-label', `${bar.label}: ${bar.numerator} of ${bar.denominator} equal parts shaded`);
    for (let i = 0; i < bar.denominator; i++) {
      const piece = document.createElement('span');
      piece.className = i < bar.numerator ? 'fraction-piece shaded' : 'fraction-piece';
      piece.setAttribute('aria-hidden', 'true');
      pieces.append(piece);
    }
    figure.append(caption, pieces);
    container.append(figure);
  }
  flush();
}

export function renderHint(container, text) {
  container.replaceChildren();
  const sections = splitHint(text);
  if (!sections) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    container.append(paragraph);
    return;
  }
  for (const section of sections) {
    if (!section.title) {
      const introduction = document.createElement('p');
      introduction.textContent = section.text;
      container.append(introduction);
      continue;
    }
    const card = document.createElement('section');
    card.className = 'learning-section';
    const heading = document.createElement('h4');
    heading.textContent = section.title === 'Example' ? 'A similar example'
      : section.title === 'Visual' ? 'Picture it' : section.title;
    const content = document.createElement(section.title === 'Visual' ? 'div' : 'p');
    if (section.title === 'Visual') renderVisual(content, section.text);
    else content.textContent = section.text;
    card.append(heading, content);
    container.append(card);
  }
}
