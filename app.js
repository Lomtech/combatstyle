/* =========================================================
   KAMPFSTIL · No-Gi BJJ · SGM-V2.3
   Engine:
   - 24 Fragen mit axes (6D) + sig (8 Signaturen)
   - Softmax-Konfidenz über gewichtete L2-Distanz
   - Primär via Zentroid-Distanz, Variante via Regelkaskade
   - Signatur-Overlay (Finish-Profil) auf Ergebniskarte
   ========================================================= */

const LS_KEY = "kampfstil_sgm_v23_state";

const AXES = ["TOP", "FORCE", "INIT", "RISK", "ULO", "TRANS"];
const AXIS_WEIGHTS = { TOP: 1.2, FORCE: 1.0, INIT: 1.1, RISK: 1.0, ULO: 1.3, TRANS: 1.1 };
const SIGS = ["FHL", "BACKLINE", "LEG", "WRESTLEUP", "PIN", "TEMPO", "CONVERT", "CHAOS"];

const SIG_LABELS = {
  FHL: { label: "Front Headlock", desc: "Snapdown / Guillotine / D'Arce", color: "#9e1f14" },
  BACKLINE: { label: "Backline", desc: "Rotation → Rücken → RNC", color: "#6e3b8a" },
  LEG: { label: "Leg Game", desc: "Ashi / Saddle / Heel Hook System", color: "#1a6640" },
  WRESTLEUP: { label: "Wrestle-Up", desc: "Guard → Single → Top Control", color: "#1a4a7a" },
  PIN: { label: "Pressure/Pin", desc: "Bodylock / Flattening / Dominanz", color: "#5e4828" },
  TEMPO: { label: "Timing/Tempo", desc: "Rhythmus-Kontrolle / Feint-Trigger", color: "#6b6b20" },
  CONVERT: { label: "Convert", desc: "Leg/Sweep → Top-Conversion", color: "#2a6b6b" },
  CHAOS: { label: "Chaos", desc: "Scramble / Struktur-Bruch", color: "#7a3a1a" },
};

