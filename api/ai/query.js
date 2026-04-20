const { verifyAdminToken } = require('../../lib/auth');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const db = require('../../lib/db');

// --- SHARED GLOBALS ---
let cachedDatabaseSchema = null;

// The base rules without the hardcoded schema
const baseSystemInstruction = `You are an AI assistant for an e-commerce admin panel. Parse requests.
- Use 'navigate' to trigger a full page navigation to a table view (e.g., 'take me to the orders page').
- Use 'execute_sql' to answer any questions about records, stats, or data directly in the chat. ALWAYS use execute_sql if the user asks for an HTML report, chart, or graphical representation so we can fetch the underlying data! NEVER use 'navigate' for reports. NEVER explain SQL queries.
- Use 'answer' ONLY for generic conversational greetings (e.g. 'hello', 'who are you?'). 
- IMPORTANT: Use EXACT table names as defined in the DATABASE SCHEMA below. Do not guess or modify pluralities (e.g. use order_items, not orders_item).

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
Do not use SQL wildcards (e.g. '%') inside the JSON "filters" block. However, when writing the "sqlQuery" string natively, you MUST use '%' wildcards alongside ILIKE (e.g., ILIKE '%engine%')!
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

// --- GROQ SPECIFIC CONFIG ---
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

        // 1. DYNAMIC SCHEMA INTROSPECTION (Cached in memory to prevent recurrent database trips)
        if (!cachedDatabaseSchema) {
            console.log("🔍 Fetching Dynamic DB Schema for AI Context...");
            const schemaQuery = `
                SELECT table_name, column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name NOT IN ('spatial_ref_sys')
                AND column_name NOT ILIKE '%password%'
                ORDER BY table_name, ordinal_position;
            `;
            const schemaRes = await db.query(schemaQuery);
            
            const tables = {};
            schemaRes.rows.forEach(row => {
                // Keep out strictly structural tables or ones without columns if any
                if (!tables[row.table_name]) tables[row.table_name] = [];
                tables[row.table_name].push(row.column_name);
            });
            
            let schemaText = "DATABASE SCHEMA:\n";
            for (const [table, columns] of Object.entries(tables)) {
                schemaText += `- ${table}(${columns.join(', ')})\n`;
            }
            
            cachedDatabaseSchema = schemaText.trim();
            console.log("✅ Dynamic Schema Cached Successfully!");
        }

        // 2. Formulate final instruction dynamically with the live schema
        const dynamicSystemInstruction = `${baseSystemInstruction}\n\n${cachedDatabaseSchema}`;

        console.log(`🤖 AI Query received [${aiProvider}]: "${prompt}"`);
        let responseText = "";

        if (aiProvider === 'groq') {
            // -- GROQ PIPELINE --
            if (!process.env.GROQ_API_KEY) {
                return res.status(500).json({ message: 'GROQ_API_KEY missing from environment variables.' });
            }
            if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "system", content: dynamicSystemInstruction }, { role: "user", content: prompt }],
                model: groqModelName,
                response_format: { type: "json_object" }
            });
            responseText = chatCompletion.choices[0]?.message?.content || "";
        } else {
            // -- GEMINI PIPELINE --
            if (!process.env.GEMINI_API_KEY) {
                return res.status(500).json({ message: 'GEMINI_API_KEY missing from environment variables.' });
            }
            // Bind config dynamically per request to append the dynamic schema cleanly
            const geminiConfig = { model: selectedModelName, systemInstruction: dynamicSystemInstruction };
            if (isModernModel) {
                geminiConfig.generationConfig = { responseMimeType: "application/json", responseSchema };
            }
            const geminiModel = genAI.getGenerativeModel(geminiConfig);
            const result = await geminiModel.generateContent(prompt);
            responseText = result.response.text();
        }
        
        console.log(`🤖 AI Raw Response: ${responseText}`);

        responseText = responseText.replace(/^```json\n?/gi, '').replace(/```$/gi, '').trim();
        let parsedResponse = JSON.parse(responseText);

        // 3. SECOND PASS (Text-to-SQL Execution)
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
                        messages: [{ role: "system", content: "Answer the user's question directly based on the database results. If the database returns multiple records, format your response using bullet points. VERY IMPORTANT RULES: 1) If the user specifically asks for a 'graphical report', 'html', or 'chart', output ONLY beautifully styled HTML using strictly INLINE CSS styles (style='...'). DO NOT use Tailwind or external CSS classes. Use pure robust SVG elements to draw charts (bar/pie) representing the data inside a clean aesthetic container. Wrap it EXACTLY in a ```html block. 2) If the user asks for CSV, Excel, sheet, or a table, output ONLY raw TSV (Tab-Separated Values) text." }, { role: "user", content: summaryPrompt }],
                        model: groqModelName,
                    });
                    parsedResponse.responseText = summaryCompletion.choices[0]?.message?.content || "Here are your stats.";
                } else {
                     const geminiTextModel = genAI.getGenerativeModel({ model: selectedModelName, systemInstruction: "Answer the user's question directly based on the database results. If the database returns multiple records, format your response using bullet points. VERY IMPORTANT RULES: 1) If the user specifically asks for a 'graphical report', 'html', or 'chart', output ONLY beautifully styled HTML using strictly INLINE CSS styles (style='...'). DO NOT use Tailwind or external CSS classes. Use pure robust SVG elements to draw charts (bar/pie) representing the data inside a clean aesthetic container. Wrap it EXACTLY in a ```html block. 2) If the user asks for CSV, Excel, sheet, or a table, output ONLY raw TSV (Tab-Separated Values) text." });
                     const summaryResponse = await geminiTextModel.generateContent(summaryPrompt);
                     parsedResponse.responseText = summaryResponse.response.text();
                }

                // --- HTML EXTRACTION LOGIC ---
                const htmlMatch = parsedResponse.responseText.match(/```(?:html|svg)\n?([\s\S]*?)```/i);
                if (htmlMatch) {
                    parsedResponse.htmlReport = htmlMatch[1].trim();
                    parsedResponse.responseText = parsedResponse.responseText.replace(htmlMatch[0], '').trim() || "Here's your graphical report:";
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
