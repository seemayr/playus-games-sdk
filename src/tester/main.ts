import './styles.css';
import { BridgeEmulator, type HostReadyPayload, type TesterEvent } from './bridge-emulator';

type Example = {
  label: string;
  url: string;
};

const examples: Example[] = [
  { label: 'Starter game', url: '/games/starter-game/' },
  { label: 'Phaser example', url: '/games/phaser-example/' },
  { label: 'Babylon example', url: '/games/babylon-example/' },
];

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Missing #app root.');
}

app.innerHTML = `
  <section class="tester-shell">
    <aside class="tester-panel" aria-label="Game tester controls">
      <div class="brand">
        <div>
          <p class="eyebrow">Playus Devkit</p>
          <h1>Game Tester</h1>
        </div>
        <button class="icon-button" id="reloadButton" title="Reload game" aria-label="Reload game">↻</button>
      </div>

      <label class="field">
        <span>Example</span>
        <select id="exampleSelect"></select>
      </label>

      <label class="field">
        <span>Game URL</span>
        <input id="gameUrlInput" type="text" spellcheck="false" />
      </label>

      <label class="field">
        <span>Group game seed</span>
        <div class="inline-input">
          <input id="groupInput" type="text" spellcheck="false" />
          <button id="seedButton" type="button">New</button>
        </div>
      </label>

      <label class="field">
        <span>Language</span>
        <select id="languageSelect">
          <option value="en">EN</option>
          <option value="de">DE</option>
          <option value="fr">FR</option>
          <option value="es">ES</option>
          <option value="it">IT</option>
        </select>
      </label>

      <div class="toggle-list">
        <label class="toggle-field">
          <span>Debug mode</span>
          <input id="debugInput" type="checkbox" />
        </label>
        <label class="toggle-field">
          <span>Mute game sound</span>
          <input id="muteInput" type="checkbox" />
        </label>
      </div>

      <div class="status-grid">
        <div class="status-card" id="readyStatus">ready</div>
        <div class="status-card" id="hostReadyStatus">host ack</div>
        <div class="status-card" id="startedStatus">started</div>
        <div class="status-card" id="finishedStatus">finished</div>
        <div class="status-card" id="scoreStatus">score: -</div>
      </div>

      <div class="contract">
        <h2>Expected flow</h2>
        <ol>
          <li><code>ready()</code> after required assets are loaded.</li>
          <li>Host calls <code>gameAPI.hostReady()</code> and receives <code>hostReadyAck</code>.</li>
          <li><code>started()</code> when the run actually begins.</li>
          <li><code>score()</code> on meaningful live leaderboard changes.</li>
          <li><code>finished(score)</code> exactly once at the end.</li>
        </ol>
      </div>
    </aside>

    <section class="preview-area">
      <div class="phone-shell">
        <iframe id="gameFrame" title="Game preview" sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"></iframe>
      </div>
    </section>

    <aside class="event-panel" aria-label="Game event log">
      <div class="event-header">
        <div>
          <p class="eyebrow">Bridge</p>
          <h2>Event Log</h2>
        </div>
        <button id="clearButton" type="button">Clear</button>
      </div>
      <div id="eventList" class="event-list"></div>
    </aside>
  </section>
`;

const exampleSelect = getElement<HTMLSelectElement>('exampleSelect');
const gameUrlInput = getElement<HTMLInputElement>('gameUrlInput');
const groupInput = getElement<HTMLInputElement>('groupInput');
const languageSelect = getElement<HTMLSelectElement>('languageSelect');
const debugInput = getElement<HTMLInputElement>('debugInput');
const muteInput = getElement<HTMLInputElement>('muteInput');
const seedButton = getElement<HTMLButtonElement>('seedButton');
const reloadButton = getElement<HTMLButtonElement>('reloadButton');
const clearButton = getElement<HTMLButtonElement>('clearButton');
const gameFrame = getElement<HTMLIFrameElement>('gameFrame');
const eventList = getElement<HTMLDivElement>('eventList');
const readyStatus = getElement<HTMLDivElement>('readyStatus');
const hostReadyStatus = getElement<HTMLDivElement>('hostReadyStatus');
const startedStatus = getElement<HTMLDivElement>('startedStatus');
const finishedStatus = getElement<HTMLDivElement>('finishedStatus');
const scoreStatus = getElement<HTMLDivElement>('scoreStatus');

const bridge = new BridgeEmulator({
  sendHostReady,
});
let reloadCount = 0;

for (const example of examples) {
  const option = document.createElement('option');
  option.value = example.url;
  option.textContent = example.label;
  exampleSelect.appendChild(option);
}