/* ─── ARCHETYPEN ─────────────────────────────────────────── */
const ARCHETYPES = [
  {
    id: "PBP", tier: "primary", emoji: "💪", name: "Druckspieler",
    short: "Bodylock/Inside Passing → Pin-Kontrolle", focus: "Immobilisierung", dom: "FORCE",
    centroid: { TOP: 92, FORCE: 95, INIT: 70, RISK: 40, ULO: 20, TRANS: 15 },
    wiki: {
      entryBias: ["Clinch", "Underhooks", "Bodylock-Progression"],
      winPath: ["Inside Control → Pass", "Flattening/Pins", "Mount/Back → Finish"],
      vuln: ["Leg-Exposure bei offenen Schritten", "Rotation gegen hohen TRANS"],
      anti: ["Step-Passing ohne Leg-Awareness", "Pins lösen für 'mehr'", "Zu viel Rotation beim Pass"]
    }
  },
  {
    id: "WTC", tier: "primary", emoji: "🤼", name: "Top-Erzwinger",
    short: "Takedown → Top-Stabilisierung → Ride", focus: "Ortsbestimmung", dom: "TOP",
    centroid: { TOP: 95, FORCE: 75, INIT: 92, RISK: 20, ULO: 30, TRANS: 35 },
    wiki: {
      entryBias: ["Level-Change", "Shot-Chains", "Re-Attacks"],
      winPath: ["Takedown → Stabilisieren", "Ride/Mat-Returns", "Kontrolle über Punkte"],
      vuln: ["Front-Headlock-Konter", "Back-Takes bei gescheiterten Shots"],
      anti: ["Lineare Entries ohne Head-Position", "Zu tiefe Knie", "Transitions jagen statt re-pin"]
    }
  },
  {
    id: "FHF", tier: "primary", emoji: "🫴", name: "Nacken-Jäger",
    short: "Snapdown/Sprawl → FHL → Finish oder Back", focus: "Entry-Bestrafung", dom: "INIT",
    centroid: { TOP: 60, FORCE: 55, INIT: 85, RISK: 85, ULO: 40, TRANS: 65 },
    wiki: {
      entryBias: ["Snapdowns", "Sprawl", "Front-Headlock-Traps"],
      winPath: ["Guillotine/D'Arce/Anaconda", "FHL als Pass-Tool", "Back nach Reaktion"],
      vuln: ["Leg-Exposure bei Vorwärtsdruck", "Gute Hand-Fighting-Defenses"],
      anti: ["Guillotine ohne Control", "FHL jagen statt resetten", "Head-Arm verlieren und bleiben"]
    }
  },
  {
    id: "LIH", tier: "primary", emoji: "🦵", name: "Fußjäger",
    short: "Knee-Line → Inside Saddle → Heel Hook", focus: "Knee-Line", dom: "ULO/RISK",
    centroid: { TOP: 45, FORCE: 30, INIT: 70, RISK: 95, ULO: 100, TRANS: 75 },
    wiki: {
      entryBias: ["Ashi Entries", "Inside Sankaku/Saddle", "Knee-Line sichern"],
      winPath: ["Inside Heel Hook", "Knee-Line → Breaking Mechanics", "Leg → Sweep/Back"],
      vuln: ["Elite Leg-Defense", "Heavy Top-Pressure nach Entry"],
      anti: ["Statisches 50/50 ohne Progression", "Knee-Line verlieren", "Head-Position ignorieren"]
    }
  },
  {
    id: "DOGR", tier: "primary", emoji: "🕸", name: "Winkel-Spieler",
    short: "Retention → Angle → Leg Entry oder Wrestle-Up", focus: "Distanz + Winkel", dom: "ULO",
    centroid: { TOP: 20, FORCE: 25, INIT: 55, RISK: 65, ULO: 85, TRANS: 65 },
    wiki: {
      entryBias: ["Guard Pull", "Retention", "Distanzarbeit"],
      winPath: ["Angle → Leg Threat", "Off-Balance → Sweep", "Wrestle-Up als Option"],
      vuln: ["Bodylock-Pressure", "Direktes Flattening"],
      anti: ["Guard halten statt Winkel bauen", "Zu lang im Smash", "Tief kreuzen ohne Plan"]
    }
  },
  {
    id: "RBTS", tier: "primary", emoji: "🔄", name: "Rückenjäger",
    short: "Rotation → Turtle-Exposure → Back → RNC", focus: "Backline", dom: "TRANS",
    centroid: { TOP: 60, FORCE: 40, INIT: 65, RISK: 65, ULO: 45, TRANS: 95 },
    wiki: {
      entryBias: ["Rotation", "Scramble", "Turtle-Traps"],
      winPath: ["Seatbelt früh", "Hooks sauber", "Backline > Sub-Trade"],
      vuln: ["Statische Pin-Spieler", "Base-Loss in Legs"],
      anti: ["Back-Chase ohne Base", "Seatbelt sloppy", "Scramble ohne Trigger"]
    }
  },
  {
    id: "PPF", tier: "variant", emoji: "🎯", name: "Geduldiger Killer",
    short: "Position first → isolieren → Submission ohne Risiko", focus: "Sicherheit", dom: "Low-RISK",
    centroid: { TOP: 85, FORCE: 75, INIT: 60, RISK: 30, ULO: 35, TRANS: 30 },
    wiki: {
      entryBias: ["Progressiver Positionsaufbau"],
      winPath: ["Stabilisieren → isolieren", "Submission erst nach Kontrolle"],
      vuln: ["Zeitdruck", "sehr mobile Gegner"],
      anti: ["Rushing unter Druck", "Submission auf Kosten der Position"]
    }
  },
  {
    id: "DN", tier: "variant", emoji: "🛡", name: "Neutralisierer",
    short: "Neutralisieren → resetten → Fehler abwarten", focus: "Überleben", dom: "Low-INIT/Low-RISK",
    centroid: { TOP: 55, FORCE: 55, INIT: 25, RISK: 25, ULO: 35, TRANS: 20 },
    wiki: {
      entryBias: ["Reaktiv, kein aktiver Entry"],
      winPath: ["Nie exponieren", "Konter auf Fehler"],
      vuln: ["Aggressive Punktesysteme", "Dauer-Initiativsysteme"],
      anti: ["Zu passiv = Punkteverlust", "Chancen nicht nutzen"]
    }
  },
  {
    id: "TSO", tier: "variant", emoji: "⚡", name: "Chaos-Spieler",
    short: "Chaos → Strukturbruch → opportunistischer Finish", focus: "Chaos", dom: "High-TRANS",
    centroid: { TOP: 50, FORCE: 40, INIT: 45, RISK: 70, ULO: 50, TRANS: 98 },
    wiki: {
      entryBias: ["Instabilität aktiv erzeugen"],
      winPath: ["Scramble gewinnen", "Chaos → Kontrolle überführen"],
      vuln: ["Strukturierte Pressure-Systeme"],
      anti: ["Chaos ohne Exit-Plan", "Position nicht sichern"]
    }
  },
  {
    id: "WUGP", tier: "variant", emoji: "🔝", name: "Guard-Wrestler",
    short: "Guard → Single Build → Top Control", focus: "Guard → Top", dom: "High-INIT + TOP",
    centroid: { TOP: 60, FORCE: 50, INIT: 80, RISK: 50, ULO: 65, TRANS: 65 },
    wiki: {
      entryBias: ["Underhook-Build", "Sit-Up Singles"],
      winPath: ["Single aus Guard → Top", "Stabilisieren → Finish"],
      vuln: ["Front Headlock bei schlechtem Head-Positioning"],
      anti: ["Head exponieren beim Single-Build", "Wrestle-Up ohne Base"]
    }
  },
  {
    id: "LTC", tier: "variant", emoji: "🔀", name: "Sweep-Jäger",
    short: "Leg Threat → Sweep → Top → Finish", focus: "Leg → Position", dom: "ULO + TOP",
    centroid: { TOP: 70, FORCE: 55, INIT: 65, RISK: 75, ULO: 90, TRANS: 65 },
    wiki: {
      entryBias: ["Leg Threat als Entry-Mittel"],
      winPath: ["Leg Entry → Sweep", "Top → Finish"],
      vuln: ["Sehr mobile Gegner", "Direkte Counter-Entries"],
      anti: ["Leg-Lock und Top gleichzeitig", "Knee-Line verlieren ohne Plan B"]
    }
  },
  {
    id: "TC", tier: "variant", emoji: "⏱", name: "Rhythmus-Brecher",
    short: "Rhythmus brechen → Trigger → Positional Edge", focus: "Rhythmus", dom: "INIT",
    centroid: { TOP: 55, FORCE: 45, INIT: 90, RISK: 55, ULO: 50, TRANS: 75 },
    wiki: {
      entryBias: ["Timing-Dominanz", "Rhythmuswechsel"],
      winPath: ["Fehler provozieren → Entry", "Initiative von Beginn"],
      vuln: ["Power-Pressure", "statische Bodylock-Systeme"],
      anti: ["Feints ohne Follow-Through", "Tempo verlieren"]
    }
  },
];


