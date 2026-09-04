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

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.post("/chat", async (req, res) => {
    try {
        const { message, image } = req.body;

        if (!message && !image) {
            return res.status(400).json({
                response: "Please enter a message or upload a photo."
            });
        }

        const parts = [];

        // Add text message
        if (message) {
            parts.push({
                text: message
            });
        } else {
            parts.push({
                text: "Please analyze this image and tell me what you see."
            });
        }

        // Add uploaded image
        if (image) {
            const match = image.match(/^data:(image\/[^;]+);base64,(.+)$/);

            if (!match) {
                return res.status(400).json({
                    response: "The uploaded image format is not supported."
                });
            }

            const mimeType = match[1];
            const base64Data = match[2];

            parts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        }

        const result = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: [
                {
                    role: "user",
                    parts: parts
                }
            ],
            config: {
                systemInstruction:
                    "You are Max AI, a helpful, friendly and intelligent AI assistant. You can understand text and images. When a user uploads an image, carefully analyze it and answer their question about the image."
            }
        });

        res.json({
            response: result.text
        });

    } catch (error) {
        console.error("Gemini Error:", error);

        res.status(500).json({
            response: "Max AI could not respond right now. Please try again."
        });
    }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Max AI running on port ${port}`);
});