gameUrlInput.value = examples[0].url;
groupInput.value = createSeed();

exampleSelect.addEventListener('change', () => {
  gameUrlInput.value = exampleSelect.value;
  reloadGame();
});

for (const element of [gameUrlInput, groupInput]) {
  element.addEventListener('change', reloadGame);
}

for (const element of [languageSelect, debugInput]) {
  element.addEventListener('change', reloadGame);
}

muteInput.addEventListener('change', applyMutedState);

seedButton.addEventListener('click', () => {
  groupInput.value = createSeed();
  reloadGame();
});

reloadButton.addEventListener('click', reloadGame);
clearButton.addEventListener('click', () => bridge.clear());

bridge.onChange((events) => {
  renderEvents(events);
  renderState();
});

reloadGame();

function reloadGame() {
  bridge.clear();
  reloadCount += 1;

  const baseUrl = gameUrlInput.value.trim() || examples[0].url;
  const url = new URL(baseUrl, window.location.href);
  const params = new URLSearchParams();

  params.set('groupgame', groupInput.value.trim() || createSeed());
  params.set('playcontext', 'dev');
  params.set('lang', languageSelect.value);
  if (debugInput.checked) params.set('d', '1');

  url.searchParams.set('playusDevkitReload', String(reloadCount));
  url.hash = params.toString();
  gameFrame.src = url.toString();
}

function sendHostReady(payload: HostReadyPayload) {
  try {
    const gameWindow = gameFrame.contentWindow as (Window & {
      gameAPI?: {
        hostReady?: (payload: HostReadyPayload) => string | { success?: boolean; error?: string } | undefined;
      };
    }) | null;
    const result = gameWindow?.gameAPI?.hostReady?.(payload);
    const parsedResult = parseHostReadyResult(result);

    applyMutedState();

    return parsedResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof DOMException
        ? 'host_ready_cross_origin_blocked'
        : 'host_ready_exception',
    };
  }
}

function parseHostReadyResult(result: unknown) {
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result) as { success?: boolean; error?: string };
      return {
        success: parsed.success === true,
        error: parsed.error,
      };
    } catch {
      return {
        success: false,
        error: 'invalid_host_ready_result',
      };
    }
  }

  if (result && typeof result === 'object') {
    const parsed = result as { success?: boolean; error?: string };
    return {
      success: parsed.success !== false,
      error: parsed.error,
    };
  }

  return { success: true };
}

function applyMutedState() {
  try {
    const gameWindow = gameFrame.contentWindow as (Window & {
      gameAPI?: {
        setMuted?: (muted: boolean) => void;
      };
    }) | null;
    gameWindow?.gameAPI?.setMuted?.(muteInput.checked);
  } catch {
    // Cross-origin game URLs can still be tested for outgoing events.
  }
}

function renderState() {
  const state = bridge.getState();

  readyStatus.className = `status-card ${state.hasReady ? 'ok' : ''}`;
  hostReadyStatus.className = `status-card ${state.hasHostReadyAck ? 'ok' : ''}`;
  startedStatus.className = `status-card ${state.hasStarted ? 'ok' : ''}`;
  finishedStatus.className = `status-card ${state.hasFinished ? 'ok' : ''}`;

  readyStatus.textContent = state.hasReady ? 'ready ✓' : 'ready';
  hostReadyStatus.textContent = state.hasHostReadyAck ? 'host ack ✓' : 'host ack';
  startedStatus.textContent = state.hasStarted ? 'started ✓' : 'started';
  finishedStatus.textContent = state.hasFinished ? 'finished ✓' : 'finished';
  scoreStatus.textContent = `score: ${state.score ?? '-'}`;
}

function renderEvents(events: TesterEvent[]) {
  if (events.length === 0) {
    eventList.innerHTML = '<p class="empty-log">Waiting for game events...</p>';
    return;
  }

  eventList.innerHTML = '';

  for (const event of [...events].reverse()) {
    const item = document.createElement('article');
    item.className = `event-item ${event.warning ? 'warn' : ''}`;

    item.innerHTML = `
      <header>
        <span class="event-type">${event.type}</span>
        <span class="event-time">${formatTime(event.timestamp)}</span>
      </header>
      <p class="event-direction">${event.direction === 'game-to-host' ? 'Game → Host' : 'Host → Game'}</p>
      ${event.warning ? `<p class="event-warning">${event.warning}</p>` : ''}
      <pre>${escapeHtml(JSON.stringify(event.payload, null, 2))}</pre>
    `;

    eventList.appendChild(item);
  }
}

function createSeed(): string {
  return `dev-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.toLocaleTimeString('en-US', { hour12: false })}.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}.`);
  return element as T;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