/* ─── 24 FRAGEN (axes + sig) ─────────────────────────────── */
const QUESTIONS = [
  {
    id: 1, phase: "Pre-Fight",
    q: "Du betrittst die Matte. Dein innerer Plan?",
    A: { t: "Früh Druck etablieren.", d: { FORCE: +2, TOP: +1 }, s: { PIN: +1 } },
    B: { t: "Distanz und Timing lesen.", d: { INIT: +1, TRANS: +1 }, s: { TEMPO: +2 } },
    C: { t: "Seinen ersten Fehler bestrafen.", d: { INIT: +2 }, s: { FHL: +1, BACKLINE: +1 } },
    D: { t: "Früh in mein Leg-/Guard-System.", d: { ULO: +2, TOP: -1 }, s: { LEG: +2 } },
  },
  {
    id: 2, phase: "Neutral",
    q: "Erster Handfight. Dein Default?",
    A: { t: "Underhooks & Inside Position.", d: { FORCE: +2, TOP: +1 }, s: { PIN: +1 } },
    B: { t: "Snapdown & Kopfkontrolle.", d: { INIT: +2 }, s: { FHL: +3 } },
    C: { t: "Level Change / Shot.", d: { TOP: +2, INIT: +1 }, s: { WRESTLEUP: +1 } },
    D: { t: "Guard Pull in Struktur.", d: { TOP: -2, ULO: +1 }, s: { LEG: +1 } },
  },
  {
    id: 3, phase: "Takedown",
    q: "Gegner schießt auf deine Beine.",
    A: { t: "Sprawl → Front Headlock.", d: { INIT: +2 }, s: { FHL: +3 } },
    B: { t: "Sprawl → Rotation zum Rücken.", d: { TRANS: +2 }, s: { BACKLINE: +3 } },
    C: { t: "Scramble beschleunigen.", d: { TRANS: +2, RISK: +1 }, s: { CHAOS: +3 } },
    D: { t: "Pull Guard kontrolliert.", d: { TOP: -1, ULO: +1 }, s: { LEG: +1 } },
  },
  {
    id: 4, phase: "Clinch",
    q: "Du hast Körperkontakt.",
    A: { t: "Bodylock & Hüftkontrolle.", d: { FORCE: +3, TOP: +1 }, s: { PIN: +2 } },
    B: { t: "Kopf ziehen → Snapdown.", d: { INIT: +2 }, s: { FHL: +2 } },
    C: { t: "Angle & Knieposition lösen.", d: { TRANS: +1 }, s: { TEMPO: +1 } },
    D: { t: "Single-Build aus Kontakt.", d: { TOP: +2 }, s: { WRESTLEUP: +2 } },
  },
  {
    id: 5, phase: "Top",
    q: "Du landest oben in Half Guard.",
    A: { t: "Crossface & flatten.", d: { FORCE: +3 }, s: { PIN: +3 } },
    B: { t: "Knee Cut mit Tempo.", d: { INIT: +2 }, s: { TEMPO: +1 } },
    C: { t: "Backstep ins Leg-System.", d: { ULO: +2, RISK: +1 }, s: { LEG: +2 } },
    D: { t: "Stabilisieren, nichts forcieren.", d: { RISK: -2 }, s: {} },
  },
  {
    id: 6, phase: "Guard",
    q: "Du bist unten.",
    A: { t: "Angle & Distanz sichern.", d: { ULO: +2, FORCE: -1 }, s: { LEG: +1 } },
    B: { t: "Underhook → Wrestle-Up.", d: { TOP: +2 }, s: { WRESTLEUP: +3 } },
    C: { t: "Leg Entry sofort.", d: { ULO: +3, RISK: +2 }, s: { LEG: +3 } },
    D: { t: "Retention & Geduld.", d: { RISK: -1 }, s: {} },
  },
  {
    id: 7, phase: "Pass",
    q: "Du stehst vor offener Guard.",
    A: { t: "Bodylock Pressure.", d: { FORCE: +2 }, s: { PIN: +2 } },
    B: { t: "Distance & Leg Drag.", d: { INIT: +1 }, s: { TEMPO: +1 } },
    C: { t: "Leg Pummel → Entry.", d: { ULO: +2, RISK: +1 }, s: { LEG: +2 } },
    D: { t: "Rhythmus brechen.", d: { INIT: +2 }, s: { TEMPO: +2 } },
  },
  {
    id: 8, phase: "Side Control",
    q: "Submission öffnet sich.",
    A: { t: "Position sichern.", d: { RISK: -2 }, s: { PIN: +1 } },
    B: { t: "Direkt attackieren.", d: { RISK: +2 }, s: {} },
    C: { t: "Back Exposure erzwingen.", d: { TRANS: +2 }, s: { BACKLINE: +2 } },
    D: { t: "Knee-on-Belly Druck.", d: { FORCE: +1 }, s: { PIN: +1 } },
  },
  {
    id: 9, phase: "Mount",
    q: "Du hast Mount.",
    A: { t: "Isolieren → Finish sicher.", d: { RISK: -1 }, s: {} },
    B: { t: "Armbar-Chain sofort.", d: { RISK: +2 }, s: {} },
    C: { t: "Backtake statt Mount halten.", d: { TRANS: +2 }, s: { BACKLINE: +2 } },
    D: { t: "High Risk Submission-Jagd.", d: { RISK: +3 }, s: {} },
  },
  {
    id: 10, phase: "Leg",
    q: "Du landest in Ashi.",
    A: { t: "Heel Hook jagen.", d: { RISK: +3, ULO: +2 }, s: { LEG: +3 } },
    B: { t: "Sweep vorbereiten.", d: { TOP: +2 }, s: { CONVERT: +3 } },
    C: { t: "Position sichern.", d: { RISK: -1 }, s: {} },
    D: { t: "Konfiguration wechseln.", d: { TRANS: +1 }, s: { LEG: +1 } },
  },
  {
    id: 11, phase: "Turtle",
    q: "Gegner rollt in Turtle.",
    A: { t: "Hooks & Harness.", d: { TRANS: +2 }, s: { BACKLINE: +3 } },
    B: { t: "D'Arce / Head-Arm.", d: { INIT: +1 }, s: { FHL: +2 } },
    C: { t: "Rotation forcieren.", d: { TRANS: +3 }, s: { CHAOS: +1 } },
    D: { t: "Reset & Top sichern.", d: { RISK: -1 }, s: {} },
  },
  {
    id: 12, phase: "Scramble",
    q: "Position bricht auf.",
    A: { t: "Stabilisieren.", d: { TRANS: -1 }, s: {} },
    B: { t: "Beschleunigen.", d: { TRANS: +3, RISK: +1 }, s: { CHAOS: +3 } },
    C: { t: "Rücken suchen.", d: { TRANS: +2 }, s: { BACKLINE: +2 } },
    D: { t: "Wrestle-Up.", d: { TOP: +2 }, s: { WRESTLEUP: +2 } },
  },
  {
    id: 13, phase: "Mid-Fight",
    q: "Kurze Trennung entsteht (kein Grip, neutral). Dein nächster Schritt?",
    A: { t: "Sofort wieder in Clinch/Underhooks.", d: { FORCE: +2, TOP: +1 }, s: { PIN: +1 } },
    B: { t: "Rhythmuswechsel/Feints für Trigger.", d: { INIT: +2 }, s: { TEMPO: +3 } },
    C: { t: "Snapdown/Head Control als Konter.", d: { INIT: +2 }, s: { FHL: +2 } },
    D: { t: "Guard ziehen und neu strukturieren.", d: { TOP: -2, ULO: +1 }, s: { LEG: +1 } },
  },
  {
    id: 14, phase: "Clinch",
    q: "Gegner gewinnt Head-Position. Was tust du?",
    A: { t: "Inside Position zurückholen.", d: { FORCE: +2, TOP: +1 }, s: { PIN: +1 } },
    B: { t: "Snapdown / Kopf runterziehen.", d: { INIT: +2 }, s: { FHL: +2 } },
    C: { t: "Scramble/Angle, Struktur brechen.", d: { TRANS: +2, RISK: +1 }, s: { CHAOS: +2 } },
    D: { t: "Disengage, sauber neu ansetzen.", d: { RISK: -1, INIT: -1 }, s: {} },
  },
  {
    id: 15, phase: "Pass-Crisis",
    q: "Fast durch den Pass. Gegner dreht: Rücken-Zugang ODER exponiertes Bein?",
    A: { t: "Rücken nehmen – Back Control.", d: { TRANS: +2, RISK: +1 }, s: { BACKLINE: +3 } },
    B: { t: "Top stabilisieren, keine Wilden.", d: { TOP: +2, RISK: -1 }, s: { PIN: +1 } },
    C: { t: "Bein nehmen – Leg-Entanglement.", d: { ULO: +2, RISK: +2 }, s: { LEG: +3 } },
    D: { t: "Reset – sauber neu aufbauen.", d: { RISK: -2 }, s: {} },
  },
  {
    id: 16, phase: "Defense",
    q: "Du wirst in Turtle/Quad-Pod gedrückt. Dein Escape-Reflex?",
    A: { t: "Granby/Scramble – raus in Transition.", d: { TRANS: +2, RISK: +1 }, s: { CHAOS: +2 } },
    B: { t: "Zurück in Guard/Retention fighten.", d: { TOP: -1, ULO: +1 }, s: {} },
    C: { t: "Aufstehen / Wrestle-Up Neutral.", d: { TOP: +2 }, s: { WRESTLEUP: +2 } },
    D: { t: "Kompakt halten, Backtake verhindern.", d: { RISK: -2, INIT: -1 }, s: {} },
  },
  {
    id: 17, phase: "Front Headlock",
    q: "Gegner schießt sloppy – du bekommst kurz Front Headlock. Dein Default?",
    A: { t: "Direkt auf Guillotine/D'Arce.", d: { RISK: +2, INIT: +1 }, s: { FHL: +3 } },
    B: { t: "FHL als Pass-Tool → Top sichern.", d: { TOP: +2, FORCE: +1 }, s: { FHL: +1, PIN: +1 } },
    C: { t: "Rotation zum Rücken (Backtake).", d: { TRANS: +2 }, s: { BACKLINE: +3 } },
    D: { t: "Loslassen, kein Forced Attempt.", d: { RISK: -2 }, s: {} },
  },
  {
    id: 18, phase: "Leg",
    q: "Inside Saddle: Gegner versteckt die Ferse perfekt.",
    A: { t: "Mechanik erzwingen, drauf bleiben.", d: { RISK: +3, ULO: +1 }, s: { LEG: +3 } },
    B: { t: "Sweep / Top-Conversion.", d: { TOP: +2 }, s: { CONVERT: +3 } },
    C: { t: "Konfiguration wechseln (Outside).", d: { TRANS: +1, ULO: +1 }, s: { LEG: +2 } },
    D: { t: "Abbrechen, Position neu aufbauen.", d: { RISK: -2 }, s: {} },
  },
  {
    id: 19, phase: "Back",
    q: "Du hast Seatbelt, aber die Zeit läuft. Dein Back-Plan?",
    A: { t: "RNC-Finish erzwingen.", d: { RISK: +2, TRANS: +1 }, s: { BACKLINE: +3 } },
    B: { t: "Back als Kontrollraum halten.", d: { RISK: -1, TOP: +1 }, s: {} },
    C: { t: "Body Triangle / Druck erhöhen.", d: { FORCE: +2 }, s: { PIN: +1, BACKLINE: +1 } },
    D: { t: "Leg-Trap / Bodylock-Transition.", d: { ULO: +1, TRANS: +1 }, s: { LEG: +1 } },
  },
  {
    id: 20, phase: "Score-Lead",
    q: "Du führst knapp. Game-Plan für die nächsten 90 Sekunden?",
    A: { t: "Pressure/Pin – ich töte den Raum.", d: { FORCE: +2, TOP: +1, RISK: -1 }, s: { PIN: +2 } },
    B: { t: "Tempo kontrollieren, nichts schenken.", d: { INIT: +1, RISK: -1 }, s: { TEMPO: +2 } },
    C: { t: "Aktiv den Finish-Pfad suchen.", d: { RISK: +2 }, s: {} },
    D: { t: "Scrambles provozieren.", d: { TRANS: +2, RISK: +1 }, s: { CHAOS: +2 } },
  },
  {
    id: 21, phase: "Score-Down",
    q: "Du liegst knapp zurück. Was forcierst du?",
    A: { t: "Takedown / Top erzwingen.", d: { TOP: +3, INIT: +1 }, s: { WRESTLEUP: +1 } },
    B: { t: "Front Headlock Trap.", d: { INIT: +2 }, s: { FHL: +3 } },
    C: { t: "Leg Entry für schnellen Finish.", d: { ULO: +3, RISK: +2 }, s: { LEG: +3, CONVERT: +1 } },
    D: { t: "Chaos/Scramble, damit etwas aufbricht.", d: { TRANS: +3, RISK: +1 }, s: { CHAOS: +3 } },
  },
  {
    id: 22, phase: "Final Minute",
    q: "Letzte Minute. Du bekommst eine halbe Chance. Was ist wichtiger?",
    A: { t: "Position sichern – nicht verlieren.", d: { RISK: -3 }, s: {} },
    B: { t: "Finish-first – alles oder nichts.", d: { RISK: +3 }, s: {} },
    C: { t: "Backtake/Transition – bestes Fenster.", d: { TRANS: +2, RISK: +1 }, s: { BACKLINE: +2 } },
    D: { t: "Wrestle-Up für klaren Score.", d: { TOP: +2, INIT: +1 }, s: { WRESTLEUP: +2 } },
  },
  {
    id: 23, phase: "Post-Fight",
    q: "Wenn du in Turnieren gewinnst, kommt es über …",
    A: { t: "Kontrolle / Pressure / Dominanz.", d: { FORCE: +2, TOP: +1 }, s: { PIN: +2 } },
    B: { t: "Front Headlock / Guillotine-Lane.", d: { INIT: +2 }, s: { FHL: +3 } },
    C: { t: "Leg-System (Heel Hooks / Knee-Line).", d: { ULO: +3, RISK: +2 }, s: { LEG: +3 } },
    D: { t: "Backtakes / Transitions / Rotation.", d: { TRANS: +3 }, s: { BACKLINE: +2, CHAOS: +1 } },
  },
  {
    id: 24, phase: "Post-Fight",
    q: "Was macht dir gegen gute Gegner am meisten Probleme?",
    A: { t: "Heavy Pressure / Flattening.", d: { FORCE: -1 }, s: {} },
    B: { t: "Explosive Scrambler & Backtakes.", d: { TRANS: -1 }, s: {} },
    C: { t: "Leg-Lock-Spezialisten.", d: { ULO: -1 }, s: {} },
    D: { t: "Rhythmuswechsel / Timing-Spieler.", d: { INIT: -1 }, s: {} },
  },
];


