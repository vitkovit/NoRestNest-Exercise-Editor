# Exercise Muscle Mapper — CLI Instructions

## Your Task
Open `exercises_master.xlsx` and correct EVERY exercise so it loads and displays correctly
in the editor app (`npm start`). For each exercise, fix:

1. **Muscle Groups** (primary + secondary) — remove old values, reapply in the app/SVG format
2. **Category, Equipment, Tracking Mode**
3. **Instructions** and **Tips**

The current xlsx values are the **first reference point** (they are already decent — improve,
never degrade). Then **web search every exercise** to confirm biomechanics before correcting.

Sheets:
- `universal` (1140 rows) — unique list, each processed independently.
- `male` + `female` (457 rows each) — a PAIR. Write the SAME correction to BOTH sheets, matched by `id`.

Progress is tracked in `.editor-state.json` (`editedIds`). Resume from there; do not redo done rows.

---

## How to Edit the XLSX

Use the project's Node `xlsx` (SheetJS) library — the same one `server.js` uses — so the
server reads edits identically. Do NOT use pandas/openpyxl.

- The sheet layout is a fixed **59 columns by position** (see `server.js` COLUMNS).
- Edit only these fields: `category`, `equipment`, `tracking_mode`, `instructions`, `tips`,
  the 5 primary groups + their 4 latin slots each, the 5 secondary groups + their 4 latin slots each.
- **Clear ALL muscle slots first** (`primary_group_1..5`, all `primary_i_latin_j`,
  `sec_group_1..5`, all `sec_i_latin_j` → empty string), THEN write fresh. No stale leftovers.
- Save after every batch (~25-50 rows). Append processed ids to `.editor-state.json`.

---

## Muscle Encoding — THE CRITICAL RULE

The editor highlights a muscle on the SVG **only when a `*_latin_*` cell exactly equals an
`advance` term** from the app's muscle mapping (`server.js` MUSCLE_MAPPING; SVG regions in
`public/body_front.svg` / `public/body_back.svg`). The `*_group_*` cell holds a coarse bucket.

Therefore, for each muscle:
- `*_group_*` cell = the **bucket** (the `simple` value), exact casing.
- `*_latin_*` cell = the exact **`advance` term** the SVG matches on, exact spelling/casing.

Group muscles that share a bucket into ONE group entry, listing their advance terms in the
latin slots. Example (V-bar lat pulldown):
```
primary_group_1 = "Lats"      primary_1_latin_1 = "Latissimus Dorsi"
sec_group_1     = "mid back"  sec_1_latin_1 = "Rhomboids"   sec_1_latin_2 = "Lower Traps"
sec_group_2     = "shoulders" sec_2_latin_1 = "Posterior Deltoid"
sec_group_3     = "biceps"    sec_3_latin_1 = "Biceps Brachii"
sec_group_4     = "Lats"      sec_4_latin_1 = "Rotator Cuff"
```

### The ONLY allowed values — bucket (group) → latin (advance)

| group (bucket) | allowed latin (advance) terms — copy EXACTLY | SVG regions |
|---|---|---|
| `neck` | `neck` | neck |
| `shoulders` | `Anterior Deltoids`, `Lateral Deltoids`, `Posterior Deltoid` | front/side/rear delts |
| `chest` | `Clavicular Head`, `Sternal Head` | upper chest / mid+lower chest |
| `mid back` | `Upper Traps`, `Rhomboids`, `Lower Traps` | upper/mid/lower traps |
| `Lats` | `Latissimus Dorsi`, `Rotator Cuff` | lats, rotator_cuff |
| `biceps` | `Biceps Brachii` | inner+outer biceps |
| `Triceps` | `Triceps Brachii` | all 3 triceps heads |
| `forearms` | `Wrist Flexors`, `Wrist Extensors` | inner/outer forearm |
| `abs` | `Upper Rectus Abdominis`, `Lower Rectus Abdominis` | upper/lower abs |
| `oblique` | `External Obliques`, `Internal Obliques` | external/internal oblique |
| `Lower Back` | `Erector Spinae` | lower_back |
| `glutes` | `Gluteus Maximus`, `Gluteus Medius` | glutes / side_glutes |
| `Quads` | `Rectus Femoris`, `Vastus Medialis`, `Vastus Lateralis` | middle/inner/outer quad |
| `Abductor` | `Abductor` | tensor |
| `Adductors` | `Adductors` | inner_thighs |
| `Hamstrings` | `Biceps Femoris`, `Semitendinosus` | outer/inner hamstring |
| `Calves` | `Gastrocnemius Lateral`, `Gastrocnemius Medial`, `Soleus` | outer/inner/deep calves |
| `Shin` | `Fibularis`, `Extensor`, `Tibialis` | outer_shin / shin_extensor / shin_muscle |

