// State
let exercises = [];
let muscleMapping = [];
let selectedExercise = null;
let muscleMode = 'primary';
let currentVideoType = 'male';
let isNewExercise = false;
let editedIds = new Set(); // track which exercises have been edited

let svgFrontRaw = '';
let svgBackRaw = '';

let currentPrimary = [];
let currentSecondary = [];

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// Make muscle regions transparent by default (they ship as black)
function prepareSvg(raw) {
  const muscleIds = new Set(muscleMapping.map(m => m.svgId));
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');
  const svg = doc.querySelector('svg');

  svg.querySelectorAll('[id]').forEach(el => {
    const id = el.getAttribute('id');
    if (id === 'body_shape' || id === 'svg1' || id === 'defs1') return;
    if (muscleIds.has(id)) {
      el.style.fill = 'transparent';
      el.style.stroke = 'rgba(255,255,255,0.15)';
      el.style.strokeWidth = '0.5';
    }
  });

  return new XMLSerializer().serializeToString(svg);
}

// Boot
document.addEventListener('DOMContentLoaded', async () => {
  const [mappingRes, frontRes, backRes] = await Promise.all([
    fetch('/api/muscle-mapping'),
    fetch('body_front.svg'),
    fetch('body_back.svg'),
  ]);
  muscleMapping = await mappingRes.json();
  svgFrontRaw = prepareSvg(await frontRes.text());
  svgBackRaw = prepareSvg(await backRes.text());

  bindEvents();

  await loadEditorState();
  await loadExercises();

  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    if (cfg.assetsFolder) {
      showApp();
      return;
    }
  } catch {}

  showConfig();
});

function bindEvents() {
  $('#folder-btn').addEventListener('click', setFolder);
  $('#folder-input').addEventListener('keydown', e => { if (e.key === 'Enter') setFolder(); });
  $('#search-input').addEventListener('input', renderList);
  $('#sheet-filter').addEventListener('change', renderList);
  $('#add-btn').addEventListener('click', addNewExercise);
  $('#save-btn').addEventListener('click', exportXlsx);
  $('#change-folder-btn').addEventListener('click', showConfig);
  $('#toggle-primary').addEventListener('click', () => setMuscleMode('primary'));
  $('#toggle-secondary').addEventListener('click', () => setMuscleMode('secondary'));
  $$('.video-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.video-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentVideoType = tab.dataset.vtype;
      loadVideo();
    });
  });
  $('#apply-btn').addEventListener('click', applyChanges);
  $('#reset-btn').addEventListener('click', resetEditor);
  $('#delete-btn').addEventListener('click', deleteExercise);
}

// Config
async function setFolder() {
  const folder = $('#folder-input').value.trim();
  if (!folder) return;
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetsFolder: folder })
  });
  const data = await res.json();
  if (!res.ok) {
    $('#folder-error').textContent = data.error || 'Failed to set folder';
    return;
  }
  await loadEditorState();
  await loadExercises();
  showApp();
}

function showConfig() {
  $('#config-overlay').classList.remove('hidden');
  $('#app').classList.add('hidden');
  $('#folder-error').textContent = '';
}

function showApp() {
  $('#config-overlay').classList.add('hidden');
  $('#app').classList.remove('hidden');
}

// Exercises
async function loadExercises() {
  const res = await fetch('/api/exercises');
  exercises = await res.json();
  renderList();
}

async function loadEditorState() {
  try {
    const res = await fetch('/api/editor-state');
    const data = await res.json();
    editedIds = new Set(data.editedIds || []);
  } catch {
    editedIds = new Set();
  }
}

async function saveEditorState() {
  try {
    await fetch('/api/editor-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editedIds: [...editedIds] })
    });
  } catch {}
}

function renderList() {
  const query = $('#search-input').value.toLowerCase();
  const filter = $('#sheet-filter').value;

  const filtered = exercises.filter(ex => {
    if (filter !== 'all' && ex.sheet !== filter) return false;
    if (query && !ex.name.toLowerCase().includes(query) && !ex.id.toLowerCase().includes(query)) return false;
    return true;
  });

  const list = $('#exercise-list');
  list.innerHTML = '';
  $('#exercise-count').textContent = filtered.length;
  $('#edited-count').textContent = `${editedIds.size} / ${exercises.length} edited`;

  filtered.forEach(ex => {
    const li = document.createElement('li');
    li.dataset.id = ex.id;
    if (selectedExercise && selectedExercise.id === ex.id) li.classList.add('active');

    // Checkmark for edited exercises
    const check = document.createElement('span');
    if (editedIds.has(ex.id)) {
      check.className = 'check edited';
      check.textContent = '\u2713';
    } else {
      check.className = 'check not-edited';
      check.textContent = '\u25CB';
    }
    li.appendChild(check);

    const name = document.createElement('span');
    name.className = 'ex-name';
    name.textContent = ex.name;

    const badge = document.createElement('span');
    badge.className = 'sheet-badge';
    badge.textContent = ex.sheet === 'universal' ? 'UNI' : 'M/F';

    li.appendChild(name);
    li.appendChild(badge);
    li.addEventListener('click', () => selectExercise(ex));
    list.appendChild(li);
  });
}

