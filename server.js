import express from 'express';

import dotenv from 'dotenv';

import { GoogleGenAI } from '@google/genai';

import path from 'path';

import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Serve your Max AI website

app.use(express.static(__dirname));

app.get('/', (req, res) => {

    res.sendFile(path.join(__dirname, 'index.html'));

});

// Gemini AI

const ai = new GoogleGenAI({

    apiKey: process.env.GEMINI_API_KEY

});

app.post('/chat', async (req, res) => {

    try {

        const { message } = req.body;

        const response = await ai.models.generateContent({

            model: 'gemini-2.5-flash',

            contents: message,

            config: {

                systemInstruction:

                    'You are Max AI, a helpful, precise, and concise AI assistant.'

            }

        });

        res.json({

            response: response.text

        });

    } catch (error) {

        console.error('API Error:', error);

        res.status(500).json({

            response: 'Sorry, Max AI could not respond right now.'

        });

    }

});

const port = process.env.PORT || 3000;

app.listen(port, () => {

    console.log(`Max AI server running on port ${port}`);

});