<script lang="ts">
  import { onMount } from "svelte";
  import { questionStore, type StoredQuestion } from "$lib/questionStore.svelte";
  import { PRIZE_LADDER } from "$lib/prizeLadder";
  import type { AnswerIndex } from "$lib/types";

  type SortMode = "level" | "alpha" | "recent";

  let search = $state("");
  let sortMode = $state<SortMode>("level");
  let levelFilter = $state<number | "all">("all");
  let onlyEdited = $state(false);
  let onlyUser = $state(false);

  // Edit-/Add-Modal-State
  let editorOpen = $state(false);
  let editorMode = $state<"edit" | "add">("edit");
  let editorQuestion = $state<StoredQuestion | null>(null);
  let editorLevel = $state(1);
  let editorQ = $state("");
  let editorAnswers = $state<[string, string, string, string]>(["", "", "", ""]);
  let editorCorrect = $state<AnswerIndex>(0);
  let editorCategory = $state("");
  let editorError = $state("");

  // Delete-Confirm-State
  let confirmDelete = $state<StoredQuestion | null>(null);

  // History-Toggle
  let showHistory = $state(false);

  // Paginierung — nur die ersten N Treffer rendern, Rest per Button nachladen.
  const PAGE_SIZE = 60;
  let visibleCount = $state(PAGE_SIZE);

  const collator = new Intl.Collator("de");

  onMount(() => {
    if (!questionStore.loaded) {
      questionStore.load().catch((e) => console.warn("questionStore.load fehlgeschlagen:", e));
    }
  });

  // Schneller Lookup statt linearem History-Scan pro Frage.
  const lastAskedMap = $derived.by(() => {
    const m = new Map<string, number>();
    for (const e of questionStore.history) {
      const prev = m.get(e.id);
      if (prev === undefined || e.askedAt > prev) m.set(e.id, e.askedAt);
    }
    return m;
  });

  // Bei Filter-/Sortier-Wechsel zurück auf Seite 1 (nicht bei Edits/Löschungen).
  $effect(() => {
    search;
    sortMode;
    levelFilter;
    onlyEdited;
    onlyUser;
    visibleCount = PAGE_SIZE;
  });

  const allQuestions = $derived(questionStore.allQuestions());

  const filtered = $derived.by(() => {
    const term = search.trim().toLowerCase();
    let arr = allQuestions;
    if (levelFilter !== "all") arr = arr.filter((q) => q.level === levelFilter);
    if (onlyEdited) arr = arr.filter((q) => q.edited);
    if (onlyUser) arr = arr.filter((q) => q.origin === "user");
    if (term) {
      arr = arr.filter(
        (q) =>
          q.q.toLowerCase().includes(term) ||
          q.a.some((ans) => ans.toLowerCase().includes(term)) ||
          (q.category ?? "").toLowerCase().includes(term),
      );
    }
    return arr;
  });

  // Gruppierung: bei "level" nach Stufe gruppieren; sonst flach + sortieren.
  const grouped = $derived.by(() => {
    if (sortMode === "level") {
      const byLevel = new Map<number, StoredQuestion[]>();
      for (const q of filtered) {
        if (!byLevel.has(q.level)) byLevel.set(q.level, []);
        byLevel.get(q.level)!.push(q);
      }
      // innerhalb der Stufe alphabetisch
      for (const [lvl, list] of byLevel) {
        list.sort((a, b) => collator.compare(a.q, b.q));
        byLevel.set(lvl, list);
      }
      return PRIZE_LADDER.map((step) => ({
        level: step.level,
        label: step.label,
        items: byLevel.get(step.level) ?? [],
      }));
    } else if (sortMode === "alpha") {
      const sorted = [...filtered].sort((a, b) => collator.compare(a.q, b.q));
      return [{ level: 0, label: "Alphabetisch", items: sorted }];
    } else {
      // recent: nach lastAskedAt absteigend, nie-gestellte am Ende
      const withTime = filtered.map((q) => ({ q, t: lastAskedMap.get(q.id) ?? null }));
      withTime.sort((a, b) => {
        if (a.t === null && b.t === null) return collator.compare(a.q.q, b.q.q);
        if (a.t === null) return 1;
        if (b.t === null) return -1;
        return b.t - a.t;
      });
      return [{ level: 0, label: "Zuletzt gestellt", items: withTime.map((x) => x.q) }];
    }
  });

  // Nur die sichtbare Seite über alle Gruppen hinweg rendern.
  const displayGroups = $derived.by(() => {
    let budget = visibleCount;
    const out: { level: number; label: string; items: StoredQuestion[]; total: number }[] = [];
    for (const g of grouped) {
      if (budget <= 0) break;
      const items = g.items.slice(0, budget);
      budget -= items.length;
      if (items.length > 0) out.push({ ...g, items, total: g.items.length });
    }
    return out;
  });
  const shownCount = $derived(displayGroups.reduce((s, g) => s + g.items.length, 0));

  const totalFiltered = $derived(filtered.length);
  const totalAll = $derived(allQuestions.length);

  function openEditor(q: StoredQuestion) {
    editorMode = "edit";
    editorQuestion = q;
    editorLevel = q.level;
    editorQ = q.q;
    editorAnswers = [q.a[0], q.a[1], q.a[2], q.a[3]];
    editorCorrect = q.correct;
    editorCategory = q.category ?? "";
    editorError = "";
    editorOpen = true;
  }

  function openAdd(presetLevel?: number) {
    editorMode = "add";
    editorQuestion = null;
    editorLevel = presetLevel ?? 1;
    editorQ = "";
    editorAnswers = ["", "", "", ""];
    editorCorrect = 0;
    editorCategory = "";
    editorError = "";
    editorOpen = true;
  }

  function closeEditor() {
    editorOpen = false;
    editorQuestion = null;
  }

  async function saveEditor() {
    const qText = editorQ.trim();
    const answers = editorAnswers.map((a) => a.trim()) as [string, string, string, string];
    if (!qText) {
      editorError = "Frage darf nicht leer sein.";
      return;
    }
    if (answers.some((a) => !a)) {
      editorError = "Alle vier Antworten müssen ausgefüllt sein.";
      return;
    }
    if (editorLevel < 1 || editorLevel > 15) {
      editorError = "Stufe muss zwischen 1 und 15 liegen.";
      return;
    }
    try {
      if (editorMode === "edit" && editorQuestion) {
        await questionStore.updateQuestion({
          ...editorQuestion,
          level: editorLevel,
          q: qText,
          a: answers,
          correct: editorCorrect,
          category: editorCategory.trim() || undefined,
        });
      } else {
        await questionStore.addQuestion(
          editorLevel,
          qText,
          answers,
          editorCorrect,
          editorCategory.trim() || undefined,
        );
      }
      closeEditor();
    } catch (e) {
      editorError = `Speichern fehlgeschlagen: ${e}`;
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    try {
      await questionStore.deleteQuestion(confirmDelete);
    } catch (e) {
      console.warn("delete fehlgeschlagen:", e);
    }
    confirmDelete = null;
  }

  async function revert(q: StoredQuestion) {
    if (q.origin !== "default" || !q.edited) return;
    await questionStore.revertOverride(q.id);
  }

  function formatRelative(ms: number | null): string {
    if (ms === null) return "—";
    const diff = Date.now() - ms;
    const sec = Math.round(diff / 1000);
    if (sec < 60) return `vor ${sec}s`;
    const min = Math.round(sec / 60);
    if (min < 60) return `vor ${min}min`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `vor ${hr}h`;
    const d = Math.round(hr / 24);
    if (d < 30) return `vor ${d}T`;
    return new Date(ms).toLocaleDateString("de-DE");
  }

  function levelLabel(level: number): string {
    return PRIZE_LADDER[level - 1]?.label ?? `Stufe ${level}`;
  }

  async function clearHistory() {
    if (!confirm("Frage-Historie wirklich leeren?")) return;
    await questionStore.clearHistory();
  }
</script>

<div class="questions-tab">
  <header>
    <h3>Fragen-Datenbank</h3>
    <p class="lead">
      Alle Fragen aller 15 Preisstufen. Edits, neue Fragen und Löschungen werden in einer User-Datei
      im App-Verzeichnis gespeichert und überleben App-Updates.
    </p>
  </header>

  {#if !questionStore.loaded}
    <p class="muted">Lade Fragen …</p>
  {:else}
    <div class="toolbar">
      <input
        type="search"
        class="search"
        placeholder="Suchen in Frage, Antworten, Kategorie …"
        bind:value={search}
      />
      <div class="sort">
        <label for="sort-mode">Sortierung</label>
        <select id="sort-mode" bind:value={sortMode}>
          <option value="level">Nach Preisstufe</option>
          <option value="alpha">Alphabetisch (A–Z)</option>
          <option value="recent">Zuletzt gestellt</option>
        </select>
      </div>
      <div class="sort">
        <label for="level-filter">Preisstufe</label>
        <select id="level-filter" bind:value={levelFilter}>
          <option value="all">Alle Stufen</option>
          {#each PRIZE_LADDER as step (step.level)}
            <option value={step.level}>{step.label}</option>
          {/each}
        </select>
      </div>
      <label class="check"><input type="checkbox" bind:checked={onlyEdited} /> Nur editierte</label>
      <label class="check"><input type="checkbox" bind:checked={onlyUser} /> Nur eigene</label>
      <button class="btn primary" onclick={() => openAdd()}>+ Neue Frage</button>
    </div>

    <div class="meta">
      <span>{totalFiltered} von {totalAll} Fragen</span>
      <span class="dot">·</span>
      <button class="link" onclick={() => (showHistory = !showHistory)}>
        Historie {showHistory ? "ausblenden" : "anzeigen"} ({questionStore.history.length})
      </button>
    </div>

    {#if showHistory}
      <div class="history">
        <div class="history-head">
          <strong>Zuletzt gestellte Fragen</strong>
          <button class="btn ghost small" onclick={clearHistory} disabled={questionStore.history.length === 0}>
            Historie leeren
          </button>
        </div>
        {#if questionStore.history.length === 0}
          <p class="muted small">Noch keine Frage gestellt.</p>
        {:else}
          <ul class="history-list">
            {#each [...questionStore.history].slice(-30).reverse() as entry (entry.askedAt + entry.id)}
              <li>
                <span class="history-time">{new Date(entry.askedAt).toLocaleString("de-DE")}</span>
                <span class="history-level">{levelLabel(entry.level)}</span>
                <span class="history-q">{entry.q}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}

    <div class="groups">
      {#each displayGroups as group (group.label)}
        {#if group.items.length > 0}
          <section class="group">
            <h4 class="group-head">
              {#if sortMode === "level"}
                <span class="group-amount">{group.label}</span>
                <span class="group-count">{group.total} Fragen</span>
                <button class="btn ghost small" onclick={() => openAdd(group.level)}>+ in dieser Stufe</button>
              {:else}
                <span class="group-amount">{group.label}</span>
                <span class="group-count">{group.total} Fragen</span>
              {/if}
            </h4>

            <ul class="qlist">
              {#each group.items as q (q.id)}
                {@const lastAsked = lastAskedMap.get(q.id) ?? null}
                <li class="qrow" class:user={q.origin === "user"} class:edited={q.edited}>
                  <div class="qrow-main">
                    <div class="qrow-q">{q.q}</div>
                    <div class="qrow-answers">
                      {#each q.a as ans, i (i)}
                        <span class="ans" class:correct={i === q.correct}>
                          <span class="ans-letter">{["A", "B", "C", "D"][i]}</span>
                          <span class="ans-text">{ans}</span>
                        </span>
                      {/each}
                    </div>
                    <div class="qrow-meta">
                      {#if sortMode !== "level"}
                        <span class="tag level">{levelLabel(q.level)}</span>
                      {/if}
                      {#if q.origin === "user"}<span class="tag tag-user">eigene</span>{/if}
                      {#if q.edited}<span class="tag tag-edited">editiert</span>{/if}
                      {#if q.category}<span class="tag">{q.category}</span>{/if}
                      {#if lastAsked !== null}
                        <span class="tag tag-recent">zuletzt: {formatRelative(lastAsked)}</span>
                      {/if}
                      {#if q.source && q.origin === "default"}
                        <span class="tag tag-source" title={q.source}>{q.source}</span>
                      {/if}
                    </div>
                  </div>
                  <div class="qrow-actions">
                    <button class="btn small" onclick={() => openEditor(q)}>Bearbeiten</button>
                    {#if q.edited}
                      <button class="btn ghost small" onclick={() => revert(q)}>Zurücksetzen</button>
                    {/if}
                    <button class="btn small danger" onclick={() => (confirmDelete = q)}>Löschen</button>
                  </div>
                </li>
              {/each}
            </ul>
          </section>
        {/if}
      {/each}

      {#if shownCount < totalFiltered}
        <button class="btn load-more" onclick={() => (visibleCount += PAGE_SIZE)}>
          Mehr anzeigen ({totalFiltered - shownCount} weitere)
        </button>
      {/if}

      {#if filtered.length === 0}
        <p class="muted">Keine Fragen entsprechen den Filtern.</p>
      {/if}
    </div>
  {/if}
</div>

<!-- ============== Edit/Add-Modal ============== -->
{#if editorOpen}
  <div class="modal-backdrop" role="presentation" onclick={closeEditor}>
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label={editorMode === "edit" ? "Frage bearbeiten" : "Neue Frage"}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.key === "Escape" && closeEditor()}
      tabindex={-1}
    >
      <h3>{editorMode === "edit" ? "Frage bearbeiten" : "Neue Frage anlegen"}</h3>

      <label class="field">
        <span>Preisstufe</span>
        <select bind:value={editorLevel}>
          {#each PRIZE_LADDER as step (step.level)}
            <option value={step.level}>{step.level}. {step.label}</option>
          {/each}
        </select>
      </label>

      <label class="field">
        <span>Frage</span>
        <textarea rows="3" bind:value={editorQ}></textarea>
      </label>

      <div class="answers-edit">
        {#each [0, 1, 2, 3] as i (i)}
          <label class="ans-field" class:correct={editorCorrect === i}>
            <input
              type="radio"
              name="correct"
              value={i}
              checked={editorCorrect === i}
              onchange={() => (editorCorrect = i as AnswerIndex)}
            />
            <span class="ans-letter-edit">{["A", "B", "C", "D"][i]}</span>
            <input type="text" bind:value={editorAnswers[i]} placeholder={`Antwort ${["A", "B", "C", "D"][i]}`} />
          </label>
        {/each}
      </div>
      <p class="hint small">Wähle den Radiobutton der richtigen Antwort.</p>

      <label class="field">
        <span>Kategorie (optional)</span>
        <input type="text" bind:value={editorCategory} placeholder="z.B. Geschichte, Sport, …" />
      </label>

      {#if editorError}
        <p class="error">{editorError}</p>
      {/if}

      <div class="modal-actions">
        <button class="btn ghost" onclick={closeEditor}>Abbrechen</button>
        <button class="btn primary" onclick={saveEditor}>Speichern</button>
      </div>
    </div>
  </div>
{/if}

<!-- ============== Delete-Confirm ============== -->
{#if confirmDelete}
  <div class="modal-backdrop" role="presentation" onclick={() => (confirmDelete = null)}>
    <div
      class="modal small-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Löschen bestätigen"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.key === "Escape" && (confirmDelete = null)}
      tabindex={-1}
    >
      <h3>Frage löschen?</h3>
      <p class="confirm-text">{confirmDelete.q}</p>
      {#if confirmDelete.origin === "default"}
        <p class="hint small">
          Diese Frage gehört zur Build-Bibliothek. Sie wird ausgeblendet und bleibt auch nach
          App-Updates verborgen (die Markierung steht in der User-Datei <code>user-questions.json</code>
          unter <code>tombstones</code>).
        </p>
      {/if}
      <div class="modal-actions">
        <button class="btn ghost" onclick={() => (confirmDelete = null)}>Abbrechen</button>
        <button class="btn danger" onclick={doDelete}>Endgültig löschen</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .questions-tab { display: flex; flex-direction: column; gap: 14px; }
  header h3 { margin: 0 0 4px; font-size: 16px; color: #e6ecff; }
  .lead { margin: 0; color: #93a8d6; font-size: 13px; line-height: 1.5; }

  .toolbar {
    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
    padding: 10px; border-radius: 10px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  }
  .search {
    flex: 1; min-width: 200px;
    background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px; color: #e6ecff; padding: 7px 10px; font-size: 13px;
  }
  .search:focus { outline: none; border-color: rgba(108,147,232,0.5); }
  .sort { display: flex; gap: 6px; align-items: center; font-size: 12px; color: #93a8d6; }
  .sort select, .field select, .field input, .field textarea, .ans-field input[type="text"] {
    background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px; color: #e6ecff; padding: 6px 10px; font-size: 13px;
    font-family: inherit;
  }
  .sort select:focus, .field select:focus, .field input:focus, .field textarea:focus,
  .ans-field input[type="text"]:focus { outline: none; border-color: rgba(108,147,232,0.5); }
  .check { display: flex; gap: 6px; align-items: center; font-size: 12px; color: #c5d0ee; cursor: pointer; }

  .meta { display: flex; gap: 10px; align-items: baseline; color: #93a8d6; font-size: 12px; }
  .dot { opacity: 0.6; }
  .link { background: none; border: none; color: #6ea1f0; cursor: pointer; padding: 0; font-size: 12px; text-decoration: underline; }
  .link:hover { color: #a37bff; }

  .history { padding: 10px 12px; border-radius: 8px;
    background: rgba(110,161,240,0.05); border: 1px solid rgba(110,161,240,0.2); }
  .history-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; color: #c5d0ee; font-size: 13px; }
  .history-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow-y: auto; }
  .history-list li { display: grid; grid-template-columns: 160px 90px 1fr; gap: 8px; font-size: 12px; color: #c5d0ee; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .history-time { color: #8aa0d0; font-variant-numeric: tabular-nums; }
  .history-level { color: #ffd58a; font-weight: 600; }
  .history-q { color: #e6ecff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .groups { display: flex; flex-direction: column; gap: 18px; }
  .group { display: flex; flex-direction: column; gap: 8px; }
  .group-head {
    display: flex; align-items: center; gap: 12px; margin: 0;
    padding: 8px 10px; border-radius: 8px;
    background: linear-gradient(90deg, rgba(243,192,80,0.12), rgba(243,192,80,0.02));
    border: 1px solid rgba(243,192,80,0.25);
    font-size: 13px;
  }
  .group-amount { color: #ffd58a; font-weight: 700; }
  .group-count { color: #93a8d6; font-size: 12px; margin-right: auto; }

  .qlist { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .qrow {
    display: grid; grid-template-columns: 1fr auto; gap: 10px;
    padding: 10px 12px; border-radius: 8px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  }
  .qrow.user { border-color: rgba(110,161,240,0.35); background: rgba(110,161,240,0.05); }
  .qrow.edited { border-color: rgba(243,192,80,0.35); background: rgba(243,192,80,0.05); }
  .qrow-main { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .qrow-q { color: #e6ecff; font-weight: 500; font-size: 14px; line-height: 1.4; }
  .qrow-answers { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
  .ans { display: flex; gap: 6px; align-items: baseline; font-size: 12px; color: #c5d0ee; }
  .ans-letter { color: #8aa0d0; font-weight: 700; min-width: 14px; }
  .ans.correct { color: #82e6a8; }
  .ans.correct .ans-letter { color: #3ed079; }
  .ans-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .qrow-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; font-size: 11px; }
  .tag { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; padding: 1px 8px; color: #93a8d6; }
  .tag.level { background: rgba(243,192,80,0.1); border-color: rgba(243,192,80,0.3); color: #ffd58a; }
  .tag-user { background: rgba(110,161,240,0.15); border-color: rgba(110,161,240,0.35); color: #a3c4ff; }
  .tag-edited { background: rgba(243,192,80,0.15); border-color: rgba(243,192,80,0.35); color: #ffd58a; }
  .tag-recent { background: rgba(163,123,255,0.12); border-color: rgba(163,123,255,0.3); color: #c4adff; }
  .tag-source { font-family: monospace; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .qrow-actions { display: flex; gap: 6px; align-items: flex-start; }

  .btn {
    cursor: pointer; border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06); color: #e6ecff;
    padding: 6px 12px; border-radius: 6px; font-weight: 500; font-size: 12px;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn:hover:not(:disabled) { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn.small { padding: 5px 9px; font-size: 11px; }
  .btn.primary { background: linear-gradient(180deg, #4671d6, #2a4eaa); border-color: #6c93e8; }
  .btn.primary:hover:not(:disabled) { background: linear-gradient(180deg, #5680e6, #305bbf); }
  .btn.ghost { background: transparent; }
  .btn.danger { background: linear-gradient(180deg, #d63a3a, #8e1d1d); border-color: #ef7a7a; }
  .btn.danger:hover:not(:disabled) { background: linear-gradient(180deg, #e64b4b, #a52323); }

  .load-more { align-self: center; margin-top: 2px; }

  .muted { color: #8aa0d0; }
  .small { font-size: 12px; }

  /* ===== Modal ===== */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 1100;
    background: rgba(2,6,23,0.75); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .modal {
    width: min(640px, 95vw); max-height: 90vh; overflow-y: auto;
    background: #0d1530; border: 1px solid rgba(255,255,255,0.1);
    border-radius: 14px; padding: 22px 26px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    display: flex; flex-direction: column; gap: 14px;
  }
  .modal.small-modal { width: min(440px, 95vw); }
  .modal h3 { margin: 0; font-size: 16px; color: #e6ecff; }
  .field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #93a8d6; }
  .field textarea { resize: vertical; min-height: 60px; line-height: 1.4; }
  .answers-edit { display: flex; flex-direction: column; gap: 6px; }
  .ans-field {
    display: grid; grid-template-columns: auto 24px 1fr; gap: 8px; align-items: center;
    padding: 6px 10px; border-radius: 6px;
    border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);
  }
  .ans-field.correct { border-color: rgba(62,208,121,0.4); background: rgba(62,208,121,0.05); }
  .ans-letter-edit { color: #ffd58a; font-weight: 700; font-size: 13px; }
  .ans-field input[type="text"] { width: 100%; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
  .confirm-text { color: #e6ecff; padding: 10px 12px; border-radius: 6px; background: rgba(255,255,255,0.04); margin: 0; }
  .error { color: #ef7a7a; font-size: 12px; margin: 0; }
  .hint { color: #93a8d6; font-size: 12px; margin: 0; line-height: 1.5; }
</style>
