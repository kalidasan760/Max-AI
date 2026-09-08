import express from "express";

import dotenv from "dotenv";

import { GoogleGenAI } from "@google/genai";

import { createClient } from "@supabase/supabase-js";

import path from "path";

import { fileURLToPath } from "url";

dotenv.config();

// =====================================================

// PATH

// =====================================================

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// =====================================================

// EXPRESS

// =====================================================

const app = express();

app.use(express.json({ limit: "15mb" }));

app.use(

    express.static(

        path.join(__dirname, "www")

    )

);

app.get("/", (req, res) => {

    res.sendFile(

        path.join(

            __dirname,

            "www",

            "index.html"

        )

    );

});

// =====================================================

// ENVIRONMENT

// =====================================================

console.log("=================================");

console.log("MAX AI SERVER STARTING");

console.log("=================================");

console.log(

    "GEMINI_API_KEY:",

    process.env.GEMINI_API_KEY ? "FOUND" : "MISSING"

);

console.log(

    "SUPABASE_URL:",

    process.env.SUPABASE_URL ? "FOUND" : "MISSING"

);

console.log(

    "SUPABASE_SECRET_KEY:",

    process.env.SUPABASE_SECRET_KEY ? "FOUND" : "MISSING"

);

console.log("=================================");

// =====================================================

// SUPABASE

// =====================================================

let supabase = null;

if (

    process.env.SUPABASE_URL &&

    process.env.SUPABASE_SECRET_KEY

) {

    supabase = createClient(

        process.env.SUPABASE_URL,

        process.env.SUPABASE_SECRET_KEY

    );

    console.log("Supabase initialized.");

} else {

    console.error(

        "Supabase environment variables are missing."

    );

}

// =====================================================

// GEMINI

// =====================================================

let ai = null;

if (process.env.GEMINI_API_KEY) {

    ai = new GoogleGenAI({

        apiKey: process.env.GEMINI_API_KEY

    });

    console.log("Gemini initialized.");

} else {

    console.error(

        "GEMINI_API_KEY is missing."

    );

}

// =====================================================

// GEMINI MODEL

// =====================================================

const MODEL = "gemini-3.6-flash";

// =====================================================

// TEXT HELPERS

// =====================================================

function cleanText(value) {

    return String(value || "")

        .trim()

        .replace(/\s+/g, " ");

}

function removeEndingPunctuation(text) {

    return cleanText(text).replace(

        /[.!?]+$/,

        ""

    );

}

// =====================================================

// GET USER MEMORIES

// =====================================================

async function getUserMemories(userId) {

    if (!supabase || !userId) {

        return [];

    }

    try {

        const {

            data,

            error

        } = await supabase

            .from("memorise")

            .select(

                "id, memory, created_at"

            )

            .eq(

                "user_id",

                userId

            )

            .order(

                "created_at",

                {

                    ascending: true

                }

            );

        if (error) {

            console.error(

                "MEMORY READ ERROR:",

                error

            );

            return [];

        }

        return data || [];

    } catch (error) {

        console.error(

            "MEMORY READ EXCEPTION:",

            error

        );

        return [];

    }

}

// =====================================================

// SAVE MEMORY

// =====================================================

