#!/usr/bin/env node
/**
 * apply_edits.js — deterministic, validated writer for exercises_master.xlsx
 *
 * The PER-ROW ANALYSIS (web search, muscle choice, text) happens elsewhere and is
 * fed to this script as JSON. This script only does the mechanical, error-prone part:
 * clear old muscle slots, write the new values, VALIDATE them against the SVG terms,
 * sync male/female, and update .editor-state.json. It refuses to write invalid data.
 *
 * Usage:
 *   node apply_edits.js <corrections.json> [--dry-run]
 *
 * corrections.json = array of:
 *   {
 *     "id": "barbell_bench_press",
 *     "sheet": "universal" | "malefemale",
 *     "category": "Free Weights",
 *     "equipment": "barbell",
 *     "trackingMode": "" | "repsOnly" | "timed",   // optional, default ""
 *     "instructions": "1. ...\n2. ... Repeat.",
 *     "tips": "1. ...\n2. ...",
 *     "primary":   [ { "group": "chest", "latins": ["Sternal Head","Clavicular Head"] }, ... ],
 *     "secondary": [ { "group": "Triceps", "latins": ["Triceps Brachii"] }, ... ]
 *   }
 *
 * Only id, sheet, category, equipment, instructions, tips, primary are required.
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const XLSX_PATH = path.resolve(__dirname, 'exercises_master.xlsx');
// NOTE: .editor-state.json is the USER's manual "verified & applied" tracker — never touch it.
// This script tracks what IT has written into the xlsx (pending the user's manual review) here:
const PROGRESS_PATH = path.resolve(__dirname, '.script-progress.json');

// Layout (must match server.js column model).
const NUM_PRIMARY = 5, NUM_SECONDARY = 5, LATINS_PER_GROUP = 4;

// ---- Canonical allowed values (derived from server.js MUSCLE_MAPPING + the SVG regions) ----
// group bucket -> the exact `advance` terms the editor highlights on. THESE are the only
// allowed strings. Mirror app quirks exactly (e.g. "LowerRectus Abdominis" has no space).
const BUCKET_ADVANCES = {
  'neck': ['neck'],
  'shoulders': ['Anterior Deltoids', 'Lateral Deltoids', 'Posterior Deltoid'],
  'chest': ['Clavicular Head', 'Sternal Head'],
  'mid back': ['Upper Traps', 'Rhomboids', 'Lower Traps'],
  'Lats': ['Latissimus Dorsi', 'Rotator Cuff'],
  'biceps': ['Biceps Brachii'],
  'Triceps': ['Triceps Brachii'],
  'forearms': ['Wrist Flexors', 'Wrist Extensors'],
  'abs': ['Upper Rectus Abdominis', 'LowerRectus Abdominis'],
  'oblique': ['External Obliques', 'Internal Obliques'],
  'Lower Back': ['Erector Spinae'],
  'glutes': ['Gluteus Maximus', 'Gluteus Medius'],
  'Quads': ['Rectus Femoris', 'Vastus Medialis', 'Vastus Lateralis'],
  'Abductor': ['Abductor'],
  'Adductors': ['Adductors'],
  'Hamstrings': ['Biceps Femoris', 'Semitendinosus'],
  'Calves': ['Gastrocnemius Lateral', 'Gastrocnemius Medial', 'Soleus'],
  'Shin': ['Fibularis', 'Extensor', 'Tibialis'],
};

let NO_TEXT = false; // when true, instructions/tips are neither validated nor written (muscles-only)
const CATEGORIES = ['Bodyweight', 'Free Weights', 'Resistance', 'Uncategorized'];
const EQUIPMENT = ['bands', 'barbell', 'bench', 'bodyweight', 'cable', 'dumbbell',
  'kettlebell', 'machine', 'other', 'plate', 'pull_up_bar', 'resistance_band'];
const TRACKING = ['', 'repsOnly', 'timed'];

// ---- Validation ------------------------------------------------------------
function validateMuscleList(list, label, errs) {
  if (!Array.isArray(list)) { errs.push(`${label} must be an array`); return; }
  const max = label === 'primary' ? NUM_PRIMARY : NUM_SECONDARY;
  if (list.length > max) errs.push(`${label} has ${list.length} groups (max ${max})`);
  list.forEach((g, i) => {
    if (!g || typeof g.group !== 'string') { errs.push(`${label}[${i}] missing group`); return; }
    const allowed = BUCKET_ADVANCES[g.group];
    if (!allowed) { errs.push(`${label}[${i}] invalid bucket "${g.group}"`); return; }
    const latins = g.latins || [];
    if (!Array.isArray(latins) || latins.length === 0) {
      errs.push(`${label}[${i}] "${g.group}" has no latins`); return;
    }
    if (latins.length > LATINS_PER_GROUP) {
      errs.push(`${label}[${i}] "${g.group}" has ${latins.length} latins (max ${LATINS_PER_GROUP})`);
    }
    latins.forEach(l => {
      if (!allowed.includes(l)) {
        errs.push(`${label}[${i}] "${g.group}": latin "${l}" not a valid advance term ` +
          `(allowed: ${allowed.join(', ')})`);
      }
    });
  });
}

function validateCorrection(c) {
  const errs = [];
  if (!c.id || typeof c.id !== 'string') errs.push('missing id');
  if (c.sheet !== 'universal' && c.sheet !== 'malefemale') errs.push(`sheet must be "universal" or "malefemale" (got "${c.sheet}")`);
  if (!CATEGORIES.includes(c.category)) errs.push(`invalid category "${c.category}" (allowed: ${CATEGORIES.join(', ')})`);
  if (!EQUIPMENT.includes(c.equipment)) errs.push(`invalid equipment "${c.equipment}" (allowed: ${EQUIPMENT.join(', ')})`);
  const tracking = c.trackingMode || '';
  if (!TRACKING.includes(tracking)) errs.push(`invalid trackingMode "${tracking}" (allowed: "", repsOnly, timed)`);
  if (!NO_TEXT) {
    if (typeof c.instructions !== 'string' || !c.instructions.trim()) errs.push('missing/invalid instructions');
    if (typeof c.tips !== 'string' || !c.tips.trim()) errs.push('missing/invalid tips');
  }
  validateMuscleList(c.primary || [], 'primary', errs);
  if (c.secondary) validateMuscleList(c.secondary, 'secondary', errs);
  return errs;
}

// ---- Sheet helpers ---------------------------------------------------------
function headerMap(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const map = {};
  for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell && cell.v != null) map[String(cell.v)] = c;
  }
  return map;
}

function findRowById(ws, hmap, id) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const idCol = hmap['id'];
  for (let r = 1; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: idCol })];
    if (cell && String(cell.v) === id) return r;
  }
  return -1;
}

function setCell(ws, hmap, header, rowIdx, value) {
  const c = hmap[header];
  if (c == null) throw new Error(`column "${header}" not found in sheet`);
  ws[XLSX.utils.encode_cell({ r: rowIdx, c })] = { t: 's', v: value == null ? '' : String(value) };
}

// Clear all muscle slots, then write provided muscles into the row.
function writeRow(ws, hmap, rowIdx, c) {
  setCell(ws, hmap, 'category', rowIdx, c.category);
  setCell(ws, hmap, 'equipment', rowIdx, c.equipment);
  setCell(ws, hmap, 'tracking_mode', rowIdx, c.trackingMode || '');
  if (!NO_TEXT) {
    setCell(ws, hmap, 'instructions', rowIdx, c.instructions);
    setCell(ws, hmap, 'tips', rowIdx, c.tips);
  }

  // Clear every primary/secondary group + latin slot.
  for (let i = 1; i <= NUM_PRIMARY; i++) {
    setCell(ws, hmap, `primary_group_${i}`, rowIdx, '');
    for (let j = 1; j <= LATINS_PER_GROUP; j++) setCell(ws, hmap, `primary_${i}_latin_${j}`, rowIdx, '');
  }
  for (let i = 1; i <= NUM_SECONDARY; i++) {
    setCell(ws, hmap, `sec_group_${i}`, rowIdx, '');
    for (let j = 1; j <= LATINS_PER_GROUP; j++) setCell(ws, hmap, `sec_${i}_latin_${j}`, rowIdx, '');
  }

  // Write fresh.
  (c.primary || []).forEach((g, idx) => {
    const i = idx + 1;
    setCell(ws, hmap, `primary_group_${i}`, rowIdx, g.group);
    (g.latins || []).forEach((l, k) => setCell(ws, hmap, `primary_${i}_latin_${k + 1}`, rowIdx, l));
  });
  (c.secondary || []).forEach((g, idx) => {
    const i = idx + 1;
    setCell(ws, hmap, `sec_group_${i}`, rowIdx, g.group);
    (g.latins || []).forEach((l, k) => setCell(ws, hmap, `sec_${i}_latin_${k + 1}`, rowIdx, l));
  });
}

// ---- Script progress tracker (separate from the user's .editor-state.json) -
function loadState() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8')); }
  catch { return { processedIds: [] }; }
}
function saveState(state) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2));
}

// ---- Main ------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const file = args.find(a => !a.startsWith('--'));
  if (!file) { console.error('Usage: node apply_edits.js <corrections.json> [--dry-run]'); process.exit(1); }

  let corrections = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!Array.isArray(corrections)) { console.error('corrections file must be a JSON array'); process.exit(1); }

  const skipInvalid = args.includes('--skip-invalid');
  NO_TEXT = args.includes('--no-text');

  // Validate everything FIRST.
  const failures = [];
  corrections.forEach((c, i) => {
    const errs = validateCorrection(c);
    if (errs.length) failures.push({ i, id: c && c.id, errs });
  });
  if (failures.length) {
    if (!skipInvalid) {
      // Default: never write a partial/invalid batch.
      console.error(`\n❌ Validation failed for ${failures.length}/${corrections.length} correction(s). Nothing written.\n`);
      for (const f of failures) console.error(`  [${f.i}] ${f.id || '(no id)'}:\n    - ${f.errs.join('\n    - ')}`);
      process.exit(2);
    }
    // --skip-invalid: drop the bad rows, apply the rest, write a reject report.
    const reportPath = path.resolve(__dirname, 'work', 'apply_rejected.json');
    fs.writeFileSync(reportPath, JSON.stringify(failures, null, 2));
    const badIdx = new Set(failures.map(f => f.i));
    corrections = corrections.filter((_, i) => !badIdx.has(i));
    console.log(`⚠️  ${failures.length} invalid correction(s) SKIPPED → ${reportPath}`);
  }
  console.log(`✓ Applying ${corrections.length} valid correction(s).`);

  const wb = XLSX.readFile(XLSX_PATH);
  const sheets = {
    universal: wb.Sheets['universal'],
    male: wb.Sheets['male'],
    female: wb.Sheets['female'],
  };
  const hmaps = {
    universal: headerMap(sheets.universal),
    male: headerMap(sheets.male),
    female: headerMap(sheets.female),
  };

  const applied = [];
  const warnings = [];
  for (const c of corrections) {
    const targets = c.sheet === 'universal' ? ['universal'] : ['male', 'female'];
    let wroteAny = false;
    for (const sn of targets) {
      const ws = sheets[sn];
      const rowIdx = findRowById(ws, hmaps[sn], c.id);
      if (rowIdx < 0) { warnings.push(`${c.id}: not found in "${sn}" sheet — skipped`); continue; }
      if (!dryRun) writeRow(ws, hmaps[sn], rowIdx, c);
      wroteAny = true;
    }
    if (wroteAny) applied.push(c.id);
    else warnings.push(`${c.id}: not found in any target sheet — NOTHING written`);
  }

  if (!dryRun) {
    XLSX.writeFile(wb, XLSX_PATH);
    const state = loadState();
    const set = new Set(state.processedIds || []);
    applied.forEach(id => set.add(id));
    state.processedIds = [...set];
    saveState(state);
  }

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Applied: ${applied.length}/${corrections.length}`);
  if (warnings.length) { console.log('\n⚠️  Warnings:'); warnings.forEach(w => console.log('  - ' + w)); }
  if (!dryRun) console.log(`\n✓ Saved ${XLSX_PATH}\n✓ Updated .script-progress.json (now ${loadState().processedIds.length} ids) — .editor-state.json untouched`);
}

main();
