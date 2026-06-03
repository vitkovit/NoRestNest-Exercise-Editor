const express = require('express');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = 3333;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------
let assetsFolder = null;

// ---------------------------------------------------------------------------
// Schema constants (matching import_from_xlsx.py)
// ---------------------------------------------------------------------------
const NUM_PRIMARY_GROUPS = 5;
const NUM_LATINS_PER_PRIMARY = 4;
const NUM_SECONDARY_GROUPS = 5;
const NUM_LATINS_PER_SECONDARY = 4;

const COLUMNS_PREFIX = ['id', 'name', 'category', 'equipment', 'instructions', 'tips'];
const COLUMNS_SUFFIX = ['tracking_mode', 'video_path', 'video_status'];

function buildMuscleColumns() {
  const cols = [];
  for (let i = 1; i <= NUM_PRIMARY_GROUPS; i++) {
    cols.push(`primary_group_${i}`);
    for (let j = 1; j <= NUM_LATINS_PER_PRIMARY; j++) {
      cols.push(`primary_${i}_latin_${j}`);
    }
  }
  for (let i = 1; i <= NUM_SECONDARY_GROUPS; i++) {
    cols.push(`sec_group_${i}`);
    for (let j = 1; j <= NUM_LATINS_PER_SECONDARY; j++) {
      cols.push(`sec_${i}_latin_${j}`);
    }
  }
  return cols;
}

const COLUMNS_MUSCLES = buildMuscleColumns();
const COLUMNS = [...COLUMNS_PREFIX, ...COLUMNS_MUSCLES, ...COLUMNS_SUFFIX];

