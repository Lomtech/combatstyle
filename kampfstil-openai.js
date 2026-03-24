/* ═══════════════════════════════════════════════════════════════
   KAMPFSTIL · KI-Coach · Kontextsensitiver Floating-Assistent
   Einbinden: <script src="./kampfstil-openai.js"></script> nach app.js
   ═══════════════════════════════════════════════════════════════ */

const KAI = (() => {

    /* ── Config ────────────────────────────────────────────────── */
    const LS_KEY = 'kampfstil_oai_key';
    const MODEL = 'gpt-4o-mini';
    const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

    /* ── System-Prompt ────────────────────────────────────────── */
    const SYSTEM = `Du bist ein erfahrener No-Gi BJJ Coach und Stilanalyst im System KAMPFSTIL (SGM-V2.3).
Es gibt 6 Primär-Archetypen (PBP=Druckspieler, WTC=Top-Erzwinger, FHF=Guillotine-Jäger, LIH=Beinjäger, DOGR=Winkel-Spieler, RBTS=Rückenjäger) und 6 Ausprägungen.
Stilvektor: TOP (Guard/Bottom ↔ Top), FORCE (Mobilität ↔ Druck), INIT (reaktiv ↔ Initiative), RISK (Position-first ↔ Submission-first), ULO (Upper-Body ↔ Leg-Fokus), TRANS (Stabil ↔ Scramble).
Antworte immer auf Deutsch, direkt und präzise. Maximale Länge: 3–4 Sätze, kein Floskeln.`;

    /* ── App-Kontext ──────────────────────────────────────────── */
    let ctx = {
        page: 'home',
        archetype: null,
        matchupA: null, matchupB: null, matchupVerdict: null,
        result: null,
        answeredCount: 0,
    };

    let chatHistory = [];
    let generating = false;
    const _seen = new Set();

    /* ═══════════════════════════════════════════════════════════
       HOOKS – app.js-Funktionen wrappen
       ═════════════════════════════════════════════════════════== */
    function installHooks() {
        // showPage
        const origShowPage = window.showPage;
        window.showPage = function (page) {
            origShowPage?.(page);
            ctx.page = page;
            setTimeout(() => onPageChange(page), 80);
        };

        // openWikiDetail
        const origWiki = window.openWikiDetail;
        window.openWikiDetail = function (id) {
            origWiki?.(id);
            const a = window.ARCHETYPES?.find(x => x.id === id);
            if (a) { ctx.archetype = a; onWikiDetail(a); }
        };

        // compareMatchup
        const origCompare = window.compareMatchup;
        window.compareMatchup = function () {
            origCompare?.();
            setTimeout(() => {
                const idA = document.querySelector('#muA')?.value;
                const idB = document.querySelector('#muB')?.value;
                ctx.matchupA = window.ARCHETYPES?.find(x => x.id === idA);
                ctx.matchupB = window.ARCHETYPES?.find(x => x.id === idB);
                ctx.matchupVerdict = window.MATCHUPS?.[idA]?.[idB] ?? 'MID';
                onMatchup(ctx.matchupA, ctx.matchupB, ctx.matchupVerdict);
            }, 60);
        };

        // finalize
        const origFinalize = window.finalize;
        window.finalize = function () {
            const result = origFinalize?.();
            if (result) { ctx.result = result; setTimeout(() => onResult(result), 200); }
            return result;
        };

        // chooseAnswer
        const origChoose = window.chooseAnswer;
        window.chooseAnswer = function (letter) {
            origChoose?.(letter);
            ctx.answeredCount++;
            if (ctx.answeredCount % 8 === 0 && ctx.answeredCount < 24) {
                setTimeout(() => onMidTest(ctx.answeredCount), 100);
            }
        };
    }

    /* ═══════════════════════════════════════════════════════════
       CONTEXT-EVENTS
       ═════════════════════════════════════════════════════════== */
    function onPageChange(page) {
        const prompts = {
            test: 'Nutzer startet den Stil-Test. Gib ihm einen kurzen Hinweis: ehrlich antworten, Default-Verhalten nicht Idealbild, erste Intuition zählt.',
            wiki: 'Nutzer öffnet das Archetypen-Wiki. Erkläre in 2 Sätzen was er hier findet und wie er es am besten nutzt.',
            matchups: 'Nutzer öffnet die Matchup-Matrix. Erkläre kurz die Logik: Stiltendenzen, kein Skill-Garant, was die Symbole bedeuten.',
        };
        if (prompts[page]) autoComment(prompts[page], `page_${page}`);
    }

    function onWikiDetail(a) {
        const c = a.centroid;
        const prompt = `Nutzer schaut sich Archetyp "${a.name}" (${a.id}) an.
Zentroid: TOP=${c.TOP}, FORCE=${c.FORCE}, INIT=${c.INIT}, RISK=${c.RISK}, ULO=${c.ULO}, TRANS=${c.TRANS}.
Entry-Bias: ${a.wiki?.entryBias?.join(', ')}.
Coach-Kommentar: Was macht diesen Stil aus, größte Stärke, größte Schwäche?`;
        autoComment(prompt, `wiki_${a.id}`);
    }

    function onMatchup(a, b, verdict) {
        if (!a || !b) return;
        const vLabel = { OK: 'Stilvorteil für A', BAD: 'Stiltendenz gegen A', MID: 'Ausgeglichen' }[verdict];
        const prompt = `Matchup: ${a.name} vs ${b.name}. Ergebnis: ${vLabel}.
Erkläre in 3 Sätzen warum und welche 1–2 Schlüsselsituationen entscheidend sind.`;
        autoComment(prompt, `mu_${a.id}_${b.id}`);
    }

    function onMidTest(count) {
        autoComment(
            `Nutzer hat Frage ${count} von 24 beantwortet. Kurzer energetischer Zwischen-Kommentar, kein Profil-Spoiler.`,
            `mid_${count}`
        );
    }

    function onResult(result) {
        const primary = window.ARCHETYPES?.find(a => a.id === result.primaryId);
        const variant = result.variantId ? window.ARCHETYPES?.find(a => a.id === result.variantId) : null;
        const ax = result.axes;
        const sigs = window.topSigs?.(result.sigs, 3)?.map(([k]) => window.SIG_LABELS?.[k]?.label || k).join(', ') || '–';

        const prompt = `Test-Ergebnis: ${primary?.name} (${primary?.id}), Konfidenz ${Math.round(result.confidence * 100)}%.
${variant ? `Ausprägung: ${variant.name}.` : ''}
Vektor: TOP=${ax.TOP}, FORCE=${ax.FORCE}, INIT=${ax.INIT}, RISK=${ax.RISK}, ULO=${ax.ULO}, TRANS=${ax.TRANS}.
Finish-Signaturen: ${sigs}.
Coach-Kommentar (4–5 Sätze): echte Stärke, blinder Fleck, 1 konkreter Trainingshinweis.`;
        autoComment(prompt, `result_${result.primaryId}`);
    }

    /* ═══════════════════════════════════════════════════════════
       API
       ═════════════════════════════════════════════════════════== */
    async function callAPI(messages) {
        const key = localStorage.getItem(LS_KEY);
        if (!key) return null;

        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
                model: MODEL, max_tokens: 280, temperature: 0.75,
                messages: [{ role: 'system', content: SYSTEM }, ...messages]
            })
        });
        if (res.status === 401) { localStorage.removeItem(LS_KEY); throw new Error('KEY_INVALID'); }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() ?? '';
    }

    async function autoComment(prompt, cacheKey) {
        if (_seen.has(cacheKey) || generating) return;
        if (!localStorage.getItem(LS_KEY)) return;
        _seen.add(cacheKey);
        generating = true;
        setLoading(true, true);
        try {
            const text = await callAPI([{ role: 'user', content: prompt }]);
            if (text) { chatHistory.push({ role: 'assistant', content: text }); appendMessage('coach', text); }
        } catch (e) {
            if (e.message === 'KEY_INVALID') showKeyBanner();
        } finally { generating = false; setLoading(false); }
    }

    async function sendUserMessage(text) {
        if (!text.trim() || generating) return;
        const key = localStorage.getItem(LS_KEY);
        if (!key) { showKeySetup(); return; }

        appendMessage('user', text);
        chatHistory.push({ role: 'user', content: text });
        generating = true;
        setLoading(true, false);

        // Kontext-Note anhängen
        let ctxNote = `[Kontext: Seite="${ctx.page}"`;
        if (ctx.result) {
            const p = window.ARCHETYPES?.find(a => a.id === ctx.result.primaryId);
            ctxNote += `, Nutzer-Archetyp="${p?.name}"`;
        }
        if (ctx.archetype && ctx.page === 'wiki') ctxNote += `, schaut "${ctx.archetype.name}"`;
        ctxNote += ']';

        const messages = [
            ...chatHistory.slice(-10),
            { role: 'user', content: `${ctxNote}\n${text}` }
        ];

        try {
            const reply = await callAPI(messages);
            if (reply) { chatHistory.push({ role: 'assistant', content: reply }); appendMessage('coach', reply); }
        } catch (e) {
            if (e.message === 'KEY_INVALID') showKeyBanner();
            else appendMessage('error', 'Fehler – nochmal versuchen.');
        } finally { generating = false; setLoading(false); }
    }

    /* ═══════════════════════════════════════════════════════════
       UI
       ═════════════════════════════════════════════════════════== */
    let _panelOpen = false;
    let _unread = 0;

    function build() {
        if (document.getElementById('kaiRoot')) return;
        const root = document.createElement('div');
        root.id = 'kaiRoot';

        // Backdrop für Mobile
        const backdrop = document.createElement('div');
        backdrop.id = 'kaiBackdrop';
        backdrop.addEventListener('click', () => setPanelOpen(false));
        document.body.appendChild(backdrop);

        root.innerHTML = `
      <button id="kaiToggle" aria-label="KI-Coach">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span id="kaiBadge" style="display:none">0</span>
      </button>

      <div id="kaiPanel" role="complementary" aria-label="KI-Coach">
        <div id="kaiPanelHead">
          <div id="kaiPanelTitle">
            <span class="kai-dot"></span>
            <span>KI-Coach</span>
            <span id="kaiModel">gpt-4o-mini</span>
          </div>
          <div id="kaiPanelActions">
            <button id="kaiKeyBtn" title="API-Key ändern">⚙</button>
            <button id="kaiClearBtn" title="Chat löschen">↺</button>
            <button id="kaiCloseBtn" aria-label="Schließen">✕</button>
          </div>
        </div>

        <div id="kaiKeySetup">
          <div class="kai-setup-icon">🔑</div>
          <p>OpenAI API-Key eingeben.<br><span class="kai-muted">Nur in deinem Browser gespeichert – nie an unsere Server.</span></p>
          <input id="kaiKeyInput" type="password" placeholder="sk-proj-…" autocomplete="off" spellcheck="false"/>
          <button id="kaiKeySaveBtn">Aktivieren</button>
        </div>

        <div id="kaiChat"></div>
        <div id="kaiLoading" style="display:none">
          <span></span><span></span><span></span>
          <span id="kaiLoadLabel">Coach denkt…</span>
        </div>

        <div id="kaiInputRow">
          <textarea id="kaiInput" placeholder="Frag den Coach…" rows="1" maxlength="400"></textarea>
          <button id="kaiSendBtn">↑</button>
        </div>
      </div>`;

        document.body.appendChild(root);
        injectStyles();
        bindEvents();
        checkKeyState();
    }

    function bindEvents() {
        document.getElementById('kaiToggle').addEventListener('click', togglePanel);
        document.getElementById('kaiCloseBtn').addEventListener('click', () => setPanelOpen(false));
        document.getElementById('kaiClearBtn').addEventListener('click', clearChat);
        document.getElementById('kaiKeyBtn').addEventListener('click', showKeySetup);
        document.getElementById('kaiKeySaveBtn').addEventListener('click', saveKey);
        document.getElementById('kaiKeyInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveKey(); });

        const input = document.getElementById('kaiInput');
        document.getElementById('kaiSendBtn').addEventListener('click', () => submit(input));
        input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(input); } });
        input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 100) + 'px'; });
    }

    function submit(input) {
        const v = input.value.trim();
        if (v) { input.value = ''; input.style.height = 'auto'; sendUserMessage(v); }
    }

    function togglePanel() { setPanelOpen(!_panelOpen); }
    function setPanelOpen(open) {
        _panelOpen = open;
        document.getElementById('kaiPanel').classList.toggle('open', open);
        document.getElementById('kaiToggle').classList.toggle('active', open);
        document.getElementById('kaiBackdrop')?.classList.toggle('visible', open);
        if (open) { _unread = 0; updateBadge(); }
    }

    function updateBadge() {
        const badge = document.getElementById('kaiBadge');
        if (_unread > 0 && !_panelOpen) { badge.textContent = _unread; badge.style.display = 'flex'; }
        else badge.style.display = 'none';
    }

    function appendMessage(role, text) {
        const chat = document.getElementById('kaiChat');
        if (!chat) return;
        const msg = document.createElement('div');
        msg.className = `kai-msg kai-msg-${role}`;
        if (role === 'coach') {
            msg.innerHTML = `<div class="kai-msg-label">Coach</div><div class="kai-msg-text">${text.replace(/\n/g, '<br>')}</div>`;
        } else if (role === 'user') {
            msg.innerHTML = `<div class="kai-msg-text">${esc(text)}</div>`;
        } else {
            msg.innerHTML = `<div class="kai-msg-text kai-err">${text}</div>`;
        }
        chat.appendChild(msg);
        setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 30);

        if (!_panelOpen && role === 'coach') {
            _unread++; updateBadge();
            document.getElementById('kaiToggle').classList.add('pulse');
            setTimeout(() => document.getElementById('kaiToggle').classList.remove('pulse'), 1200);
        }
    }

    function setLoading(on, auto = false) {
        const el = document.getElementById('kaiLoading');
        if (!el) return;
        el.style.display = on ? 'flex' : 'none';
        const lbl = document.getElementById('kaiLoadLabel');
        if (lbl) lbl.textContent = auto ? 'Coach beobachtet…' : 'Coach denkt…';
    }

    function clearChat() {
        const c = document.getElementById('kaiChat');
        if (c) c.innerHTML = '';
        chatHistory = []; _seen.clear();
    }

    function checkKeyState() {
        const key = localStorage.getItem(LS_KEY);
        const setup = document.getElementById('kaiKeySetup');
        const inputRow = document.getElementById('kaiInputRow');
        const chat = document.getElementById('kaiChat');
        if (key) {
            setup.style.display = 'none';
            inputRow.style.display = 'flex';
            chat.style.display = 'flex';
            if (chatHistory.length === 0)
                appendMessage('coach', 'Coach aktiv. Ich beobachte was du anschaust und kommentiere automatisch. Frag mich auch direkt.');
        } else {
            setup.style.display = 'flex';
            inputRow.style.display = 'none';
            chat.style.display = 'none';
        }
    }

    function showKeySetup() {
        document.getElementById('kaiKeySetup').style.display = 'flex';
        setTimeout(() => document.getElementById('kaiKeyInput').focus(), 80);
    }

    function showKeyBanner() {
        appendMessage('error', '⚠ API-Key ungültig. Bitte neu eingeben (⚙ oben rechts).');
        document.getElementById('kaiKeySetup').style.display = 'flex';
    }

    function saveKey() {
        const val = document.getElementById('kaiKeyInput').value.trim();
        if (!val.startsWith('sk-')) {
            const inp = document.getElementById('kaiKeyInput');
            inp.classList.remove('kai-shake'); void inp.offsetWidth; inp.classList.add('kai-shake');
            return;
        }
        localStorage.setItem(LS_KEY, val);
        checkKeyState();
        if (ctx.page !== 'home') { _seen.delete(`page_${ctx.page}`); onPageChange(ctx.page); }
    }

    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    /* ═══════════════════════════════════════════════════════════
       STYLES
       ═════════════════════════════════════════════════════════== */
    function injectStyles() {
        if (document.getElementById('kaiCSS')) return;
        const s = document.createElement('style');
        s.id = 'kaiCSS';
        s.textContent = `
      #kaiRoot {
        position: fixed; bottom: 24px; right: 20px; z-index: 9999;
        display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
        font-family: 'IBM Plex Mono', 'Courier New', monospace;
      }
      #kaiToggle {
        width: 48px; height: 48px; border-radius: 50%;
        background: #1a1a17; border: 1.5px solid #3a3a32;
        color: #c8c4b4; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 20px rgba(0,0,0,.55);
        transition: transform .15s, background .15s; position: relative;
      }
      #kaiToggle:hover  { background: #252520; transform: scale(1.06); }
      #kaiToggle.active { background: #2a2a22; border-color: #c8a84a; }
      @keyframes kaipulse { 0%,100%{box-shadow:0 0 0 0 rgba(200,168,74,.45)} 50%{box-shadow:0 0 0 9px rgba(200,168,74,0)} }
      #kaiToggle.pulse { animation: kaipulse .55s ease 2; }

      #kaiBadge {
        position: absolute; top: -4px; right: -4px;
        width: 18px; height: 18px; border-radius: 50%;
        background: #c8a84a; color: #1a1a17;
        font-size: .6rem; font-weight: 700;
        align-items: center; justify-content: center;
        border: 2px solid #1a1a17;
      }

      #kaiPanel {
        width: 300px; max-height: 480px;
        background: #141412; border: 1.5px solid #2e2e28;
        border-radius: 10px; box-shadow: 0 10px 44px rgba(0,0,0,.7);
        display: flex; flex-direction: column; overflow: hidden;
        opacity: 0; transform: translateY(12px) scale(.97); pointer-events: none;
        transition: opacity .2s, transform .2s;
      }
      #kaiPanel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }

      #kaiPanelHead {
        padding: 10px 12px; border-bottom: 1px solid #222;
        display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
      }
      #kaiPanelTitle {
        display: flex; align-items: center; gap: 7px;
        font-size: .7rem; font-weight: 700; letter-spacing: .09em;
        color: #c8c4b4; text-transform: uppercase;
      }
      .kai-dot { width: 7px; height: 7px; border-radius: 50%; background: #4caf50; box-shadow: 0 0 5px #4caf5055; }
      #kaiModel { font-size: .6rem; color: #555; font-weight: 400; letter-spacing: .03em; text-transform: none; }
      #kaiPanelActions { display: flex; gap: 3px; }
      #kaiPanelActions button {
        width: 26px; height: 26px; border-radius: 5px;
        background: transparent; border: none; color: #555; cursor: pointer;
        font-size: .85rem; display: flex; align-items: center; justify-content: center;
        transition: background .1s, color .1s;
      }
      #kaiPanelActions button:hover { background: #1e1e1a; color: #c8c4b4; }

      #kaiKeySetup {
        padding: 16px 14px; display: flex; flex-direction: column;
        align-items: center; gap: 10px; text-align: center; flex-shrink: 0;
      }
      .kai-setup-icon { font-size: 1.5rem; }
      #kaiKeySetup p { font-size: .72rem; color: #a0a090; line-height: 1.55; margin: 0; }
      .kai-muted { color: #555; font-size: .66rem; }
      #kaiKeyInput {
        width: 100%; box-sizing: border-box;
        background: #1e1e1a; border: 1px solid #333; border-radius: 6px;
        padding: 8px 10px; color: #c8c4b4; font-size: .74rem;
        font-family: monospace; outline: none;
        transition: border-color .15s;
      }
      #kaiKeyInput:focus { border-color: #c8a84a; }
      #kaiKeySaveBtn {
        width: 100%; padding: 8px;
        background: #c8a84a; color: #1a1a17;
        border: none; border-radius: 6px;
        font-size: .74rem; font-weight: 700; cursor: pointer; letter-spacing: .06em;
        transition: background .1s;
      }
      #kaiKeySaveBtn:hover { background: #d4b860; }
      @keyframes kaiShakeX { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)} }
      .kai-shake { animation: kaiShakeX .3s ease; }

      #kaiChat {
        flex: 1; overflow-y: auto; overflow-x: hidden;
        padding: 10px 12px; display: flex; flex-direction: column; gap: 10px;
        scroll-behavior: smooth;
      }
      #kaiChat::-webkit-scrollbar { width: 3px; }
      #kaiChat::-webkit-scrollbar-thumb { background: #2e2e28; border-radius: 2px; }

      .kai-msg { display: flex; flex-direction: column; gap: 3px; max-width: 96%; }
      .kai-msg-coach { align-self: flex-start; }
      .kai-msg-user  { align-self: flex-end; }
      .kai-msg-error { align-self: flex-start; }
      .kai-msg-label { font-size: .58rem; font-weight: 700; letter-spacing: .1em; color: #c8a84a; text-transform: uppercase; }
      .kai-msg-text  { font-size: .73rem; line-height: 1.6; color: #c0bcac; background: #1c1c18; border: 1px solid #282824; border-radius: 7px; padding: 8px 10px; }
      .kai-msg-user .kai-msg-text { background: #1e1e16; border-color: rgba(200,168,74,.25); color: #e0dccc; }
      .kai-err { color: #e07070 !important; background: #1c1414 !important; border-color: rgba(224,112,112,.25) !important; }

      #kaiLoading {
        padding: 7px 14px; display: flex; align-items: center; gap: 5px; flex-shrink: 0;
      }
      #kaiLoading span:not(#kaiLoadLabel) {
        width: 6px; height: 6px; border-radius: 50%; background: #c8a84a;
        animation: kaiDot 1s infinite both;
      }
      #kaiLoading span:nth-child(2){animation-delay:.16s}
      #kaiLoading span:nth-child(3){animation-delay:.32s}
      @keyframes kaiDot { 0%,80%,100%{opacity:.2;transform:scale(.7)} 40%{opacity:1;transform:scale(1)} }
      #kaiLoadLabel { font-size: .63rem; color: #555; margin-left: 4px; }

      #kaiInputRow {
        padding: 8px 10px; border-top: 1px solid #1e1e1a;
        display: flex; gap: 6px; align-items: flex-end; flex-shrink: 0;
      }
      #kaiInput {
        flex: 1; resize: none; overflow-y: hidden;
        background: #1c1c18; border: 1px solid #2a2a24; border-radius: 6px;
        padding: 7px 9px; color: #c8c4b4; font-size: .73rem; line-height: 1.4;
        font-family: inherit; outline: none; min-height: 32px;
        transition: border-color .15s;
      }
      #kaiInput:focus { border-color: rgba(200,168,74,.4); }
      #kaiInput::placeholder { color: #333; }
      #kaiSendBtn {
        width: 32px; height: 32px; flex-shrink: 0;
        background: #c8a84a; color: #1a1a17;
        border: none; border-radius: 6px; font-size: 1rem;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: background .1s;
      }
      #kaiSendBtn:hover { background: #d4b860; }

      /* ── Mobile: Bottom Sheet ── */
      @media (max-width: 600px) {
        #kaiRoot {
          /* Toggle bleibt unten rechts */
          right: 14px; bottom: 16px;
        }

        /* Panel wird zum Bottom Sheet */
        #kaiPanel {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          width: 100%;
          max-height: 75dvh;          /* dynamic viewport height */
          border-radius: 14px 14px 0 0;
          border-left: none; border-right: none; border-bottom: none;
          /* Slide-up statt scale */
          transform: translateY(100%);
          opacity: 1;
        }
        #kaiPanel.open {
          transform: translateY(0);
          opacity: 1;
        }

        /* Drag-Handle oben */
        #kaiPanelHead::before {
          content: '';
          display: block;
          position: absolute;
          top: 7px; left: 50%;
          transform: translateX(-50%);
          width: 36px; height: 4px;
          border-radius: 2px;
          background: #333;
        }
        #kaiPanelHead { position: relative; padding-top: 18px; }

        /* Chat bekommt mehr Raum */
        #kaiChat { max-height: 38dvh; }

        /* Backdrop wenn Panel offen */
        #kaiBackdrop {
          display: block;
          position: fixed; inset: 0;
          background: rgba(0,0,0,.45);
          backdrop-filter: blur(2px);
          z-index: 9998;
          opacity: 0;
          pointer-events: none;
          transition: opacity .2s;
        }
        #kaiBackdrop.visible {
          opacity: 1;
          pointer-events: all;
        }

        /* Input-Bereich größer für Thumbs */
        #kaiInput  { font-size: .82rem; min-height: 38px; }
        #kaiSendBtn { width: 38px; height: 38px; font-size: 1.1rem; }
        #kaiInputRow { padding: 10px 12px 20px; } /* extra Platz für Home-Bar */

        /* Nachrichten etwas größer */
        .kai-msg-text { font-size: .78rem; }
        .kai-msg-label { font-size: .62rem; }
      }
    `;
        document.head.appendChild(s);
    }

    /* ═══════════════════════════════════════════════════════════
       INIT
       ═════════════════════════════════════════════════════════== */
    function init() {
        build();
        setTimeout(installHooks, 200);
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => KAI.init());