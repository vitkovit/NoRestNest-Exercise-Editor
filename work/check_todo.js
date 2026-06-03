// Determines which chunks still need (re)processing. Writes work/todo.json (array of idx strings).
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const BUCKET_ADVANCES = {
  'neck': ['neck'], 'shoulders': ['Anterior Deltoids', 'Lateral Deltoids', 'Posterior Deltoid'],
  'chest': ['Clavicular Head', 'Sternal Head'], 'mid back': ['Upper Traps', 'Rhomboids', 'Lower Traps'],
  'Lats': ['Latissimus Dorsi', 'Rotator Cuff'], 'biceps': ['Biceps Brachii'], 'Triceps': ['Triceps Brachii'],
  'forearms': ['Wrist Flexors', 'Wrist Extensors'], 'abs': ['Upper Rectus Abdominis', 'Lower Rectus Abdominis'],
  'oblique': ['External Obliques', 'Internal Obliques'], 'Lower Back': ['Erector Spinae'],
  'glutes': ['Gluteus Maximus', 'Gluteus Medius'], 'Quads': ['Rectus Femoris', 'Vastus Medialis', 'Vastus Lateralis'],
  'Abductor': ['Abductor'], 'Adductors': ['Adductors'], 'Hamstrings': ['Biceps Femoris', 'Semitendinosus'],
  'Calves': ['Gastrocnemius Lateral', 'Gastrocnemius Medial', 'Soleus'], 'Shin': ['Fibularis', 'Extensor', 'Tibialis'],
};
const CATEGORIES = ['Bodyweight', 'Free Weights', 'Resistance', 'Uncategorized'];
const EQUIPMENT = ['bands', 'barbell', 'bench', 'bodyweight', 'cable', 'dumbbell', 'kettlebell', 'machine', 'other', 'plate', 'pull_up_bar', 'resistance_band'];
const TRACKING = ['', 'repsOnly', 'timed'];

function validMuscles(list) {
  if (!Array.isArray(list)) return false;
  for (const g of list) {
    if (!g || !BUCKET_ADVANCES[g.group]) return false;
    if (!Array.isArray(g.latins) || !g.latins.length) return false;
    for (const l of g.latins) if (!BUCKET_ADVANCES[g.group].includes(l)) return false;
  }
  return true;
}
function validCorrection(c) {
  return c && typeof c.id === 'string'
    && (c.sheet === 'universal' || c.sheet === 'malefemale')
    && CATEGORIES.includes(c.category) && EQUIPMENT.includes(c.equipment) && TRACKING.includes(c.trackingMode || '')
    && typeof c.instructions === 'string' && c.instructions.trim()
    && typeof c.tips === 'string' && c.tips.trim()
    && validMuscles(c.primary || []) && (!c.secondary || validMuscles(c.secondary));
}

const inDir = path.join(ROOT, 'work/in'), outDir = path.join(ROOT, 'work/out');
const chunks = fs.readdirSync(inDir).filter(f => /^chunk_\d+\.json$/.test(f)).sort();
const todo = [];
let goodFiles = 0, goodEx = 0;
for (const f of chunks) {
  const idx = f.match(/chunk_(\d+)\.json/)[1];
  const inp = JSON.parse(fs.readFileSync(path.join(inDir, f), 'utf8'));
  const outPath = path.join(outDir, f);
  let ok = false;
  if (fs.existsSync(outPath)) {
    try {
      const out = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (Array.isArray(out) && out.length === inp.length && out.every(validCorrection)) { ok = true; goodFiles++; goodEx += out.length; }
    } catch (e) { /* unparseable -> redo */ }
  }
  if (!ok) todo.push(idx);
}
fs.writeFileSync(path.join(ROOT, 'work/todo.json'), JSON.stringify(todo));
console.log('total chunks:', chunks.length);
console.log('good (valid) chunks:', goodFiles, '| good exercises:', goodEx);
console.log('TODO chunks:', todo.length, todo.length ? '(' + todo[0] + '..' + todo[todo.length - 1] + ')' : '');
