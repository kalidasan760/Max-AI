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
    res.sendFile(
        path.join(__dirname, "www", "index.html")
    );
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
        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------
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
        // GET USER MEMORY
        // =================================================
        let memoryList = [];
        if (memoryEnabled !== false) {
            const {
                data: memories,
                error: memoryError
            } = await supabase
                .from("memories")
                .select("id, memory")
                .eq("user_id", userId)
                .order("created_at", {
                    ascending: true
                });
            if (memoryError) {
                console.error(
                    "Memory read error:",
                    memoryError
                );
            } else {
                memoryList = memories || [];
            }
        }
        // -------------------------------------------------
        // FORMAT MEMORY
        // -------------------------------------------------
        let memoryText = "No saved memories.";
        if (memoryList.length > 0) {
            memoryText = memoryList
                .map(item => `- ${item.memory}`)
                .join("\n");
        }
        // =================================================
        // GEMINI CONTENT
        // =================================================
        const parts = [];
        if (message) {
            parts.push({
                text: message
            });
        }
        // -------------------------------------------------
        // IMAGE
        // -------------------------------------------------
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
Give clear, useful and natural answers.
These are memories belonging ONLY to this user:
${memoryText}
Use these memories naturally when they are relevant.
IMPORTANT MEMORY RULES:
1. Only save information when the user explicitly asks you to remember it.
2. Examples:
"Remember my name is Rahul."
"Remember that I am a data analyst."
"Remember I like football."
3. Do NOT save random conversation.
4. Do NOT save temporary information.
5. Do NOT save sensitive personal information unless the user explicitly asks you to remember it.
6. If the user asks you to forget something, identify the matching memory.
7. Do not tell the user that you are processing memory.
At the END of your response, provide these internal instructions:
MEMORY_TO_SAVE: none
OR:
MEMORY_TO_SAVE:
- exact fact one
- exact fact two
And:
MEMORY_TO_DELETE: none
OR:
MEMORY_TO_DELETE: exact memory to delete
Do not explain these instructions.
`;
        // =================================================
        // GEMINI
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
        // EXTRACT MEMORY TO SAVE
        // =================================================
        let memoryToSave = [];
        const saveMatch =
            responseText.match(
                /MEMORY_TO_SAVE:\s*([\s\S]*?)(?=MEMORY_TO_DELETE:|$)/i
            );
        if (
            saveMatch &&
            saveMatch[1].trim() &&
            saveMatch[1].trim().toLowerCase() !== "none"
        ) {
            memoryToSave =
                saveMatch[1]
                    .split("\n")
                    .map(item =>
                        item
                            .replace(/^[-•*]\s*/, "")
                            .trim()
                    )
                    .filter(Boolean);
        }
        // =================================================
        // EXTRACT MEMORY TO DELETE
        // =================================================
        let memoryToDelete = null;
        const deleteMatch =
            responseText.match(
                /MEMORY_TO_DELETE:\s*([\s\S]*)$/i
            );
        if (
            deleteMatch &&
            deleteMatch[1].trim() &&
            deleteMatch[1].trim().toLowerCase() !== "none"
        ) {
            memoryToDelete =
                deleteMatch[1]
                    .trim()
                    .replace(/^[-•*]\s*/, "");
        }
        // =================================================
        // SAVE MEMORY
        // =================================================
        if (memoryEnabled !== false) {
            for (const memory of memoryToSave) {
                if (!memory) continue;
                const {
                    error
                } = await supabase
                    .from("memories")
                    .insert({
                        user_id: userId,
                        memory: memory
                    });
                if (error) {
                    console.error(
                        "Memory save error:",
                        error
                    );
                } else {
                    console.log(
                        "Memory saved:",
                        memory
                    );
                }
            }
        }
        // =================================================
        // DELETE MEMORY
        // =================================================
        if (
            memoryEnabled !== false &&
            memoryToDelete
        ) {
            const {
                error
            } = await supabase
                .from("memories")
                .delete()
                .eq("user_id", userId)
                .ilike(
                    "memory",
                    `%${memoryToDelete}%`
                );
            if (error) {
                console.error(
                    "Memory delete error:",
                    error
                );
            } else {
                console.log(
                    "Memory deleted:",
                    memoryToDelete
                );
            }
        }
        // =================================================
        // GET UPDATED MEMORY
        // =================================================
        let updatedMemory = "";
        if (memoryEnabled !== false) {
            const {
                data: updatedMemories,
                error: updatedMemoryError
            } = await supabase
                .from("memories")
                .select("memory")
                .eq("user_id", userId)
                .order("created_at", {
                    ascending: true
                });
            if (updatedMemoryError) {
                console.error(
                    "Updated memory read error:",
                    updatedMemoryError
                );
            } else {
                updatedMemory =
                    (updatedMemories || [])
                        .map(item => item.memory)
                        .join("\n");
            }
        }
        // =================================================
        // REMOVE INTERNAL MEMORY INSTRUCTIONS
        // =================================================
        responseText =
            responseText
                .replace(
                    /MEMORY_TO_SAVE:[\s\S]*?(?=MEMORY_TO_DELETE:|$)/i,
                    ""
                )
                .replace(
                    /MEMORY_TO_DELETE:[\s\S]*$/i,
                    ""
                )
                .trim();
        // =================================================
        // SEND RESPONSE
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
// CLEAR MEMORY
// =====================================================
app.post("/clear-memory", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is missing."
            });
        }
        const {
            error
        } = await supabase
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
                message: "Could not clear memory."
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
            message: "Could not clear memory."
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