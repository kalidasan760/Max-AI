const form = document.getElementById("chat-form");

const input = document.getElementById("user-input");

const chat = document.getElementById("chat-container");

const emojiBtn = document.getElementById("emoji-btn");

const emojiPanel = document.getElementById("emoji-panel");

const photoBtn = document.getElementById("photo-btn");

const photoInput = document.getElementById("photo-input");

const imagePreviewContainer = document.getElementById("image-preview-container");

const imagePreview = document.getElementById("image-preview");

const removeImageBtn = document.getElementById("remove-image-btn");

const voiceBtn = document.getElementById("voice-btn");

const sendBtn = document.getElementById("send-btn");

const settingsBtn = document.getElementById("settings-btn");

const settingsPanel = document.getElementById("settings-panel");

const closeSettingsBtn = document.getElementById("close-settings-btn");

const settingsDoneBtn = document.getElementById("settings-done-btn");

const memoryToggle = document.getElementById("memory-toggle");

const clearChatBtn = document.getElementById("clear-chat-btn");

const clearMemoryBtn = document.getElementById("clear-memory-btn");

const newChatBtn = document.getElementById("new-chat-btn");

let selectedImage = null;

const CHAT_STORAGE_KEY = "max_ai_chat";

const MEMORY_STORAGE_KEY = "max_ai_memory";

const MEMORY_ENABLED_KEY = "max_ai_memory_enabled";

// ===============================

// EMOJI

// ===============================

if (emojiBtn) {

    emojiBtn.addEventListener("click", () => {

        emojiPanel.classList.toggle("hidden");

    });

}

document.querySelectorAll(".emoji-btn").forEach(button => {

    button.addEventListener("click", () => {

        input.value += button.textContent;

        input.focus();

        emojiPanel.classList.add("hidden");

    });

});

// ===============================

// PHOTO

// ===============================

if (photoBtn && photoInput) {

    photoBtn.addEventListener("click", () => {

        photoInput.click();

    });

}

if (photoInput) {

    photoInput.addEventListener("change", event => {

        const file = event.target.files[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {

            alert("Please select an image.");

            return;

        }

        const reader = new FileReader();

        reader.onload = event => {

            selectedImage = event.target.result;

            imagePreview.src = selectedImage;

            imagePreviewContainer.classList.remove("hidden");

        };

        reader.readAsDataURL(file);

    });

}

if (removeImageBtn) {

    removeImageBtn.addEventListener("click", () => {

        removeSelectedImage();

    });

}

function removeSelectedImage() {

    selectedImage = null;

    if (photoInput) {

        photoInput.value = "";

    }

    if (imagePreview) {

        imagePreview.src = "";

    }

    if (imagePreviewContainer) {

        imagePreviewContainer.classList.add("hidden");

    }

}

// ===============================

// VOICE

// ===============================

let recognition = null;

const SpeechRecognition =

    window.SpeechRecognition ||

    window.webkitSpeechRecognition;

if (SpeechRecognition && voiceBtn) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = false;

    voiceBtn.addEventListener("click", () => {

        try {

            recognition.start();

            voiceBtn.classList.add("recording");

        } catch (error) {

            console.log("Voice already running.");

        }

    });

    recognition.onresult = event => {

        const transcript =

            event.results[0][0].transcript;

        input.value +=

            (input.value ? " " : "") + transcript;

        input.focus();

    };

    recognition.onend = () => {

        voiceBtn.classList.remove("recording");

    };

    recognition.onerror = error => {

        console.log("Voice error:", error);

        voiceBtn.classList.remove("recording");

        alert("Voice input is not available in this browser.");

    };

} else if (voiceBtn) {

    voiceBtn.addEventListener("click", () => {

        alert("Voice input is not supported in this browser.");

    });

}

// ===============================

// SETTINGS

// ===============================

if (settingsBtn) {

    settingsBtn.addEventListener("click", () => {

        settingsPanel.classList.remove("hidden");

    });

}

if (closeSettingsBtn) {

    closeSettingsBtn.addEventListener("click", () => {

        settingsPanel.classList.add("hidden");

    });

}

if (settingsDoneBtn) {

    settingsDoneBtn.addEventListener("click", () => {

        settingsPanel.classList.add("hidden");

    });

}

// ===============================

// MEMORY

// ===============================

