const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    // Append User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'flex items-start space-x-3 justify-end';
    userDiv.innerHTML = `
        <div class="bg-black text-white p-3.5 rounded-2xl max-w-[80%] text-sm">${escapeHtml(message)}</div>
    `;
    chatContainer.appendChild(userDiv);
    userInput.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Append AI Loading/Response Bubble
    const aiDiv = document.createElement('div');
    aiDiv.className = 'flex items-start space-x-3';
    aiDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 shrink-0 text-xs">AI</div>
        <div class="bg-gray-100 p-3.5 rounded-2xl max-w-[80%] text-sm text-gray-800 ai-response">Thinking...</div>
    `;
    chatContainer.appendChild(aiDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const responseBubble = aiDiv.querySelector('.ai-response');

    try {
        const res = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        responseBubble.textContent = ''; // Clear "Thinking..."

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.substring(6));
                    fullText += data.response;
                    responseBubble.textContent = fullText;
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
            }
        }
    } catch (err) {
        responseBubble.textContent = 'Error connecting to Max AI server.';
    }
});

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}