const form = document.getElementById("chat-form");

const input = document.getElementById("user-input");

const chat = document.getElementById("chat-container");

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const message = input.value.trim();

    if (!message) return;

    // Show user message

    const userMessage = document.createElement("div");

    userMessage.className = "flex justify-end";

    userMessage.innerHTML = `

        <div class="bg-black text-white p-3 rounded-2xl max-w-[80%] text-sm">

            ${escapeHTML(message)}

        </div>

    `;

    chat.appendChild(userMessage);

    input.value = "";

    input.disabled = true;

    // Show loading message

    const loading = document.createElement("div");

    loading.className = "flex items-start space-x-3";

    loading.innerHTML = `

        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 shrink-0 text-xs">

            AI

        </div>

        <div class="bg-gray-100 p-3.5 rounded-2xl text-sm text-gray-800">

            Max AI is thinking...

        </div>

    `;

    chat.appendChild(loading);

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

        const data = await response.json();

        loading.remove();

        const aiMessage = document.createElement("div");

        aiMessage.className = "flex items-start space-x-3";

        aiMessage.innerHTML = `

            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 shrink-0 text-xs">

                AI

            </div>

            <div class="bg-gray-100 p-3.5 rounded-2xl max-w-[80%] text-sm text-gray-800">

                ${escapeHTML(data.response || "No response from Max AI.")}

            </div>

        `;

        chat.appendChild(aiMessage);

    } catch (error) {

        loading.remove();

        const errorMessage = document.createElement("div");

        errorMessage.className = "flex items-start space-x-3";

        errorMessage.innerHTML = `

            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-700 shrink-0 text-xs">

                AI

            </div>

            <div class="bg-gray-100 p-3.5 rounded-2xl text-sm text-red-600">

                Connection error. Please try again.

            </div>

        `;

        chat.appendChild(errorMessage);

        console.error(error);

    }

    input.disabled = false;

    input.focus();

    chat.scrollTop = chat.scrollHeight;

});

function escapeHTML(text) {

    const div = document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}