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

WAREHOUSE & OWNER RELATIONSHIPS:
- Warehouses are assigned to admin users via users.warehouse_id = warehouses.id.
- When the user asks to "display warehouses and their owner email id" or questions about warehouse managers, owners, or branch emails:
  Write a query joining warehouses with users, for example:
  SELECT w.id, w.name, w.code, w.city, w.state, w.country, u.email as owner_email, u.name as owner_name, u.role
  FROM warehouses w
  LEFT JOIN users u ON u.warehouse_id = w.id
  ORDER BY w.id;

CHART RULES:
- When the user asks for a GROUPED, COMPARISON, COMBO, or MULTI-METRIC chart (e.g., "revenue AND quantity", "revenue vs qty", "group column chart"), your SQL query MUST return ONE text/label column AND MULTIPLE numeric columns. For example: SELECT p.name, SUM(oi.quantity) AS qty_sold, SUM(oi.quantity * oi.price) AS revenue FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.name ORDER BY revenue DESC LIMIT 10.
- When the user asks for a simple chart (single metric), return ONE label column and ONE numeric column as usual.
- ALWAYS alias numeric columns with clear, descriptive names (e.g., qty_sold, revenue, total_orders).

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

// --- GEMINI SPECIFIC CONFIG & FALLBACK CASCADE ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');
const GEMINI_MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro'
].filter(Boolean);

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

// --- GROQ SPECIFIC CONFIG & FALLBACK CASCADE ---
let groq = null;
const GROQ_MODELS = [
    process.env.GROQ_MODEL,
    'llama-3.3-70b-versatile',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'mixtral-8x7b-32768'
].filter(Boolean);

async function callGroqWithFallback(messages, options = {}) {
    if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    let lastError = null;
    for (const model of GROQ_MODELS) {
        try {
            console.log(`🦙 Trying Groq model: ${model}`);
            const completion = await groq.chat.completions.create({
                messages,
                model,
                temperature: 0.0,
                ...options
            });
            return completion.choices[0]?.message?.content || "";
        } catch (err) {
            console.warn(`⚠️ Groq model "${model}" failed: ${err.message}. Trying next model in cascade...`);
            lastError = err;
        }
    }
    throw lastError || new Error("All Groq models in fallback cascade failed");
}

async function callGeminiWithFallback(prompt, systemInstruction, withJsonSchema = false) {
    let lastError = null;
    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`✨ Trying Gemini model: ${modelName}`);
            const isModern = modelName.includes('1.5') || modelName.includes('2.0') || modelName.includes('2.5');
            const config = { model: modelName, systemInstruction };
            if (withJsonSchema && isModern) {
                config.generationConfig = { temperature: 0.0, responseMimeType: "application/json", responseSchema };
            } else {
                config.generationConfig = { temperature: 0.0 };
            }
            const model = genAI.getGenerativeModel(config);
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (err) {
            console.warn(`⚠️ Gemini model "${modelName}" failed: ${err.message}. Trying next model in cascade...`);
            lastError = err;
        }
    }
    throw lastError || new Error("All Gemini models in fallback cascade failed");
}

