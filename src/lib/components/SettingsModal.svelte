<script lang="ts">
  import BalancingTab from "./settings/BalancingTab.svelte";
  import WebhookTab from "./settings/WebhookTab.svelte";
  import QuestionsTab from "./settings/QuestionsTab.svelte";
  import StylingTab from "./settings/StylingTab.svelte";
  import AudioTab from "./settings/AudioTab.svelte";

  let { open, onClose }: { open: boolean; onClose: () => void } = $props();

  // Neue Tabs hier ergänzen, dann Komponente im Markup unten anhängen.
  type TabId = "questions" | "balancing" | "audio" | "webhook" | "styling";
  const tabs: { id: TabId; label: string }[] = [
    { id: "questions", label: "Fragen" },
    { id: "balancing", label: "Balancing" },
    { id: "audio", label: "Audio" },
    { id: "webhook", label: "Webhook" },
    { id: "styling", label: "Styling" },
  ];
  let activeTab = $state<TabId>("questions");

  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape" && open) onClose();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if open}
  <div
    class="backdrop"
    role="presentation"
    onclick={onClose}
  >
    <div
      class="panel"
      role="dialog"
      aria-modal="true"
      aria-label="Einstellungen"
      tabindex={-1}
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2>Einstellungen</h2>
        </div>
        <nav class="tab-list">
          {#each tabs as tab (tab.id)}
            <button
              class="tab"
              class:active={activeTab === tab.id}
              onclick={() => (activeTab = tab.id)}
            >
              {tab.label}
            </button>
          {/each}
        </nav>
      </aside>

      <main class="content">
        <button class="close-btn" onclick={onClose} aria-label="Schließen">×</button>
        <div class="tab-body">
          {#if activeTab === "questions"}
            <QuestionsTab />
          {:else if activeTab === "balancing"}
            <BalancingTab />
          {:else if activeTab === "audio"}
            <AudioTab />
          {:else if activeTab === "webhook"}
            <WebhookTab />
          {:else if activeTab === "styling"}
            <StylingTab />
          {/if}
        </div>
      </main>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0;
    background: rgba(2, 6, 23, 0.7);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .panel {
    width: min(1000px, 95vw);
    height: min(720px, 90vh);
    background: #0d1530;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    overflow: hidden;
    display: grid;
    grid-template-columns: 220px 1fr;
  }
  .sidebar {
    background: rgba(0,0,0,0.25);
    border-right: 1px solid rgba(255,255,255,0.08);
    display: flex; flex-direction: column;
  }
  .sidebar-header {
    padding: 18px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sidebar-header h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #b9c8ec;
    text-transform: uppercase;
    letter-spacing: 1.2px;
  }
  .tab-list {
    display: flex; flex-direction: column;
    padding: 10px 8px;
    gap: 2px;
  }
  .tab {
    text-align: left;
    background: transparent;
    border: none;
    color: #c5d0ee;
    padding: 9px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.12s, color 0.12s;
  }
  .tab:hover {
    background: rgba(255,255,255,0.05);
    color: #fff;
  }
  .tab.active {
    background: linear-gradient(180deg, rgba(70,113,214,0.45), rgba(42,78,170,0.45));
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(108,147,232,0.4);
  }
  .content {
    position: relative;
    overflow: hidden;
    display: flex; flex-direction: column;
  }
  .close-btn {
    position: absolute;
    top: 12px; right: 14px;
    width: 32px; height: 32px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: #c5d0ee;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    z-index: 1;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .close-btn:hover {
    background: rgba(255,255,255,0.12);
    color: #fff;
  }
  .tab-body {
    flex: 1;
    overflow-y: auto;
    padding: 28px 32px;
  }
</style>