// ---------------------------------------------------------------------------
// Hardcoded SVG muscle mapping
// ---------------------------------------------------------------------------
const MUSCLE_MAPPING = [
  {"svgId":"neck","displayName":"Neck","simple":"neck","advance":"neck","section":"Upper Body","muscleGroup":"neck","advanceKeywords":["Levator Scapulae","Scalenes","Splenius Capitis","Sternocleidomastoid"]},
  {"svgId":"front_delts","displayName":"Front Delts","simple":"shoulders","advance":"Anterior Deltoids","section":"Upper Body","muscleGroup":"shoulders","advanceKeywords":["Anterior Deltoid","Anterior Deltoids","Front Shoulders"]},
  {"svgId":"side_delts","displayName":"Side Delts","simple":"shoulders","advance":"Lateral Deltoids","section":"Upper Body","muscleGroup":"shoulders","advanceKeywords":["Lateral Deltoid","Lateral Deltoids"]},
  {"svgId":"rear_delts","displayName":"Rear Delts","simple":"shoulders","advance":"Posterior Deltoid","section":"Upper Body","muscleGroup":"shoulders","advanceKeywords":["Posterior Deltoid","Posterior Deltoids","Rear Deltoids"]},
  {"svgId":"upper_chest","displayName":"Upper Chest","simple":"chest","advance":"Clavicular Head","section":"Upper Body","muscleGroup":"chest","advanceKeywords":["Clavicular Head","Upper Chest"]},
  {"svgId":"mid_chest","displayName":"Mid Chest","simple":"chest","advance":"Sternal Head","section":"Upper Body","muscleGroup":"chest","advanceKeywords":["Sternal Head","Pectoralis Major"]},
  {"svgId":"lower_chest","displayName":"Lower Chest","simple":"chest","advance":"Sternal Head","section":"Upper Body","muscleGroup":"chest","advanceKeywords":["Sternal Head","Pectoralis Major"]},
  {"svgId":"upper_traps","displayName":"Upper Traps","simple":"mid back","advance":"Upper Traps","section":"Upper Body","muscleGroup":"back","advanceKeywords":["Upper Trapezius","Trapezius","Traps"]},
  {"svgId":"mid_traps","displayName":"Mid Traps","simple":"mid back","advance":"Rhomboids","section":"Upper Body","muscleGroup":"back","advanceKeywords":["Rhomboids"]},
  {"svgId":"lower_traps","displayName":"Lower Traps","simple":"mid back","advance":"Lower Traps","section":"Upper Body","muscleGroup":"back","advanceKeywords":["Lower Trapezius","Trapezius","Traps"]},
  {"svgId":"lats","displayName":"Lats","simple":"Lats","advance":"Latissimus Dorsi","section":"Upper Body","muscleGroup":"back","advanceKeywords":["Latissimus Dorsi","Teres Major"]},
  {"svgId":"rotator_cuff","displayName":"Rotator Cuff","simple":"Lats","advance":"Rotator Cuff","section":"Upper Body","muscleGroup":"back","advanceKeywords":["Rotator Cuff","Infraspinatus","Subscapularis","Supraspinatus","Teres Minor"]},
  {"svgId":"outer_biceps","displayName":"Outer Biceps","simple":"biceps","advance":"Biceps Brachii","section":"Upper Body","muscleGroup":"biceps","advanceKeywords":["Biceps Brachii","Brachiali","Musculus Brachialis"]},
  {"svgId":"inner_biceps","displayName":"Inner Biceps","simple":"biceps","advance":"Biceps Brachii","section":"Upper Body","muscleGroup":"biceps","advanceKeywords":["Biceps Brachii","Brachiali","Musculus Brachialis"]},
  {"svgId":"rear_triceps","displayName":"Rear Triceps","simple":"Triceps","advance":"Triceps Brachii","section":"Upper Body","muscleGroup":"triceps","advanceKeywords":["Triceps Brachii"]},
  {"svgId":"outer_triceps","displayName":"Outer Triceps","simple":"Triceps","advance":"Triceps Brachii","section":"Upper Body","muscleGroup":"triceps","advanceKeywords":["Triceps Brachii"]},
  {"svgId":"inner_triceps","displayName":"Inner Triceps","simple":"Triceps","advance":"Triceps Brachii","section":"Upper Body","muscleGroup":"triceps","advanceKeywords":["Triceps Brachii"]},
  {"svgId":"inner_forearm","displayName":"Inner Forearm","simple":"forearms","advance":"Wrist Flexors","section":"Upper Body","muscleGroup":"forearms","advanceKeywords":["Flexor Carpi Radialis","Flexor Carpi Ulnaris","Pronator Teres","Palmaris Longus"]},
  {"svgId":"outer_forearm","displayName":"Outer Forearm","simple":"forearms","advance":"Wrist Extensors","section":"Upper Body","muscleGroup":"forearms","advanceKeywords":["Brachioradialis","Extensor Carpi Radialis","Extensor Carpi Ulnaris"]},
  {"svgId":"upper_abs","displayName":"Upper Abs","simple":"abs","advance":"Upper Rectus Abdominis","section":"Core","muscleGroup":"abs","advanceKeywords":["Upper Abs","Rectus Abdominis","Transverse Abdominis"]},
  {"svgId":"lower_abs","displayName":"Lower Abs","simple":"abs","advance":"Lower Rectus Abdominis","section":"Core","muscleGroup":"abs","advanceKeywords":["Lower Abs","Rectus Abdominis","Transverse Abdominis"]},
  {"svgId":"external_oblique","displayName":"External Oblique","simple":"oblique","advance":"External Obliques","section":"Core","muscleGroup":"abs","advanceKeywords":["External Oblique","External Obliques"]},
  {"svgId":"internal_oblique","displayName":"Internal Oblique","simple":"oblique","advance":"Internal Obliques","section":"Core","muscleGroup":"abs","advanceKeywords":["Internal Oblique","Internal Obliques"]},
  {"svgId":"lower_back","displayName":"Lower Back","simple":"Lower Back","advance":"Erector Spinae","section":"Core","muscleGroup":"lowerBack","advanceKeywords":["Erector Spinae","Lower Back"]},
  {"svgId":"glutes","displayName":"Glutes","simple":"glutes","advance":"Gluteus Maximus","section":"Lower Body","muscleGroup":"glutes","advanceKeywords":["Gluteus Maximus"]},
  {"svgId":"side_glutes","displayName":"Side Glutes","simple":"glutes","advance":"Gluteus Medius","section":"Lower Body","muscleGroup":"glutes","advanceKeywords":["Gluteus Medius","Gluteus Minimus","Piriformis"]},
  {"svgId":"middle_quad","displayName":"Middle Quad","simple":"Quads","advance":"Rectus Femoris","section":"Lower Body","muscleGroup":"quadriceps","advanceKeywords":["Quadriceps Femoris"]},
  {"svgId":"inner_quad","displayName":"Inner Quad","simple":"Quads","advance":"Vastus Medialis","section":"Lower Body","muscleGroup":"quadriceps","advanceKeywords":["Quadriceps Femoris"]},
  {"svgId":"outer_quad","displayName":"Outer Quad","simple":"Quads","advance":"Vastus Lateralis","section":"Lower Body","muscleGroup":"quadriceps","advanceKeywords":["Quadriceps Femoris"]},
  {"svgId":"tensor","displayName":"Tensor","simple":"Abductor","advance":"Abductor","section":"Lower Body","muscleGroup":"quadriceps","advanceKeywords":["Hip Flexors","Iliopsoas","Tensor Fasciae Latae"]},
  {"svgId":"inner_thighs","displayName":"Inner Thighs","simple":"Adductors","advance":"Adductors","section":"Lower Body","muscleGroup":"quadriceps","advanceKeywords":["Adductor Brevis","Adductor Longus","Adductor Magnus"]},
  {"svgId":"outer_hamstring","displayName":"Outer Hamstring","simple":"Hamstrings","advance":"Biceps Femoris","section":"Lower Body","muscleGroup":"hamstrings","advanceKeywords":["Biceps Femoris"]},
  {"svgId":"inner_hamstring","displayName":"Inner Hamstring","simple":"Hamstrings","advance":"Semitendinosus","section":"Lower Body","muscleGroup":"hamstrings","advanceKeywords":["Semimembranosus","Semitendinosus"]},
  {"svgId":"outer_calves","displayName":"Outer Calves","simple":"Calves","advance":"Gastrocnemius Lateral","section":"Lower Body","muscleGroup":"calves","advanceKeywords":["Gastrocnemius"]},
  {"svgId":"inner_calves","displayName":"Inner Calves","simple":"Calves","advance":"Gastrocnemius Medial","section":"Lower Body","muscleGroup":"calves","advanceKeywords":["Gastrocnemius"]},
  {"svgId":"deep_calves","displayName":"Deep Calves","simple":"Calves","advance":"Soleus","section":"Lower Body","muscleGroup":"calves","advanceKeywords":["Soleus"]},
  {"svgId":"outer_shin","displayName":"Outer Shin","simple":"Shin","advance":"Fibularis","section":"Lower Body","muscleGroup":"calves","advanceKeywords":["Fibularis Muscles","Peroneus Longus"]},
  {"svgId":"front_shin_extensor","displayName":"Front Shin Extensor","simple":"Shin","advance":"Extensor","section":"Lower Body","muscleGroup":"calves","advanceKeywords":[]},
  {"svgId":"shin_muscle","displayName":"Shin Muscle","simple":"Shin","advance":"Tibialis","section":"Lower Body","muscleGroup":"calves","advanceKeywords":["Tibialis Anterior","Tibialis Posterior"]}
];

