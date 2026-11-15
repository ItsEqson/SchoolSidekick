import { addEvent, loadEvents, removeEvent } from './storage.js';

const monthLabel = document.querySelector('#calendar-month');
const days = document.querySelector('#calendar-days');
const dayLabel = document.querySelector('#selected-day');
const eventList = document.querySelector('#day-events');
const eventForm = document.querySelector('#event-form');
const title = document.querySelector('#event-title');
const status = document.querySelector('#planner-status');
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const today = new Date();
let selected = today;

function dateKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
}

export function renderPlanner(focusDay = false) {
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const last = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
  const selectedKey = dateKey(selected);
  let events = [];
  status.textContent = '';
  try {
    events = loadEvents();
  } catch {
    status.textContent = 'Your browser couldn’t load the calendar.';
  }
  monthLabel.textContent = monthFormat.format(first);
  dayLabel.textContent = dayFormat.format(selected);
  days.replaceChildren();
  for (let space = 0; space < first.getDay(); space++) days.append(document.createElement('span'));
  for (let day = 1; day <= last.getDate(); day++) {
    const date = new Date(first.getFullYear(), first.getMonth(), day);
    const key = dateKey(date);
    const count = events.filter((event) => event.date === key).length;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = day;
    button.setAttribute('aria-label', `${dayFormat.format(date)}${count ? `, ${count} scheduled` : ''}`);
    button.setAttribute('aria-pressed', key === selectedKey);
    if (key === dateKey(today)) button.setAttribute('aria-current', 'date');
    if (count) button.classList.add('has-events');
    button.addEventListener('click', () => {
      selected = date;
      renderPlanner(true);
    });
    days.append(button);
    if (focusDay && key === selectedKey) button.focus();
  }

  eventList.replaceChildren();
  const scheduled = events.filter((event) => event.date === selectedKey);
  if (!scheduled.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Nothing scheduled for this day.';
    eventList.append(empty);
  }
  for (const event of scheduled) {
    const item = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = event.title;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${event.title}`);
    remove.addEventListener('click', () => {
      try {
        removeEvent(event.id);
        renderPlanner();
        title.focus();
        status.textContent = 'Removed from your calendar.';
      } catch {
        status.textContent = 'Your browser couldn’t update the calendar.';
      }
    });
    item.append(text, remove);
    eventList.append(item);
  }
}

function changeMonth(offset) {
  selected = new Date(selected.getFullYear(), selected.getMonth() + offset, 1);
  renderPlanner();
}

document.querySelector('#prev-month').addEventListener('click', () => changeMonth(-1));
document.querySelector('#next-month').addEventListener('click', () => changeMonth(1));
eventForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = title.value.trim();
  if (!name) {
    status.textContent = 'Enter something you want to remember.';
    return;
  }
  try {
    addEvent({ id: crypto.randomUUID(), date: dateKey(selected), title: name });
    title.value = '';
    renderPlanner();
    status.textContent = 'Added to your calendar.';
  } catch {
    status.textContent = 'Your browser couldn’t save the event.';
  }
});
