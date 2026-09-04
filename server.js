import express from "express";

import dotenv from "dotenv";

import { GoogleGenAI } from "@google/genai";

import path from "path";

import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Serve the www folder

app.use(express.static(path.join(__dirname, "www")));

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "www", "index.html"));

});

const ai = new GoogleGenAI({

    apiKey: process.env.GEMINI_API_KEY

});

app.post("/chat", async (req, res) => {

    try {

        const { message } = req.body;

        if (!message) {

            return res.status(400).json({

                response: "Please enter a message."

            });

        }

        const result = await ai.models.generateContent({

            model: "gemini-3.5-flash-lite",

            contents: message,

            config: {

                systemInstruction:

                    "You are Max AI, a helpful, precise, and concise AI assistant."

            }

        });

        res.json({

            response: result.text

        });

    } catch (error) {

        console.error("Gemini Error:", error);

        res.status(500).json({

            response: "Max AI error: " + error.message

        });

    }

});

const port = process.env.PORT || 3000;

app.listen(port, () => {

    console.log(`Max AI running on port ${port}`);

});