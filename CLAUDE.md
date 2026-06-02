# Exercise Muscle Mapper — Opus CLI Instructions

## Your Task
Open `exercises_master.xlsx`. Go through EVERY row in the `universal` sheet, one by one. For each exercise:

1. **Read** the exercise `id` and `name`
2. **Web search** the exercise to verify biomechanics (MANDATORY — do NOT guess)
3. **Correct** the muscle groups using ONLY the controlled vocabulary below
4. **Rewrite** instructions and tips
5. **Save** the corrected row back into the xlsx
6. After processing all rows in `universal`, sync corrections to `male` and `female` sheets (match by `id`)

## How to Process the XLSX

Use openpyxl to edit in place. Do NOT use pandas for writing — it destroys formatting.

```python
from openpyxl import load_workbook
wb = load_workbook('exercises_master.xlsx')
ws = wb['universal']
```

For each row, edit only these columns (find column indices dynamically from headers):
- `primary_group_1` through `primary_group_5`
- `primary_1_latin_1` through `primary_5_latin_4`
- `sec_group_1` through `sec_group_5`
- `sec_1_latin_1` through `sec_5_latin_4`
- `instructions`
- `tips`

Clear unused primary/secondary slots (set to None). Save after every ~50 rows to avoid data loss:
```python
wb.save('exercises_master.xlsx')
```

## Controlled Vocabulary — ONLY These 35 Terms

These are the ONLY allowed values for `primary_group_X` and `sec_group_X` fields. Nothing else. Ever.

```
neck
Anterior Deltoids
Lateral Deltoids
Posterior Deltoid
Clavicular Head
Sternal Head
Upper Traps
Rhomboids
Lower Traps
Latissimus Dorsi
Rotator Cuff
Biceps Brachii
Triceps Brachii
Wrist Flexors
Wrist Extensors
Upper Rectus Abdominis
Lower Rectus Abdominis
External Obliques
Internal Obliques
Erector Spinae
Gluteus Maximus
Gluteus Medius
Rectus Femoris
Vastus Medialis
Vastus Lateralis
Abductor
Adductors
Biceps Femoris
Semitendinosus
Gastrocnemius Lateral
Gastrocnemius Medial
Soleus
Fibularis
Extensor
Tibialis
```

## Latin Names — Fill These for Each Group

When you write a `primary_group_X` or `sec_group_X`, fill the corresponding `_latin_` columns with the specific anatomical muscles:

| Group Term | latin_1 | latin_2 | latin_3 | latin_4 |
|---|---|---|---|---|
| neck | Levator Scapulae | Scalenes | Splenius Capitis | Sternocleidomastoid |
| Anterior Deltoids | Anterior Deltoid | | | |
| Lateral Deltoids | Lateral Deltoid | | | |
| Posterior Deltoid | Posterior Deltoid | | | |
| Clavicular Head | Clavicular Head Of Pectoralis Major | Pectoralis Minor | | |
| Sternal Head | Sternal Head | Pectoralis Major | | |
| Upper Traps | Upper Trapezius | | | |
| Rhomboids | Rhomboids | | | |
| Lower Traps | Lower Trapezius | | | |
| Latissimus Dorsi | Latissimus Dorsi | Teres Major | | |
| Rotator Cuff | Infraspinatus | Subscapularis | Supraspinatus | Teres Minor |
| Biceps Brachii | Biceps Brachii | Brachialis | | |
| Triceps Brachii | Triceps Brachii | | | |
| Wrist Flexors | Flexor Carpi Radialis | Flexor Carpi Ulnaris | Flexor Digitorum Superficialis | Palmaris Longus |
| Wrist Extensors | Brachioradialis | Extensor Carpi Radialis | Extensor Carpi Ulnaris | |
| Upper Rectus Abdominis | Rectus Abdominis | Transverse Abdominis | | |
| Lower Rectus Abdominis | Rectus Abdominis | Transverse Abdominis | | |
| External Obliques | External Oblique | | | |
| Internal Obliques | Internal Oblique | | | |
| Erector Spinae | Erector Spinae | | | |
| Gluteus Maximus | Gluteus Maximus | | | |
| Gluteus Medius | Gluteus Medius | Gluteus Minimus | Piriformis | |
| Rectus Femoris | Rectus Femoris | | | |
| Vastus Medialis | Vastus Medialis | | | |
| Vastus Lateralis | Vastus Lateralis | | | |
| Abductor | Tensor Fasciae Latae | Iliopsoas | | |
| Adductors | Adductor Longus | Adductor Magnus | Adductor Brevis | |
| Biceps Femoris | Biceps Femoris | | | |
| Semitendinosus | Semitendinosus | Semimembranosus | | |
| Gastrocnemius Lateral | Gastrocnemius | | | |
| Gastrocnemius Medial | Gastrocnemius | | | |
| Soleus | Soleus | | | |
| Fibularis | Peroneus Longus | Peroneus Brevis | | |
| Extensor | Extensor Digitorum Longus | | | |
| Tibialis | Tibialis Anterior | | | |