function selectExercise(ex) {
  selectedExercise = ex;
  isNewExercise = false;
  renderList();
  showEditor(ex);
}

function showEditor(ex) {
  $('#editor').classList.remove('empty-state');
  $('#empty-msg').classList.add('hidden');
  $('#editor-content').classList.remove('hidden');

  $('#ex-id').value = ex.id;
  $('#ex-id').disabled = !isNewExercise;
  $('#ex-name').value = ex.name;
  $('#ex-category').value = ex.category;
  $('#ex-equipment').value = ex.equipment;
  $('#ex-tracking').value = ex.trackingMode || '';
  $('#ex-sheet').value = ex.sheet;
  $('#ex-sheet').disabled = !isNewExercise;
  $('#ex-instructions').value = ex.instructions;
  $('#ex-tips').value = ex.tips;

  currentPrimary = buildMuscleState(ex.primaryMuscles);
  currentSecondary = buildMuscleState(ex.secondaryMuscles);

  injectSvgs();
  renderMuscleTags();
  colorSvgMuscles();

  currentVideoType = ex.sheet === 'universal' ? 'universal' : 'male';
  $$('.video-tab').forEach(t => t.classList.toggle('active', t.dataset.vtype === currentVideoType));
  loadVideo();
}

function buildMuscleState(muscles) {
  if (!muscles) return [];
  const state = [];
  for (const m of muscles) {
    if (!m.group) continue;
    for (const latin of m.latins) {
      if (!latin) continue;
      const mapping = muscleMapping.find(mm => mm.advance.toLowerCase() === latin.toLowerCase());
      if (mapping) {
        if (!state.find(s => s.svgId === mapping.svgId)) {
          state.push({ svgId: mapping.svgId, advance: mapping.advance, simple: mapping.simple });
        }
      } else {
        if (!state.find(s => s.advance.toLowerCase() === latin.toLowerCase())) {
          state.push({ svgId: null, advance: latin, simple: m.group });
        }
      }
    }
    if (m.latins.length === 0) {
      const mapping = muscleMapping.find(mm => mm.simple.toLowerCase() === m.group.toLowerCase());
      if (mapping && !state.find(s => s.svgId === mapping.svgId)) {
        state.push({ svgId: mapping.svgId, advance: mapping.advance, simple: mapping.simple });
      }
    }
  }
  return state;
}

// SVG
function injectSvgs() {
  $('#svg-front-wrapper').innerHTML = svgFrontRaw;
  $('#svg-back-wrapper').innerHTML = svgBackRaw;
  setupSvgInteractivity($('#svg-front-wrapper svg'));
  setupSvgInteractivity($('#svg-back-wrapper svg'));
}

function setupSvgInteractivity(svg) {
  if (!svg) return;
  svg.querySelectorAll('[id]').forEach(el => {
    const id = el.getAttribute('id');
    if (id === 'body_shape' || id === 'svg1' || id === 'defs1') return;
    const mapping = muscleMapping.find(m => m.svgId === id);
    if (!mapping) return;

    el.style.cursor = 'pointer';
    el.style.transition = 'opacity 0.15s';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMuscle(mapping);
    });
    el.addEventListener('mouseenter', () => { el.style.opacity = '0.7'; });
    el.addEventListener('mouseleave', () => { el.style.opacity = '1'; });
  });
}

function setMuscleMode(mode) {
  muscleMode = mode;
  $('#toggle-primary').classList.toggle('active', mode === 'primary');
  $('#toggle-secondary').classList.toggle('active', mode === 'secondary');
}

function toggleMuscle(mapping) {
  const list = muscleMode === 'primary' ? currentPrimary : currentSecondary;
  const otherList = muscleMode === 'primary' ? currentSecondary : currentPrimary;

  const idx = list.findIndex(m => m.svgId === mapping.svgId);
  if (idx !== -1) {
    list.splice(idx, 1);
  } else {
    const otherIdx = otherList.findIndex(m => m.svgId === mapping.svgId);
    if (otherIdx !== -1) otherList.splice(otherIdx, 1);
    list.push({ svgId: mapping.svgId, advance: mapping.advance, simple: mapping.simple });
  }
  renderMuscleTags();
  colorSvgMuscles();
}

function removeMuscle(type, idx) {
  if (type === 'primary') currentPrimary.splice(idx, 1);
  else currentSecondary.splice(idx, 1);
  renderMuscleTags();
  colorSvgMuscles();
}