// ---------------------------------------------------------------------------
// Helpers: XLSX reading/writing
// ---------------------------------------------------------------------------

function getXlsxPath() {
  return path.resolve(__dirname, 'exercises_master.xlsx');
}

/**
 * Read a worksheet into an array of row-objects keyed by COLUMNS.
 */
function readSheet(workbook, sheetName) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const rows = [];

  for (let r = range.s.r + 1; r <= range.e.r; r++) { // skip header row (r=0)
    const row = {};
    let hasId = false;

    for (let c = 0; c < COLUMNS.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      const val = cell ? String(cell.v != null ? cell.v : '').trim() : '';
      row[COLUMNS[c]] = val;
      if (c === 0 && val) hasId = true;
    }

    if (!hasId) continue; // skip empty rows
    row._rowIndex = r; // 0-based row index in the sheet
    rows.push(row);
  }

  return rows;
}

/**
 * Convert a flat row-object into the API response format.
 */
function rowToExercise(row, sheetName) {
  const primaryMuscles = [];
  for (let i = 1; i <= NUM_PRIMARY_GROUPS; i++) {
    const group = row[`primary_group_${i}`] || '';
    if (!group) continue;
    const latins = [];
    for (let j = 1; j <= NUM_LATINS_PER_PRIMARY; j++) {
      const latin = row[`primary_${i}_latin_${j}`] || '';
      if (latin) latins.push(latin);
    }
    primaryMuscles.push({ group, latins });
  }

  const secondaryMuscles = [];
  for (let i = 1; i <= NUM_SECONDARY_GROUPS; i++) {
    const group = row[`sec_group_${i}`] || '';
    if (!group) continue;
    const latins = [];
    for (let j = 1; j <= NUM_LATINS_PER_SECONDARY; j++) {
      const latin = row[`sec_${i}_latin_${j}`] || '';
      if (latin) latins.push(latin);
    }
    secondaryMuscles.push({ group, latins });
  }

  return {
    id: row.id || '',
    name: row.name || '',
    category: row.category || '',
    equipment: row.equipment || '',
    instructions: row.instructions || '',
    tips: row.tips || '',
    trackingMode: row.tracking_mode || '',
    primaryMuscles,
    secondaryMuscles,
    sheet: sheetName === 'universal' ? 'universal' : 'male',
    videoStatus: row.video_status || '',
  };
}

