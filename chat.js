// SupplementBot — WebSocket chat client
// No framework, no build step. Just connects and renders.

const messagesEl = document.getElementById('messages');
const typingEl = document.getElementById('typing-indicator');
const inputForm = document.getElementById('input-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const phaseEl = document.getElementById('phase-indicator');
const emergencyEl = document.getElementById('emergency-block');
const deniedEl = document.getElementById('denied-block');
const deniedMsg = document.getElementById('denied-message');

let ws = null;
let sessionId = null;

const isDonor = new URLSearchParams(location.search).get('donor') === 'true';

// -- WebSocket connection --

function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws/chat${isDonor ? '?donor=true' : ''}`;

    ws = new WebSocket(url);

    ws.onopen = () => {
        console.log('[ws] connected');
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
    };

    ws.onclose = () => {
        console.log('[ws] disconnected');
        disableInput();
    };

    ws.onerror = (err) => {
        console.error('[ws] error', err);
        addSystemMessage('Connection error. Please refresh to try again.');
        disableInput();
    };
}

// -- Message handling --

function handleServerMessage(msg) {
    switch (msg.type) {
        case 'welcome':
            sessionId = msg.session_id;
            if (msg.phase) updatePhase(msg.phase);
            break;

        case 'typing':
            showTyping();
            break;

        case 'response':
            hideTyping();
            addAgentMessage(msg.text);
            if (msg.phase) updatePhase(msg.phase);
            if (msg.complete) {
                disableInput();
                addSystemMessage('Session complete. Thank you for using SupplementBot.');
            }
            enableInput();
            break;

        case 'emergency':
            hideTyping();
            emergencyEl.classList.remove('hidden');
            inputForm.classList.add('hidden');
            break;

        case 'denied':
            deniedMsg.innerHTML = msg.message
                + ' <a href="/about.html#capacity">See why &rarr;</a>';
            deniedEl.classList.remove('hidden');
            inputForm.classList.add('hidden');
            break;

        case 'error':
            hideTyping();
            addSystemMessage(`Error: ${msg.message}`);
            enableInput();
            break;
    }
}

// -- UI helpers --

function addAgentMessage(text) {
    const el = document.createElement('div');
    el.className = 'message agent';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
}

function addUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'message user';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
}

function addSystemMessage(text) {
    const el = document.createElement('div');
    el.className = 'message agent';
    el.style.fontStyle = 'italic';
    el.style.opacity = '0.7';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
}

function showTyping() {
    typingEl.classList.remove('hidden');
    scrollToBottom();
}

function hideTyping() {
    typingEl.classList.add('hidden');
}

const PHASES = [
    { key: 'chief_complaint',   label: 'Chief Complaint' },
    { key: 'hpi',               label: 'History' },
    { key: 'review_of_systems', label: 'Review of Systems' },
    { key: 'differentiation',   label: 'Narrowing Down' },
    { key: 'causation_inquiry', label: 'Causation Check' },
    { key: 'recommendation',    label: 'Recommendations' },
];

function updatePhase(phase) {
    if (phase === 'emergency') {
        phaseEl.textContent = 'Emergency';
        return;
    }
    const idx = PHASES.findIndex(p => p.key === phase);
    if (idx === -1) {
        phaseEl.textContent = phase;
        return;
    }
    phaseEl.textContent = `Step ${idx + 1} of ${PHASES.length} — ${PHASES[idx].label}`;
}

function scrollToBottom() {
    const container = document.getElementById('chat-container');
    container.scrollTop = container.scrollHeight;
}

function disableInput() {
    userInput.disabled = true;
    sendBtn.disabled = true;
}

function enableInput() {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
}

// -- Send message --

inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

    addUserMessage(text);
    disableInput();

    ws.send(JSON.stringify({ type: 'message', text }));
    userInput.value = '';
});

// -- Start --

phaseEl.textContent = 'Standing by';
connect();