**App quirks to mirror EXACTLY (or it won't highlight):**
- Rear delt is singular `Posterior Deltoid`; front/side are plural `Anterior Deltoids` / `Lateral Deltoids`.
- Writing one advance term highlights all SVG regions sharing it (e.g. `Sternal Head` lights
  mid + lower chest; `Triceps Brachii` lights all 3 heads; `Biceps Brachii` lights both heads).

**Rule:** Any muscle that cannot be expressed with a bucket+advance pair above → do NOT invent
a value. Flag the exercise for the user.

---

## Translating Current XLSX Terms → New Encoding

The current data uses loose terms. Map them (then confirm with web search which specific ones apply):

| Current term(s) | New encoding (group → latin) |
|---|---|
| Abdominals / Rectus Abdominis | `abs` → `Upper Rectus Abdominis`, `Lower Rectus Abdominis` |
| Obliques | `oblique` → `External Obliques`, `Internal Obliques` |
| Quadriceps / Quadriceps Femoris | `Quads` → `Rectus Femoris`, `Vastus Medialis`, `Vastus Lateralis` |
| Pectoralis Major / Chest | `chest` → `Clavicular Head` and/or `Sternal Head` (by angle, see below) |
| Deltoids / Shoulders | `shoulders` → correct head(s) by movement |
| Hamstrings | `Hamstrings` → `Biceps Femoris`, `Semitendinosus` |
| Calves / Gastrocnemius | `Calves` → `Gastrocnemius Lateral`, `Gastrocnemius Medial` (+`Soleus` if relevant) |
| Hip Flexors / Iliopsoas | `Abductor` → `Abductor` (hip flexion/abduction) OR `Quads` if knee extension |
| Trapezius / Traps | `mid back` → `Upper Traps` / `Lower Traps` (+`Rhomboids`) by scapular action |
| Back / Middle Back | `Lats`→`Latissimus Dorsi` and/or `mid back`→`Rhomboids`/`Lower Traps` |
| Lower Back | `Lower Back` → `Erector Spinae` |
| Forearms | `forearms` → `Wrist Flexors` / `Wrist Extensors` by grip |
| Glutes / gluteus mideus (typo) | `glutes` → `Gluteus Maximus` / `Gluteus Medius` |
| Adductors | `Adductors` → `Adductors` |
| Abductor | `Abductor` → `Abductor` |
| Neck | `neck` → `neck` |
| Tibialis / Shin | `Shin` → `Tibialis` / `Extensor` / `Fibularis` |
| Soleus | `Calves` → `Soleus` |
| Biceps | `biceps` → `Biceps Brachii` |
| Triceps | `Triceps` → `Triceps Brachii` |
| Rotator Cuff | `Lats` → `Rotator Cuff` |

---

## Classification Rules (Primary vs Secondary)

- **Primary** = muscles that produce the movement (prime movers, or the isometric holders that define the exercise).
- **Secondary** = muscles that meaningfully assist or stabilize.
- Do NOT drop legitimately engaged muscles. Do NOT inflate with irrelevant ones.

**Chest — which head?**
- Flat bench / push-up → `Clavicular Head` + `Sternal Head` (Sternal dominant)
- Incline → `Clavicular Head` primary, `Sternal Head` secondary
- Decline → `Sternal Head` primary, `Clavicular Head` secondary
- Close grip → add `Triceps` as co-primary

**Shoulders — which deltoid?**
- Front raise / overhead press → `Anterior Deltoids` primary (press also `Lateral Deltoids` secondary)
- Lateral raise → `Lateral Deltoids` primary
- Reverse fly / face pull → `Posterior Deltoid` primary

**Pulling (lat pulldown, pull-up, rows):**
- Lat pulldown / pull-up → `Latissimus Dorsi` primary
- Row → `Latissimus Dorsi` + `Rhomboids`
- Face pull → `Posterior Deltoid` + `Rhomboids` + `Rotator Cuff`
- All pulls: `Rotator Cuff` secondary; `Biceps Brachii` secondary (co-primary on chin-ups)

**Squat / Lunge:**
- Include `Hamstrings` (`Biceps Femoris` + `Semitendinosus`) as secondary (knee-stability co-contraction).
- Free squat → `Gluteus Maximus` primary. Wall squat/sit → `Gluteus Maximus` drops to secondary.

**Hamstring exercises:**
- Hamstring curl → include `Gastrocnemius` (`Calves`) as secondary. Romanian deadlift → no calves.

**Equipment effects:**
- Machine / Smith → reduced stabilizer demand (less `Rotator Cuff`, less core, less `Erector Spinae`).
- Standing vs seated → standing adds core + `Lower Back` (`Erector Spinae`) as secondary.
- Unilateral vs bilateral → unilateral adds `oblique` (`External Obliques` + `Internal Obliques`) anti-rotation as secondary.
- Cable/band constant or ascending tension can shift emphasis — verify per variant.

---

## Mandatory Web Search Rules
1. Web search EVERY exercise before correcting. No guessing from memory.
2. ≥2 searches per exercise:
   - `"[exercise name] muscles worked primary secondary"`
   - `"[exercise name] EMG activation biomechanics"`
   - (if sources disagree) `"[exercise name] vs [similar] difference muscles"`
3. Prefer: EMG studies > sports-science sites > fitness encyclopedias > blogs. Don't trust a single source.
4. Verify each variant (grip/stance/equipment) — do NOT blindly copy muscles between variants.

---

## Category / Equipment / Tracking Mode

Use ONLY existing dropdown values. If an exercise needs a value not listed → STOP and alert the user.
- **Category:** `Bodyweight`, `Free Weights`, `Resistance`, `Uncategorized`
- **Equipment:** `bands`, `barbell`, `bench`, `bodyweight`, `cable`, `dumbbell`, `kettlebell`, `machine`, `other`, `plate`, `pull_up_bar`, `resistance_band`
- **Tracking Mode:** `` (empty = default reps+weight), `repsOnly` (bodyweight/timed-rep moves), `timed` (planks, holds, carries)

---

## Instructions Rewrite Rules
Format — raw numbered text, no header:
```
1. First step.
2. Second step.
```
- Numbered, plain, short sentences. No fluff, no motivational language.
- Metric only: cm, m, kg (2 feet → 60 cm; 12 inches → 30 cm; "shoulder-width" is fine).
- **No static counts:** no rep counts, no set counts, no weights, no time durations (seconds/minutes).
  The app tracks reps/weight/time — descriptions must not. Use qualitative wording instead
  ("Hold", "Hold briefly", "Pause briefly", "Lower slowly under control"). Allowed numbers are
  only spatial: cm/m/kg and joint angles (e.g. "90 degrees").
- Max 5-6 steps. Start with setup, end with "Repeat" (never "desired number of repetitions").

## Tips Rewrite Rules
Format — raw numbered text, no header. Max 4 tips. Practical only (form cues, common mistakes,
breathing, safety). No fluff. NEVER write "avoid locking your elbows" for pressing exercises.

---

## Per-Exercise Checklist
- [ ] ≥2 web searches for THIS exercise (and its specific variant)?
- [ ] All `group` values are real buckets and all `latin` values are exact `advance` terms?
- [ ] Generic terms split correctly (Abdominals, Quadriceps, Deltoids/head, Chest/head, Hamstrings, Calves, Obliques)?
- [ ] Both `External Obliques` + `Internal Obliques` when obliques involved?
- [ ] Hamstrings secondary on squats/lunges? Rotator Cuff + Biceps secondary on pulls?
- [ ] Seated/standing and unilateral/bilateral effects applied?
- [ ] ALL old muscle slots cleared before writing fresh?
- [ ] Category / Equipment / Tracking from allowed lists (else flagged)?
- [ ] Instructions metric, ≤5-6 steps, end "Repeat"? Tips ≤4, practical?
- [ ] For male/female: identical correction written to BOTH sheets by id?
- [ ] Anything unmappable or needing a new dropdown value → flagged for the user, not invented?

## Progress
After every ~50 exercises, print: `PROGRESS: [X/1140] processed. Last: [exercise_id]`.
