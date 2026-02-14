const STORAGE_KEY = 'theatre-classes-planning';

const defaultWaveTimes = () => ({
  A: { start: '17:00', end: '17:25' },
  B: { start: '17:30', end: '17:50' },
  C: { start: '17:55', end: '18:15' },
  D: { start: '18:20', end: '18:40' },
});

function normalizeTimeForInput(val) {
  if (!val || typeof val !== 'string') return '';
  const t = val.trim();
  const colon = t.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) return `${colon[1].padStart(2, '0')}:${colon[2]}`;
  const m = t.match(/^(\d{1,2})h?(\d{2})?$/);
  if (m) return `${m[1].padStart(2, '0')}:${(m[2] || '00').padStart(2, '0')}`;
  return t;
}

const defaultState = () => ({
  classes: [],
  siblingGroups: [],
  editingClassIds: [],
  toastClassIds: [],
  selectedStudentIds: [],
  waveTimes: defaultWaveTimes(),
});

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    const classes = data.classes ?? [];
    const editingClassIds = (data.editingClassIds ?? []).filter((id) =>
      classes.some((c) => c.id === id)
    );
    const rawWaveTimes = data.waveTimes && typeof data.waveTimes === 'object' ? data.waveTimes : {};
    const waveTimes = (() => {
      const def = defaultWaveTimes();
      const out = {};
      for (const w of ['A', 'B', 'C', 'D']) {
        const s = rawWaveTimes[w]?.start ?? def[w]?.start ?? '';
        const e = rawWaveTimes[w]?.end ?? def[w]?.end ?? '';
        out[w] = { start: normalizeTimeForInput(s) || def[w].start, end: normalizeTimeForInput(e) || def[w].end };
      }
      return out;
    })();
    return {
      classes,
      siblingGroups: data.siblingGroups ?? [],
      editingClassIds,
      toastClassIds: [],
      selectedStudentIds: [],
      waveTimes,
    };
  } catch {
    return defaultState();
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = load();

export function getState() {
  return state;
}

export function setState(updater) {
  state = typeof updater === 'function' ? updater(state) : updater;
  save(state);
  return state;
}

export function resetState() {
  state = defaultState();
  save(state);
  return state;
}

// Helpers pour générer des ids
export function nextId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
