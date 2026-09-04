// Max AI - Chat

const chatForm = document.getElementById("chat-form");

const userInput = document.getElementById("user-input");

const chatContainer = document.getElementById("chat-container");

chatForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const message = userInput.value.trim();

    if (!message) return;

    // Show user's message

    addMessage(message, "user");

    // Clear input

    userInput.value = "";

    // Disable input while Max AI responds

    userInput.disabled = true;

    const thinkingMessage = addMessage(

        "Max AI is thinking...",

        "ai"

    );

    try {

        const response = await fetch("/chat", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                message: message

            })

        });

        if (!response.ok) {

            throw new Error(

                `Server error: ${response.status}`

            );

        }

        const data = await response.json();

        // Remove "thinking..."

        thinkingMessage.remove();

        if (data.response) {

            addMessage(data.response, "ai");

        } else {

            addMessage(

                "Max AI didn't return a response.",

                "ai"

            );

        }

    } catch (error) {

        console.error("Max AI Error:", error);

        thinkingMessage.remove();

        addMessage(

            "Sorry, Max AI couldn't connect to the server.",

            "ai"

        );

    }

    userInput.disabled = false;

    userInput.focus();

});

// Add message to chat

function addMessage(text, type) {

    const wrapper = document.createElement("div");

    if (type === "user") {

        wrapper.className =

            "flex items-start justify-end space-x-3";

        wrapper.innerHTML = `

            <div class="bg-black text-white p-3.5 rounded-2xl max-w-[80%] text-sm">

                ${escapeHTML(text)}

            </div>

        `;

    } else {

        wrapper.className =

            "flex items-start space-x-3";

        wrapper.innerHTML = `

            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 shrink-0 text-xs">

                AI

            </div>

            <div class="bg-gray-100 p-3.5 rounded-2xl max-w-[80%] text-sm text-gray-800">

                ${escapeHTML(text)}

            </div>

        `;

    }

    chatContainer.appendChild(wrapper);

    // Scroll to newest message

    chatContainer.scrollTop = chatContainer.scrollHeight;

    return wrapper;

}

// Protect against HTML injection

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}