function renderMuscleTags() {
  $('#primary-tags').innerHTML = currentPrimary.map((m, i) =>
    `<span class="tag primary">${m.advance} <span class="remove" onclick="removeMuscle('primary',${i})">&times;</span></span>`
  ).join('');
  $('#secondary-tags').innerHTML = currentSecondary.map((m, i) =>
    `<span class="tag secondary">${m.advance} <span class="remove" onclick="removeMuscle('secondary',${i})">&times;</span></span>`
  ).join('');
}

function colorSvgMuscles() {
  ['#svg-front-wrapper svg', '#svg-back-wrapper svg'].forEach(sel => {
    const svg = $(sel);
    if (!svg) return;

    // Reset all to transparent
    muscleMapping.forEach(m => {
      const el = svg.getElementById(m.svgId);
      if (el) el.style.fill = 'transparent';
    });

    // Secondary (pale red)
    currentSecondary.forEach(m => {
      if (!m.svgId) return;
      const el = svg.getElementById(m.svgId);
      if (el) el.style.fill = '#e9456066';
    });

    // Primary (dark red)
    currentPrimary.forEach(m => {
      if (!m.svgId) return;
      const el = svg.getElementById(m.svgId);
      if (el) el.style.fill = '#e94560';
    });
  });
}

// Video
function loadVideo() {
  if (!selectedExercise) return;
  const player = $('#video-player');
  const missing = $('#video-missing');
  let type = currentVideoType;
  if (selectedExercise.sheet === 'universal') type = 'universal';

  player.classList.remove('hidden');
  missing.classList.add('hidden');
  player.src = `/api/videos/${type}/${selectedExercise.id}.mp4`;
  player.loop = true;
  player.muted = true;
  player.play().catch(() => {});
  player.onerror = () => {
    player.classList.add('hidden');
    missing.classList.remove('hidden');
  };
}

// CRUD
function addNewExercise() {
  isNewExercise = true;
  selectedExercise = {
    id: '', name: '', category: '', equipment: '',
    instructions: '', tips: '', trackingMode: '',
    sheet: 'male', primaryMuscles: [], secondaryMuscles: [], videoStatus: ''
  };
  renderList();
  showEditor(selectedExercise);
  $('#ex-id').focus();
}

function collectEditorState() {
  const buildMuscleGroups = (muscleState) => {
    const grouped = {};
    for (const m of muscleState) {
      const key = m.simple;
      if (!grouped[key]) grouped[key] = { group: key, latins: [] };
      if (m.advance && !grouped[key].latins.includes(m.advance)) {
        grouped[key].latins.push(m.advance);
      }
    }
    return Object.values(grouped);
  };

  return {
    id: $('#ex-id').value.trim(),
    name: $('#ex-name').value.trim(),
    category: $('#ex-category').value,
    equipment: $('#ex-equipment').value,
    trackingMode: $('#ex-tracking').value,
    sheet: $('#ex-sheet').value,
    instructions: $('#ex-instructions').value.trim(),
    tips: $('#ex-tips').value.trim(),
    primaryMuscles: buildMuscleGroups(currentPrimary),
    secondaryMuscles: buildMuscleGroups(currentSecondary),
  };
}

function resetEditor() {
  if (!selectedExercise) return;
  showEditor(selectedExercise);
}

async function applyChanges() {
  const data = collectEditorState();
  if (!data.id) { alert('Exercise ID is required'); return; }
  if (!data.name) { alert('Exercise name is required'); return; }

  const res = await fetch('/api/exercises', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    alert(err.error || 'Failed to save');
    return;
  }

  editedIds.add(data.id);
  await saveEditorState();
  await loadExercises();
  const updated = exercises.find(e => e.id === data.id);
  if (updated) selectExercise(updated);
  showToast('Exercise saved');
}

async function deleteExercise() {
  if (!selectedExercise || !selectedExercise.id) return;
  if (!confirm(`Delete "${selectedExercise.name}"?`)) return;

  const res = await fetch(`/api/exercises/${selectedExercise.id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    alert(err.error || 'Failed to delete');
    return;
  }
  editedIds.delete(selectedExercise.id);
  await saveEditorState();
  selectedExercise = null;
  isNewExercise = false;
  $('#editor').classList.add('empty-state');
  $('#empty-msg').classList.remove('hidden');
  $('#editor-content').classList.add('hidden');
  await loadExercises();
  showToast('Exercise deleted');
}

async function exportXlsx() {
  const res = await fetch('/api/exercises/export', { method: 'POST' });
  if (res.ok) showToast('XLSX exported successfully');
  else {
    const err = await res.json();
    alert(err.error || 'Export failed');
  }
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    background: #4caf50; color: #fff;
    padding: 12px 24px; border-radius: 8px;
    font-size: 14px; z-index: 200;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

window.removeMuscle = removeMuscle;
