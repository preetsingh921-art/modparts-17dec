const { verifyAdminToken } = require('../../lib/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const axios = require('axios');
const db = require('../../lib/db');

// --- SHARED GLOBALS ---
let cachedDatabaseSchema = null;

// The base rules without the hardcoded schema
const baseSystemInstruction = `You are an AI assistant for an e-commerce admin panel. Parse requests.
- Use 'navigate' ONLY if the user explicitly asks to go to or open a page (e.g., 'go to users page', 'take me to orders', 'open products page').
- If the user asks to "show", "display", "list", "fetch", or "find" records (e.g. 'show me all users', 'display products', 'list orders', 'show warehouses'), ALWAYS use 'execute_sql' to query and display the data directly in the chat! NEVER use 'navigate' for displaying data.
- Use 'execute_sql' to answer any questions about records, stats, or data directly in the chat. ALWAYS use execute_sql if the user asks for an HTML report, chart, cards, or graphical representation so we can fetch the underlying data! NEVER explain SQL queries.
- Use 'answer' ONLY for generic conversational greetings (e.g. 'hello', 'who are you?'). 
- IMPORTANT: Use EXACT table names as defined in the DATABASE SCHEMA below. Do not guess or modify pluralities (e.g. use order_items, not orders_item).

SQL RULES:
- If a user asks for both a list of items AND their count, DO NOT mix aggregate COUNT() with unaggregated columns, as it causes DB GROUP BY errors! Just SELECT the list of items normally. The conversational AI can count the rows manually.
- MUST start with SELECT and be READ-ONLY.
- ALWAYS use ILIKE instead of = for string matching (e.g. c.name ILIKE '%brakes%') to be case-insensitive.

USER MANAGEMENT RULES:
- When user asks to "show all users", "show me all users", "list users", "all users", "who are the users", "display users", or "user accounts":
  Write a query selecting safe user fields (NEVER select passwords or sensitive tokens):
  SELECT id, email, first_name, last_name, role, status, warehouse_id, is_approved, created_at
  FROM users
  ORDER BY id ASC;

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

// --- MODEL CONFIGURATIONS ---

// 1. Google Gemini (Default Primary)
const GEMINI_MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-3.6-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
].filter(Boolean);

// 2. Groq Cloud (High-Speed Inference)
const GROQ_MODELS = [
    process.env.GROQ_MODEL,
    'openai/gpt-oss-120b',
    'qwen/qwen3.6-27b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
    'llama-3.2-11b-vision-preview',
    'llama-3.1-8b-instant',
    'llama3-70b-8192',
    'llama3-8b-8192'
].filter(Boolean);

// 3. SambaNova Cloud
const SAMBANOVA_MODELS = [
    process.env.SAMBANOVA_MODEL,
    'Meta-Llama-3.1-70B-Instruct',
    'Meta-Llama-3.3-70B-Instruct'
].filter(Boolean);

// 4. GitHub Models / Azure AI
const GITHUB_MODELS = [
    process.env.GITHUB_MODEL,
    'gpt-4o',
    'gpt-4o-mini'
].filter(Boolean);

let groqClient = null;

// --- PROVIDER CALL FUNCTIONS ---

async function callGeminiWithFallback(prompt, systemInstruction, isJson = true) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");

    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError = null;

    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`✨ Trying Gemini model: ${modelName}`);
            const config = { model: modelName };
            if (systemInstruction) config.systemInstruction = systemInstruction;

            if (isJson) {
                config.generationConfig = { temperature: 0.1, responseMimeType: "application/json" };
            } else {
                config.generationConfig = { temperature: 0.1 };
            }

            const model = genAI.getGenerativeModel(config);
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            if (text) return text;
        } catch (err) {
            console.warn(`⚠️ Gemini model "${modelName}" failed: ${err.message}. Trying next in cascade...`);
            if (isJson) {
                try {
                    const fallbackModel = genAI.getGenerativeModel({ model: modelName, systemInstruction });
                    const retryResult = await fallbackModel.generateContent(prompt);
                    const retryText = retryResult.response.text();
                    if (retryText) return retryText;
                } catch (retryErr) {
                    // continue
                }
            }
            lastError = err;
        }
    }
    throw lastError || new Error("All Gemini models failed");
}

async function callGroqWithFallback(messages, isJson = true) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing");

    if (!groqClient) groqClient = new Groq({ apiKey });
    let lastError = null;

    for (const model of GROQ_MODELS) {
        try {
            console.log(`🦙 Trying Groq model: ${model}`);
            const reqPayload = {
                messages,
                model,
                temperature: 0.1
            };
            if (isJson) {
                reqPayload.response_format = { type: "json_object" };
            }

            const completion = await groqClient.chat.completions.create(reqPayload);
            const content = completion.choices[0]?.message?.content || "";
            if (content) return content;
        } catch (err) {
            console.warn(`⚠️ Groq model "${model}" failed: ${err.message}. Trying next in cascade...`);
            if (isJson) {
                try {
                    const retryComp = await groqClient.chat.completions.create({
                        messages,
                        model,
                        temperature: 0.1
                    });
                    const retryContent = retryComp.choices[0]?.message?.content || "";
                    if (retryContent) return retryContent;
                } catch (retryErr) {
                    // continue
                }
            }
            lastError = err;
        }
    }
    throw lastError || new Error("All Groq models failed");
}

async function callSambaNovaWithFallback(messages, isJson = true) {
    const apiKey = process.env.SAMBANOVA_API_KEY;
    if (!apiKey) throw new Error("SAMBANOVA_API_KEY missing");

    let lastError = null;
    for (const model of SAMBANOVA_MODELS) {
        try {
            console.log(`🔷 Trying SambaNova model: ${model}`);
            const payload = {
                model,
                messages,
                temperature: 0.1
            };
            if (isJson) {
                payload.response_format = { type: "json_object" };
            }

            const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', payload, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            const content = res.data?.choices?.[0]?.message?.content || "";
            if (content) return content;
        } catch (err) {
            console.warn(`⚠️ SambaNova model "${model}" failed: ${err.response?.data?.message || err.message}`);
            lastError = err;
        }
    }
    throw lastError || new Error("All SambaNova models failed");
}

async function callGitHubModelsWithFallback(messages, isJson = true) {
    const token = process.env.GITHUB_TOKEN || process.env.AZURE_AI_KEY || process.env.OPENAI_API_KEY;
    if (!token) throw new Error("GITHUB_TOKEN / AZURE_AI_KEY missing");

    const endpoint = process.env.OPENAI_API_KEY && !process.env.GITHUB_TOKEN
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://models.inference.ai.azure.com/chat/completions';

    let lastError = null;
    for (const model of GITHUB_MODELS) {
        try {
            console.log(`🐙 Trying GitHub/Azure model: ${model}`);
            const payload = {
                model,
                messages,
                temperature: 0.1
            };
            if (isJson) {
                payload.response_format = { type: "json_object" };
            }

            const res = await axios.post(endpoint, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            const content = res.data?.choices?.[0]?.message?.content || "";
            if (content) return content;
        } catch (err) {
            console.warn(`⚠️ GitHub/Azure model "${model}" failed: ${err.response?.data?.message || err.message}`);
            lastError = err;
        }
    }
    throw lastError || new Error("All GitHub/Azure models failed");
}

// --- UNIVERSAL MULTI-PROVIDER ORCHESTRATOR WITH GRACEFUL CASCADE ---

async function callAIWithUniversalFallback({ preferredProvider, prompt, systemInstruction, isJson = true }) {
    const pref = (preferredProvider || process.env.AI_PROVIDER || 'gemini').toLowerCase();
    
    // Order providers: preferred first, then remaining fallbacks
    const allProviders = ['gemini', 'groq', 'sambanova', 'github'];
    const providerChain = [pref, ...allProviders.filter(p => p !== pref)];

    let lastError = null;
    for (const provider of providerChain) {
        try {
            console.log(`🚀 Executing AI query with provider: [${provider.toUpperCase()}]`);
            let rawText = "";

            if (provider === 'gemini') {
                rawText = await callGeminiWithFallback(prompt, systemInstruction, isJson);
            } else if (provider === 'groq') {
                const messages = [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: prompt }
                ];
                rawText = await callGroqWithFallback(messages, isJson);
            } else if (provider === 'sambanova') {
                const messages = [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: prompt }
                ];
                rawText = await callSambaNovaWithFallback(messages, isJson);
            } else if (provider === 'github') {
                const messages = [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: prompt }
                ];
                rawText = await callGitHubModelsWithFallback(messages, isJson);
            }

            if (rawText && rawText.trim()) {
                return { text: rawText.trim(), providerUsed: provider };
            }
        } catch (providerError) {
            console.warn(`⚠️ Provider [${provider}] failed: ${providerError.message}. Cascading to next available provider...`);
            lastError = providerError;
        }
    }

    throw lastError || new Error("All AI providers in fallback chain failed.");
}

// --- HELPER: ROBUST JSON PARSER ---
function extractJson(text) {
    if (!text) return null;
    let clean = text.trim();
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
        return JSON.parse(clean);
    } catch (e) {
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
            try {
                return JSON.parse(clean.substring(start, end + 1));
            } catch (innerE) {
                // Ignore
            }
        }
    }
    return null;
}

module.exports = async function handler(req, res) {
    try {
        const decoded = verifyAdminToken(req);
        if (!decoded) return res.status(401).json({ message: 'Unauthorized' });
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        
        const { prompt, provider } = req.body;
        if (!prompt) return res.status(400).json({ message: 'Prompt is required' });

        const requestedProvider = (provider || process.env.AI_PROVIDER || 'gemini').toLowerCase();

        // 1. DYNAMIC SCHEMA INTROSPECTION (Cached in memory to prevent recurrent database trips)
        if (!cachedDatabaseSchema) {
            console.log("🔍 Fetching Dynamic DB Schema for AI Context...");
            const schemaQuery = `
                SELECT table_name, column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name NOT IN ('spatial_ref_sys')
                AND column_name NOT ILIKE '%password%'
                AND column_name NOT ILIKE '%token%'
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

        console.log(`🤖 AI Query received [Requested: ${requestedProvider}]: "${prompt}"`);

        // Execute pass 1 via universal fallback orchestrator
        const { text: rawAiResponse, providerUsed } = await callAIWithUniversalFallback({
            preferredProvider: requestedProvider,
            prompt,
            systemInstruction: dynamicSystemInstruction,
            isJson: true
        });

        console.log(`🤖 AI Response generated using [${providerUsed.toUpperCase()}]: ${rawAiResponse}`);

        let parsedResponse = extractJson(rawAiResponse);
        if (!parsedResponse) {
            throw new Error(`Failed to parse AI response into valid JSON. Raw output: ${rawAiResponse.substring(0, 200)}...`);
        }

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
                
                const userKeywords = /\b(users?|customers?|admins?|accounts?|staff|members?)\b/i;
                if (chartKeywords.test(prompt)) {
                    // Detect chart type from the prompt
                    let chartType = 'bar';
                    if (/\bpie\b/i.test(prompt)) chartType = 'pie';
                    else if (/\bline\b/i.test(prompt)) chartType = 'line';
                    else if (/\bdoughnut\b/i.test(prompt)) chartType = 'doughnut';

                    const isGrouped = /\b(group|grouped|comparison|compare|combo|multi|vs|versus|stacked|and|&)\b/i.test(prompt);
                    const rows = dbResult.rows;

                    if (rows.length > 0) {
                        const keys = Object.keys(rows[0]);
                        const isNumericValue = (val) => {
                            if (val === null || val === undefined) return false;
                            if (typeof val === 'number') return true;
                            if (typeof val === 'string' && val.trim() !== '' && isFinite(Number(val))) return true;
                            return false;
                        };
                        
                        const labelKeys = keys.filter(k => !isNumericValue(rows[0][k]));
                        const valueKeys = keys.filter(k => isNumericValue(rows[0][k]));
                        
                        const coercedRows = rows.map(row => {
                            const newRow = { ...row };
                            valueKeys.forEach(vk => { newRow[vk] = Number(newRow[vk]) || 0; });
                            return newRow;
                        });
                        
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
                } else if ((tableKeywords.test(prompt) || userKeywords.test(prompt) || dbResult.rows.length > 0) && dbResult.rows.length > 0) {
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
                    const { text: summarizedText } = await callAIWithUniversalFallback({
                        preferredProvider: requestedProvider,
                        prompt: summaryPrompt,
                        systemInstruction: summarizationInstruction,
                        isJson: false
                    });
                    parsedResponse.responseText = summarizedText;
                }

            } catch (dbError) {
                console.error("❌ SQL Execution Error:", dbError);
                parsedResponse.responseText = "I couldn't fetch that specific data right now due to a database error.";
            }
        }

        res.status(200).json({ success: true, data: parsedResponse, providerUsed });

    } catch (error) {
        console.error('❌ AI API error:', error);
        return res.status(500).json({
            success: false,
            message: `Failed to process AI query: ${error.message || 'Unknown error'}`,
            error: error.stack || error.message
        });
    }
};
