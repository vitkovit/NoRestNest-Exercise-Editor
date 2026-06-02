export const meta = {
  name: 'exercise-verify-sweep',
  description: 'Independent verification of muscle groups + equipment/category/tracking for every applied exercise',
  phases: [{ title: 'Verify', detail: 'one agent per chunk: fresh searches, correct muscles, write verified file' }],
}

const RULES = `
MUSCLE FORMAT. Each muscle entry = {"group":<bucket>,"latins":[<advance terms>]}.
"group" MUST be EXACTLY one of these 18 buckets: neck | shoulders | chest | mid back | Lats | biceps |
Triceps | forearms | abs | oblique | Lower Back | glutes | Quads | Abductor | Adductors | Hamstrings | Calves | Shin
"latins" MUST come from that bucket's allowed list, copied EXACTLY:
  neck->neck ; shoulders->Anterior Deltoids,Lateral Deltoids,Posterior Deltoid ; chest->Clavicular Head,Sternal Head ;
  mid back->Upper Traps,Rhomboids,Lower Traps ; Lats->Latissimus Dorsi,Rotator Cuff ; biceps->Biceps Brachii ;
  Triceps->Triceps Brachii ; forearms->Wrist Flexors,Wrist Extensors ; abs->Upper Rectus Abdominis,LowerRectus Abdominis ;
  oblique->External Obliques,Internal Obliques ; Lower Back->Erector Spinae ; glutes->Gluteus Maximus,Gluteus Medius ;
  Quads->Rectus Femoris,Vastus Medialis,Vastus Lateralis ; Abductor->Abductor ; Adductors->Adductors ;
  Hamstrings->Biceps Femoris,Semitendinosus ; Calves->Gastrocnemius Lateral,Gastrocnemius Medial,Soleus ;
  Shin->Fibularis,Extensor,Tibialis
"group" is NEVER a muscle name. Quirks: "LowerRectus Abdominis" no space; "Posterior Deltoid" singular,
"Anterior Deltoids"/"Lateral Deltoids" plural. Merge a bucket into ONE entry. Max 5 primary + 5 secondary, max 4 latins each.
Primary = prime movers; Secondary = meaningful assist/stabilize. Hamstrings (secondary) on squats/lunges;
Lats->Rotator Cuff + biceps (secondary) on pulls; BOTH obliques when twisting; Calves->Gastrocnemius (secondary) on
hamstring curls. No inflation. Chest head by angle; deltoid head by movement. If a worked muscle has no allowed value, omit + flag.
DROPDOWNS: category = Bodyweight|Free Weights|Resistance|Uncategorized
  (dumbbell/barbell/kettlebell/plate=Free Weights; cable/machine/bands/resistance_band=Resistance; bodyweight/pull_up_bar=Bodyweight).
equipment = bands|barbell|bench|bodyweight|cable|dumbbell|kettlebell|machine|other|plate|pull_up_bar|resistance_band
trackingMode = ""(weighted reps) | repsOnly(bodyweight reps) | timed(holds/planks/carries)
`

const prompt = (idx) => `You are an INDEPENDENT verifier of exercise muscle data. ${RULES}

TASK: Read work/cur/chunk_${idx}.json (Read tool) — up to 5 exercises, each with id, name, sheet, category, equipment,
trackingMode, instructions, tips, primary[], secondary[] (the CURRENT applied data). If work/verified/chunk_${idx}.json
already exists and is a valid array of the same length, you may stop and reply "skipped".

For EACH exercise, run your OWN at least 2 FRESH web searches to independently confirm the PRIMARY and SECONDARY
muscles and the equipment/category/trackingMode. If the current data is wrong, incomplete, inflated, or breaks the
MUSCLE FORMAT rules, CORRECT it. Judge on the exercise NAME (grip/stance/equipment define the variant).

CRITICAL: Do NOT change "instructions" or "tips" — copy them VERBATIM from the input into your output, byte-for-byte.
Keep "id" and "sheet" exactly.

WRITE two files with the Write tool:
1. work/verified/chunk_${idx}.json — array of correction objects {"id","sheet","category","equipment","trackingMode",
   "instructions","tips","primary":[{"group","latins":[]}],"secondary":[{"group","latins":[]}]}, one per input, same order.
   Re-check: every "group" is a bucket; every "latins" term is in that bucket's allowed list.
2. work/vflags/chunk_${idx}.json — array of {"id","change"} describing each correction you made (what changed and why),
   plus any remaining uncertainty. Write [] if nothing changed.

Final message: one line, e.g. "chunk ${idx}: N verified, M changed".`

// Resume: chunks 057..316 (000..056 already verified). Idempotent — agents skip any chunk already verified.
const idxs = Array.from({ length: 260 }, (_, i) => String(57 + i).padStart(3, '0'))
log(`Verification sweep over ${idxs.length} chunks (resume from 057)`)
const results = await parallel(idxs.map(idx => () => agent(prompt(idx), { label: `verify:${idx}`, phase: 'Verify' })))
log(`Agents returned: ${results.filter(Boolean).length}/${idxs.length}`)
return { requested: idxs.length, returned: results.filter(Boolean).length }
