export const meta = {
  name: 'exercise-muscle-mapper-v2',
  description: 'Research muscle groups/equipment/instructions/tips per chunk (file is the deliverable, no schema)',
  phases: [{ title: 'Research', detail: 'one agent per chunk: web-search each exercise, write corrections file' }],
}

const RULES = `
MUSCLE FORMAT — READ CAREFULLY. Each muscle entry has TWO fields:
  "group"  = a BUCKET. MUST be EXACTLY one of these 18 strings (case-sensitive), nothing else:
       neck | shoulders | chest | mid back | Lats | biceps | Triceps | forearms | abs | oblique |
       Lower Back | glutes | Quads | Abductor | Adductors | Hamstrings | Calves | Shin
  "latins" = one or more TERMS from that bucket's allowed list below, copied EXACTLY.

  bucket        ->  allowed latins:
  neck          ->  neck
  shoulders     ->  Anterior Deltoids , Lateral Deltoids , Posterior Deltoid
  chest         ->  Clavicular Head , Sternal Head
  mid back      ->  Upper Traps , Rhomboids , Lower Traps
  Lats          ->  Latissimus Dorsi , Rotator Cuff
  biceps        ->  Biceps Brachii
  Triceps       ->  Triceps Brachii
  forearms      ->  Wrist Flexors , Wrist Extensors
  abs           ->  Upper Rectus Abdominis , Lower Rectus Abdominis
  oblique       ->  External Obliques , Internal Obliques
  Lower Back    ->  Erector Spinae
  glutes        ->  Gluteus Maximus , Gluteus Medius
  Quads         ->  Rectus Femoris , Vastus Medialis , Vastus Lateralis
  Abductor      ->  Abductor
  Adductors     ->  Adductors
  Hamstrings    ->  Biceps Femoris , Semitendinosus
  Calves        ->  Gastrocnemius Lateral , Gastrocnemius Medial , Soleus
  Shin          ->  Fibularis , Extensor , Tibialis

"group" is NEVER a muscle name; muscle names go ONLY in "latins". Do NOT use any other word in "latins"
(NOT "Pectoralis Major", "Brachialis", "Upper Trapezius", or "Anterior Deltoid" singular).
Quirks: "Posterior Deltoid" singular, "Anterior Deltoids"/"Lateral Deltoids" plural.
  RIGHT: {"group":"shoulders","latins":["Anterior Deltoids","Lateral Deltoids"]}
  RIGHT: {"group":"chest","latins":["Sternal Head","Clavicular Head"]}
  WRONG: {"group":"Anterior Deltoids","latins":["Anterior Deltoid"]}
  WRONG: {"group":"chest","latins":["Pectoralis Major"]}

Merge muscles of one bucket into ONE entry. Max 5 primary + 5 secondary groups; max 4 latins each.
Primary = prime movers; Secondary = meaningful assist/stabilize. Hamstrings (secondary) on squats/lunges;
Lats->Rotator Cuff + biceps (secondary) on pulls; BOTH obliques when twisting; Calves->Gastrocnemius (secondary)
on hamstring curls. No inflation. Chest head by angle (flat=both; incline=Clavicular primary; decline=Sternal primary).
Deltoid head by movement (press/front raise=Anterior; lateral raise=Lateral; reverse fly/face pull=Posterior).
If a worked muscle has no allowed value, OMIT it and note it in flags.

DROPDOWNS (use only these; if a needed value is missing, pick the closest and note in flags):
category: Bodyweight | Free Weights | Resistance | Uncategorized
  (dumbbell/barbell/kettlebell/plate=Free Weights; cable/machine/bands/resistance_band=Resistance;
   bodyweight/pull_up_bar=Bodyweight; bodyweight-on-apparatus=Bodyweight)
equipment: bands | barbell | bench | bodyweight | cable | dumbbell | kettlebell | machine | other | plate | pull_up_bar | resistance_band
trackingMode: "" (weighted reps) | "repsOnly" (bodyweight reps) | "timed" (holds/planks/carries)

INSTRUCTIONS (string): numbered plain text, short sentences, no fluff, METRIC only (no feet/inches/lb), max 5-6 steps,
start at setup, end with "Repeat". Never "desired number of repetitions".
TIPS (string): numbered plain text, max 4, practical, no fluff. Never "avoid locking your elbows" for presses.
Keep each exercise's id and sheet EXACTLY. A correction object =
{"id","sheet","category","equipment","trackingMode","instructions","tips","primary":[{"group","latins":[]}],"secondary":[{"group","latins":[]}]}
"instructions" and "tips" MUST be plain strings (never arrays/numbers).
`

const prompt = (idx) => `You correct fitness-exercise data with web research. ${RULES}

TASK: Read work/in/chunk_${idx}.json (Read tool) — up to 5 exercises, each with id, name, sheet, and current data
(reference only — correct it). For EACH exercise run AT LEAST 3 web searches ("<name> muscles worked primary
secondary", "<name> EMG activation", and a grip/stance/equipment-variant or tiebreaker search). Never guess.

OUTPUT (two files, via the Write tool):
1. work/out/chunk_${idx}.json — a JSON array, one correction object per input exercise, SAME order. Before writing,
   re-check every entry: "group" is one of the 18 buckets; every "latins" term is in that bucket's allowed list;
   instructions and tips are strings.
2. work/flags/chunk_${idx}.json — a JSON array of {"id","issue"} for any uncertainty (ambiguous exercise, a worked
   muscle with no allowed value, a needed dropdown value that doesn't exist, conflicting sources). Write [] if none.

Your final message: one short line, e.g. "chunk ${idx}: wrote N corrections, M flags".`

const idxs = ["176","234","236","237","238","239","240","241","242","243","244","245","246","247","248","249","250","251","252","253","254","255","256","257","258","259","260","261","262","263","264","265","266","267","268","269","270","271","272","273","274","275","276","277","278","279","280","281","282","283","284","285","286","287","288","289","290","291","292","293","294","295","296","297","298","299","300","301","302","303","304","305","306","307","308","309","310","311"]
log(`Re-running ${idxs.length} chunks`)
const results = await parallel(idxs.map(idx => () => agent(prompt(idx), { label: `research:${idx}`, phase: 'Research' })))
const done = results.filter(Boolean).length
log(`Agents returned: ${done}/${idxs.length}`)
return { requested: idxs.length, returned: done }