async function saveMemory(

    userId,

    memory

) {

    if (!supabase) {

        return {

            success: false,

            error:

                "Supabase is not configured."

        };

    }

    const cleanMemory =

        cleanText(memory);

    if (!userId) {

        return {

            success: false,

            error:

                "User ID is missing."

        };

    }

    if (!cleanMemory) {

        return {

            success: false,

            error:

                "Memory is empty."

        };

    }

    try {

        // Check duplicate

        const {

            data: existing,

            error: checkError

        } = await supabase

            .from("memorise")

            .select(

                "id, memory"

            )

            .eq(

                "user_id",

                userId

            )

            .eq(

                "memory",

                cleanMemory

            )

            .limit(1);

        if (checkError) {

            console.error(

                "MEMORY CHECK ERROR:"

            );

            console.error(

                "Code:",

                checkError.code

            );

            console.error(

                "Message:",

                checkError.message

            );

            console.error(

                "Details:",

                checkError.details

            );

            console.error(

                "Hint:",

                checkError.hint

            );

            return {

                success: false,

                error:

                    checkError.message

            };

        }

        // Already exists

        if (

            existing &&

            existing.length > 0

        ) {

            console.log(

                "MEMORY ALREADY EXISTS:",

                cleanMemory

            );

            return {

                success: true,

                alreadyExists: true

            };

        }

        // Insert

        const {

            data,

            error

        } = await supabase

            .from("memorise")

            .insert({

                user_id: userId,

                memory: cleanMemory

            })

            .select();

        if (error) {

            console.error(

                "================================="

            );

            console.error(

                "MEMORY SAVE ERROR"

            );

            console.error(

                "Code:",

                error.code

            );

            console.error(

                "Message:",

                error.message

            );

            console.error(

                "Details:",

                error.details

            );

            console.error(

                "Hint:",

                error.hint

            );

            console.error(

                "================================="

            );

            return {

                success: false,

                error:

                    error.message

            };

        }

        console.log(

            "================================="

        );

        console.log(

            "MEMORY SAVED SUCCESSFULLY"

        );

        console.log(

            "USER:",

            userId

        );

        console.log(

            "MEMORY:",

            cleanMemory

        );

        console.log(

            "DATA:",

            data

        );

        console.log(

            "================================="

        );

        return {

            success: true,

            alreadyExists: false

        };

    } catch (error) {

        console.error(

            "MEMORY SAVE EXCEPTION:",

            error

        );

        return {

            success: false,

            error:

                error?.message ||

                "Unknown memory error."

        };

    }

}

// =====================================================

// EXTRACT REMEMBER REQUEST

// =====================================================

function extractRememberRequest(message) {

    const text =

        cleanText(message);

    if (!text) {

        return null;

    }

    const lower =

        text.toLowerCase();

    // -----------------------------------------------

    // "remember my name is Kalidasan"

    // -----------------------------------------------

    if (

        lower.startsWith(

            "remember my name is "

        )

    ) {

        let name =

            text.substring(

                "remember my name is ".length

            );

        name =

            removeEndingPunctuation(

                name

            );

        if (!name) {

            return null;

        }

        return `My name is ${name}.`;

    }

    // -----------------------------------------------

    // "remember that I like football"

    // -----------------------------------------------

    if (

        lower.startsWith(

            "remember that "

        )

    ) {

        let fact =

            text.substring(

                "remember that ".length

            );

        fact =

            removeEndingPunctuation(

                fact

            );

        if (!fact) {

            return null;

        }

        return (

            fact.charAt(0).toUpperCase() +

            fact.substring(1) +

            "."

        );

    }

    // -----------------------------------------------

    // "remember I like football"

    // -----------------------------------------------

    if (

        lower.startsWith(

            "remember "

        )

    ) {

        let fact =

            text.substring(

                "remember ".length

            );

        fact =

            removeEndingPunctuation(

                fact

            );

        if (!fact) {

            return null;

        }

        return (

            fact.charAt(0).toUpperCase() +

            fact.substring(1) +

            "."

        );

    }

    // -----------------------------------------------

    // "please remember that I like Python"

    // -----------------------------------------------

    if (

        lower.startsWith(

            "please remember that "

        )

    ) {

        let fact =

            text.substring(

                "please remember that ".length

            );

        fact =

            removeEndingPunctuation(

                fact

            );

        if (!fact) {

            return null;

        }

        return (

            fact.charAt(0).toUpperCase() +

            fact.substring(1) +

            "."

        );

    }

    // -----------------------------------------------

    // "please remember I like Python"

    // -----------------------------------------------

    if (

        lower.startsWith(

            "please remember "

        )

    ) {

        let fact =

            text.substring(

                "please remember ".length

            );

        fact =

            removeEndingPunctuation(

                fact

            );

        if (!fact) {

            return null;

        }

        return (

            fact.charAt(0).toUpperCase() +

            fact.substring(1) +

            "."

        );

    }

    // -----------------------------------------------

    // "don't forget that I like Python"

    // -----------------------------------------------

    if (

        lower.startsWith(

            "don't forget that "

        )

    ) {

        let fact =

            text.substring(

                "don't forget that ".length

            );

        fact =

            removeEndingPunctuation(

                fact

            );

        if (!fact) {

            return null;

        }

        return (

            fact.charAt(0).toUpperCase() +

            fact.substring(1) +

            "."

        );

    }

    return null;

}

// =====================================================