if (memoryToggle) {

    const savedMemorySetting =

        localStorage.getItem(MEMORY_ENABLED_KEY);

    memoryToggle.checked =

        savedMemorySetting !== "false";

    memoryToggle.addEventListener("change", () => {

        localStorage.setItem(

            MEMORY_ENABLED_KEY,

            memoryToggle.checked

        );

    });

}

if (clearMemoryBtn) {

    clearMemoryBtn.addEventListener("click", () => {

        localStorage.removeItem(MEMORY_STORAGE_KEY);

        alert("Max AI memory cleared.");

    });

}

// ===============================

// CLEAR CHAT

// ===============================

if (clearChatBtn) {

    clearChatBtn.addEventListener("click", () => {

        localStorage.removeItem(CHAT_STORAGE_KEY);

        chat.innerHTML = "";

        addAIMessage(

            "Hello! I'm Max AI. How can I help you?"

        );

    });

}

// ===============================

// NEW CHAT

// ===============================

if (newChatBtn) {

    newChatBtn.addEventListener("click", () => {

        chat.innerHTML = "";

        addAIMessage(

            "New chat started. How can I help?"

        );

        input.focus();

    });

}

// ===============================

// LOAD CHAT HISTORY

// ===============================

function loadChatHistory() {

    const saved =

        localStorage.getItem(CHAT_STORAGE_KEY);

    if (!saved) {

        addAIMessage(

            "Hello! I'm Max AI. How can I help you?"

        );

        return;

    }

    try {

        const messages =

            JSON.parse(saved);

        messages.forEach(message => {

            if (message.role === "user") {

                addUserMessage(message.text);

            }

            if (message.role === "assistant") {

                addAIMessage(message.text);

            }

        });

    } catch (error) {

        console.log("Chat history error:", error);

    }

}

// ===============================

// SAVE CHAT

// ===============================

function saveChat() {

    const messages = [];

    chat.querySelectorAll(".message").forEach(message => {

        const isUser =

            message.classList.contains("user-message");

        messages.push({

            role: isUser ? "user" : "assistant",

            text: message.textContent

        });

    });

    localStorage.setItem(

        CHAT_STORAGE_KEY,

        JSON.stringify(messages)

    );

}

// ===============================

// SEND MESSAGE

// ===============================

form.addEventListener("submit", async event => {

    event.preventDefault();

    const message =

        input.value.trim();

    if (!message && !selectedImage) {

        return;

    }

    addUserMessage(

        message || "Image"

    );

    input.value = "";

    const imageToSend =

        selectedImage;

    removeSelectedImage();

    const loading =

        addLoadingMessage();

    sendBtn.disabled = true;

    input.disabled = true;

    try {

        const response =

            await fetch("/chat", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    message: message,

                    image: imageToSend

                })

            });

        const data =

            await response.json();

        loading.remove();

        if (data.response) {

            addAIMessage(

                data.response

            );

        } else {

            addErrorMessage(

                "Max AI could not respond."

            );

        }

    } catch (error) {

        console.error(error);

        loading.remove();

        addErrorMessage(

            "Unable to connect to Max AI."

        );

    } finally {

        sendBtn.disabled = false;

        input.disabled = false;

        input.focus();

    }

});

// ===============================

// MESSAGE FUNCTIONS

// ===============================

function addUserMessage(text) {

    const message =

        document.createElement("div");

    message.className =

        "message user-message";

    message.textContent =

        text;

    chat.appendChild(message);

    scrollToBottom();

    saveChat();

}

function addAIMessage(text) {

    const message =

        document.createElement("div");

    message.className =

        "message ai-message";

    message.innerHTML =

        escapeHTML(text);

    chat.appendChild(message);

    scrollToBottom();

    saveChat();

}

function addLoadingMessage() {

    const message =

        document.createElement("div");

    message.className =

        "message ai-message";

    message.textContent =

        "Max AI is thinking...";

    chat.appendChild(message);

    scrollToBottom();

    return message;

}

function addErrorMessage(text) {

    const message =

        document.createElement("div");

    message.className =

        "message ai-message error";

    message.textContent =

        text;

    chat.appendChild(message);

    scrollToBottom();

}

// ===============================

// HELPERS

// ===============================

function scrollToBottom() {

    chat.scrollTop =

        chat.scrollHeight;

}

function escapeHTML(text) {

    const div =

        document.createElement("div");

    div.textContent =

        text;

    return div.innerHTML;

}

// ===============================

// START

// ===============================

loadChatHistory();

input.focus();