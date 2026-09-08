const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const chat = document.getElementById("chat-container");

const emojiBtn = document.getElementById("emoji-btn");
const emojiPanel = document.getElementById("emoji-panel");

const photoBtn = document.getElementById("photo-btn");
const photoInput = document.getElementById("photo-input");

const imagePreviewContainer =
    document.getElementById("image-preview-container");

const imagePreview =
    document.getElementById("image-preview");

const removeImageBtn =
    document.getElementById("remove-image-btn");

const voiceBtn =
    document.getElementById("voice-btn");

const sendBtn =
    document.getElementById("send-btn");

const settingsBtn =
    document.getElementById("settings-btn");

const settingsPanel =
    document.getElementById("settings-panel");

const closeSettingsBtn =
    document.getElementById("close-settings-btn");

const settingsDoneBtn =
    document.getElementById("settings-done-btn");

const memoryToggle =
    document.getElementById("memory-toggle");

const clearChatBtn =
    document.getElementById("clear-chat-btn");

const clearMemoryBtn =
    document.getElementById("clear-memory-btn");

const newChatBtn =
    document.getElementById("new-chat-btn");


// =====================================================
// MAX AI USER ID
// IMPORTANT: CREATE ONCE AND REUSE FOREVER
// =====================================================

const USER_ID_STORAGE_KEY = "max_ai_user_id";

let MAX_AI_USER_ID =
    localStorage.getItem(USER_ID_STORAGE_KEY);

if (!MAX_AI_USER_ID) {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {
        MAX_AI_USER_ID =
            window.crypto.randomUUID();
    } else {

        MAX_AI_USER_ID =
            "max-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2);
    }

    localStorage.setItem(
        USER_ID_STORAGE_KEY,
        MAX_AI_USER_ID
    );
}

console.log(
    "Max AI User ID:",
    MAX_AI_USER_ID
);


// =====================================================
// STORAGE KEYS
// =====================================================

const CHAT_STORAGE_KEY =
    "max_ai_chat";

const MEMORY_ENABLED_KEY =
    "max_ai_memory_enabled";


// =====================================================
// SELECTED IMAGE
// =====================================================

let selectedImage = null;


// =====================================================
// EMOJI
// =====================================================

if (
    emojiBtn &&
    emojiPanel
) {

    emojiBtn.addEventListener(
        "click",
        () => {

            emojiPanel.classList.toggle(
                "hidden"
            );
        }
    );
}

document
    .querySelectorAll(".emoji-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                if (!input) return;

                input.value +=
                    button.textContent;

                input.focus();

                if (emojiPanel) {

                    emojiPanel.classList.add(
                        "hidden"
                    );
                }
            }
        );
    });


// =====================================================
// PHOTO
// =====================================================

if (
    photoBtn &&
    photoInput
) {

    photoBtn.addEventListener(
        "click",
        () => {

            photoInput.click();
        }
    );
}

if (photoInput) {

    photoInput.addEventListener(
        "change",
        event => {

            const file =
                event.target.files[0];

            if (!file) return;

            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                alert(
                    "Please select an image."
                );

                photoInput.value = "";

                return;
            }

            const reader =
                new FileReader();

            reader.onload =
                event => {

                    selectedImage =
                        event.target.result;

                    if (imagePreview) {

                        imagePreview.src =
                            selectedImage;
                    }

                    if (
                        imagePreviewContainer
                    ) {

                        imagePreviewContainer.classList.remove(
                            "hidden"
                        );
                    }
                };

            reader.onerror =
                () => {

                    alert(
                        "Could not read the image."
                    );
                };

            reader.readAsDataURL(file);
        }
    );
}


if (removeImageBtn) {

    removeImageBtn.addEventListener(
        "click",
        () => {

            removeSelectedImage();
        }
    );
}


function removeSelectedImage() {

    selectedImage = null;

    if (photoInput) {

        photoInput.value = "";
    }

    if (imagePreview) {

        imagePreview.src = "";
    }

    if (
        imagePreviewContainer
    ) {

        imagePreviewContainer.classList.add(
            "hidden"
        );
    }
}


// =====================================================
// VOICE
// =====================================================

let recognition = null;

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (
    SpeechRecognition &&
    voiceBtn
) {

    recognition =
        new SpeechRecognition();

    recognition.lang =
        "en-US";

    recognition.continuous =
        false;

    recognition.interimResults =
        false;


    voiceBtn.addEventListener(
        "click",
        () => {

            try {

                recognition.start();

                voiceBtn.classList.add(
                    "recording"
                );

            } catch (error) {

                console.log(
                    "Voice already running."
                );
            }
        }
    );


    recognition.onresult =
        event => {

            const transcript =
                event.results[0][0]
                    .transcript;

            if (!input) return;

            input.value +=
                (
                    input.value
                        ? " "
                        : ""
                ) + transcript;

            input.focus();
        };


    recognition.onend =
        () => {

            voiceBtn.classList.remove(
                "recording"
            );
        };


    recognition.onerror =
        error => {

            console.log(
                "Voice error:",
                error
            );

            voiceBtn.classList.remove(
                "recording"
            );

            if (
                error.error !==
                "no-speech"
            ) {

                alert(
                    "Voice input is not available in this browser."
                );
            }
        };

} else if (voiceBtn) {

    voiceBtn.addEventListener(
        "click",
        () => {

            alert(
                "Voice input is not supported in this browser."
            );
        }
    );
}