/**
 * Convert an API exercise object back into a flat row-object keyed by COLUMNS.
 */
function exerciseToRow(exercise) {
  const row = {};
  row.id = exercise.id || '';
  row.name = exercise.name || '';
  row.category = exercise.category || '';
  row.equipment = exercise.equipment || '';
  row.instructions = exercise.instructions || '';
  row.tips = exercise.tips || '';

  // Primary muscles
  const pm = exercise.primaryMuscles || [];
  for (let i = 1; i <= NUM_PRIMARY_GROUPS; i++) {
    const entry = pm[i - 1];
    row[`primary_group_${i}`] = entry ? (entry.group || '') : '';
    for (let j = 1; j <= NUM_LATINS_PER_PRIMARY; j++) {
      row[`primary_${i}_latin_${j}`] = entry && entry.latins && entry.latins[j - 1] ? entry.latins[j - 1] : '';
    }
  }

  // Secondary muscles
  const sm = exercise.secondaryMuscles || [];
  for (let i = 1; i <= NUM_SECONDARY_GROUPS; i++) {
    const entry = sm[i - 1];
    row[`sec_group_${i}`] = entry ? (entry.group || '') : '';
    for (let j = 1; j <= NUM_LATINS_PER_SECONDARY; j++) {
      row[`sec_${i}_latin_${j}`] = entry && entry.latins && entry.latins[j - 1] ? entry.latins[j - 1] : '';
    }
  }

  row.tracking_mode = exercise.trackingMode || '';
  row.video_path = '';
  row.video_status = exercise.videoStatus || '';

  return row;
}

/**
 * Write a row-object into a worksheet at a given 0-based row index.
 */
function writeRowToSheet(ws, rowIndex, row) {
  for (let c = 0; c < COLUMNS.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c });
    const val = row[COLUMNS[c]] || '';
    ws[cellRef] = { t: 's', v: val };
  }
}

/**
 * Ensure the header row exists on a worksheet.
 */
function ensureHeaders(ws) {
  for (let c = 0; c < COLUMNS.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    ws[cellRef] = { t: 's', v: COLUMNS[c] };
  }
}

/**
 * Recalculate the !ref range for a worksheet.
 */