// EXTRACT FORGET REQUEST

// =====================================================

function extractForgetRequest(message) {

    const text =

        cleanText(message);

    if (!text) {

        return null;

    }

    const lower =

        text.toLowerCase();

    // -----------------------------------------------

    // "forget my name"

    // -----------------------------------------------

    if (

        lower ===

        "forget my name"

    ) {

        return "My name";

    }

    // -----------------------------------------------

    // "forget my birthday"

    // -----------------------------------------------

    if (

        lower.startsWith(

            "forget my "

        )

    ) {

        let fact =

            text.substring(

                "forget my ".length

            );

        fact =

            removeEndingPunctuation(

                fact

            );

        if (!fact) {

            return null;

        }

        return `My ${fact}`;

    }

    // -----------------------------------------------

    // "forget that I like football"

    // -----------------------------------------------

    if (

        lower.startsWith(

            "forget that "

        )

    ) {

        let fact =

            text.substring(

                "forget that ".length

            );

        fact =

            removeEndingPunctuation(

                fact

            );

        if (!fact) {

            return null;

        }

        return fact;

    }

    // -----------------------------------------------

    // "forget I like football"

    // -----------------------------------------------

    if (

        lower.startsWith(

            "forget "

        )

    ) {

        let fact =

            text.substring(

                "forget ".length

            );

        fact =

            removeEndingPunctuation(

                fact

            );

        if (!fact) {

            return null;

        }

        return fact;

    }

    return null;

}

// =====================================================

// DELETE MEMORY

// =====================================================

async function deleteMemory(

    userId,

    memoryText

) {

    if (!supabase) {

        return {

            success: false,

            deletedCount: 0,

            error:

                "Supabase is not configured."

        };

    }

    const cleanSearch =

        removeEndingPunctuation(

            memoryText

        );

    if (!userId || !cleanSearch) {

        return {

            success: false,

            deletedCount: 0,

            error:

                "Missing user or memory."

        };

    }

    try {

        const {

            data,

            error

        } = await supabase

            .from("memorise")

            .delete()

            .eq(

                "user_id",

                userId

            )

            .ilike(

                "memory",

                `%${cleanSearch}%`

            )

            .select();

        if (error) {

            console.error(

                "MEMORY DELETE ERROR:",

                error

            );

            return {

                success: false,

                deletedCount: 0,

                error:

                    error.message

            };

        }

        return {

            success: true,

            deletedCount:

                data?.length || 0

        };

    } catch (error) {

        console.error(

            "MEMORY DELETE EXCEPTION:",

            error

        );

        return {

            success: false,

            deletedCount: 0,

            error:

                error?.message ||

                "Unknown error."

        };

    }

}

// =====================================================

// FORMAT MEMORIES

// =====================================================

function formatMemories(memories) {

    if (

        !memories ||

        memories.length === 0

    ) {

        return "No saved memories.";

    }

    return memories

        .map(

            item =>

                `- ${item.memory}`

        )

        .join("\n");

}

// =====================================================

// HEALTH

// =====================================================

app.get(

    "/health",

    (req, res) => {

        res.json({

            status: "ok",

            gemini:

                Boolean(

                    process.env.GEMINI_API_KEY

                ),

            supabase:

                Boolean(

                    process.env.SUPABASE_URL &&

                    process.env.SUPABASE_SECRET_KEY

                ),

            model: MODEL

        });

    }

);

// =====================================================

// CHAT

// =====================================================