## Classification Rules

### What is Primary vs Secondary
- **Primary** = muscles that PRODUCE the movement (concentric movers, or isometric holders that define the exercise)
- **Secondary** = muscles that ASSIST or STABILIZE meaningfully

### Mandatory Search Rules
1. Web search EVERY exercise before correcting. No exceptions. No guessing from memory.
2. Run at least 2 searches per exercise:
   - Search 1: `"[exercise name] muscles worked primary secondary"` — get the muscle list
   - Search 2: `"[exercise name] EMG activation biomechanics"` — verify with science
   - Search 3 (if sources disagree): `"[exercise name] vs [similar exercise] difference muscles"` — resolve conflict
3. Prefer sources in this order: EMG studies > sports science sites > fitness encyclopedias > blogs
4. Do NOT trust a single source. If only one source lists a muscle, verify with a second search.
5. When reading sources, extract SPECIFIC muscles, not generic groups. If a source says "shoulders", search deeper to find WHICH deltoid head.

### Equipment-Specific Rules
6. Equipment DOES matter for some exercises. Before reusing a base pattern for a variant, verify these:
   - **Smith machine vs free weight**: Smith removes stabilizer demand (less rotator cuff, less core, less Erector Spinae). Search specifically: `"smith machine [exercise] vs barbell [exercise] muscles"`
   - **Cable vs dumbbell**: Cable provides constant tension and may change the strength curve. For fly/raise exercises, cable keeps tension at the top where dumbbells lose it.
   - **Resistance band vs dumbbell**: Bands have ascending resistance (peak at top). This can shift emphasis within a muscle group.
   - **Machine vs free weight**: Machines remove stabilizer demand. Always note reduced stabilizer activation.
   - **Seated vs standing**: Standing adds core + Erector Spinae as secondary. Seated removes them.
   - **Unilateral vs bilateral**: Unilateral adds External Obliques + Internal Obliques as secondary (anti-rotation demand).
7. When in doubt about an equipment variant, search it specifically: `"[equipment] [exercise] muscles worked"`

### Inclusion Rules
8. Do NOT drop muscles that are legitimately engaged — include everything meaningful.
9. Do NOT inflate — only include muscles with real activation.
10. Clear unused group/latin slots to None — do not leave stale data from the original entry.

### Translation Rules — Incoming Terms to Vocabulary
These terms appear in the current data but are NOT in the vocabulary. Translate them:

| Current Term | Translate To |
|---|---|
| Abdominals | Upper Rectus Abdominis + Lower Rectus Abdominis |
| Rectus Abdominis | Upper Rectus Abdominis + Lower Rectus Abdominis |
| Obliques | External Obliques + Internal Obliques |
| Quadriceps / Quadriceps Femoris | Rectus Femoris + Vastus Medialis + Vastus Lateralis |
| Pectoralis Major | Sternal Head + Clavicular Head (or just one depending on exercise angle) |
| Chest | Sternal Head + Clavicular Head (split by exercise angle) |
| Deltoids / Shoulders | Anterior Deltoids / Lateral Deltoids / Posterior Deltoid (pick correct one based on movement) |
| Hamstrings | Biceps Femoris + Semitendinosus |
| Calves / Gastrocnemius | Gastrocnemius Lateral + Gastrocnemius Medial (add Soleus if relevant) |
| Hip Flexors / Iliopsoas | Rectus Femoris (if knee extension involved) or Abductor (if hip abduction/flexion only) |
| Trapezius / Traps | Upper Traps / Lower Traps / Rhomboids (pick correct one based on scapular movement) |
| Back / Middle Back | Latissimus Dorsi / Rhomboids / Lower Traps (pick correct one) |
| Lower Back | Erector Spinae |
| Forearms | Wrist Flexors / Wrist Extensors (pick based on grip orientation) |
| gluteus mideus | Gluteus Medius (fix the typo) |

### Context-Dependent Decisions

**Chest exercises — which head?**
- Flat bench/push-up → both Sternal Head + Clavicular Head (Sternal dominant)
- Incline → Clavicular Head primary, Sternal Head secondary
- Decline → Sternal Head primary, Clavicular Head secondary
- Wide grip → Sternal Head emphasis
- Close grip → both, but Triceps becomes co-primary

