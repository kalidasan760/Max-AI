import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(__dirname));

app.get('/', (req, res) => {

    res.sendFile(path.join(__dirname, 'index.html'));

});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3.5-flash-lite',
            contents: message,
            config: {
                systemInstruction: 'You are Max AI, a helpful, precise, and concise AI assistant.'
            }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                res.write(`data: ${JSON.stringify({ response: chunk.text })}\n\n`);
            }
        }
        res.end();
    } catch (error) {
        console.error("API Error Details:", error);
        res.write(`data: ${JSON.stringify({ response: 'Error: ' + (error.message || 'Unknown error occurred') })}\n\n`);
        res.end();
    }
});

app.listen(port, () => {
    console.log(`Max AI server running at http://localhost:${port}`);
});