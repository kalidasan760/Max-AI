import express from "express";

import dotenv from "dotenv";

import { GoogleGenAI } from "@google/genai";

import path from "path";

import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: "10mb" }));

app.use(express.static(path.join(__dirname, "www")));

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "www", "index.html"));

});

if (!process.env.GEMINI_API_KEY) {

    console.error("GEMINI_API_KEY is missing.");

}

const ai = new GoogleGenAI({

    apiKey: process.env.GEMINI_API_KEY

});

app.post("/chat", async (req, res) => {

    try {

        const { message, image } = req.body;

        if (!message && !image) {

            return res.status(400).json({

                response: "Please enter a message."

            });

        }

        if (!image) {

            const result = await ai.models.generateContent({

                model: "gemini-3.5-flash-lite",

                contents: message,

                config: {

                    systemInstruction:

                        "You are Max AI, a helpful, friendly and precise AI assistant."

                }

            });

            return res.json({

                response: result.text

            });

        }

        const match = image.match(

            /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/

        );

        if (!match) {

            return res.status(400).json({

                response: "The uploaded image format is not supported."

            });

        }

        const mimeType = match[1];

        const base64Data = match[2];

        const result = await ai.models.generateContent({

            model: "gemini-2.5-flash",

            contents: [

                {

                    role: "user",

                    parts: [

                        {

                            text: message ||

                                "Please analyze this image."

                        },

                        {

                            inlineData: {

                                mimeType: mimeType,

                                data: base64Data

                            }

                        }

                    ]

                }

            ]

        });

        return res.json({

            response: result.text

        });

    } catch (error) {

        console.error("Gemini Error:", error);

        return res.status(500).json({

            response: "Max AI could not respond right now."

        });

    }

});

const port = process.env.PORT || 3000;

app.listen(port, () => {

    console.log(`Max AI running on port ${port}`);

});