/* ─── MATCHUPS ───────────────────────────────────────────── */
const ARCH_ORDER = ["PBP", "WTC", "PPF", "DN", "FHF", "RBTS", "TSO", "DOGR", "WUGP", "LIH", "LTC", "TC"];
const MU_SYMBOL = { OK: "✓", MID: "~", BAD: "✗" };
const MATCHUPS = {
  PBP: { PBP: "MID", WTC: "OK", PPF: "MID", DN: "OK", FHF: "BAD", RBTS: "BAD", TSO: "MID", DOGR: "OK", WUGP: "MID", LIH: "BAD", LTC: "BAD", TC: "MID" },
  WTC: { PBP: "MID", WTC: "MID", PPF: "MID", DN: "OK", FHF: "BAD", RBTS: "BAD", TSO: "MID", DOGR: "OK", WUGP: "MID", LIH: "BAD", LTC: "BAD", TC: "BAD" },
  PPF: { PBP: "MID", WTC: "MID", PPF: "MID", DN: "OK", FHF: "MID", RBTS: "BAD", TSO: "OK", DOGR: "OK", WUGP: "OK", LIH: "BAD", LTC: "BAD", TC: "MID" },
  DN: { PBP: "BAD", WTC: "BAD", PPF: "BAD", DN: "MID", FHF: "BAD", RBTS: "MID", TSO: "MID", DOGR: "MID", WUGP: "BAD", LIH: "MID", LTC: "BAD", TC: "BAD" },
  FHF: { PBP: "OK", WTC: "OK", PPF: "MID", DN: "OK", FHF: "MID", RBTS: "MID", TSO: "MID", DOGR: "MID", WUGP: "OK", LIH: "BAD", LTC: "MID", TC: "MID" },
  RBTS: { PBP: "OK", WTC: "OK", PPF: "OK", DN: "MID", FHF: "MID", RBTS: "MID", TSO: "BAD", DOGR: "MID", WUGP: "MID", LIH: "MID", LTC: "BAD", TC: "MID" },
  TSO: { PBP: "BAD", WTC: "MID", PPF: "BAD", DN: "MID", FHF: "MID", RBTS: "OK", TSO: "MID", DOGR: "MID", WUGP: "MID", LIH: "MID", LTC: "MID", TC: "MID" },
  DOGR: { PBP: "BAD", WTC: "BAD", PPF: "BAD", DN: "MID", FHF: "MID", RBTS: "MID", TSO: "MID", DOGR: "MID", WUGP: "OK", LIH: "BAD", LTC: "MID", TC: "MID" },
  WUGP: { PBP: "BAD", WTC: "MID", PPF: "BAD", DN: "OK", FHF: "BAD", RBTS: "MID", TSO: "MID", DOGR: "BAD", WUGP: "MID", LIH: "BAD", LTC: "MID", TC: "BAD" },
  LIH: { PBP: "OK", WTC: "OK", PPF: "OK", DN: "MID", FHF: "OK", RBTS: "MID", TSO: "MID", DOGR: "OK", WUGP: "OK", LIH: "MID", LTC: "MID", TC: "MID" },
  LTC: { PBP: "OK", WTC: "OK", PPF: "OK", DN: "OK", FHF: "MID", RBTS: "OK", TSO: "MID", DOGR: "MID", WUGP: "OK", LIH: "MID", LTC: "MID", TC: "MID" },
  TC: { PBP: "BAD", WTC: "OK", PPF: "MID", DN: "OK", FHF: "MID", RBTS: "MID", TSO: "MID", DOGR: "MID", WUGP: "OK", LIH: "MID", LTC: "MID", TC: "MID" },
};