function updateSheetRange(ws) {
  const keys = Object.keys(ws).filter(k => !k.startsWith('!'));
  if (keys.length === 0) {
    ws['!ref'] = 'A1';
    return;
  }
  let maxR = 0, maxC = 0;
  for (const key of keys) {
    const decoded = XLSX.utils.decode_cell(key);
    if (decoded.r > maxR) maxR = decoded.r;
    if (decoded.c > maxC) maxC = decoded.c;
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
}

/**
 * Find the next empty row (0-based) in a worksheet.
 */
function findNextEmptyRow(ws) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  return range.e.r + 1;
}

/**
 * Delete a row from a worksheet by shifting all rows below it up.
 */
function deleteRow(ws, rowIndex) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const lastRow = range.e.r;
  const lastCol = range.e.c;

  // Shift all rows above the deleted row down
  for (let r = rowIndex; r < lastRow; r++) {
    for (let c = 0; c <= lastCol; c++) {
      const srcRef = XLSX.utils.encode_cell({ r: r + 1, c });
      const dstRef = XLSX.utils.encode_cell({ r, c });
      if (ws[srcRef]) {
        ws[dstRef] = ws[srcRef];
      } else {
        delete ws[dstRef];
      }
    }
  }

  // Clear the last row
  for (let c = 0; c <= lastCol; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: lastRow, c });
    delete ws[cellRef];
  }

  // Update range
  if (lastRow > 0) {
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow - 1, c: lastCol } });
  }
}

// ---------------------------------------------------------------------------
// API: Config
// ---------------------------------------------------------------------------

app.get('/api/config', (req, res) => {
  res.json({ assetsFolder: assetsFolder || '' });
});

app.post('/api/config', (req, res) => {
  const { assetsFolder: folder } = req.body;
  if (!folder) {
    return res.status(400).json({ error: 'assetsFolder is required' });
  }

  const resolved = path.resolve(folder);

  if (!fs.existsSync(resolved)) {
    return res.status(400).json({ error: `Folder does not exist: ${resolved}` });
  }

  assetsFolder = resolved;
  console.log(`Assets folder set to: ${assetsFolder}`);
  res.json({ assetsFolder });
});

// ---------------------------------------------------------------------------
// API: Editor State (persisted checkmarks)
// ---------------------------------------------------------------------------

function getEditorStatePath() {
  return path.resolve(__dirname, '.editor-state.json');
}

app.get('/api/editor-state', (req, res) => {
  try {
    const statePath = getEditorStatePath();
    if (!fs.existsSync(statePath)) {
      return res.json({ editedIds: [] });
    }
    const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    res.json({ editedIds: data.editedIds || [] });
  } catch {
    res.json({ editedIds: [] });
  }
});

