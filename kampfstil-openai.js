/* ═══════════════════════════════════════════════════════════════
   KAMPFSTIL · OpenAI Kommentar-Modul
   Einbinden: <script src="./kampfstil-openai.js"></script>
   Direkt nach app.js einbinden (app.js muss zuerst geladen sein)
   ═══════════════════════════════════════════════════════════════ */

const KAI = (() => {

    // ── Konstanten ─────────────────────────────────────────────────
    const LS_KEY = 'kampfstil_oai_key';
    const LS_CACHE = 'kampfstil_oai_cache';
    const MODEL = 'gpt-4o-mini';          // günstig, schnell, gut genug
    const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

    // ── Prompt-Builder ─────────────────────────────────────────────
    function buildPrompt(result) {
        // result = { archetype, variant, vector, finishSigs, confidence }
        // Passe die Feldnamen an das an, was dein app.js wirklich liefert
        const vec = result.vector || {};
        const axes = ['TOP', 'FORCE', 'INIT', 'RISK', 'ULO', 'TRANS']
            .map(a => `${a}=${(vec[a] ?? 0).toFixed(2)}`)
            .join(', ');

        const archetype = result.archetype || '–';
        const variant = result.variant ? ` (${result.variant})` : '';
        const finishes = (result.finishSigs || []).join(', ') || '–';
        const confidence = result.confidence != null
            ? `${Math.round(result.confidence * 100)} %` : '–';

        return `Du bist ein erfahrener No-Gi BJJ Coach und Stilanalyst.
Schreibe einen persönlichen, direkten Kommentar (4–6 Sätze, Deutsch, Du-Form) 
für einen Athleten mit folgendem Stilprofil aus dem KAMPFSTIL-System (SGM-V2.3):

Primär-Archetyp: ${archetype}${variant}
Konfidenz: ${confidence}
Stilvektor: ${axes}
Finish-Signaturen: ${finishes}

Erkläre:
1. Was den Kampfstil dieser Person wirklich ausmacht (konkrete Achsen nennen).
2. Wo die größte natürliche Stärke liegt.
3. Ein blinder Fleck oder ein typisches Risiko dieses Stils.

Ton: präzise, ehrlich, coachend – kein Marketing-Sprech, keine leeren Floskeln.
Antworte NUR mit dem Kommentar-Text, ohne Einleitung oder Überschrift.`;
    }

    // ── API-Call ───────────────────────────────────────────────────
    async function fetchComment(result, apiKey) {
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 300,
                temperature: 0.72,
                messages: [
                    { role: 'user', content: buildPrompt(result) }
                ],
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() ?? '';
    }

    // ── Cache (verhindert doppelte Calls bei Retake) ───────────────
    function cacheGet(key) { return sessionStorage.getItem(`${LS_CACHE}_${key}`); }
    function cacheSet(key, val) { sessionStorage.setItem(`${LS_CACHE}_${key}`, val); }

    function resultCacheKey(result) {
        // Stabiler Hash aus Archetyp + Vektor
        const vec = result.vector || {};
        const axes = ['TOP', 'FORCE', 'INIT', 'RISK', 'ULO', 'TRANS']
            .map(a => (vec[a] ?? 0).toFixed(1)).join('');
        return `${result.archetype}_${axes}`;
    }

    // ── UI: Key-Modal ──────────────────────────────────────────────
    function injectModal() {
        if (document.getElementById('kaiModal')) return;

        const modal = document.createElement('div');
        modal.id = 'kaiModal';
        modal.innerHTML = `
      <div class="kai-overlay" id="kaiOverlay"></div>
      <div class="kai-modal card" role="dialog" aria-modal="true" aria-labelledby="kaiModalTitle">
        <div class="k" id="kaiModalTitle">OpenAI API-Key</div>
        <p class="muted small">Dein Key wird nur in deinem Browser gespeichert (localStorage)
          und nie an unsere Server gesendet. Requests gehen direkt an api.openai.com.</p>
        <input
          class="input"
          id="kaiKeyInput"
          type="password"
          placeholder="sk-proj-…"
          autocomplete="off"
          spellcheck="false"
        />
        <div class="kai-modal-actions">
          <button class="btn ghost" id="kaiCancelBtn">Abbrechen</button>
          <button class="btn primary" id="kaiSaveBtn">Speichern &amp; generieren</button>
        </div>
      </div>`;
        document.body.appendChild(modal);

        // Events
        document.getElementById('kaiOverlay').addEventListener('click', hideModal);
        document.getElementById('kaiCancelBtn').addEventListener('click', hideModal);
        document.getElementById('kaiSaveBtn').addEventListener('click', () => {
            const val = document.getElementById('kaiKeyInput').value.trim();
            if (!val.startsWith('sk-')) {
                shakeInput(); return;
            }
            localStorage.setItem(LS_KEY, val);
            hideModal();
            _pendingGenerate?.();
        });
    }

    function showModal() {
        const m = document.getElementById('kaiModal');
        m.classList.add('visible');
        const inp = document.getElementById('kaiKeyInput');
        inp.value = localStorage.getItem(LS_KEY) || '';
        setTimeout(() => inp.focus(), 80);
    }

    function hideModal() {
        document.getElementById('kaiModal')?.classList.remove('visible');
        _pendingGenerate = null;
    }

    function shakeInput() {
        const inp = document.getElementById('kaiKeyInput');
        inp.classList.remove('shake');
        void inp.offsetWidth;
        inp.classList.add('shake');
    }

    let _pendingGenerate = null;

    // ── UI: Kommentar-Block (wird in Ergebnis-Karte injiziert) ─────
    function injectCommentBlock() {
        if (document.getElementById('kaiCommentBlock')) return;

        // Ziel-Container: result-bottom (existiert in deinem HTML)
        const target = document.querySelector('.result-bottom');
        if (!target) return;

        const block = document.createElement('div');
        block.id = 'kaiCommentBlock';
        block.className = 'card subtle kai-comment-card';
        block.innerHTML = `
      <div class="kai-comment-head">
        <div class="k">KI-Coach-Kommentar</div>
        <div class="kai-badge">GPT-4o mini</div>
      </div>
      <div id="kaiCommentBody" class="kai-comment-body kai-empty">
        <button class="btn primary kai-gen-btn" id="kaiGenBtn">Kommentar generieren</button>
        <span class="muted small">Erfordert eigenen OpenAI API-Key</span>
      </div>`;

        // Block als erstes Element in result-bottom einfügen
        target.insertAdjacentElement('afterbegin', block);

        document.getElementById('kaiGenBtn').addEventListener('click', () => {
            const stored = localStorage.getItem(LS_KEY);
            if (!stored) {
                _pendingGenerate = () => KAI.generate();
                showModal();
            } else {
                KAI.generate();
            }
        });
    }

    // ── Haupt-Funktion: generate() ─────────────────────────────────
    async function generate(resultOverride) {
        const apiKey = localStorage.getItem(LS_KEY);
        if (!apiKey) {
            _pendingGenerate = () => generate(resultOverride);
            showModal();
            return;
        }

        // Hole letztes Ergebnis aus deinem App-State
        // ⚠️ ANPASSEN: Wie heißt das globale Ergebnis-Objekt in deinem app.js?
        //    Häufige Namen: window.lastResult, window.AppState.result, etc.
        //    Standardmäßig versuchen wir window.KAMPFSTIL_RESULT
        const result = resultOverride
            || window.KAMPFSTIL_RESULT
            || window.lastResult
            || null;

        if (!result) {
            setBodyText('⚠ Kein Ergebnis gefunden. Bitte zuerst den Test abschließen.');
            return;
        }

        // Cache-Check
        const cKey = resultCacheKey(result);
        const cached = cacheGet(cKey);
        if (cached) { setBodyText(cached); return; }

        // Loading-State
        setLoading(true);

        try {
            const comment = await fetchComment(result, apiKey);
            cacheSet(cKey, comment);
            setBodyText(comment);
        } catch (err) {
            if (err.message?.includes('401') || err.message?.includes('Incorrect API key')) {
                localStorage.removeItem(LS_KEY);
                setBodyError('API-Key ungültig. Bitte neu eingeben.', true);
            } else if (err.message?.includes('429')) {
                setBodyError('Rate-Limit erreicht. Kurz warten und nochmal versuchen.');
            } else {
                setBodyError(`Fehler: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    }

    // ── UI-Hilfsfunktionen ─────────────────────────────────────────
    function setLoading(on) {
        const body = document.getElementById('kaiCommentBody');
        if (!body) return;
        if (on) {
            body.innerHTML = `<div class="kai-loading"><span></span><span></span><span></span></div>`;
        }
    }

    function setBodyText(text) {
        const body = document.getElementById('kaiCommentBody');
        if (!body) return;
        body.innerHTML = `
      <p class="kai-text">${text.replace(/\n/g, '<br>')}</p>
      <div class="kai-footer">
        <button class="btn ghost kai-retry-btn" id="kaiRetryBtn">↻ Neu generieren</button>
        <button class="btn ghost kai-key-btn" id="kaiChangeKeyBtn">Key ändern</button>
      </div>`;
        document.getElementById('kaiRetryBtn')?.addEventListener('click', () => {
            const cKey = resultCacheKey(window.KAMPFSTIL_RESULT || window.lastResult || {});
            sessionStorage.removeItem(`${LS_CACHE}_${cKey}`);
            generate();
        });
        document.getElementById('kaiChangeKeyBtn')?.addEventListener('click', () => {
            _pendingGenerate = () => generate();
            showModal();
        });
    }

    function setBodyError(msg, offerRetry = false) {
        const body = document.getElementById('kaiCommentBody');
        if (!body) return;
        body.innerHTML = `
      <p class="muted small" style="color:var(--c-warn,#e07);">${msg}</p>
      ${offerRetry
                ? `<button class="btn ghost" id="kaiErrRetry">Key neu eingeben</button>`
                : `<button class="btn ghost" id="kaiErrRetry">↻ Nochmal</button>`}`;
        document.getElementById('kaiErrRetry')?.addEventListener('click', () => {
            if (offerRetry) { _pendingGenerate = () => generate(); showModal(); }
            else generate();
        });
    }

    // ── Init ───────────────────────────────────────────────────────
    function init() {
        injectModal();
        injectStyles();

        // Lausche auf das Erscheinen der Ergebnis-Karte
        // (da dein app.js sie per display:none/block toggled)
        const observer = new MutationObserver(() => {
            const rc = document.getElementById('resultsCard');
            if (rc && rc.style.display !== 'none') {
                injectCommentBlock();
            }
        });
        observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] });
    }

    // ── Styles (inline – kein extra CSS nötig) ─────────────────────
    function injectStyles() {
        if (document.getElementById('kaiStyles')) return;
        const s = document.createElement('style');
        s.id = 'kaiStyles';
        s.textContent = `
      /* Modal */
      #kaiModal { position:fixed; inset:0; z-index:1000; display:none; align-items:center; justify-content:center; }
      #kaiModal.visible { display:flex; }
      .kai-overlay { position:absolute; inset:0; background:rgba(0,0,0,.55); backdrop-filter:blur(3px); }
      .kai-modal {
        position:relative; z-index:1; width:min(420px,92vw);
        display:flex; flex-direction:column; gap:12px;
        padding:24px;
      }
      .kai-modal-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:4px; }
      @keyframes kaiShake {
        0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)}
      }
      .shake { animation:kaiShake .28s ease; }

      /* Comment Card */
      .kai-comment-card { display:flex; flex-direction:column; gap:10px; }
      .kai-comment-head { display:flex; justify-content:space-between; align-items:center; }
      .kai-badge {
        font-size:.68rem; font-weight:600; letter-spacing:.06em;
        padding:2px 7px; border-radius:4px;
        background:var(--c-surface2,#2a2a2a); color:var(--c-muted,#888);
        border:1px solid var(--c-border,#333);
      }
      .kai-comment-body { display:flex; flex-direction:column; gap:10px; }
      .kai-empty { flex-direction:row; align-items:center; flex-wrap:wrap; gap:10px; }
      .kai-gen-btn { flex-shrink:0; }
      .kai-text { line-height:1.65; font-size:.93rem; margin:0; }
      .kai-footer { display:flex; gap:8px; flex-wrap:wrap; }

      /* Loading dots */
      .kai-loading { display:flex; gap:5px; padding:8px 0; }
      .kai-loading span {
        width:7px; height:7px; border-radius:50%;
        background:var(--c-muted,#666);
        animation:kaiDot 1.1s infinite both;
      }
      .kai-loading span:nth-child(2){animation-delay:.18s}
      .kai-loading span:nth-child(3){animation-delay:.36s}
      @keyframes kaiDot {
        0%,80%,100%{opacity:.2;transform:scale(.8)}
        40%{opacity:1;transform:scale(1)}
      }
    `;
        document.head.appendChild(s);
    }

    // ── Public API ─────────────────────────────────────────────────
    return { init, generate, showModal };

})();

// Auto-Init
document.addEventListener('DOMContentLoaded', () => KAI.init());