const CARD_ORDER = ["PBP", "WTC", "PPF", "DN", "FHF", "RBTS", "TSO", "DOGR", "WUGP", "LIH", "LTC", "TC"];
function pad2(n) { return String(n).padStart(2, "0"); }
function assignCardImages() { CARD_ORDER.forEach((id, i) => { const a = archetypeById(id); if (a) a.img = `./images/archetyp_${pad2(i + 1)}.jpg`; }); }

/* ─── STATE ──────────────────────────────────────────────── */
let state = { i: 0, answers: {}, finished: false, lastResult: null };
function loadState() { try { const r = localStorage.getItem(LS_KEY); if (r) state = { ...state, ...JSON.parse(r) }; } catch (e) { } }
function saveState() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { } }
function clearState() { state = { i: 0, answers: {}, finished: false, lastResult: null }; try { localStorage.removeItem(LS_KEY); } catch (e) { } }

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const archetypeById = id => ARCHETYPES.find(a => a.id === id);
const labelById = id => { const a = archetypeById(id); return a ? `${a.emoji} ${a.name}` : id; };

/* ═══ SCORING ENGINE ════════════════════════════════════════ */

function computeAxes() {
  const STEP = 3.0;
  let ax = { TOP: 50, FORCE: 50, INIT: 50, RISK: 50, ULO: 50, TRANS: 50 };
  for (let qi = 0; qi < QUESTIONS.length; qi++) {
    const pick = state.answers[qi]; if (!pick) continue;
    const d = QUESTIONS[qi][pick].d;
    for (const k of AXES) ax[k] += (d[k] || 0) * STEP;
  }
  for (const k of AXES) ax[k] = clamp(Math.round(ax[k]), 0, 100);
  return ax;
}

