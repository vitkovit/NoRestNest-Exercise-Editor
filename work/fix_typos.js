// Fix two typos in xlsx latin/group cells:
//   "LowerRectus Abdominis" -> "Lower Rectus Abdominis"  (all latin columns)
//   "Onlique" -> "oblique"  (all group columns)
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const FILE = path.resolve(__dirname, '..', 'exercises_master.xlsx');
const BAK  = FILE + '.pre-typofix.bak';

if (!fs.existsSync(BAK)) fs.copyFileSync(FILE, BAK);

const wb = XLSX.readFile(FILE, { type: 'file', cellStyles: true });
// Column layout (0-indexed): id=0, name=1, category=2, equipment=3, instructions=4, tips=5
// primary: cols 6..35 (group1=6, lat1_1=7,lat1_2=8,lat1_3=9,lat1_4=10, group2=11,...group5=31,lat5_1..4=32..35)
// secondary: cols 36..65 (same pattern), tracking_mode=66
// Group columns: 6,11,16,21,26,31,36,41,46,51,56,61
// Latin columns: 7-10, 12-15, 17-20, 22-25, 27-30, 32-35, 37-40, 42-45, 47-50, 52-55, 57-60, 62-65

const GROUP_COLS = [];
const LATIN_COLS = [];
for (let g = 0; g < 10; g++) {
  const base = 6 + g * 5;
  GROUP_COLS.push(base);
  for (let l = 1; l <= 4; l++) LATIN_COLS.push(base + l);
}

let fixedSheets = 0, fixedCells = 0;
for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws['!ref']);
  let sheetFixed = 0;

  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (const C of LATIN_COLS) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell && typeof cell.v === 'string' && cell.v.includes('LowerRectus Abdominis')) {
        cell.v = cell.v.replace(/LowerRectus Abdominis/g, 'Lower Rectus Abdominis');
        if (cell.w) cell.w = cell.v;
        sheetFixed++; fixedCells++;
      }
    }
    for (const C of GROUP_COLS) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell && typeof cell.v === 'string' && cell.v.toLowerCase() === 'onlique') {
        cell.v = 'oblique';
        if (cell.w) cell.w = 'oblique';
        sheetFixed++; fixedCells++;
      }
    }
  }
  if (sheetFixed) { fixedSheets++; console.log(`  ${sheetName}: fixed ${sheetFixed} cells`); }
}

XLSX.writeFile(wb, FILE);
console.log(`Done. Fixed ${fixedCells} cells across ${fixedSheets} sheets.`);