// =====================================================
// SETTINGS
// =====================================================

if (
    settingsBtn &&
    settingsPanel
) {

    settingsBtn.addEventListener(
        "click",
        () => {

            settingsPanel.classList.remove(
                "hidden"
            );
        }
    );
}


if (
    closeSettingsBtn &&
    settingsPanel
) {

    closeSettingsBtn.addEventListener(
        "click",
        () => {

            settingsPanel.classList.add(
                "hidden"
            );
        }
    );
}


if (
    settingsDoneBtn &&
    settingsPanel
) {

    settingsDoneBtn.addEventListener(
        "click",
        () => {

            settingsPanel.classList.add(
                "hidden"
            );
        }
    );
}


// =====================================================
// MEMORY SETTING
// =====================================================

if (memoryToggle) {

    const savedMemorySetting =
        localStorage.getItem(
            MEMORY_ENABLED_KEY
        );

    memoryToggle.checked =
        savedMemorySetting !== "false";


    memoryToggle.addEventListener(
        "change",
        () => {

            localStorage.setItem(
                MEMORY_ENABLED_KEY,
                memoryToggle.checked
                    ? "true"
                    : "false"
            );

            console.log(
                "Max AI Memory:",
                memoryToggle.checked
                    ? "ON"
                    : "OFF"
            );
        }
    );
}


// =====================================================
// IS MEMORY ENABLED?
// =====================================================

function isMemoryEnabled() {

    if (memoryToggle) {

        return memoryToggle.checked;
    }

    return (
        localStorage.getItem(
            MEMORY_ENABLED_KEY
        ) !== "false"
    );
}


// =====================================================
// CLEAR MEMORY
// =====================================================

if (clearMemoryBtn) {

    clearMemoryBtn.addEventListener(
        "click",
        async () => {

            if (
                !confirm(
                    "Are you sure you want to clear all Max AI memories?"
                )
            ) {
                return;
            }

            clearMemoryBtn.disabled =
                true;

            try {

                const response =
                    await fetch(
                        "/clear-memory",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    userId:
                                        MAX_AI_USER_ID
                                })
                        }
                    );

                const data =
                    await response.json();

                if (
                    response.ok &&
                    data.success
                ) {

                    alert(
                        "Max AI memory cleared."
                    );

                } else {

                    alert(
                        data.message ||
                        "Could not clear Max AI memory."
                    );
                }

            } catch (error) {

                console.error(
                    "Server memory clear error:",
                    error
                );

                alert(
                    "Unable to connect to Max AI."
                );

            } finally {

                clearMemoryBtn.disabled =
                    false;
            }
        }
    );
}


// =====================================================
// CLEAR CHAT
// =====================================================

if (clearChatBtn) {

    clearChatBtn.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                CHAT_STORAGE_KEY
            );

            if (chat) {

                chat.innerHTML = "";
            }

            addAIMessage(
                "Hello! I'm Max AI. How can I help you?"
            );
        }
    );
}


// =====================================================
// NEW CHAT
// =====================================================

if (newChatBtn) {

    newChatBtn.addEventListener(
        "click",
        () => {

            if (chat) {

                chat.innerHTML = "";
            }

            // New chat only clears the visible
            // conversation. It DOES NOT clear memory.

            addAIMessage(
                "New chat started. How can I help?"
            );

            if (input) {

                input.focus();
            }
        }
    );
}


// =====================================================
// LOAD CHAT HISTORY
// =====================================================

function loadChatHistory() {

    if (!chat) return;

    const saved =
        localStorage.getItem(
            CHAT_STORAGE_KEY
        );

    if (!saved) {

        addAIMessage(
            "Hello! I'm Max AI. How can I help?"
        );

        return;
    }

    try {

        const messages =
            JSON.parse(saved);

        if (
            !Array.isArray(messages) ||
            messages.length === 0
        ) {

            addAIMessage(
                "Hello! I'm Max AI. How can I help?"
            );

            return;
        }

        messages.forEach(
            message => {

                if (
                    message.role ===
                    "user"
                ) {

                    addUserMessage(
                        message.text,
                        false
                    );
                }

                if (
                    message.role ===
                    "assistant"
                ) {

                    addAIMessage(
                        message.text,
                        false
                    );
                }
            }
        );

        scrollToBottom();

    } catch (error) {

        console.error(
            "Chat history error:",
            error
        );

        localStorage.removeItem(
            CHAT_STORAGE_KEY
        );

        addAIMessage(
            "Hello! I'm Max AI. How can I help?"
        );
    }
}