function computeSigs() {
  let sig = {}; for (const s of SIGS) sig[s] = 0;
  for (let qi = 0; qi < QUESTIONS.length; qi++) {
    const pick = state.answers[qi]; if (!pick) continue;
    const s = QUESTIONS[qi][pick].s || {};
    for (const k of Object.keys(s)) sig[k] = (sig[k] || 0) + s[k];
  }
  return sig;
}

function weightedL2(ax, centroid) {
  let s = 0; for (const k of AXES) { const d = ax[k] - centroid[k]; s += AXIS_WEIGHTS[k] * d * d; } return Math.sqrt(s);
}

function softmax(vals, temp = 40) {
  const neg = vals.map(v => -v / temp); const m = Math.max(...neg);
  const exp = neg.map(v => Math.exp(v - m)); const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map(v => v / sum);
}

function pickPrimary(ax) {
  const prim = ARCHETYPES.filter(a => a.tier === "primary");
  const dists = prim.map(a => weightedL2(ax, a.centroid));
  const probs = softmax(dists);
  const best = dists.indexOf(Math.min(...dists));
  return {
    primary: prim[best], confidence: probs[best],
    allScores: prim.map((a, i) => ({ id: a.id, prob: probs[i], dist: dists[i] })).sort((a, b) => b.prob - a.prob)
  };
}

function pickVariant(ax) {
  const { TOP, FORCE, INIT, RISK, TRANS, ULO } = ax;
  if (INIT <= 32 && RISK <= 32) return archetypeById("DN");
  if (TRANS >= 92 && RISK >= 55) return archetypeById("TSO");
  if (RISK <= 34 && (TOP >= 70 || FORCE >= 70)) return archetypeById("PPF");
  if (INIT >= 78 && TOP >= 55 && ULO >= 45) return archetypeById("WUGP");
  if (ULO >= 78 && TOP >= 62 && RISK >= 55 && RISK <= 88) return archetypeById("LTC");
  if (INIT >= 88 && TRANS >= 62) return archetypeById("TC");
  return null;
}

function topSigs(sig, n = 3) {
  return Object.entries(sig).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function finalize() {
  const axes = computeAxes(), sigs = computeSigs();
  const { primary, confidence, allScores } = pickPrimary(axes);
  const variant = pickVariant(axes);
  const result = { axes, sigs, primaryId: primary.id, variantId: variant?.id ?? null, confidence, allScores, timestamp: Date.now() };
  state.finished = true; state.lastResult = result; saveState(); return result;
}

/* ═══ RESULT CARD ════════════════════════════════════════════ */

function buildResultCard(result) {
  const primary = archetypeById(result.primaryId);
  const variant = result.variantId ? archetypeById(result.variantId) : null;
  const ax = result.axes, sigs = result.sigs, conf = Math.round(result.confidence * 100);
  const art = primary.img ?? "./images/archetyp_01.jpg";

  const bars = AXES.map(k => `
    <div class="rtcg-bar-row">
      <div class="rtcg-bar-label">${k}</div>
      <div class="rtcg-bar-track"><div class="rtcg-bar-fill" style="width:${ax[k]}%"></div></div>
      <div class="rtcg-bar-val">${ax[k]}</div>
    </div>`).join("");

  const topS = topSigs(sigs, 3);
  const sigHTML = topS.length ? `
    <div class="rtcg-sigs">
      <div class="rtcg-sigs-label">Finish-Signatur</div>
      ${topS.map(([k, v]) => {
    const info = SIG_LABELS[k] || { label: k, desc: "", color: "#555" };
    const pct = Math.min(100, v * 8);
    return `<div class="rtcg-sig-row">
          <div class="rtcg-sig-name" style="color:${info.color}">${info.label}</div>
          <div class="rtcg-sig-desc">${info.desc}</div>
          <div class="rtcg-sig-bar-wrap">
            <div class="rtcg-sig-bar" style="width:${pct}%;background:${info.color}"></div>
          </div>
        </div>`;
  }).join("")}
    </div>`: "";

  const varBlock = variant ? `
    <div class="rtcg-variant">
      <div class="rtcg-variant-label">Ausprägung</div>
      <div class="rtcg-variant-name">${variant.emoji} ${variant.name}</div>
      <div class="rtcg-variant-short">${variant.short}</div>
    </div>`: "";

  return `
    <div class="rtcg-stripe"></div>
    <div class="rtcg-head">
      <div class="rtcg-name">${primary.emoji} ${primary.name}</div>
      <div class="rtcg-id">${primary.id}</div>
    </div>
    <div class="rtcg-art">
      <img src="${art}" alt="${primary.name}" loading="eager"
           onerror="this.parentElement.innerHTML='<div class=rtcg-art-placeholder><svg width=80 height=75 viewBox=\'0 0 28 26\' fill=none><polygon points=\'14,2 26,24 2,24\' stroke=\'rgba(19,19,16,.2)\' stroke-width=\'2\' fill=none/></svg></div>'"/>
      <div class="rtcg-fade"></div>
      <div class="rtcg-overlay">
        <span class="rtcg-chip">Fokus: ${primary.focus}</span>
        <span class="rtcg-chip">Dom: ${primary.dom}</span>
      </div>
    </div>
    <div class="rtcg-body">
      <div class="rtcg-short">${primary.short}</div>
      <div class="rtcg-bars">${bars}</div>
      ${sigHTML}
      ${varBlock}
    </div>
    <div class="rtcg-foot">
      <div class="rtcg-conf">Konfidenz <span class="rtcg-conf-val">${conf}%</span></div>
      <div class="rtcg-tier">${primary.tier === "primary" ? "Primär-Archetyp" : "Ausprägung"}</div>
    </div>`;
}

function buildAxesRadar(axes) {
  return AXES.map(k => `
    <div class="ax-row">
      <div class="ax-row-label">${k}</div>
      <div class="ax-row-track"><div class="ax-row-fill" style="width:${axes[k]}%"></div></div>
      <div class="ax-row-val">${axes[k]}</div>
    </div>`).join("");
}

function buildShareText(result) {
  const p = archetypeById(result.primaryId), v = result.variantId ? archetypeById(result.variantId) : null;
  const ax = result.axes, ts = topSigs(result.sigs, 3).map(([k]) => SIG_LABELS[k]?.label || k).join(", ");
  return [`KAMPFSTIL · No-Gi BJJ (SGM-V2.3)`,
    v ? `Profil: ${p.emoji} ${p.name} + ${v.emoji} ${v.name}` : `Profil: ${p.emoji} ${p.name}`,
    `x = (TOP ${ax.TOP}, FORCE ${ax.FORCE}, INIT ${ax.INIT}, RISK ${ax.RISK}, ULO ${ax.ULO}, TRANS ${ax.TRANS})`,
    ts ? `Finish-Signatur: ${ts}` : "",
    `Konfidenz: ${Math.round(result.confidence * 100)}%`].filter(Boolean).join("\n");
}

function renderResults(result) {
  $("#resultsCard").style.display = "block";
  $("#resultTCG").innerHTML = buildResultCard(result);
  $("#axesRadar").innerHTML = buildAxesRadar(result.axes);
  $("#axisChips").innerHTML = AXES.map(k => `<span class="chip"><strong>${k}</strong>&nbsp;${result.axes[k]}</span>`).join("");
  requestAnimationFrame(() => {
    document.querySelectorAll(".rtcg-bar-fill,.rtcg-sig-bar,.ax-row-fill").forEach(el => {
      const w = el.style.width; el.style.width = "0%"; requestAnimationFrame(() => { el.style.width = w; });
    });
  });
}

/* ═══ QUESTION RENDER ════════════════════════════════════════ */

function renderQuestion() {
  const qi = state.i, q = QUESTIONS[qi]; if (!q) return;
  const answered = Object.keys(state.answers).length;
  $("#progressText").textContent = `${answered} / ${QUESTIONS.length}`;
  $("#progressBar").style.width = `${Math.round(answered / QUESTIONS.length * 100)}%`;
  const pick = state.answers[qi] || null;
  $("#qWrap").innerHTML = `
    <div class="qnum">Frage ${q.id} · ${q.phase}</div>
    <div class="qtitle">${q.q}</div>
    <div class="qblock">
      ${["A", "B", "C", "D"].map(L => `
        <div class="opt ${pick === L ? "selected" : ""}" data-pick="${L}" role="button" tabindex="0">
          <div class="letter">${L}</div>
          <div class="txt">${q[L].t}</div>
        </div>`).join("")}
    </div>`;
  $$(".opt").forEach(el => {
    el.addEventListener("click", () => chooseAnswer(el.dataset.pick));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); chooseAnswer(el.dataset.pick); } });
  });
  $("#btnPrev").disabled = qi === 0;
}