app.post(

    "/chat",

    async (req, res) => {

        try {

            const {

                message,

                image,

                userId,

                memoryEnabled

            } = req.body;

            const cleanMessage =

                cleanText(message);

            // -----------------------------------------------

            // VALIDATION

            // -----------------------------------------------

            if (

                !cleanMessage &&

                !image

            ) {

                return res

                    .status(400)

                    .json({

                        response:

                            "Please enter a message or upload a photo."

                    });

            }

            if (!userId) {

                return res

                    .status(400)

                    .json({

                        response:

                            "User ID is missing."

                    });

            }

            if (!ai) {

                return res

                    .status(500)

                    .json({

                        response:

                            "Gemini AI is not configured on the server."

                    });

            }

            const useMemory =

                memoryEnabled !== false;

            console.log(

                "================================="

            );

            console.log(

                "NEW CHAT REQUEST"

            );

            console.log(

                "USER ID:",

                userId

            );

            console.log(

                "MEMORY ENABLED:",

                useMemory

            );

            console.log(

                "MESSAGE:",

                cleanMessage

            );

            // =================================================

            // REMEMBER

            // =================================================

            if (

                useMemory &&

                cleanMessage

            ) {

                const memoryToSave =

                    extractRememberRequest(

                        cleanMessage

                    );

                if (memoryToSave) {

                    console.log(

                        "REMEMBER REQUEST:"

                    );

                    console.log(

                        memoryToSave

                    );

                    const result =

                        await saveMemory(

                            userId,

                            memoryToSave

                        );

                    if (result.success) {

                        const updated =

                            await getUserMemories(

                                userId

                            );

                        return res.json({

                            response:

                                result.alreadyExists

                                    ? `I already remembered that: ${removeEndingPunctuation(memoryToSave)}. 😊`

                                    : `Got it! I'll remember that: ${removeEndingPunctuation(memoryToSave)}. 🎉`,

                            memory:

                                updated

                                    .map(

                                        item =>

                                            item.memory

                                    )

                                    .join("\n")

                        });

                    }

                    console.error(

                        "MEMORY SAVE FAILED:",

                        result.error

                    );

                    return res

                        .status(500)

                        .json({

                            response:

                                "I couldn't save that memory right now. Please try again."

                        });

                }

            }

            // =================================================

            // FORGET

            // =================================================

            if (

                useMemory &&

                cleanMessage

            ) {

                const memoryToDelete =

                    extractForgetRequest(

                        cleanMessage

                    );

                if (memoryToDelete) {

                    console.log(

                        "FORGET REQUEST:"

                    );

                    console.log(

                        memoryToDelete

                    );

                    const result =

                        await deleteMemory(

                            userId,

                            memoryToDelete

                        );

                    if (result.success) {

                        const updated =

                            await getUserMemories(

                                userId

                            );

                        if (

                            result.deletedCount === 0

                        ) {

                            return res.json({

                                response:

                                    "I couldn't find a saved memory matching that request. 🤔",

                                memory:

                                    updated

                                        .map(

                                            item =>

                                                item.memory

                                        )

                                        .join("\n")

                            });

                        }

                        return res.json({

                            response:

                                "Got it! I've forgotten that. 🗑️",

                            memory:

                                updated

                                    .map(

                                        item =>

                                            item.memory

                                    )

                                    .join("\n")

                        });

                    }

                    return res

                        .status(500)

                        .json({

                            response:

                                "I couldn't forget that right now. Please try again."

                        });

                }

            }

            // =================================================

            // LOAD MEMORY

            // =================================================

            let memories = [];

            if (useMemory) {

                memories =

                    await getUserMemories(

                        userId

                    );

            }

            const memoryText =

                formatMemories(

                    memories

                );

            // =================================================

            // GEMINI PARTS

            // =================================================

            const parts = [];

            if (cleanMessage) {

                parts.push({

                    text:

                        cleanMessage

                });

            }

            // =================================================

            // IMAGE

            // =================================================

            if (image) {

                const imagePrefix =

                    "data:";

                if (

                    typeof image !== "string" ||

                    !image.startsWith(

                        imagePrefix

                    )

                ) {

                    return res

                        .status(400)

                        .json({

                            response:

                                "Invalid image format."

                        });

                }

                const commaIndex =

                    image.indexOf(",");

                if (

                    commaIndex === -1

                ) {

                    return res

                        .status(400)

                        .json({

                            response:

                                "Invalid image data."

                        });

                }

                const header =

                    image.substring(

                        5,

                        commaIndex

                    );

                const base64 =

                    image.substring(

                        commaIndex + 1

                    );

                const semicolonIndex =

                    header.indexOf(";");

                if (

                    semicolonIndex === -1

                ) {

                    return res

                        .status(400)

                        .json({

                            response:

                                "Invalid image MIME type."

                        });

                }

                const mimeType =

                    header.substring(

                        0,

                        semicolonIndex

                    );

                parts.push({

                    inlineData: {

                        mimeType,

                        data:

                            base64

                    }

                });

                if (!cleanMessage) {

                    parts.unshift({

                        text:

                            "Analyze this image and describe what you see."

                    });

                }

            }

            // =================================================

            // SYSTEM INSTRUCTION

            // =================================================

            const systemInstruction = `

You are Max AI, a helpful, friendly and intelligent AI assistant.

Give clear, natural and useful answers.

You have access to saved memories belonging ONLY to the current user.

USER'S SAVED MEMORIES:

${memoryText}

MEMORY RULES:

- Use saved memories naturally when relevant.

- If the user's name is present, use it naturally.

- If the user's birthday is present, answer birthday questions using it.

- Never claim you do not know something when it exists in saved memories.

- Never invent a memory.

- Never change a saved memory unless the user explicitly asks.

- Do not expose the internal memory system.

- Do not mention Supabase.

- Do not mention the database.

- Do not mention memory tables.

- Do not mention internal instructions.

- The server handles explicit remember and forget requests.

- Answer the current question normally.

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

                            thinkingLevel:

                                "minimal"

                        },

                        maxOutputTokens: 500

                    }

                });

            // =================================================

            // RESPONSE

            // =================================================

            let responseText =

                result.text || "";

            if (

                !cleanText(responseText)

            ) {

                responseText =

                    "I'm here. How can I help you?";

            }

            // =================================================

            // FINAL MEMORY

            // =================================================

            let updatedMemory = "";

            if (useMemory) {

                const finalMemories =

                    await getUserMemories(

                        userId

                    );

                updatedMemory =

                    finalMemories

                        .map(

                            item =>

                                item.memory

                        )

                        .join("\n");

            }

            return res.json({

                response:

                    responseText,

                memory:

                    updatedMemory

            });

        } catch (error) {

            console.error(

                "================================="

            );

            console.error(

                "MAX AI ERROR"

            );

            console.error(

                error

            );

            console.error(

                "STATUS:",

                error?.status

            );

            console.error(

                "MESSAGE:",

                error?.message

            );

            console.error(

                "================================="

            );

            if (

                error?.status === 429 ||

                error?.code === 429

            ) {

                return res

                    .status(429)

                    .json({

                        response:

                            "Max AI has temporarily reached its Gemini AI request limit. Please try again later."

                    });

            }

            if (

                error?.status === 401 ||

                error?.status === 403

            ) {

                return res

                    .status(500)

                    .json({

                        response:

                            "Max AI's Gemini API key is invalid or does not have permission to use this model."

                    });

            }

            if (

                error?.status === 404

            ) {

                return res

                    .status(500)

                    .json({

                        response:

                            `Max AI could not access the Gemini model ${MODEL}.`

                    });

            }

            return res

                .status(500)

                .json({

                    response:

                        "Max AI could not respond right now. Please try again."

                });

        }

    }

);

// =====================================================

// CLEAR ALL MEMORY

// =====================================================

app.post(

    "/clear-memory",

    async (req, res) => {

        try {

            const {

                userId

            } = req.body;

            if (!userId) {

                return res

                    .status(400)

                    .json({

                        success: false,

                        message:

                            "User ID is missing."

                    });

            }

            if (!supabase) {

                return res

                    .status(500)

                    .json({

                        success: false,

                        message:

                            "Supabase is not configured."

                    });

            }

            const {

                data,

                error

            } = await supabase

                .from("memorise")

                .delete()

                .eq(

                    "user_id",

                    userId

                )

                .select();

            if (error) {

                console.error(

                    "CLEAR MEMORY ERROR:",

                    error

                );

                return res

                    .status(500)

                    .json({

                        success: false,

                        message:

                            "Could not clear memory."

                    });

            }

            console.log(

                "ALL MEMORY CLEARED:",

                userId

            );

            return res.json({

                success: true,

                message:

                    "All memories cleared.",

                deleted:

                    data?.length || 0

            });

        } catch (error) {

            console.error(

                "CLEAR MEMORY EXCEPTION:",

                error

            );

            return res

                .status(500)

                .json({

                    success: false,

                    message:

                        "Could not clear memory."

                });

        }

    }

);

// =====================================================

// SERVER

// =====================================================

const PORT =

    process.env.PORT || 3000;

app.listen(

    PORT,

    () => {

        console.log(

            "================================="

        );

        console.log(

            `Max AI running on port ${PORT}`

        );

        console.log(

            `Gemini model: ${MODEL}`

        );

        console.log(

            "================================="

        );

    }

);
