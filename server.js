import express from "express";

import dotenv from "dotenv";

import { GoogleGenAI } from "@google/genai";

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

// Gemini

const ai = new GoogleGenAI({

    apiKey: process.env.GEMINI_API_KEY

});

// Current fast model

const MODEL = "gemini-3.6-flash";

app.post("/chat", async (req, res) => {

    try {

        const { message, image } = req.body;

        if (!message && !image) {

            return res.status(400).json({

                response: "Please enter a message or upload a photo."

            });

        }

        const parts = [];

        // Text

        if (message) {

            parts.push({

                text: message

            });

        }

        // Photo

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

            // If user uploaded only an image

            if (!message) {

                parts.unshift({

                    text: "Analyze this image and describe what you see."

                });

            }

        }

        const result = await ai.models.generateContent({

            model: MODEL,

            contents: [

                {

                    role: "user",

                    parts: parts

                }

            ],

            config: {

                systemInstruction:

                    "You are Max AI, a helpful, friendly and intelligent AI assistant. Give clear and concise answers. When a user uploads an image, carefully analyze the image and answer questions about it.",

                thinkingConfig: {

                    thinkingLevel: "minimal"

                },

                maxOutputTokens: 250

            }

        });

        const responseText = result.text;

        res.json({

            response: responseText

        });

    } catch (error) {

        console.error("Gemini Error:", error);

        res.status(500).json({

            response:

                "Max AI could not respond right now. Please try again."

        });

    }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

    console.log(`Max AI running on port ${PORT}`);

});