function chooseAnswer(letter) {
  state.answers[state.i] = letter; saveState();
  state.i = findNextIndex(state.i); saveState(); renderQuestion();
}
function findNextIndex(from) {
  for (let j = from + 1; j < QUESTIONS.length; j++)if (!state.answers[j]) return j;
  for (let j = 0; j < QUESTIONS.length; j++)if (!state.answers[j]) return j;
  return Math.min(from + 1, QUESTIONS.length - 1);
}
function findPrevIndex(from) { return Math.max(0, from - 1); }

/* ═══ WIKI ═══════════════════════════════════════════════════ */

function renderWikiGrid() {
  const search = ($("#wikiSearch").value || "").trim().toLowerCase();
  const filter = $("#wikiFilter").value;
  const items = ARCHETYPES
    .filter(a => filter === "primary" ? a.tier === "primary" : filter === "variant" ? a.tier === "variant" : true)
    .filter(a => !search || `${a.name} ${a.short} ${a.focus} ${a.dom} ${a.id}`.toLowerCase().includes(search));
  $("#wikiGrid").innerHTML = items.map(a => {
    const art = a.img ?? "./images/archetyp_01.jpg";
    const stats = AXES.map(k => `<div class="stat"><div class="statk">${k}</div><div class="statv">${a.centroid[k] ?? '—'}</div></div>`).join("");
    return `<article class="tcg" data-id="${a.id}" role="button" tabindex="0">
      <div class="tcgframe">
        <div class="tcghead"><div class="tcgname">${a.emoji} ${a.name}</div><div class="tcgtier">${a.tier === "primary" ? "PRIMÄR" : "AUSPRÄGUNG"}</div></div>
        <div class="tcgart"><img src="${art}" alt="${a.name}" loading="lazy"/>
          <div class="tcgfade"></div>
          <div class="tcgmeta"><span class="chipmini">Fokus: ${a.focus}</span><span class="chipmini">Dom: ${a.dom}</span></div>
        </div>
        <div class="tcgbody"><div class="tcgshort">${a.short}</div><div class="statsgrid">${stats}</div></div>
      </div></article>`;
  }).join("");
  $$(".tcg").forEach(el => {
    el.addEventListener("click", () => openWikiDetail(el.dataset.id));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openWikiDetail(el.dataset.id); } });
  });
}

