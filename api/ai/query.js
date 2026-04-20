const { verifyAdminToken } = require('../../lib/auth');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const db = require('../../lib/db');

// --- SHARED CONFIG ---
const sharedSystemInstruction = `You are an AI assistant for an e-commerce admin panel. Parse requests.
- Use 'navigate' to trigger a full page navigation to a table view (e.g., 'take me to the orders page').
- Use 'execute_sql' to answer questions directly in the chat. You can use this for AGGREGATE STATS ('what is total revenue?') OR for DIRECT DATA QUERIES ('list the products in engine parts', 'which users are admins?').

DATABASE SCHEMA: 
- products(id, name, description, part_number, barcode, price, quantity, category_id, warehouse_id)
- orders(id, user_id, total_amount, status, created_at)
- users(id, email, first_name, last_name, role)
- categories(id, name) (You can JOIN this with products if they ask for categories by name)

SQL RULES:
- If a user asks for both a list of items AND their count, DO NOT mix aggregate COUNT() with unaggregated columns, as it causes DB GROUP BY errors! Just SELECT the list of items normally. The conversational AI can count the rows manually.
- MUST start with SELECT and be READ-ONLY.
- ALWAYS use ILIKE instead of = for string matching (e.g. c.name ILIKE '%brakes%') to be case-insensitive.

IMPORTANT: You MUST return ONLY a valid JSON object with the following exact keys:
{
  "actionType": "navigate" | "execute_sql" | "answer",
  "targetPage": "products" | "orders" | "users" | "inventory" (only if navigating),
  "filters": { "search": "...", "status": "...", "category": "...", "role": "..." } (only if navigating),
  "sqlQuery": "SELECT ..." (only if execute_sql, MUST start with SELECT),
  "responseText": "Your conversational response to the user."
}
Do not use SQL wildcards (e.g. '%') in the 'search' filter. Just use plain text (e.g. 'H').
Do not return markdown formatting blocks or any text outside the JSON object.`;

// --- GEMINI SPECIFIC CONFIG ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');
const selectedModelName = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
const isModernModel = selectedModelName.includes('1.5') || selectedModelName.includes('2.0');
const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        actionType: { type: SchemaType.STRING, description: "Type of action to perform. 'navigate' or 'execute_sql' or 'answer'." },
        targetPage: { type: SchemaType.STRING, description: "The target admin page to navigate to e.g. 'products', 'orders', 'users'." },
        filters: { type: SchemaType.OBJECT, properties: { search: { type: SchemaType.STRING }, category: { type: SchemaType.STRING }, status: { type: SchemaType.STRING }, role: { type: SchemaType.STRING } } },
        responseText: { type: SchemaType.STRING, description: "Conversational text." },
        sqlQuery: { type: SchemaType.STRING, description: "Postgres SELECT query if action is execute_sql." }
    },
    required: ["actionType", "responseText"]
};

const geminiConfig = { model: selectedModelName, systemInstruction: sharedSystemInstruction };
if (isModernModel) {
    geminiConfig.generationConfig = { responseMimeType: "application/json", responseSchema };
}
const geminiModel = genAI.getGenerativeModel(geminiConfig);
const geminiTextModel = genAI.getGenerativeModel({ model: selectedModelName, systemInstruction: "Answer directly and conversationally formatting the numbers." });

// --- GROQ SPECIFIC CONFIG ---
// We initialize the client dynamically inside the pipeline to avoid global missing key errors
let groq = null;
const groqModelName = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

module.exports = async function handler(req, res) {
    try {
        const decoded = verifyAdminToken(req);
        if (!decoded) return res.status(401).json({ message: 'Unauthorized' });
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        
        const { prompt, provider } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

        const aiProvider = (provider || process.env.AI_PROVIDER || 'gemini').toLowerCase();

        console.log(`🤖 AI Query received [${aiProvider}]: "${prompt}"`);
        let responseText = "";

        if (aiProvider === 'groq') {
            // -- GROQ PIPELINE --
            if (!process.env.GROQ_API_KEY) {
                return res.status(500).json({ message: 'GROQ_API_KEY missing from environment variables.' });
            }
            if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "system", content: sharedSystemInstruction }, { role: "user", content: prompt }],
                model: groqModelName,
                response_format: { type: "json_object" }
            });
            responseText = chatCompletion.choices[0]?.message?.content || "";
        } else {
            // -- GEMINI PIPELINE --
            if (!process.env.GEMINI_API_KEY) {
                return res.status(500).json({ message: 'GEMINI_API_KEY missing from environment variables.' });
            }
            const result = await geminiModel.generateContent(prompt);
            responseText = result.response.text();
        }
        
        console.log(`🤖 AI Raw Response: ${responseText}`);

        responseText = responseText.replace(/^```json\n?/gi, '').replace(/```$/gi, '').trim();
        let parsedResponse = JSON.parse(responseText);

        // SECOND PASS (Text-to-SQL Execution)
        if (parsedResponse.actionType === 'execute_sql' && parsedResponse.sqlQuery) {
            console.log(`🔍 Executing AI SQL: ${parsedResponse.sqlQuery}`);
            if (!parsedResponse.sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
                throw new Error("Only SELECT queries are allowed for security.");
            }
            try {
                const dbResult = await db.query(parsedResponse.sqlQuery);
                const rawDbStats = JSON.stringify(dbResult.rows);
                const truncatedStats = rawDbStats.length > 4000 ? rawDbStats.substring(0, 4000) + '... (truncated)' : rawDbStats;
                const summaryPrompt = `User asked: "${prompt}"\nDatabase returned: ${truncatedStats}`;

                if (aiProvider === 'groq') {
                     const summaryCompletion = await groq.chat.completions.create({
                        messages: [{ role: "system", content: "Answer the user's question directly based on the database results in 1-2 friendly sentences. Format currencies nicely." }, { role: "user", content: summaryPrompt }],
                        model: groqModelName,
                    });
                    parsedResponse.responseText = summaryCompletion.choices[0]?.message?.content || "Here are your stats.";
                } else {
                     const summaryResponse = await geminiTextModel.generateContent(summaryPrompt);
                     parsedResponse.responseText = summaryResponse.response.text();
                }

            } catch (dbError) {
                console.error("❌ SQL Execution Error:", dbError);
                parsedResponse.responseText = "I couldn't fetch that specific data right now due to a database error.";
            }
        }

        res.status(200).json({ success: true, data: parsedResponse });

    } catch (error) {
        console.error('❌ AI API error:', error);
        return res.status(500).json({
            success: false,
            message: `Failed to process AI query: ${error.message || 'Unknown error'}`,
            error: error.stack || error.message
        });
    }
};
