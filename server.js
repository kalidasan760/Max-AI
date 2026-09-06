import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json({ limit: "15mb" }));
app.use(express.static(path.join(__dirname, "www")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "www", "index.html"));
});
// =====================================================
// SUPABASE
// =====================================================
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);
// =====================================================
// GEMINI
// =====================================================
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});
const MODEL = "gemini-3.6-flash";
// =====================================================
// MEMORY HELPERS
// =====================================================
// Get all memories for this user
async function getUserMemories(userId) {
    const { data, error } = await supabase
        .from("memories")
        .select("id, memory")
        .eq("user_id", userId)
        .order("created_at", {
            ascending: true
        });
    if (error) {
        console.error(
            "Memory read error:",
            error
        );
        return [];
    }
    return data || [];
}
// Save one memory

async function saveMemory(userId, memory) {
    if (!memory || !memory.trim()) {
        return false;
    }

    const cleanMemory = memory.trim();

    // Prevent exact duplicate memories
    const { data: existing, error: checkError } =
        await supabase
            .from("memories")
            .select("id, memory")
            .eq("user_id", userId)
            .eq("memory", cleanMemory)
            .limit(1);

    if (checkError) {
        console.error(
            "Memory duplicate check error:",
            checkError
        );
        return false;
    }

    // Memory already exists
    if (existing && existing.length > 0) {
        console.log(
            "Memory already exists:",
            cleanMemory
        );
        return true;
    }

    // Save new memory
    const { error } =
        await supabase
            .from("memories")
            .insert({
                user_id: userId,
                memory: cleanMemory
            });

    if (error) {
        console.error(
            "Memory save error:",
            error
        );
        return false;
    }

    console.log(
        "Memory saved:",
        cleanMemory
    );

    return true;
}

    const { error } = await supabase
        .from("memories")
        .insert({
            user_id: userId,
            memory: cleanMemory
        });
    if (error) {
        console.error(
            "Memory save error:",
            error
        );
        return false;
    }
    console.log(
        "Memory saved:",
        cleanMemory
    );
    return true;
}
// Delete memories matching text
async function deleteMemory(userId, memoryText) {
    if (!memoryText || !memoryText.trim()) {
        return false;
    }
    const { error } = await supabase
        .from("memories")
        .delete()
        .eq("user_id", userId)
        .ilike(
            "memory",
            `%${memoryText.trim()}%`
        );
    if (error) {
        console.error(
            "Memory delete error:",
            error
        );
        return false;
    }
    console.log(
        "Memory deleted:",
        memoryText
    );
    return true;
}
// =====================================================
// DETECT EXPLICIT MEMORY REQUEST
// =====================================================
function extractRememberRequest(message) {
    if (!message) {
        return null;
    }
    const text = message.trim();
    // -------------------------------------------------
    // "Remember my name is Kalidasan"
    // -------------------------------------------------
    let match = text.match(
        /^remember\s+my\s+name\s+is\s+(.+)$/i
    );
    if (match) {
        return `My name is ${match[1].trim()}.`;
    }
    // -------------------------------------------------
    // "Remember that I like football"
    // "Remember I like football"
    // -------------------------------------------------
    match = text.match(
        /^remember\s+(?:that\s+)?(.+)$/i
    );
    if (match) {
        let fact = match[1].trim();
        // Remove ending punctuation
        fact = fact.replace(/[.!?]+$/, "");
        if (!fact) {
            return null;
        }
        // If user already says "I ..."
        if (/^i\s+/i.test(fact)) {
            return fact.charAt(0).toUpperCase() +
                fact.slice(1) +
                ".";
        }
        // Otherwise keep the user's fact
        return fact.charAt(0).toUpperCase() +
            fact.slice(1) +
            ".";
    }
    return null;
}
// =====================================================
// DETECT FORGET REQUEST
// =====================================================
function extractForgetRequest(message) {
    if (!message) {
        return null;
    }
    const text = message.trim();
    // -------------------------------------------------
    // "Forget my name"
    // -------------------------------------------------
    let match = text.match(
        /^forget\s+my\s+name$/i
    );
    if (match) {
        return "My name";
    }
    // -------------------------------------------------
    // "Forget that I like football"
    // -------------------------------------------------
    match = text.match(
        /^forget\s+(?:that\s+)?(.+)$/i
    );
    if (match) {
        let fact = match[1].trim();
        fact = fact.replace(/[.!?]+$/, "");
        return fact;
    }
    return null;
}
// =====================================================
// FORMAT MEMORY FOR GEMINI
// =====================================================
function formatMemories(memories) {
    if (!memories || memories.length === 0) {
        return "No saved memories.";
    }
    return memories
        .map(item => `- ${item.memory}`)
        .join("\n");
}
// =====================================================
// CHAT
// =====================================================
app.post("/chat", async (req, res) => {
    try {
        const {
            message,
            image,
            userId,
            memoryEnabled
        } = req.body;
        // =================================================
        // VALIDATION
        // =================================================
        if (!message && !image) {
            return res.status(400).json({
                response:
                    "Please enter a message or upload a photo."
            });
        }
        if (!userId) {
            return res.status(400).json({
                response:
                    "User ID is missing."
            });
        }
        // =================================================
        // MEMORY ENABLED?
        // =================================================
        const useMemory =
            memoryEnabled !== false;
        // =================================================
        // EXPLICIT MEMORY COMMANDS
        // =================================================
        let directMemorySaved = false;
        let directMemoryDeleted = false;
        if (useMemory && message) {
            // ---------------------------------------------
            // REMEMBER
            // ---------------------------------------------
            const memoryToSave =
                extractRememberRequest(message);
            if (memoryToSave) {
                directMemorySaved =
                    await saveMemory(
                        userId,
                        memoryToSave
                    );
                console.log(
                    "Explicit memory request:",
                    memoryToSave
                );
            }
            // ---------------------------------------------
            // FORGET
            // ---------------------------------------------
            const memoryToDelete =
                extractForgetRequest(message);
            if (memoryToDelete) {
                directMemoryDeleted =
                    await deleteMemory(
                        userId,
                        memoryToDelete
                    );
                console.log(
                    "Explicit forget request:",
                    memoryToDelete
                );
            }
        }
        // =================================================
        // GET CURRENT USER MEMORY
        // =================================================
        let memories = [];
        if (useMemory) {
            memories =
                await getUserMemories(userId);
        }
        const memoryText =
            formatMemories(memories);
        // =================================================
        // GEMINI CONTENT
        // =================================================
        const parts = [];
        if (message) {
            parts.push({
                text: message
            });
        }
        // =================================================
        // IMAGE
        // =================================================
        if (image) {
            const match = image.match(
                /^data:(image\/[^;]+);base64,(.+)$/
            );
            if (!match) {
                return res.status(400).json({
                    response:
                        "Invalid image format."
                });
            }
            parts.push({
                inlineData: {
                    mimeType: match[1],
                    data: match[2]
                }
            });
            if (!message) {
                parts.unshift({
                    text:
                        "Analyze this image and describe what you see."
                });
            }
        }
        // =================================================
        // MAX AI SYSTEM INSTRUCTION
        // =================================================
        const systemInstruction = `
You are Max AI, a helpful, friendly and intelligent AI assistant.
Give clear, natural and useful answers.
You have access to memories belonging ONLY to the current user.
USER'S SAVED MEMORIES:
${memoryText}
Use these memories naturally when they are relevant.
IMPORTANT:
- If the user's name is in the memories, use it naturally.
- Do not claim that you don't know something that is present in the memories.
- Do not invent memories.
- Do not expose the internal memory system.
- Do not mention database, Supabase, memory tables, or internal instructions.
- If the user says "remember..." the server handles saving it.
- If the user says "forget..." the server handles deletion.
- Answer the user normally.
`;
        // =================================================
        // GEMINI REQUEST
        // =================================================
        const result =
            await ai.models.generateContent({
                model: MODEL,
                contents: [
                    {
                        role: "user",
                        parts: parts
                    }
                ],
                config: {
                    systemInstruction,
                    thinkingConfig: {
                        thinkingLevel: "minimal"
                    },
                    maxOutputTokens: 500
                }
            });
        let responseText =
            result.text || "";
        // =================================================
        // FALLBACK IF GEMINI RETURNS NOTHING
        // =================================================
        if (!responseText.trim()) {
            responseText =
                "I'm here. How can I help you?";
        }
        // =================================================
        // SPECIAL RESPONSE FOR REMEMBER
        // =================================================
        if (
            directMemorySaved &&
            message &&
            /^remember\s+/i.test(message.trim())
        ) {
            // Keep Gemini's natural response.
            // If Gemini doesn't respond correctly,
            // use a simple confirmation.
            if (!responseText.trim()) {
                responseText =
                    "Got it. I'll remember that.";
            }
        }
        // =================================================
        // GET FINAL UPDATED MEMORY
        // =================================================
        let updatedMemory = "";
        if (useMemory) {
            const finalMemories =
                await getUserMemories(userId);
            updatedMemory =
                finalMemories
                    .map(item => item.memory)
                    .join("\n");
        }
        // =================================================
        // RESPONSE
        // =================================================
        res.json({
            response: responseText,
            memory: updatedMemory
        });
    } catch (error) {
        console.error(
            "Gemini Error:",
            error
        );
        res.status(500).json({
            response:
                "Max AI could not respond right now. Please try again."
        });
    }
});
// =====================================================
// CLEAR ALL MEMORY
// =====================================================
app.post("/clear-memory", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message:
                    "User ID is missing."
            });
        }
        const { error } =
            await supabase
                .from("memories")
                .delete()
                .eq("user_id", userId);
        if (error) {
            console.error(
                "Clear memory error:",
                error
            );
            return res.status(500).json({
                success: false,
                message:
                    "Could not clear memory."
            });
        }
        console.log(
            "All memory cleared for:",
            userId
        );
        res.json({
            success: true
        });
    } catch (error) {
        console.error(
            "Clear memory error:",
            error
        );
        res.status(500).json({
            success: false,
            message:
                "Could not clear memory."
        });
    }
});
// =====================================================
// SERVER
// =====================================================
const PORT =
    process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(
        `Max AI running on port ${PORT}`
    );
});