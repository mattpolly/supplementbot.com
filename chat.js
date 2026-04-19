// SupplementBot — WebSocket chat client
// No framework, no build step. Just connects and renders.

const messagesEl = document.getElementById('messages');
const typingEl = document.getElementById('typing-indicator');
const inputForm = document.getElementById('input-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const emergencyEl = document.getElementById('emergency-block');
const deniedEl = document.getElementById('denied-block');
const deniedMsg = document.getElementById('denied-message');
const citationsPanel = document.getElementById('citations-panel');
const citationsList = document.getElementById('citations-list');
const debugPanel = document.getElementById('debug-panel');
const debugTurns = document.getElementById('debug-turns');

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
        case 'ready':
            enableInput();
            break;

        case 'welcome':
            sessionId = msg.session_id;
            break;

        case 'typing':
            showTyping();
            break;

        case 'response':
            hideTyping();
            addAgentMessage(msg.text);
            if (msg.citations && msg.citations.length > 0) {
                showCitations(msg.citations);
            }
            if (msg.debug_llm_prompt) {
                showDebugPrompt(msg.debug_llm_prompt);
            }
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

// -- Citations --

function showCitations(citations) {
    citationsList.innerHTML = '';

    // Group by ingredient
    const byIngredient = {};
    for (const c of citations) {
        if (!byIngredient[c.ingredient]) byIngredient[c.ingredient] = [];
        byIngredient[c.ingredient].push(c);
    }

    for (const [ingredient, cites] of Object.entries(byIngredient)) {
        const group = document.createElement('div');
        group.className = 'citation-group';

        const heading = document.createElement('h3');
        heading.textContent = ingredient;
        group.appendChild(heading);

        for (const cite of cites) {
            const item = document.createElement('div');
            item.className = 'citation-item';

            const sentence = document.createElement('p');
            sentence.className = 'citation-sentence';
            sentence.textContent = cite.sentence;

            const link = document.createElement('a');
            link.href = cite.url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.className = 'citation-link';
            link.textContent = `PMID ${cite.pmid}`;

            item.appendChild(sentence);
            item.appendChild(link);
            group.appendChild(item);
        }

        citationsList.appendChild(group);
    }

    citationsPanel.classList.remove('hidden');
    document.getElementById('chat-layout').classList.add('with-citations');
}

// -- Debug prompt panel --

function showDebugPrompt(prompt) {
    const turnNum = debugTurns.children.length + 1;
    const block = document.createElement('div');
    block.className = 'debug-turn';

    const heading = document.createElement('h3');
    heading.textContent = `Turn ${turnNum}`;
    block.appendChild(heading);

    const pre = document.createElement('pre');
    pre.className = 'debug-prompt-text';
    pre.textContent = prompt;
    block.appendChild(pre);

    debugTurns.appendChild(block);
    debugPanel.classList.remove('hidden');
    document.getElementById('chat-layout').classList.add('with-debug');
}

// -- Start --

disableInput();

if (isDonor) {
    const banner = document.getElementById('donor-banner');
    banner.classList.remove('hidden');
    document.getElementById('donor-banner-close').addEventListener('click', () => {
        banner.classList.add('hidden');
    });
}

connect();