module.exports = async function handler(req, res) {
    try {
        const decoded = verifyAdminToken(req);
        if (!decoded) return res.status(401).json({ message: 'Unauthorized' });
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        
        const { prompt, provider } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

        const aiProvider = (provider || process.env.AI_PROVIDER || 'groq').toLowerCase();

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

        // 2. Formulate final instruction dynamically with the live schema and user context
        const userContext = `
USER CONTEXT:
- Role: ${decoded.role} (Superadmins can see all data across all warehouses. Regular admins should only query data related to their assigned warehouse)
- Warehouse ID: ${decoded.warehouse_id || 'None / Global'}

If the user asks questions about "my warehouse", "my products", or "my orders", you MUST filter your SQL query to ONLY include records where warehouse_id = ${decoded.warehouse_id || 'NULL'} (unless they are a superadmin). If they ask what warehouse they are under, answer them conversationally using this context.`;

        const dynamicSystemInstruction = `${baseSystemInstruction}\n${userContext}\n\n${cachedDatabaseSchema}`;

        console.log(`🤖 AI Query received [${aiProvider}]: "${prompt}"`);
        let responseText = "";

        if (aiProvider === 'groq') {
            // -- GROQ PIPELINE --
            if (!process.env.GROQ_API_KEY) {
                return res.status(500).json({ message: 'GROQ_API_KEY missing from environment variables.' });
            }
            responseText = await callGroqWithFallback(
                [{ role: "system", content: dynamicSystemInstruction }, { role: "user", content: prompt }],
                { response_format: { type: "json_object" } }
            );
        } else {
            // -- GEMINI PIPELINE --
            if (!process.env.GEMINI_API_KEY) {
                return res.status(500).json({ message: 'GEMINI_API_KEY missing from environment variables.' });
            }
            responseText = await callGeminiWithFallback(prompt, dynamicSystemInstruction, true);
        }
        
        console.log(`🤖 AI Raw Response: ${responseText}`);

        responseText = responseText.replace(/^```json\n?/gi, '').replace(/```$/gi, '').trim();
        let parsedResponse = JSON.parse(responseText);

        // 3. SECOND PASS (Text-to-SQL Execution)
        if (parsedResponse.actionType === 'execute_sql' && parsedResponse.sqlQuery) {
            console.log(`🔍 Executing AI SQL: ${parsedResponse.sqlQuery}`);
            const queryStr = parsedResponse.sqlQuery.trim();
            const queryUpper = queryStr.toUpperCase();
            
            // 1. Must start strictly with SELECT
            if (!queryUpper.startsWith('SELECT')) {
                throw new Error("Only SELECT queries are allowed for security.");
            }
            
            // 2. Prevent stacked queries (no semicolons except possibly at the very end)
            if (queryStr.replace(/;+\s*$/, '').includes(';')) {
                throw new Error("Stacked queries are not allowed for security.");
            }
            
            // 3. Blocklist of dangerous keywords
            const dangerousKeywords = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE|MERGE|CALL|REPLACE)\b/i;
            if (dangerousKeywords.test(queryStr)) {
                throw new Error("Query contains forbidden keywords.");
            }

            try {
                const dbResult = await db.query(parsedResponse.sqlQuery);
                const rawDbStats = JSON.stringify(dbResult.rows);
                const truncatedStats = rawDbStats.length > 4000 ? rawDbStats.substring(0, 4000) + '... (truncated)' : rawDbStats;
                const summaryPrompt = `User asked: "${prompt}"\nDatabase returned: ${truncatedStats}`;

                // --- TABLE/CARD DETECTION: if user wants a table, card view, or multiple records are returned ---
                const tableKeywords = /\b(table|csv|spreadsheet|excel|sheet|tabular|export data|download data|list all|show all|show me all|display|cards?|card layout|warehouses?|inventory matrix)\b/i;
                // --- CHART DETECTION: if user wants a chart, skip the LLM summarization and send raw data ---
                const chartKeywords = /\b(chart|graph|pie|bar chart|bar|graphical|html report|visual report|column|grouped|stacked|combo|comparison|compare|vs|versus)\b/i;
                
                if (chartKeywords.test(prompt)) {
                    // Detect chart type from the prompt
                    let chartType = 'bar';
                    if (/\bpie\b/i.test(prompt)) chartType = 'pie';
                    else if (/\bline\b/i.test(prompt)) chartType = 'line';
                    else if (/\bdoughnut\b/i.test(prompt)) chartType = 'doughnut';

                    // Detect if this should be a grouped/multi-dataset chart
                    const isGrouped = /\b(group|grouped|comparison|compare|combo|multi|vs|versus|stacked|and|&)\b/i.test(prompt);

                    // Analyze DB result columns to find label and value keys
                    const rows = dbResult.rows;
                    if (rows.length > 0) {
                        const keys = Object.keys(rows[0]);
                        
                        // Helper: check if a value is numeric (handles pg numeric-as-string)
                        const isNumericValue = (val) => {
                            if (val === null || val === undefined) return false;
                            if (typeof val === 'number') return true;
                            if (typeof val === 'string' && val.trim() !== '' && isFinite(Number(val))) return true;
                            return false;
                        };
                        
                        const labelKeys = keys.filter(k => !isNumericValue(rows[0][k]));
                        const valueKeys = keys.filter(k => isNumericValue(rows[0][k]));
                        
                        // Coerce numeric string values to actual numbers for Chart.js
                        const coercedRows = rows.map(row => {
                            const newRow = { ...row };
                            valueKeys.forEach(vk => { newRow[vk] = Number(newRow[vk]) || 0; });
                            return newRow;
                        });
                        
                        // Build multi-dataset chart data if multiple numeric columns exist
                        if (valueKeys.length > 1 && (isGrouped || valueKeys.length >= 2)) {
                            parsedResponse.chartData = {
                                type: chartType,
                                multiDataset: true,
                                labelKey: labelKeys[0] || keys[0],
                                valueKeys: valueKeys,
                                rows: coercedRows,
                            };
                        } else {
                            parsedResponse.chartData = {
                                type: chartType,
                                rows: coercedRows,
                            };
                        }
                    } else {
                        parsedResponse.chartData = {
                            type: chartType,
                            rows: rows,
                        };
                    }
                    parsedResponse.responseText = "Here's your chart:";
                } else if ((tableKeywords.test(prompt) || dbResult.rows.length > 0) && dbResult.rows.length > 0) {
                    // Always attach raw tableData when records are present so frontend can render Cards or Table
                    parsedResponse.tableData = {
                        columns: Object.keys(dbResult.rows[0]),
                        rows: dbResult.rows,
                        totalRows: dbResult.rows.length,
                    };
                    parsedResponse.responseText = `Here are the results (${dbResult.rows.length} record${dbResult.rows.length !== 1 ? 's' : ''}):`;
                } else {
                    // Normal text summarization for non-chart, non-tabular queries
                    const summarizationInstruction = "Answer the user's question directly based on the database results. If the database returns multiple records, format your response using bullet points so no data is lost. If the user asks for CSV, Excel, sheet, or a table, output ONLY raw TSV (Tab-Separated Values) text.";
                    if (aiProvider === 'groq') {
                        parsedResponse.responseText = await callGroqWithFallback([
                            { role: "system", content: summarizationInstruction },
                            { role: "user", content: summaryPrompt }
                        ]);
                    } else {
                        parsedResponse.responseText = await callGeminiWithFallback(summaryPrompt, summarizationInstruction, false);
                    }
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
