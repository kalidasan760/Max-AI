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

// ===============================

// SUPABASE

// ===============================

const supabase = createClient(

    process.env.SUPABASE_URL,

    process.env.SUPABASE_SECRET_KEY

);

// ===============================

// GEMINI

// ===============================

const ai = new GoogleGenAI({

    apiKey: process.env.GEMINI_API_KEY

});

const MODEL = "gemini-3.6-flash";

// ===============================

// CHAT

// ===============================

app.post("/chat", async (req, res) => {

    try {

        const {

            message,

            image,

            userId

        } = req.body;

        if (!message && !image) {

            return res.status(400).json({

                response: "Please enter a message or upload a photo."

            });

        }

        if (!userId) {

            return res.status(400).json({

                response: "User ID is missing."

            });

        }

        // ===============================

        // GET USER MEMORY

        // ===============================

        const { data: memories, error: memoryError } =

            await supabase

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

        }

        const memoryList = memories || [];

        let memoryText = "No saved memories.";

        if (memoryList.length > 0) {

            memoryText = memoryList

                .map(item => `- ${item.memory}`)

                .join("\n");

        }

        // ===============================

        // GEMINI CONTENT

        // ===============================

        const parts = [];

        if (message) {

            parts.push({

                text: message

            });

        }

        if (image) {

            const match = image.match(

                /^data:(image\/[^;]+);base64,(.+)$/

            );

            if (!match) {

                return res.status(400).json({

                    response: "Invalid image format."

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

        // ===============================

        // MAX AI INSTRUCTION

        // ===============================

        const systemInstruction = `

You are Max AI, a helpful, friendly and intelligent AI assistant.

Give clear and useful answers.

The following are memories belonging ONLY to this user:

${memoryText}

Use these memories naturally when relevant.

MEMORY RULES:

1. If the user explicitly tells you to remember something about themselves,

   create a memory.

2. Examples:

   "Remember my name is Rahul."

   "Remember that I am a data analyst."

   "Remember I like football."

3. Do NOT save random conversation.

4. Do NOT save sensitive information unless the user explicitly asks you

   to remember it.

5. If the user asks you to forget a specific memory, identify that memory.

6. At the END of your response, output memory instructions using this format:

MEMORY_TO_SAVE: none

or

MEMORY_TO_SAVE: the exact fact to remember

or

MEMORY_TO_SAVE:

- fact one

- fact two

If the user asks to forget something, output:

MEMORY_TO_DELETE: exact memory text

Otherwise output:

MEMORY_TO_DELETE: none

Do not explain these memory instructions to the user.

`;

        // ===============================

        // GEMINI

        // ===============================

        const result = await ai.models.generateContent({

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

                maxOutputTokens: 300

            }

        });

        let responseText = result.text || "";

        // ===============================

        // EXTRACT MEMORY TO SAVE

        // ===============================

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

            memoryToSave = saveMatch[1]

                .split("\n")

                .map(item =>

                    item

                        .replace(/^[-•*]\s*/, "")

                        .trim()

                )

                .filter(Boolean);

        }

        // ===============================

        // EXTRACT MEMORY TO DELETE

        // ===============================

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

        // ===============================

        // SAVE MEMORY

        // ===============================

        for (const memory of memoryToSave) {

            if (!memory) continue;

            const { error } =

                await supabase

                    .from("memorise")

                    .insert({

                        user_id: userId,

                        memory: memory

                    });

            if (error) {

                console.error(

                    "Memory save error:",

                    error

                );

            }

        }

        // ===============================

        // DELETE MEMORY

        // ===============================

        if (memoryToDelete) {

            const { error } =

                await supabase

                    .from("memories")

                    .delete()

                    .eq("user_id", userId)

                    .ilike("memory", `%${memoryToDelete}%`);

            if (error) {

                console.error(

                    "Memory delete error:",

                    error

                );

            }

        }

        // ===============================

        // REMOVE INTERNAL MEMORY TEXT

        // ===============================

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

        res.json({

            response: responseText

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

// ===============================

// SERVER

// ===============================

const PORT =

    process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(

        `Max AI running on port ${PORT}`

    );

});