const { verifyAdminToken } = require('../../lib/auth');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const db = require('../../lib/db');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

// Define the expected output schema for Gemini
const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        actionType: {
            type: SchemaType.STRING,
            description: "Type of action to perform. 'navigate' to navigate to a page and set filters. 'execute_sql' to run a query for aggregations/stats. 'answer' for general questions.",
        },
        targetPage: {
            type: SchemaType.STRING,
            description: "The page to navigate to if actionType is 'navigate'. Valid options: 'products', 'orders', 'users', 'inventory'.",
        },
        filters: {
            type: SchemaType.OBJECT,
            description: "Key-value pairs of filters to apply to the target page.",
            properties: {
                search: { type: SchemaType.STRING, description: "Text to search by name, email, part number, etc." },
                category: { type: SchemaType.STRING, description: "Category ID if mentioned." },
                status: { type: SchemaType.STRING, description: "Status filter e.g., 'pending', 'completed' for orders or 'active' for users." },
                role: { type: SchemaType.STRING, description: "Role filter for users e.g., 'admin', 'user'." }
            }
        },
        responseText: {
            type: SchemaType.STRING,
            description: "Conversational response to display to the user. For execute_sql, leave this blank.",
        },
        sqlQuery: {
            type: SchemaType.STRING,
            description: "If actionType is 'execute_sql', the Postgres SQL query to execute. MUST start with SELECT and be READ-ONLY.",
        }
    },
    required: ["actionType", "responseText"]
};

// Configure the model
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
    },
    systemInstruction: `You are an AI assistant for an e-commerce admin panel. Parse requests.
- If the user wants to VIEW a LIST or TABLE of records (e.g., 'show all users', 'list pending orders', 'find brake parts'), ALWAYS use 'navigate'.
- ONLY use 'execute_sql' for AGGREGATE STATS (e.g., 'how many users total?', 'what is the total revenue?').
SCHEMA: 
- products(id, name, description, part_number, barcode, price, quantity, category_id, warehouse_id)
- orders(id, user_id, total_amount, status, created_at)
- users(id, email, first_name, last_name, role)
If returning execute_sql, provide the SQL query in sqlQuery. MUST start with SELECT and be safe.`,
});

// Second model config for summarizing data
const textModel = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "You are interpreting raw SQL database results for a dashboard admin. Given the user's question and the raw JSON database response, answer the user's question directly in a friendly, conversational tone (1-2 sentences). Format currencies nicely.",
});

module.exports = async function handler(req, res) {
    try {
        // Verify admin access
        const decoded = verifyAdminToken(req);
        if (!decoded) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method not allowed' });
        }

        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required' });
        }

        if (!process.env.GEMINI_API_KEY) {
             return res.status(500).json({ 
                 message: 'AI Assistant is not configured. Please add GEMINI_API_KEY to your environment variables.'
             });
        }

        console.log(`🤖 AI Query received: "${prompt}"`);

        // Generate content based on schema
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        console.log(`🤖 AI Raw Response: ${responseText}`);

        // Ensure we strip markdown code blocks if the AI includes them accidentally
        responseText = responseText.replace(/^```json\n?/gi, '').replace(/```$/gi, '').trim();

        // Parse and return back to frontend
        let parsedResponse = JSON.parse(responseText);

        if (parsedResponse.actionType === 'execute_sql' && parsedResponse.sqlQuery) {
            console.log(`🔍 Executing AI SQL: ${parsedResponse.sqlQuery}`);
            if (!parsedResponse.sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
                throw new Error("Only SELECT queries are allowed for security.");
            }
            try {
                // Execute readonly query
                const dbResult = await db.query(parsedResponse.sqlQuery);
                
                // Second Pass: Ask AI to summarize the result
                const rawDbStats = JSON.stringify(dbResult.rows);
                const truncatedStats = rawDbStats.length > 4000 ? rawDbStats.substring(0, 4000) + '... (truncated)' : rawDbStats;
                const summaryPrompt = `User asked: "${prompt}"\nDatabase returned: ${truncatedStats}`;
                const summaryResponse = await textModel.generateContent(summaryPrompt);
                
                parsedResponse.responseText = summaryResponse.response.text();
            } catch (dbError) {
                console.error("❌ SQL Execution Error:", dbError);
                parsedResponse.responseText = "I couldn't fetch that specific data right now due to a database error.";
            }
        }

        res.status(200).json({
            success: true,
            data: parsedResponse
        });

    } catch (error) {
        console.error('❌ AI API error:', error);
        return res.status(500).json({
            success: false,
            message: `Failed to process AI query: ${error.message || 'Unknown error'}`,
            error: error.stack || error.message
        });
    }
};