**Shoulder exercises — which deltoid?**
- Front raise, overhead press → Anterior Deltoids primary
- Lateral raise → Lateral Deltoids primary
- Reverse fly, face pull → Posterior Deltoid primary
- Overhead press also engages Lateral Deltoids as secondary

**Pulling exercises — which back muscles?**
- Lat pulldown, pull-up → Latissimus Dorsi primary
- Row → Latissimus Dorsi + Rhomboids (both can be primary depending on grip)
- Face pull → Posterior Deltoid + Rhomboids + Rotator Cuff
- All pulling exercises: include Rotator Cuff as secondary (shoulder stabilization)
- All pulling exercises: include Biceps Brachii as secondary (unless chin-up where biceps is co-primary)

**Squat/Lunge — what's secondary?**
- All squat and lunge variants: Biceps Femoris + Semitendinosus as secondary (hamstring co-contraction for knee stability) — do NOT drop these
- Wall squat/sit: Gluteus Maximus drops to secondary (wall removes hip extension demand)
- Free squat: Gluteus Maximus is primary

**Hamstring exercises — calves?**
- Hamstring curl: include Gastrocnemius as secondary (crosses knee joint, assists knee flexion)
- Romanian deadlift: do NOT include calves

## Instructions Rewrite Rules

Format — raw numbered text, no header:
```
1. First step.
2. Second step.
3. Third step.
```

Rules:
- Numbered steps, plain text
- Simple wording, short sentences
- No fluff, no filler words, no motivational language
- All measurements in METRIC: cm, m, kg. No feet, inches, pounds.
  - 2 feet → 60 cm
  - 12 inches → 30 cm
  - shoulder-width → shoulder-width (relative measurements are fine)
- Maximum 5-6 steps per exercise
- Start with the setup position, end with "Repeat"
- Do NOT include "desired number of repetitions" — just say "Repeat"

## Tips Rewrite Rules

Format — raw numbered text, no header:
```
1. First tip.
2. Second tip.
3. Third tip.
```

Rules:
- Numbered, plain text
- Practical, actionable tips only
- No fluff
- Maximum 4 tips per exercise
- Focus on: form cues, common mistakes, breathing, safety
- NEVER include "avoid locking your elbows" as a tip for pressing exercises — full lockout is generally correct form

## Batch Processing Strategy

1. Read all exercise IDs from the universal sheet
2. For EVERY exercise: run at least 2 web searches to verify muscles
3. For variants of the same base movement (e.g. "bicep curl dumbbell" vs "bicep curl barbell"):
   - Search the base movement first
   - Then verify each variant — check if the equipment/stance/grip changes muscle activation
   - Do NOT blindly copy muscles from one variant to another without verifying
4. Rewrite instructions/tips per variant (they ALWAYS differ by equipment/stance)
5. Save every 50 rows
6. After universal is done, sync to male/female sheets by matching `id`
7. If a session is interrupted, note the last processed row ID and resume from there next session

## Progress Tracking

After every 50 exercises, print:
```
PROGRESS: [X/1140] exercises processed. Last: [exercise_id]
```

## Quality Checklist — Run This Mentally for Every Exercise

Before writing the correction:
- [ ] Did I run at least 2 web searches for this specific exercise (not just the base pattern)?
- [ ] Did I check if the equipment/stance/grip changes activation vs the base movement?
- [ ] Are ALL group values from the 35-term vocabulary? (check EVERY value against the list)
- [ ] Did I split ALL generic terms (Abdominals, Quadriceps, Deltoids, Pectoralis Major, Hamstrings, Calves, Obliques)?
- [ ] Did I include both External AND Internal Obliques when obliques are involved?
- [ ] Did I include hamstrings as secondary for squat/lunge exercises?
- [ ] Did I include Rotator Cuff as secondary for pulling exercises?
- [ ] Did I check if seated vs standing changes core/erector spinae involvement?
- [ ] Did I check if unilateral vs bilateral adds oblique anti-rotation demand?
- [ ] Did I fill latin names for EVERY group using the lookup table?
- [ ] Did I clear ALL unused slots to None?
- [ ] Are instructions in metric (no feet, inches, pounds)?
- [ ] Are instructions simple, no fluff, max 5-6 steps?
- [ ] Are tips practical, max 4, no fluff?
- [ ] Does the exercise name match what I searched? (e.g. "spider curl" is NOT a "bicep curl" — different bench angle changes activation)
