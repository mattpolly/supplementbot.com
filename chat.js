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

// -- WebSocket connection --

function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws/chat`;

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
            deniedMsg.textContent = msg.message;
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

function updatePhase(phase) {
    const labels = {
        chief_complaint: 'Chief Complaint',
        hpi: 'History',
        review_of_systems: 'Review of Systems',
        differentiation: 'Narrowing Down',
        recommendation: 'Recommendations',
        emergency: 'Emergency'
    };
    phaseEl.textContent = labels[phase] || phase;
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

connect();