function openWikiDetail(id) {
  const a = archetypeById(id); if (!a) return;
  const art = a.img ?? "./images/archetyp_01.jpg";
  const c = a.centroid;
  $("#wikiDetail").style.display = "block"; $("#wikiListCard").style.display = "none";
  $("#detailTitle").innerHTML = `${a.emoji} ${a.name} <span class="muted small">(${a.tier === "primary" ? "Primär" : "Ausprägung"} · ${a.id})</span>`;
  $("#detailBody").innerHTML = `
    <div class="detailart"><img src="${art}" alt="${a.name}"/></div>
    <div class="detailbox"><h3>Beschreibung</h3><p>${a.short}</p></div>
    <div class="detailbox"><h3>Fokus & Dominanz</h3><p><strong>Fokus:</strong> ${a.focus}<br><strong>Dominant:</strong> ${a.dom}</p></div>
    <div class="detailbox"><h3>SGM-Zentroid</h3>
      <div class="detail-bars">${AXES.map(k => `
        <div class="detail-bar-row">
          <div class="detail-bar-label">${k}</div>
          <div class="detail-bar-track"><div class="detail-bar-fill" style="width:${c[k] ?? 0}%"></div></div>
          <div class="detail-bar-val">${c[k] ?? '—'}</div>
        </div>`).join('')}</div>
    </div>
    <div class="detailbox"><h3>Entry-Bias</h3><ul>${(a.wiki.entryBias || []).map(x => `<li>${x}</li>`).join("")}</ul></div>
    <div class="detailbox"><h3>Primary Win Path</h3><ul>${(a.wiki.winPath || []).map(x => `<li>${x}</li>`).join("")}</ul></div>
    <div class="detailbox"><h3>Vulnerabilities</h3><ul>${(a.wiki.vuln || []).map(x => `<li>${x}</li>`).join("")}</ul></div>
    <div class="detailbox"><h3>Anti-Patterns</h3><ul>${(a.wiki.anti || []).map(x => `<li>${x}</li>`).join("")}</ul></div>`;
  state.lastWikiId = id; saveState();
}
function closeWikiDetail() { $("#wikiDetail").style.display = "none"; $("#wikiListCard").style.display = "block"; }

/* ═══ MATCHUPS ═══════════════════════════════════════════════ */

function renderMatchupSelects() {
  const opts = ARCH_ORDER.map(id => `<option value="${id}">${labelById(id)}</option>`).join("");
  $("#muA").innerHTML = opts; $("#muB").innerHTML = opts; $("#muB").value = "WTC";
}
function renderMatchupMatrix() {
  const head = `<tr><th class="rowhead">↓ vs →</th>${ARCH_ORDER.map(id => `<th>${archetypeById(id).id}</th>`).join("")}</tr>`;
  const rows = ARCH_ORDER.map(r => `<tr><th class="rowhead">${archetypeById(r).id} ${archetypeById(r).emoji}</th>${ARCH_ORDER.map(c => { const v = MATCHUPS[r]?.[c] ?? "MID"; return `<td class="${v === "OK" ? "cell-ok" : v === "BAD" ? "cell-bad" : "cell-mid"}">${MU_SYMBOL[v]}</td>`; }).join("")}</tr>`).join("");
  $("#matrixTable").innerHTML = head + rows;
}
function compareMatchup() {
  const a = $("#muA").value, b = $("#muB").value, v = MATCHUPS[a]?.[b] ?? "MID";
  const cls = v === "OK" ? "cell-ok" : v === "BAD" ? "cell-bad" : "cell-mid";
  $("#muResult").innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
    <div><div class="k">${labelById(a)} <span class="muted">vs</span> ${labelById(b)}</div>
    <div class="muted small">Heuristik – keine Garantie.</div></div>
    <div style="font-size:24px;font-weight:700;" class="${cls}">${MU_SYMBOL[v]}</div></div>`;
}

/* ═══ BOOT ════════════════════════════════════════════════════ */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function showPage(page) {
  $$(".page").forEach(p => p.classList.remove("active"));
  $$(".tab").forEach(t => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
  const p = $(`#page-${page}`); if (p) p.classList.add("active");
  const t = $(`.tab[data-page="${page}"]`); if (t) { t.classList.add("active"); t.setAttribute("aria-selected", "true"); }
  window.scrollTo({ top: 0, behavior: "instant" });
}

function boot() {
  loadState(); assignCardImages();
  $$(".tab").forEach(t => t.addEventListener("click", () => showPage(t.dataset.page)));
  $$(".footlinks a").forEach(a => a.addEventListener("click", e => { e.preventDefault(); showPage(a.dataset.page); }));
  $("#ctaStart").addEventListener("click", () => { showPage("test"); renderQuestion(); });
  $("#ctaResume").addEventListener("click", () => { showPage("test"); renderQuestion(); });
  $("#ctaReset").addEventListener("click", () => { clearState(); $("#resultsCard").style.display = "none"; renderQuestion(); });
  $("#btnPrev").addEventListener("click", () => { state.i = findPrevIndex(state.i); saveState(); renderQuestion(); });
  $("#btnSkip").addEventListener("click", () => { state.i = findNextIndex(state.i); saveState(); renderQuestion(); });
  $("#btnToWiki").addEventListener("click", () => { showPage("wiki"); renderWikiGrid(); });
  $("#btnFinish").addEventListener("click", () => {
    const answered = Object.keys(state.answers).length;
    renderResults(finalize());
    if (answered < QUESTIONS.length) $("#copyHint").textContent = `Hinweis: ${QUESTIONS.length - answered} Fragen übersprungen.`;
  });
  $("#btnCopy").addEventListener("click", async () => {
    const r = state.lastResult; if (!r) return;
    try { await navigator.clipboard.writeText(buildShareText(r)); $("#copyHint").textContent = "Kopiert."; }
    catch (e) { $("#copyHint").textContent = "Manuell kopieren."; }
  });
  $("#btnRetake").addEventListener("click", () => { clearState(); $("#resultsCard").style.display = "none"; renderQuestion(); });
  $("#btnOpenArchetype").addEventListener("click", () => {
    const r = state.lastResult; if (!r) return;
    showPage("wiki"); $("#wikiSearch").value = ""; $("#wikiFilter").value = "all";
    renderWikiGrid(); openWikiDetail(r.variantId || r.primaryId);
  });
  $("#btnOpenMatchups").addEventListener("click", () => showPage("matchups"));
  $("#wikiSearch").addEventListener("input", renderWikiGrid);
  $("#wikiFilter").addEventListener("change", renderWikiGrid);
  $("#btnWikiBack").addEventListener("click", () => { closeWikiDetail(); renderWikiGrid(); });
  $("#btnWikiOpenMatchups").addEventListener("click", () => showPage("matchups"));
  renderMatchupSelects(); renderMatchupMatrix();
  $("#btnCompare").addEventListener("click", compareMatchup);
  if (state.lastResult) renderResults(state.lastResult);
  renderQuestion(); renderWikiGrid();
  $("#ctaResume").style.opacity = Object.keys(state.answers).length > 0 ? "1" : ".55";
}

boot();