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

app.use(express.static(__dirname));

app.get("/", (req, res) => {

    res.sendFile(path.join(__dirname, "index.html"));

});

const ai = new GoogleGenAI({

    apiKey: process.env.GEMINI_API_KEY

});

app.post("/chat", async (req, res) => {

    try {

        const message = req.body.message;

        if (!message) {

            return res.status(400).json({

                response: "Please enter a message."

            });

        }

        console.log("User message:", message);

        const result = await ai.models.generateContent({

            model: "gemini-2.5-flash",

            contents: message,

            config: {

                systemInstruction:

                    "You are Max AI, a helpful, precise, and concise AI assistant."

            }

        });

        console.log("Gemini response received");

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