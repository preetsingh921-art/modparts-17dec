require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.log("No GEMINI_API_KEY found in .env.local");
            return;
        }
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.models) {
            console.log("Available Gemini Models:");
            data.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).forEach(m => {
                console.log(`- ${m.name}`);
            });
        } else {
            console.log("Error fetching models:", data);
        }
    } catch (err) {
        console.error(err);
    }
}
test();