// =====================================================
// SAVE CHAT
// =====================================================

function saveChat() {

    if (!chat) return;

    const messages = [];

    chat
        .querySelectorAll(
            ".message"
        )
        .forEach(message => {

            const isUser =
                message.classList.contains(
                    "user-message"
                );

            messages.push({

                role:
                    isUser
                        ? "user"
                        : "assistant",

                text:
                    message.textContent
            });
        });

    localStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages)
    );
}


// =====================================================
// SEND MESSAGE
// =====================================================

if (form) {

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const message =
                input
                    ? input.value.trim()
                    : "";

            if (
                !message &&
                !selectedImage
            ) {

                return;
            }


            // =================================================
            // SHOW USER MESSAGE
            // =================================================

            addUserMessage(
                message || "Image"
            );


            // =================================================
            // CLEAR INPUT
            // =================================================

            if (input) {

                input.value = "";
            }


            // =================================================
            // SAVE IMAGE BEFORE REMOVING PREVIEW
            // =================================================

            const imageToSend =
                selectedImage;


            removeSelectedImage();


            // =================================================
            // LOADING
            // =================================================

            const loading =
                addLoadingMessage();


            if (sendBtn) {

                sendBtn.disabled =
                    true;
            }

            if (input) {

                input.disabled =
                    true;
            }


            try {

                // =================================================
                // SEND TO SERVER
                // IMPORTANT:
                // DO NOT SEND LOCAL MEMORY.
                // SERVER/SUPABASE IS THE SOURCE OF TRUTH.
                // =================================================

                const response =
                    await fetch(
                        "/chat",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    message:
                                        message,

                                    image:
                                        imageToSend,

                                    userId:
                                        MAX_AI_USER_ID,

                                    memoryEnabled:
                                        isMemoryEnabled()
                                })
                        }
                    );


                // =================================================
                // READ RESPONSE
                // =================================================

                let data;

                try {

                    data =
                        await response.json();

                } catch (jsonError) {

                    throw new Error(
                        "Invalid server response."
                    );
                }


                // =================================================
                // REMOVE LOADING
                // =================================================

                if (loading) {

                    loading.remove();
                }


                // =================================================
                // SERVER ERROR
                // =================================================

                if (!response.ok) {

                    addErrorMessage(
                        data.response ||
                        "Max AI could not respond right now."
                    );

                    return;
                }


                // =================================================
                // AI RESPONSE
                // =================================================

                if (data.response) {

                    addAIMessage(
                        data.response
                    );

                } else {

                    addErrorMessage(
                        "Max AI could not respond."
                    );
                }


                // =================================================
                // IMPORTANT
                // SERVER MEMORY IS SUPABASE.
                //
                // We intentionally do NOT save data.memory
                // into a separate local memory database.
                //
                // This prevents localStorage and Supabase
                // from getting out of sync.
                // =================================================

            } catch (error) {

                console.error(
                    "Max AI error:",
                    error
                );

                if (loading) {

                    loading.remove();
                }

                addErrorMessage(
                    "Unable to connect to Max AI."
                );

            } finally {

                if (sendBtn) {

                    sendBtn.disabled =
                        false;
                }

                if (input) {

                    input.disabled =
                        false;

                    input.focus();
                }
            }
        }
    );
}


// =====================================================
// MESSAGE FUNCTIONS
// =====================================================

function addUserMessage(
    text,
    save = true
) {

    if (!chat) return;

    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message user-message";

    message.textContent =
        text || "";

    chat.appendChild(
        message
    );

    scrollToBottom();

    if (save) {

        saveChat();
    }
}


function addAIMessage(
    text,
    save = true
) {

    if (!chat) return;

    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message ai-message";

    message.innerHTML =
        escapeHTML(
            text || ""
        );

    chat.appendChild(
        message
    );

    scrollToBottom();

    if (save) {

        saveChat();
    }
}


function addLoadingMessage() {

    if (!chat) return null;

    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message ai-message";

    message.textContent =
        "Max AI is thinking...";

    chat.appendChild(
        message
    );

    scrollToBottom();

    return message;
}


function addErrorMessage(
    text
) {

    if (!chat) return;

    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message ai-message error";

    message.textContent =
        text || "Something went wrong.";

    chat.appendChild(
        message
    );

    scrollToBottom();

    saveChat();
}


// =====================================================
// HELPERS
// =====================================================

function scrollToBottom() {

    if (!chat) return;

    chat.scrollTop =
        chat.scrollHeight;
}


function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


// =====================================================
// START MAX AI
// =====================================================

loadChatHistory();

if (input) {

    input.focus();
}

console.log(
    "================================="
);

console.log(
    "MAX AI STARTED"
);

console.log(
    "USER ID:",
    MAX_AI_USER_ID
);

console.log(
    "MEMORY:",
    isMemoryEnabled()
        ? "ON"
        : "OFF"
);

console.log(
    "================================="
);