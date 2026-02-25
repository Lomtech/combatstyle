// app.js
/* =========================================================
   KAMPFSTIL · No-Gi BJJ · SGM-V2.2
   - 24 Fragen
   - 6 Achsen: TOP, FORCE, INIT, RISK, ULO, TRANS (0..100)
   - Hierarchische Klassifikation:
     1) Primär-Archetyp (6 Raum-Cluster) via Distanz zu Zentroiden
     2) Ausprägung (6 Varianten) via Regeln
   ========================================================= */

const LS_KEY = "kampfstil_sgm_v22_state";

/* ---------- Archetypen (6 Primär + 6 Varianten) ---------- */
const ARCHETYPES = [
  // Primär (Raum-Cluster)
  {
    id: "PBP",
    tier: "primary",
    emoji: "💪",
    name: "Druckspieler",
    short: "Bodylock/Inside Passing → Pin-Kontrolle",
    focus: "Immobilisierung",
    dom: "FORCE",
    centroid: { TOP: 92, FORCE: 95, INIT: 70, RISK: 40, ULO: 20, TRANS: 15 },
    wiki: {
      entryBias: ["Clinch", "Underhooks", "Bodylock-Progression"],
      winPath: [
        "Inside Control → Pass",
        "Flattening/Pins",
        "Mount/Back → kontrollierter Finish",
      ],
      vuln: [
        "Leg-Exposure bei offenen Pass-Schritten",
        "Rotation gegen hohen TRANS",
      ],
      anti: [
        "Step-Passing ohne Leg-Awareness",
        "Pins lösen um 'mehr' zu holen",
        "Zu viel Rotation beim Pass",
      ],
    },
  },
  {
    id: "WTC",
    tier: "primary",
    emoji: "🤼",
    name: "Top-Erzwinger",
    short: "Takedown → Top-Stabilisierung → Ride",
    focus: "Ortsbestimmung",
    dom: "TOP",
    centroid: { TOP: 95, FORCE: 75, INIT: 92, RISK: 20, ULO: 30, TRANS: 35 },
    wiki: {
      entryBias: ["Level-Change", "Shot-Chains", "Re-Attacks"],
      winPath: [
        "Takedown → Stabilisieren",
        "Ride/Mat-Returns",
        "Kontrolle über Zeit/Punkte",
      ],
      vuln: ["Front-Headlock-Konter", "Back-Takes bei gescheiterten Shots"],
      anti: [
        "Lineare Entries ohne Head-Position",
        "Zu tiefe Knie (Heel-Exposure)",
        "Transitions jagen statt re-pin",
      ],
    },
  },
  {
    id: "FHF",
    tier: "primary",
    emoji: "🫴",
    name: "Guillotine-Jäger",
    short: "Snapdown/Sprawl → FHL → Finish oder Back",
    focus: "Entry-Bestrafung",
    dom: "INIT",
    centroid: { TOP: 60, FORCE: 55, INIT: 85, RISK: 85, ULO: 40, TRANS: 65 },
    wiki: {
      entryBias: ["Snapdowns", "Sprawl", "Front-Headlock-Traps"],
      winPath: [
        "Guillotine/D’Arce/Anaconda",
        "FHL als Pass-Tool",
        "Back nach Reaktion",
      ],
      vuln: ["Leg-Exposure bei Vorwärtsdruck", "Gute Hand-Fighting-Defenses"],
      anti: [
        "Guillotine erzwingen ohne Control",
        "FHL jagen statt resetten",
        "Head-Arm verlieren und bleiben",
      ],
    },
  },
  {
    id: "LIH",
    tier: "primary",
    emoji: "🦵",
    name: "Beinjäger",
    short: "Knee-Line → Inside Saddle → Heel Hook",
    focus: "Knee-Line",
    dom: "ULO/RISK",
    centroid: { TOP: 45, FORCE: 30, INIT: 70, RISK: 95, ULO: 100, TRANS: 75 },
    wiki: {
      entryBias: ["Ashi Entries", "Inside Sankaku/Saddle", "Knee-Line sichern"],
      winPath: [
        "Inside Heel Hook",
        "Knee-Line → Breaking Mechanics",
        "Leg → Sweep/Back als Exit",
      ],
      vuln: [
        "Elite Leg-Defense",
        "Heavy Top-Pressure nach gescheitertem Entry",
      ],
      anti: [
        "Statisches 50/50 ohne Progression",
        "Knee-Line verlieren und bleiben",
        "Head-Position ignorieren (Guillotine)",
      ],
    },
  },
  {
    id: "DOGR",
    tier: "primary",
    emoji: "🕸",
    name: "Winkel-Spieler",
    short: "Retention → Angle → Leg Entry oder Wrestle-Up",
    focus: "Distanz + Winkel",
    dom: "ULO",
    centroid: { TOP: 20, FORCE: 25, INIT: 55, RISK: 65, ULO: 85, TRANS: 65 },
    wiki: {
      entryBias: ["Guard Pull", "Retention", "Distanzarbeit"],
      winPath: [
        "Angle → Leg Threat",
        "Off-Balance → Sweep",
        "Wrestle-Up als Option",
      ],
      vuln: ["Bodylock-Pressure", "Direktes Flattening"],
      anti: [
        "Guard halten statt Winkel bauen",
        "Zu lang im Smash bleiben",
        "Tief kreuzen ohne Plan",
      ],
    },
  },
  {
    id: "RBTS",
    tier: "primary",
    emoji: "🔄",
    name: "Rückenjäger",
    short: "Rotation → Turtle-Exposure → Back → RNC",
    focus: "Backline",
    dom: "TRANS",
    centroid: { TOP: 60, FORCE: 40, INIT: 65, RISK: 65, ULO: 45, TRANS: 95 },
    wiki: {
      entryBias: ["Rotation", "Scramble", "Turtle-Traps"],
      winPath: ["Seatbelt früh", "Hooks sauber", "Backline > Sub-Trade"],
      vuln: ["Statische Pin-Spieler (FORCE hoch)", "Base-Loss in Legs"],
      anti: [
        "Back-Chase ohne Base",
        "Seatbelt sloppy",
        "Scramble erzwingen ohne Trigger",
      ],
    },
  },

  // Varianten (Ausprägungen / „Ausgefallen“)
  {
    id: "PPF",
    tier: "variant",
    emoji: "🎯",
    name: "Geduldiger Killer",
    short: "Position first → isolieren → Submission ohne Risiko",
    focus: "Sicherheit",
    dom: "Low-RISK",
    centroid: { TOP: 85, FORCE: 75, INIT: 60, RISK: 30, ULO: 35, TRANS: 30 }, // repräsentativ
    wiki: {
      entryBias: ["Progressiver Positionsaufbau"],
      winPath: ["Stabilisieren → isolieren", "Submission erst nach Kontrolle"],
      vuln: ["Zeitdruck", "sehr mobile Gegner"],
      anti: ["Rushing unter Druck", "Submission jagen auf Kosten der Position"],
    },
  },
  {
    id: "DN",
    tier: "variant",
    emoji: "🛡",
    name: "Neutralisierer",
    short: "Neutralisieren → resetten → Fehler abwarten",
    focus: "Überleben",
    dom: "Low-INIT/Low-RISK",
    centroid: { TOP: 55, FORCE: 55, INIT: 25, RISK: 25, ULO: 35, TRANS: 20 },
    wiki: {
      entryBias: ["Reaktiv, kein aktiver Entry"],
      winPath: ["Nie exponieren", "Konter auf Fehler"],
      vuln: ["Aggressive Punktesysteme", "Dauer-Initiativsysteme"],
      anti: ["Zu passiv = Punkteverlust", "Chancen nicht nutzen"],
    },
  },
  {
    id: "TSO",
    tier: "variant",
    emoji: "⚡",
    name: "Chaos-Spieler",
    short: "Chaos → Strukturbruch → opportunistischer Finish",
    focus: "Chaos",
    dom: "High-TRANS",
    centroid: { TOP: 50, FORCE: 40, INIT: 45, RISK: 70, ULO: 50, TRANS: 98 },
    wiki: {
      entryBias: ["Instabilität aktiv erzeugen"],
      winPath: ["Scramble gewinnen", "Chaos → Kontrolle überführen"],
      vuln: ["Strukturierte Pressure-Systeme"],
      anti: ["Chaos ohne Exit-Plan", "Position nicht sichern nach Gewinn"],
    },
  },
  {
    id: "WUGP",
    tier: "variant",
    emoji: "🔝",
    name: "Guard-Wrestler",
    short: "Guard → Single Build → Top Control",
    focus: "Guard → Top",
    dom: "High-INIT + TOP-Shift",
    centroid: { TOP: 60, FORCE: 50, INIT: 80, RISK: 50, ULO: 65, TRANS: 65 },
    wiki: {
      entryBias: ["Underhook-Build", "Sit-Up Singles"],
      winPath: ["Single aus Guard → Top", "Stabilisieren → Finish"],
      vuln: ["Front Headlock bei schlechtem Head-Positioning"],
      anti: ["Head exponieren beim Single-Build", "Wrestle-Up ohne Base"],
    },
  },
  {
    id: "LTC",
    tier: "variant",
    emoji: "🔀",
    name: "Sweep-Jäger",
    short: "Leg Threat → Sweep → Top → Finish",
    focus: "Leg → Position",
    dom: "ULO + TOP",
    centroid: { TOP: 70, FORCE: 55, INIT: 65, RISK: 75, ULO: 90, TRANS: 65 },
    wiki: {
      entryBias: ["Leg Threat als Entry-Mittel"],
      winPath: ["Leg Entry → Sweep", "Top → stabilisieren → Finish"],
      vuln: ["Sehr mobile Gegner", "Direkte Counter-Entries"],
      anti: [
        "Leg-Lock und Top gleichzeitig erzwingen",
        "Knee-Line verlieren ohne Plan B",
      ],
    },
  },
  {
    id: "TC",
    tier: "variant",
    emoji: "⏱",
    name: "Rhythmus-Brecher",
    short: "Rhythmus brechen → Trigger → Positional Edge",
    focus: "Rhythmus",
    dom: "INIT",
    centroid: { TOP: 55, FORCE: 45, INIT: 90, RISK: 55, ULO: 50, TRANS: 75 },
    wiki: {
      entryBias: ["Timing-Dominanz", "Rhythmuswechsel"],
      winPath: ["Fehler provozieren → sauberer Entry", "Initiative von Beginn"],
      vuln: ["Power-Pressure", "statische Bodylock-Systeme"],
      anti: [
        "Feints ohne Follow-Through",
        "Tempo verlieren und nicht zurückholen",
      ],
    },
  },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

// feste Reihenfolge für Card-Artworks (12 Stück)
const CARD_ORDER = [
  "PBP",
  "WTC",
  "PPF",
  "DN",
  "FHF",
  "RBTS",
  "TSO",
  "DOGR",
  "WUGP",
  "LIH",
  "LTC",
  "TC",
];

// Bildpfade automatisch vergeben: archetyp_01..12
function assignCardImages() {
  CARD_ORDER.forEach((id, idx) => {
    const a = archetypeById(id);
    if (a) a.img = `./images/archetyp_${pad2(idx + 1)}.jpg`;
  });
}

/* ---------- Testfragen (SGM-V2.2) ---------- */
const QUESTIONS = [
  // I Neutral & Entry
  {
    n: 1,
    block: "NEUTRAL / ENTRY",
    q: "Neutral im Handfight. Beide stehen. Was ist dein Default?",
    A: {
      t: "Underhooks → Bodylock → Hüfte kontrollieren.",
      d: { TOP: +2, FORCE: +2, INIT: +1, RISK: -1, ULO: -1, TRANS: -1 },
    },
    B: {
      t: "Snapdown → Kopf dominieren.",
      d: { TOP: +1, FORCE: 0, INIT: +2, RISK: +1, ULO: -1, TRANS: +1 },
    },
    C: {
      t: "Level Change → Shot erzwingen.",
      d: { TOP: +2, FORCE: +1, INIT: +2, RISK: -1, ULO: 0, TRANS: +1 },
    },
    D: {
      t: "Guard Pull in mein System.",
      d: { TOP: -2, FORCE: -1, INIT: 0, RISK: +1, ULO: +2, TRANS: +1 },
    },
  },
  {
    n: 2,
    block: "NEUTRAL / ENTRY",
    q: "Gegner schießt Single Leg. Dein Reflex?",
    A: {
      t: "Sprawl → Front Headlock Clamp.",
      d: { TOP: +1, FORCE: +1, INIT: +2, RISK: +2, ULO: -1, TRANS: +1 },
    },
    B: {
      t: "Sprawl → Winkel drehen → Back Exposure.",
      d: { TOP: +1, FORCE: 0, INIT: +1, RISK: +1, ULO: 0, TRANS: +2 },
    },
    C: {
      t: "Scramble sofort erzwingen.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +2 },
    },
    D: {
      t: "Sitz-Guard / Leg-System einleiten.",
      d: { TOP: -1, FORCE: -1, INIT: +1, RISK: +2, ULO: +2, TRANS: +1 },
    },
  },
  {
    n: 3,
    block: "NEUTRAL / ENTRY",
    q: "Du ziehst Guard. Dein erstes strukturelles Ziel?",
    A: {
      t: "Knee-Line sichern.",
      d: { TOP: -2, FORCE: -1, INIT: +1, RISK: +2, ULO: +3, TRANS: +1 },
    },
    B: {
      t: "Underhook → Wrestle-Up vorbereiten.",
      d: { TOP: +1, FORCE: +1, INIT: +2, RISK: 0, ULO: +1, TRANS: +1 },
    },
    C: {
      t: "Arm Drag → Rücken freilegen.",
      d: { TOP: -1, FORCE: -1, INIT: +2, RISK: +1, ULO: 0, TRANS: +2 },
    },
    D: {
      t: "Distanz kontrollieren → Retention.",
      d: { TOP: -2, FORCE: -2, INIT: +1, RISK: 0, ULO: +2, TRANS: +1 },
    },
  },
  {
    n: 4,
    block: "NEUTRAL / ENTRY",
    q: "Beide auf Knien im Clinch. Was priorisierst du?",
    A: {
      t: "Bodylock → flach machen.",
      d: { TOP: +2, FORCE: +2, INIT: +1, RISK: -1, ULO: -1, TRANS: -1 },
    },
    B: {
      t: "Snapdown → Front Headlock.",
      d: { TOP: +1, FORCE: 0, INIT: +2, RISK: +2, ULO: -1, TRANS: +1 },
    },
    C: {
      t: "Seatbelt / Turtle-Zwang.",
      d: { TOP: +1, FORCE: 0, INIT: +1, RISK: +1, ULO: 0, TRANS: +2 },
    },
    D: {
      t: "Guard-Zug ins Leg-System.",
      d: { TOP: -1, FORCE: -1, INIT: +1, RISK: +2, ULO: +2, TRANS: +1 },
    },
  },

  // II Passing & Top
  {
    n: 5,
    block: "GUARD VS PASSING",
    q: "Offene Guard vor dir. Deine Strategie?",
    A: {
      t: "Inside Control → Bodylock Pressure.",
      d: { TOP: +2, FORCE: +2, INIT: +1, RISK: -1, ULO: -1, TRANS: -1 },
    },
    B: {
      t: "Leg Drag / Angle Passing.",
      d: { TOP: +2, FORCE: 0, INIT: +1, RISK: 0, ULO: 0, TRANS: +1 },
    },
    C: {
      t: "Leg Pummel → eigenes Leg-Entry.",
      d: { TOP: +1, FORCE: -1, INIT: +1, RISK: +2, ULO: +3, TRANS: +1 },
    },
    D: {
      t: "Half Guard forcieren → Flattening.",
      d: { TOP: +2, FORCE: +2, INIT: 0, RISK: -1, ULO: -1, TRANS: -2 },
    },
  },
  {
    n: 6,
    block: "GUARD VS PASSING",
    q: "Half Guard Top. Dein Fokus?",
    A: {
      t: "Crossface + Underhook → immobilisieren.",
      d: { TOP: +2, FORCE: +2, INIT: +1, RISK: -1, ULO: -1, TRANS: -2 },
    },
    B: {
      t: "Backstep → Saddle.",
      d: { TOP: +1, FORCE: -1, INIT: +1, RISK: +2, ULO: +3, TRANS: +1 },
    },
    C: {
      t: "Tempo Knee-Cut → Durchmarsch.",
      d: { TOP: +2, FORCE: +1, INIT: +2, RISK: 0, ULO: 0, TRANS: +1 },
    },
    D: {
      t: "Neu öffnen, Risiko minimieren.",
      d: { TOP: +1, FORCE: 0, INIT: -1, RISK: -1, ULO: 0, TRANS: -1 },
    },
  },
  {
    n: 7,
    block: "GUARD VS PASSING",
    q: "Du bist fast durch den Pass. Gegner dreht explosiv und gibt dir: Rücken oder exponiertes Bein.",
    A: {
      t: "Rücken nehmen – Hooks sofort.",
      d: { TOP: +1, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    B: {
      t: "Seatbelt → FHL-Option.",
      d: { TOP: +1, FORCE: 0, INIT: +2, RISK: +2, ULO: -1, TRANS: +2 },
    },
    C: {
      t: "Exponiertes Bein → Leg Entry.",
      d: { TOP: +1, FORCE: -1, INIT: +1, RISK: +2, ULO: +3, TRANS: +2 },
    },
    D: {
      t: "Position halten, kein Risiko.",
      d: { TOP: +2, FORCE: +1, INIT: -1, RISK: -2, ULO: -1, TRANS: -2 },
    },
  },
  {
    n: 8,
    block: "GUARD VS PASSING",
    q: "Side Control Top, Gegner kämpft stark.",
    A: {
      t: "Flach drücken, Geduld.",
      d: { TOP: +2, FORCE: +2, INIT: 0, RISK: -2, ULO: -1, TRANS: -2 },
    },
    B: {
      t: "Mount/Back upgraden.",
      d: { TOP: +2, FORCE: +1, INIT: +1, RISK: -1, ULO: 0, TRANS: +1 },
    },
    C: {
      t: "Submission erzwingen, auch wenn Scramble droht.",
      d: { TOP: +1, FORCE: 0, INIT: +1, RISK: +2, ULO: 0, TRANS: +2 },
    },
    D: {
      t: "Knee-on-Belly → Druck + Reaktion.",
      d: { TOP: +2, FORCE: +1, INIT: +2, RISK: 0, ULO: 0, TRANS: +1 },
    },
  },

  // III Guard & Defense
  {
    n: 9,
    block: "DEFENSE",
    q: "Du wirst fast gepasst.",
    A: {
      t: "Frame → Reguard.",
      d: { TOP: -2, FORCE: -1, INIT: 0, RISK: -1, ULO: +1, TRANS: +1 },
    },
    B: {
      t: "Leg-Entanglement beim Pass anbieten.",
      d: { TOP: -1, FORCE: -1, INIT: +1, RISK: +2, ULO: +3, TRANS: +1 },
    },
    C: {
      t: "Turtle → Scramble-Backtake.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    D: {
      t: "Wrestle-Up initiieren.",
      d: { TOP: +1, FORCE: +1, INIT: +2, RISK: 0, ULO: +1, TRANS: +1 },
    },
  },
  {
    n: 10,
    block: "DEFENSE",
    q: "Schwerer Druck von oben. Dein Verhalten?",
    A: {
      t: "Strukturell über Frames lösen.",
      d: { TOP: -1, FORCE: 0, INIT: -1, RISK: -1, ULO: +1, TRANS: -1 },
    },
    B: {
      t: "Inversion / Leg-System.",
      d: { TOP: -2, FORCE: -2, INIT: +1, RISK: +2, ULO: +3, TRANS: +2 },
    },
    C: {
      t: "Explosiver Hip-Escape + Tempo.",
      d: { TOP: -1, FORCE: -1, INIT: +2, RISK: +1, ULO: +1, TRANS: +2 },
    },
    D: {
      t: "Geduldig warten, Energie sparen.",
      d: { TOP: -1, FORCE: +1, INIT: -2, RISK: -2, ULO: 0, TRANS: -2 },
    },
  },
  {
    n: 11,
    block: "DEFENSE",
    q: "Unter Side Control Bottom. Dein Default?",
    A: {
      t: "Underhook → Single → aufstehen.",
      d: { TOP: +1, FORCE: 0, INIT: +2, RISK: 0, ULO: +1, TRANS: +1 },
    },
    B: {
      t: "Reguard → Distanz.",
      d: { TOP: -2, FORCE: -1, INIT: 0, RISK: -1, ULO: +2, TRANS: +1 },
    },
    C: {
      t: "Turtle → Rotation.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    D: {
      t: "Minimalbewegung → Energie konservieren.",
      d: { TOP: 0, FORCE: +1, INIT: -2, RISK: -2, ULO: 0, TRANS: -2 },
    },
  },
  {
    n: 12,
    block: "DEFENSE",
    q: "Gegner überpaced dich.",
    A: {
      t: "Tempo brechen durch Druck.",
      d: { TOP: +1, FORCE: +2, INIT: +1, RISK: -1, ULO: -1, TRANS: -1 },
    },
    B: {
      t: "Neutral resetten.",
      d: { TOP: 0, FORCE: 0, INIT: -2, RISK: -2, ULO: 0, TRANS: -1 },
    },
    C: {
      t: "Chaos annehmen → Scramble.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    D: {
      t: "Backline suchen.",
      d: { TOP: +1, FORCE: 0, INIT: +1, RISK: +1, ULO: 0, TRANS: +2 },
    },
  },

  // IV Sub decisions
  {
    n: 13,
    block: "SUBMISSION",
    q: "Mount Top.",
    A: {
      t: "Stabilisieren → isolieren → kontrolliert finishen.",
      d: { TOP: +2, FORCE: +1, INIT: 0, RISK: -2, ULO: -1, TRANS: -2 },
    },
    B: {
      t: "Submission-Chain sofort starten.",
      d: { TOP: +1, FORCE: 0, INIT: +2, RISK: +2, ULO: 0, TRANS: +1 },
    },
    C: {
      t: "Back Exposure priorisieren.",
      d: { TOP: +1, FORCE: 0, INIT: +1, RISK: +1, ULO: 0, TRANS: +2 },
    },
    D: {
      t: "High Mount → maximales Risiko.",
      d: { TOP: +1, FORCE: 0, INIT: +1, RISK: +3, ULO: 0, TRANS: +1 },
    },
  },
  {
    n: 14,
    block: "SUBMISSION",
    q: "Front Headlock Kontrolle.",
    A: {
      t: "Finish erzwingen.",
      d: { TOP: 0, FORCE: 0, INIT: +2, RISK: +3, ULO: -1, TRANS: +1 },
    },
    B: {
      t: "Als Pass-Tool nutzen.",
      d: { TOP: +2, FORCE: +1, INIT: +1, RISK: -1, ULO: -1, TRANS: -1 },
    },
    C: {
      t: "Rotation → Back.",
      d: { TOP: +1, FORCE: 0, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    D: {
      t: "Nur Kontrolle, kein Commitment.",
      d: { TOP: 0, FORCE: +1, INIT: -1, RISK: -2, ULO: 0, TRANS: -1 },
    },
  },
  {
    n: 15,
    block: "SUBMISSION",
    q: "Leg-Entanglement, Gegner verteidigt hart.",
    A: {
      t: "Mechanik erzwingen.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +3, ULO: +3, TRANS: +1 },
    },
    B: {
      t: "Lane wechseln (Inside ↔ Outside).",
      d: { TOP: 0, FORCE: -1, INIT: +2, RISK: +2, ULO: +2, TRANS: +2 },
    },
    C: {
      t: "Sweep → oben stabilisieren.",
      d: { TOP: +2, FORCE: +1, INIT: +1, RISK: +1, ULO: +2, TRANS: +1 },
    },
    D: {
      t: "Abbrechen, Risiko zu hoch.",
      d: { TOP: +1, FORCE: +1, INIT: -1, RISK: -3, ULO: 0, TRANS: -2 },
    },
  },
  {
    n: 16,
    block: "SUBMISSION",
    q: "Submission öffnet sich, aber Position ist gefährdet.",
    A: {
      t: "Ich nehme das Risiko.",
      d: { TOP: 0, FORCE: 0, INIT: +1, RISK: +3, ULO: 0, TRANS: +1 },
    },
    B: {
      t: "Ich verbessere Position zuerst.",
      d: { TOP: +2, FORCE: +1, INIT: +1, RISK: -2, ULO: 0, TRANS: -1 },
    },
    C: {
      t: "Ich akzeptiere Scramble.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    D: {
      t: "Ich halte nur Kontrolle.",
      d: { TOP: +1, FORCE: +2, INIT: -2, RISK: -3, ULO: 0, TRANS: -2 },
    },
  },

  // V Transition & Scramble
  {
    n: 17,
    block: "TRANSITION",
    q: "Position bricht auf.",
    A: {
      t: "Sofort Kontrolle zurück.",
      d: { TOP: +2, FORCE: +1, INIT: +1, RISK: -2, ULO: 0, TRANS: -2 },
    },
    B: {
      t: "Transition bewusst verlängern.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    C: {
      t: "Backline erzwingen.",
      d: { TOP: +1, FORCE: 0, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    D: {
      t: "Reset auf Neutral.",
      d: { TOP: 0, FORCE: 0, INIT: -2, RISK: -2, ULO: 0, TRANS: -1 },
    },
  },
  {
    n: 18,
    block: "TRANSITION",
    q: "Erster Angriff scheitert.",
    A: {
      t: "Gleiche Lane erneut.",
      d: { TOP: 0, FORCE: 0, INIT: +2, RISK: +1, ULO: 0, TRANS: +1 },
    },
    B: {
      t: "Lane wechseln.",
      d: { TOP: 0, FORCE: 0, INIT: +2, RISK: +1, ULO: +1, TRANS: +2 },
    },
    C: {
      t: "Position sichern.",
      d: { TOP: +2, FORCE: +1, INIT: 0, RISK: -2, ULO: 0, TRANS: -2 },
    },
    D: {
      t: "Reset.",
      d: { TOP: 0, FORCE: 0, INIT: -2, RISK: -2, ULO: 0, TRANS: -1 },
    },
  },
  {
    n: 19,
    block: "TRANSITION",
    q: "Gegner turtle-flieht.",
    A: {
      t: "Hooks rein, Rücken sichern.",
      d: { TOP: +1, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    B: {
      t: "D’Arce/Trap oben.",
      d: { TOP: +1, FORCE: +1, INIT: +2, RISK: +2, ULO: -1, TRANS: +1 },
    },
    C: {
      t: "Leg Entry beim Rollen.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +2, ULO: +3, TRANS: +2 },
    },
    D: {
      t: "Nur Top halten.",
      d: { TOP: +2, FORCE: +2, INIT: -1, RISK: -2, ULO: -1, TRANS: -2 },
    },
  },
  {
    n: 20,
    block: "TRANSITION",
    q: "Offene Chaos-Situation.",
    A: {
      t: "Druck erhöhen.",
      d: { TOP: +1, FORCE: +2, INIT: +1, RISK: -1, ULO: -1, TRANS: -1 },
    },
    B: {
      t: "Tempo spielen.",
      d: { TOP: +1, FORCE: 0, INIT: +2, RISK: 0, ULO: 0, TRANS: +2 },
    },
    C: {
      t: "Risiko erhöhen.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +3, ULO: 0, TRANS: +2 },
    },
    D: {
      t: "Tempo runterfahren.",
      d: { TOP: +1, FORCE: +1, INIT: -2, RISK: -2, ULO: 0, TRANS: -2 },
    },
  },

  // VI Identity
  {
    n: 21,
    block: "IDENTITÄT",
    q: "Du führst knapp, 1 Minute übrig.",
    A: {
      t: "Druck + Immobilisierung.",
      d: { TOP: +2, FORCE: +2, INIT: +1, RISK: -2, ULO: -1, TRANS: -2 },
    },
    B: {
      t: "Kontrollieren.",
      d: { TOP: +2, FORCE: +1, INIT: 0, RISK: -2, ULO: 0, TRANS: -2 },
    },
    C: {
      t: "Finish suchen.",
      d: { TOP: +1, FORCE: 0, INIT: +2, RISK: +3, ULO: 0, TRANS: +1 },
    },
    D: {
      t: "Interaktion vermeiden.",
      d: { TOP: 0, FORCE: +1, INIT: -3, RISK: -3, ULO: 0, TRANS: -2 },
    },
  },
  {
    n: 22,
    block: "IDENTITÄT",
    q: "Unter Ermüdung kämpfst du:",
    A: {
      t: "Gleiches System, keine Änderung.",
      d: { TOP: +1, FORCE: +1, INIT: +1, RISK: 0, ULO: 0, TRANS: 0 },
    },
    B: {
      t: "Geduldiger.",
      d: { TOP: +1, FORCE: +1, INIT: -1, RISK: -2, ULO: 0, TRANS: -1 },
    },
    C: {
      t: "Riskanter.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +3, ULO: 0, TRANS: +1 },
    },
    D: {
      t: "Defensiver.",
      d: { TOP: 0, FORCE: +1, INIT: -3, RISK: -3, ULO: 0, TRANS: -2 },
    },
  },
  {
    n: 23,
    block: "IDENTITÄT",
    q: "Deine häufigste Finish-Lane?",
    A: {
      t: "Upper Body (Guillotine/D’Arce).",
      d: { TOP: 0, FORCE: 0, INIT: +2, RISK: +2, ULO: -2, TRANS: +1 },
    },
    B: {
      t: "Leg-Locks.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +3, ULO: +3, TRANS: +1 },
    },
    C: {
      t: "Back Control.",
      d: { TOP: +1, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    D: {
      t: "Positionsdominanz → Strangulation.",
      d: { TOP: +2, FORCE: +2, INIT: 0, RISK: -1, ULO: -1, TRANS: -2 },
    },
  },
  {
    n: 24,
    block: "IDENTITÄT",
    q: "Was beschreibt dich am ehesten?",
    A: {
      t: "Ich breche Gegner strukturell.",
      d: { TOP: +2, FORCE: +2, INIT: +1, RISK: -2, ULO: -1, TRANS: -2 },
    },
    B: {
      t: "Ich bestrafe Entries.",
      d: { TOP: +1, FORCE: 0, INIT: +2, RISK: +2, ULO: -1, TRANS: +1 },
    },
    C: {
      t: "Ich nutze Übergänge.",
      d: { TOP: 0, FORCE: -1, INIT: +1, RISK: +1, ULO: 0, TRANS: +3 },
    },
    D: {
      t: "Ich neutralisiere Chaos.",
      d: { TOP: +1, FORCE: +1, INIT: -3, RISK: -3, ULO: 0, TRANS: -2 },
    },
  },
];

/* ---------- Matchup-Matrix: pragmatische Heuristik ---------- */
const ARCH_ORDER = [
  "PBP",
  "WTC",
  "PPF",
  "DN",
  "FHF",
  "RBTS",
  "TSO",
  "DOGR",
  "WUGP",
  "LIH",
  "LTC",
  "TC",
];
const MU_SYMBOL = { OK: "✓", MID: "~", BAD: "✗" };

// Matrixwerte (aus deinem Schema; du kannst sie leicht anpassen)
const MATCHUPS = {
  PBP: {
    PBP: "MID",
    WTC: "OK",
    PPF: "MID",
    DN: "OK",
    FHF: "BAD",
    RBTS: "BAD",
    TSO: "MID",
    DOGR: "OK",
    WUGP: "MID",
    LIH: "BAD",
    LTC: "BAD",
    TC: "MID",
  },
  WTC: {
    PBP: "MID",
    WTC: "MID",
    PPF: "MID",
    DN: "OK",
    FHF: "BAD",
    RBTS: "BAD",
    TSO: "MID",
    DOGR: "OK",
    WUGP: "MID",
    LIH: "BAD",
    LTC: "BAD",
    TC: "BAD",
  },
  PPF: {
    PBP: "MID",
    WTC: "MID",
    PPF: "MID",
    DN: "OK",
    FHF: "MID",
    RBTS: "BAD",
    TSO: "OK",
    DOGR: "OK",
    WUGP: "OK",
    LIH: "BAD",
    LTC: "BAD",
    TC: "MID",
  },
  DN: {
    PBP: "BAD",
    WTC: "BAD",
    PPF: "BAD",
    DN: "MID",
    FHF: "BAD",
    RBTS: "MID",
    TSO: "MID",
    DOGR: "MID",
    WUGP: "BAD",
    LIH: "MID",
    LTC: "BAD",
    TC: "BAD",
  },
  FHF: {
    PBP: "OK",
    WTC: "OK",
    PPF: "MID",
    DN: "OK",
    FHF: "MID",
    RBTS: "MID",
    TSO: "MID",
    DOGR: "MID",
    WUGP: "OK",
    LIH: "BAD",
    LTC: "MID",
    TC: "MID",
  },
  RBTS: {
    PBP: "OK",
    WTC: "OK",
    PPF: "OK",
    DN: "MID",
    FHF: "MID",
    RBTS: "MID",
    TSO: "BAD",
    DOGR: "MID",
    WUGP: "MID",
    LIH: "MID",
    LTC: "BAD",
    TC: "MID",
  },
  TSO: {
    PBP: "BAD",
    WTC: "MID",
    PPF: "BAD",
    DN: "MID",
    FHF: "MID",
    RBTS: "OK",
    TSO: "MID",
    DOGR: "MID",
    WUGP: "MID",
    LIH: "MID",
    LTC: "MID",
    TC: "MID",
  },
  DOGR: {
    PBP: "BAD",
    WTC: "BAD",
    PPF: "BAD",
    DN: "MID",
    FHF: "MID",
    RBTS: "MID",
    TSO: "MID",
    DOGR: "MID",
    WUGP: "OK",
    LIH: "BAD",
    LTC: "MID",
    TC: "MID",
  },
  WUGP: {
    PBP: "BAD",
    WTC: "MID",
    PPF: "BAD",
    DN: "OK",
    FHF: "BAD",
    RBTS: "MID",
    TSO: "MID",
    DOGR: "BAD",
    WUGP: "MID",
    LIH: "BAD",
    LTC: "MID",
    TC: "BAD",
  },
  LIH: {
    PBP: "OK",
    WTC: "OK",
    PPF: "OK",
    DN: "MID",
    FHF: "OK",
    RBTS: "MID",
    TSO: "MID",
    DOGR: "OK",
    WUGP: "OK",
    LIH: "MID",
    LTC: "MID",
    TC: "MID",
  },
  LTC: {
    PBP: "OK",
    WTC: "OK",
    PPF: "OK",
    DN: "OK",
    FHF: "MID",
    RBTS: "OK",
    TSO: "MID",
    DOGR: "MID",
    WUGP: "OK",
    LIH: "MID",
    LTC: "MID",
    TC: "MID",
  },
  TC: {
    PBP: "BAD",
    WTC: "OK",
    PPF: "MID",
    DN: "OK",
    FHF: "MID",
    RBTS: "MID",
    TSO: "MID",
    DOGR: "MID",
    WUGP: "OK",
    LIH: "MID",
    LTC: "MID",
    TC: "MID",
  },
};

/* ---------- State ---------- */
let state = {
  i: 0,
  answers: {}, // { [qIndex]: "A"|"B"|"C"|"D" }
  finished: false,
  lastResult: null,
};

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      state = { ...state, ...parsed };
    }
  } catch (e) {}
}
function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {}
}
function clearState() {
  state = { i: 0, answers: {}, finished: false, lastResult: null };
  try {
    localStorage.removeItem(LS_KEY);
  } catch (e) {}
}

/* ---------- Utilities ---------- */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function archetypeById(id) {
  return ARCHETYPES.find((a) => a.id === id);
}
function labelById(id) {
  const a = archetypeById(id);
  return a ? `${a.emoji} ${a.name}` : id;
}

/* ---------- Scoring ---------- */
function computeAxesFromAnswers() {
  // Start neutral 50/50 baseline
  let axes = { TOP: 50, FORCE: 50, INIT: 50, RISK: 50, ULO: 50, TRANS: 50 };

  // Weight per answer delta (each unit ≈ 3.0 points)
  const STEP = 3.0;

  for (let qi = 0; qi < QUESTIONS.length; qi++) {
    const pick = state.answers[qi];
    if (!pick) continue;
    const q = QUESTIONS[qi];
    const delta = q[pick].d;
    for (const k of Object.keys(axes)) {
      axes[k] += (delta[k] || 0) * STEP;
    }
  }

  // Clamp
  for (const k of Object.keys(axes)) {
    axes[k] = clamp(Math.round(axes[k]), 0, 100);
  }
  return axes;
}

function distance6(a, b) {
  // Euclidean distance in 6D
  const ks = ["TOP", "FORCE", "INIT", "RISK", "ULO", "TRANS"];
  let s = 0;
  for (const k of ks) {
    const d = a[k] - b[k];
    s += d * d;
  }
  return Math.sqrt(s);
}

function pickPrimary(axes) {
  const primaries = ARCHETYPES.filter((a) => a.tier === "primary");
  let best = primaries[0];
  let bestD = Infinity;
  for (const a of primaries) {
    const d = distance6(axes, a.centroid);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return { primary: best, dist: bestD };
}

function pickVariant(axes, primaryId) {
  // Regeln (bewusst simpel, robust, leicht tweakbar)
  const { INIT, RISK, TRANS, TOP, FORCE, ULO } = axes;

  // Neutralisierer als Override (sehr defensiver Bias)
  if (INIT <= 32 && RISK <= 32) return archetypeById("DN");

  // Chaos als TRANS-Extrem
  if (TRANS >= 92 && RISK >= 55) return archetypeById("TSO");

  // Geduldiger Killer: Low Risk + eher Top/Force
  if (RISK <= 34 && (TOP >= 70 || FORCE >= 70)) return archetypeById("PPF");

  // Guard-Wrestler: INIT hoch + TOP mittel/hoch + ULO nicht ultra-low
  if (INIT >= 78 && TOP >= 55 && ULO >= 45) return archetypeById("WUGP");

  // Sweep-Jäger: ULO hoch + TOP hoch, aber nicht reine Leg-Finish-Manie
  if (ULO >= 78 && TOP >= 62 && RISK >= 55 && RISK <= 88)
    return archetypeById("LTC");

  // Rhythmus-Brecher: INIT extrem hoch + TRANS hoch/moderat
  if (INIT >= 88 && TRANS >= 62) return archetypeById("TC");

  // Default: keine Variante / „primär-rein“
  return null;
}

function finalize() {
  const axes = computeAxesFromAnswers();
  const { primary } = pickPrimary(axes);
  const variant = pickVariant(axes, primary.id);

  const result = {
    axes,
    primaryId: primary.id,
    variantId: variant ? variant.id : null,
    label: variant
      ? `${primary.emoji} ${primary.name} · ${variant.emoji} ${variant.name}`
      : `${primary.emoji} ${primary.name}`,
    timestamp: Date.now(),
  };

  state.finished = true;
  state.lastResult = result;
  saveState();
  return result;
}

/* ---------- UI Wiring ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showPage(page) {
  $$(".page").forEach((p) => p.classList.remove("active"));
  $$(".tab").forEach((t) => t.classList.remove("active"));
  const p = $("#page-" + page);
  if (p) p.classList.add("active");
  const tab = $(`.tab[data-page="${page}"]`);
  if (tab) tab.classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function setTabAria() {
  $$(".tab").forEach((t) => {
    const active = t.classList.contains("active");
    t.setAttribute("aria-selected", active ? "true" : "false");
  });
}

function renderQuestion() {
  const qi = state.i;
  const q = QUESTIONS[qi];
  if (!q) return;

  const answered = Object.keys(state.answers).length;
  $("#progressText").textContent = `${answered} / ${QUESTIONS.length}`;
  $("#progressBar").style.width =
    `${Math.round((answered / QUESTIONS.length) * 100)}%`;

  const pick = state.answers[qi] || null;

  $("#qWrap").innerHTML = `
    <div class="qnum">Frage ${q.n} · ${q.block}</div>
    <div class="qtitle">${q.q}</div>
    <div class="qblock">
      ${["A", "B", "C", "D"]
        .map((L) => {
          const sel = pick === L ? "selected" : "";
          return `
          <div class="opt ${sel}" data-pick="${L}" role="button" tabindex="0" aria-label="Antwort ${L}">
            <div class="letter">${L}</div>
            <div class="txt">${q[L].t}</div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;

  $$(".opt").forEach((el) => {
    el.addEventListener("click", () => chooseAnswer(el.dataset.pick));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        chooseAnswer(el.dataset.pick);
      }
    });
  });

  // Buttons
  $("#btnPrev").disabled = qi === 0;
}

function chooseAnswer(letter) {
  state.answers[state.i] = letter;
  saveState();

  // Move to next unanswered if possible
  const next = findNextIndex(state.i);
  state.i = next;
  saveState();

  renderQuestion();
}

function findNextIndex(from) {
  // Prefer next index, else first unanswered, else last
  for (let j = from + 1; j < QUESTIONS.length; j++) {
    if (!state.answers[j]) return j;
  }
  for (let j = 0; j < QUESTIONS.length; j++) {
    if (!state.answers[j]) return j;
  }
  return Math.min(from + 1, QUESTIONS.length - 1);
}

function findPrevIndex(from) {
  for (let j = from - 1; j >= 0; j--) {
    return j;
  }
  return 0;
}

function renderResults(result) {
  const primary = archetypeById(result.primaryId);
  const variant = result.variantId ? archetypeById(result.variantId) : null;

  const title = variant
    ? `${primary.emoji} ${primary.name} <span class="muted">mit</span> ${variant.emoji} ${variant.name}`
    : `${primary.emoji} ${primary.name}`;

  const subtitle = variant ? variant.short : primary.short;

  $("#resultMain").innerHTML = `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <div>
        <div style="font-weight:950;font-size:18px;">${title}</div>
        <div class="muted" style="margin-top:6px;line-height:1.45;">${subtitle}</div>
      </div>
      <div class="pill">${primary.tier === "primary" ? "Primär-Archetyp" : ""}</div>
    </div>

    <div class="divider"></div>

    <div class="k">Kurzprofil</div>
    <div class="muted" style="line-height:1.55">
      <strong>Fokus:</strong> ${primary.focus}${variant ? ` · <strong>Ausprägung:</strong> ${variant.focus}` : ""}<br>
      <strong>Dominant:</strong> ${primary.dom}${variant ? ` · ${variant.dom}` : ""}
    </div>

    <div class="divider"></div>

    <div class="k">Win-Conditions</div>
    <ul>
      ${(primary.wiki.winPath || []).map((x) => `<li class="muted">${x}</li>`).join("")}
    </ul>

    <div class="k" style="margin-top:10px;">Vulnerabilities</div>
    <ul>
      ${(primary.wiki.vuln || []).map((x) => `<li class="muted">${x}</li>`).join("")}
    </ul>
  `;

  const chips = Object.entries(result.axes)
    .map(([k, v]) => `<span class="chip"><strong>${k}</strong> ${v}</span>`)
    .join("");
  $("#axisChips").innerHTML = chips;

  $("#resultsCard").style.display = "block";
}

function buildShareText(result) {
  const primary = archetypeById(result.primaryId);
  const variant = result.variantId ? archetypeById(result.variantId) : null;
  const axes = result.axes;

  const line1 = `KAMPFSTIL · No-Gi BJJ (SGM-V2.2)`;
  const line2 = variant
    ? `Mein Profil: ${primary.emoji} ${primary.name} + ${variant.emoji} ${variant.name}`
    : `Mein Profil: ${primary.emoji} ${primary.name}`;

  const line3 = `x = (TOP ${axes.TOP}, FORCE ${axes.FORCE}, INIT ${axes.INIT}, RISK ${axes.RISK}, ULO ${axes.ULO}, TRANS ${axes.TRANS})`;

  return [line1, line2, line3].join("\n");
}

/* ---------- WIKI ---------- */
function renderWikiGrid() {
  const search = ($("#wikiSearch").value || "").trim().toLowerCase();
  const filter = $("#wikiFilter").value;

  const items = ARCHETYPES.filter((a) => {
    if (filter === "primary") return a.tier === "primary";
    if (filter === "variant") return a.tier === "variant";
    return true;
  }).filter((a) => {
    if (!search) return true;
    const hay =
      `${a.name} ${a.short} ${a.focus} ${a.dom} ${a.id}`.toLowerCase();
    return hay.includes(search);
  });

  const grid = $("#wikiGrid");
  grid.innerHTML = items
    .map((a) => {
      const tierLabel = a.tier === "primary" ? "PRIMÄR" : "AUSPRÄGUNG";
      const art = a.img ? a.img : "./images/archetyp_01.jpg"; // fallback
      const centroid = a.centroid || {};
      const stats = [
        ["TOP", centroid.TOP],
        ["FORCE", centroid.FORCE],
        ["INIT", centroid.INIT],
        ["RISK", centroid.RISK],
        ["ULO", centroid.ULO],
        ["TRANS", centroid.TRANS],
      ]
        .map(
          ([k, v]) => `
      <div class="stat">
        <div class="statk">${k}</div>
        <div class="statv">${v ?? "—"}</div>
      </div>
    `,
        )
        .join("");

      return `
      <article class="tcg" data-id="${a.id}" role="button" tabindex="0" aria-label="${a.name} öffnen">
        <div class="tcgframe">
          <div class="tcghead">
            <div class="tcgname">${a.emoji} ${a.name}</div>
            <div class="tcgtier">${tierLabel}</div>
          </div>

          <div class="tcgart">
            <img src="${art}" alt="${a.name} Artwork" loading="lazy" />
            <div class="tcgfade"></div>
            <div class="tcgmeta">
              <span class="chipmini">Fokus: ${a.focus}</span>
              <span class="chipmini">Dom: ${a.dom}</span>
              <span class="chipmini">ID: ${a.id}</span>
            </div>
          </div>

          <div class="tcgbody">
            <div class="tcgshort">${a.short}</div>
            <div class="statsgrid">
              ${stats}
            </div>
          </div>
        </div>
      </article>
    `;
    })
    .join("");

  $$(".tcg").forEach((el) => {
    el.addEventListener("click", () => openWikiDetail(el.dataset.id));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openWikiDetail(el.dataset.id);
      }
    });
  });
}

function openWikiDetail(id) {
  const a = archetypeById(id);
  const art = a.img ? a.img : "./images/archetyp_01.jpg";
  if (!a) return;

  $("#wikiDetail").style.display = "block";
  $("#wikiGrid").parentElement.style.display = "none"; // hide grid card content region (simple)
  // Actually the grid card is the first .card in wiki page; keep it visible but hide grid & controls:
  // We'll do minimal: hide grid itself and controls.
  $("#wikiGrid").style.display = "none";
  $(".controls").style.display = "none";

  $("#detailTitle").innerHTML =
    `${a.emoji} ${a.name} <span class="muted small">(${a.tier === "primary" ? "Primär" : "Ausprägung"} · ${a.id})</span>`;

  const c = a.centroid;
  const axisLine = `TOP ${c.TOP} · FORCE ${c.FORCE} · INIT ${c.INIT} · RISK ${c.RISK} · ULO ${c.ULO} · TRANS ${c.TRANS}`;

  $("#detailBody").innerHTML = `
    <div class="detailart">
    <img src="${art}" alt="${a.name} Artwork" loading="lazy" />
    </div>
    <div class="detailbox">
      <h3>Beschreibung</h3>
      <p>${a.short}</p>
    </div>
    <div class="detailbox">
      <h3>Fokus & Dominanz</h3>
      <p><strong>Fokus:</strong> ${a.focus}<br><strong>Dominant:</strong> ${a.dom}</p>
    </div>
    <div class="detailbox">
      <h3>SGM-Zentroid (repräsentativ)</h3>
      <p class="muted">${axisLine}</p>
    </div>
    <div class="detailbox">
      <h3>Entry-Bias</h3>
      <ul>${(a.wiki.entryBias || []).map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
    <div class="detailbox">
      <h3>Primary Win Path</h3>
      <ul>${(a.wiki.winPath || []).map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
    <div class="detailbox">
      <h3>Vulnerabilities</h3>
      <ul>${(a.wiki.vuln || []).map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
    <div class="detailbox">
      <h3>Anti-Patterns</h3>
      <ul>${(a.wiki.anti || []).map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
  `;

  // Remember selection for quick actions
  state.lastWikiId = id;
  saveState();
}

function closeWikiDetail() {
  $("#wikiDetail").style.display = "none";
  $("#wikiGrid").style.display = "grid";
  $(".controls").style.display = "flex";
  // show grid card content
  $("#wikiGrid").parentElement.style.display = "";
}

/* ---------- Matchups UI ---------- */
function renderMatchupSelects() {
  const opts = ARCH_ORDER.map(
    (id) => `<option value="${id}">${labelById(id)}</option>`,
  ).join("");
  $("#muA").innerHTML = opts;
  $("#muB").innerHTML = opts;
  $("#muB").value = "WTC";
}

function renderMatchupMatrix() {
  const table = $("#matrixTable");
  const head = `
    <tr>
      <th class="rowhead">↓ vs →</th>
      ${ARCH_ORDER.map((id) => `<th>${archetypeById(id).id}</th>`).join("")}
    </tr>
  `;
  const rows = ARCH_ORDER.map((r) => {
    const rowName = `${archetypeById(r).id} ${archetypeById(r).emoji}`;
    const tds = ARCH_ORDER.map((c) => {
      const v = MATCHUPS[r] && MATCHUPS[r][c] ? MATCHUPS[r][c] : "MID";
      const sym = MU_SYMBOL[v];
      const cls =
        v === "OK" ? "cell-ok" : v === "BAD" ? "cell-bad" : "cell-mid";
      return `<td class="${cls}" title="${labelById(r)} vs ${labelById(c)}">${sym}</td>`;
    }).join("");
    return `<tr><th class="rowhead">${rowName}</th>${tds}</tr>`;
  }).join("");

  table.innerHTML = head + rows;
}

function compareMatchup() {
  const a = $("#muA").value;
  const b = $("#muB").value;
  const v = MATCHUPS[a] && MATCHUPS[a][b] ? MATCHUPS[a][b] : "MID";
  const sym = MU_SYMBOL[v];
  const cls = v === "OK" ? "cell-ok" : v === "BAD" ? "cell-bad" : "cell-mid";

  $("#muResult").innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <div>
        <div class="k">${labelById(a)} <span class="muted">vs</span> ${labelById(b)}</div>
        <div class="muted small">Heuristik: Stil-Tendenz, keine Garantie.</div>
      </div>
      <div style="font-size:22px;font-weight:950;" class="${cls}">${sym}</div>
    </div>
  `;
}

/* ---------- Boot ---------- */
function boot() {
  loadState();
  assignCardImages();

  // Tabs
  $$(".tab").forEach((t) => {
    t.addEventListener("click", () => {
      showPage(t.dataset.page);
      setTabAria();
    });
  });
  $$(".footlinks a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(a.dataset.page);
      setTabAria();
    });
  });

  // Home actions
  $("#ctaStart").addEventListener("click", () => {
    showPage("test");
    setTabAria();
    renderQuestion();
  });
  $("#ctaResume").addEventListener("click", () => {
    showPage("test");
    setTabAria();
    renderQuestion();
  });
  $("#ctaReset").addEventListener("click", () => {
    clearState();
    $("#resultsCard").style.display = "none";
    renderQuestion();
  });

  // Test actions
  $("#btnPrev").addEventListener("click", () => {
    state.i = findPrevIndex(state.i);
    saveState();
    renderQuestion();
  });
  $("#btnSkip").addEventListener("click", () => {
    state.i = findNextIndex(state.i);
    saveState();
    renderQuestion();
  });
  $("#btnToWiki").addEventListener("click", () => {
    showPage("wiki");
    setTabAria();
    renderWikiGrid();
  });

  $("#btnFinish").addEventListener("click", () => {
    const answered = Object.keys(state.answers).length;
    if (answered < QUESTIONS.length) {
      // allow finish, but signal missing
      // (keine Popup-Orgie; nur Hinweis)
    }
    const result = finalize();
    renderResults(result);
    showPage("test");
    setTabAria();
    $("#copyHint").textContent =
      answered < QUESTIONS.length
        ? `Hinweis: Du hast ${QUESTIONS.length - answered} Fragen übersprungen – Ergebnis ist weniger stabil.`
        : "";
  });

  $("#btnCopy").addEventListener("click", async () => {
    const r = state.lastResult;
    if (!r) return;
    const txt = buildShareText(r);
    try {
      await navigator.clipboard.writeText(txt);
      $("#copyHint").textContent = "Kopiert.";
    } catch (e) {
      $("#copyHint").textContent =
        "Kopieren nicht möglich – markiere den Text manuell.";
    }
  });

  $("#btnRetake").addEventListener("click", () => {
    clearState();
    $("#resultsCard").style.display = "none";
    renderQuestion();
  });

  $("#btnOpenArchetype").addEventListener("click", () => {
    const r = state.lastResult;
    if (!r) return;
    const id = r.variantId || r.primaryId;
    showPage("wiki");
    setTabAria();
    $("#wikiSearch").value = "";
    $("#wikiFilter").value = "all";
    renderWikiGrid();
    openWikiDetail(id);
  });

  $("#btnOpenMatchups").addEventListener("click", () => {
    showPage("matchups");
    setTabAria();
  });

  // Wiki
  $("#wikiSearch").addEventListener("input", renderWikiGrid);
  $("#wikiFilter").addEventListener("change", renderWikiGrid);
  $("#btnWikiBack").addEventListener("click", () => {
    closeWikiDetail();
    renderWikiGrid();
  });
  $("#btnWikiOpenMatchups").addEventListener("click", () => {
    showPage("matchups");
    setTabAria();
  });

  // Matchups
  renderMatchupSelects();
  renderMatchupMatrix();
  $("#btnCompare").addEventListener("click", compareMatchup);

  // Restore last view if finished
  if (state.lastResult) {
    $("#resultsCard").style.display = "block";
    renderResults(state.lastResult);
  }
  renderQuestion();
  renderWikiGrid();

  // If user has no progress, "Fortsetzen" is harmless but we can dim it
  const hasProgress = Object.keys(state.answers).length > 0;
  $("#ctaResume").style.opacity = hasProgress ? "1" : ".55";
}

boot();