app.post('/api/editor-state', (req, res) => {
  try {
    const { editedIds } = req.body;
    fs.writeFileSync(getEditorStatePath(), JSON.stringify({ editedIds: editedIds || [] }, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving editor state:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// API: Exercises
// ---------------------------------------------------------------------------

app.get('/api/exercises', (req, res) => {
  try {
    const xlsxPath = getXlsxPath();
    const workbook = XLSX.readFile(xlsxPath);

    const exercises = [];

    // Read male sheet (canonical for male/female pairs)
    const maleRows = readSheet(workbook, 'male');
    for (const row of maleRows) {
      exercises.push(rowToExercise(row, 'male'));
    }

    // Read universal sheet
    const universalRows = readSheet(workbook, 'universal');
    for (const row of universalRows) {
      exercises.push(rowToExercise(row, 'universal'));
    }

    res.json(exercises);
  } catch (err) {
    console.error('Error reading exercises:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/exercises', (req, res) => {
  try {
    const exercise = req.body;
    if (!exercise || !exercise.id) {
      return res.status(400).json({ error: 'Exercise with id is required' });
    }

    const xlsxPath = getXlsxPath();
    const workbook = XLSX.readFile(xlsxPath);
    const flatRow = exerciseToRow(exercise);

    if (exercise.sheet === 'universal') {
      // Write to universal sheet only
      const ws = workbook.Sheets['universal'];
      if (!ws) {
        return res.status(500).json({ error: 'Universal sheet not found in workbook' });
      }
      const existingRows = readSheet(workbook, 'universal');
      const existingIdx = existingRows.findIndex(r => r.id === exercise.id);

      if (existingIdx >= 0) {
        // Update existing row
        writeRowToSheet(ws, existingRows[existingIdx]._rowIndex, flatRow);
      } else {
        // Append new row
        const nextRow = findNextEmptyRow(ws);
        writeRowToSheet(ws, nextRow, flatRow);
        updateSheetRange(ws);
      }
    } else {
      // Write to both male AND female sheets
      for (const sheetName of ['male', 'female']) {
        const ws = workbook.Sheets[sheetName];
        if (!ws) continue;
        const existingRows = readSheet(workbook, sheetName);
        const existingIdx = existingRows.findIndex(r => r.id === exercise.id);

        if (existingIdx >= 0) {
          writeRowToSheet(ws, existingRows[existingIdx]._rowIndex, flatRow);
        } else {
          const nextRow = findNextEmptyRow(ws);
          writeRowToSheet(ws, nextRow, flatRow);
          updateSheetRange(ws);
        }
      }
    }

    XLSX.writeFile(workbook, xlsxPath);
    res.json({ success: true, id: exercise.id });
  } catch (err) {
    console.error('Error saving exercise:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/exercises/:id', (req, res) => {
  try {
    const exerciseId = req.params.id;
    const xlsxPath = getXlsxPath();
    const workbook = XLSX.readFile(xlsxPath);
    let deleted = false;

    for (const sheetName of ['male', 'female', 'universal']) {
      const ws = workbook.Sheets[sheetName];
      if (!ws) continue;

      const rows = readSheet(workbook, sheetName);
      const targetRow = rows.find(r => r.id === exerciseId);
      if (targetRow) {
        deleteRow(ws, targetRow._rowIndex);
        deleted = true;
      }
    }

    if (!deleted) {
      return res.status(404).json({ error: `Exercise not found: ${exerciseId}` });
    }

    XLSX.writeFile(workbook, xlsxPath);
    res.json({ success: true, id: exerciseId });
  } catch (err) {
    console.error('Error deleting exercise:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export is essentially a no-op since we save on every edit,
// but the frontend expects this endpoint for the "Export XLSX" button.
app.post('/api/exercises/export', (req, res) => {
  // The xlsx is already saved on disk after every POST/DELETE.
  // Just confirm the file exists.
  const xlsxPath = getXlsxPath();
  if (!fs.existsSync(xlsxPath)) {
    return res.status(500).json({ error: 'XLSX file not found' });
  }
  res.json({ success: true, path: xlsxPath });
});

// ---------------------------------------------------------------------------
// API: Videos (with Range request support)
// ---------------------------------------------------------------------------

app.get('/api/videos/:type/:filename', (req, res) => {
  if (!assetsFolder) {
    return res.status(400).json({ error: 'Assets folder not configured.' });
  }

  const { type, filename } = req.params;
  if (!['male', 'female', 'universal'].includes(type)) {
    return res.status(400).json({ error: 'Type must be male, female, or universal' });
  }

  const videoPath = path.resolve(assetsFolder, type, filename);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
  };
  const contentType = mimeTypes[ext] || 'video/mp4';

  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    // Parse Range header
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(videoPath, { start, end });

    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    stream.pipe(res);
  } else {
    // No range requested — send entire file
    res.set({
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });

    fs.createReadStream(videoPath).pipe(res);
  }
});

// ---------------------------------------------------------------------------
// API: Muscle Mapping
// ---------------------------------------------------------------------------

app.get('/api/muscle-mapping', (req, res) => {
  res.json(MUSCLE_MAPPING);
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Exercise Editor running at http://localhost:${PORT}`);
});
