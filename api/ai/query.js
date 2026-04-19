const { verifyAdminToken } = require('../../lib/auth');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MISSING_KEY');

// Define the expected output schema for Gemini
const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        actionType: {
            type: SchemaType.STRING,
            description: "Type of action to perform. Use 'navigate' to navigate to a page and set filters. Use 'answer' for general questions or greetings.",
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
            description: "Conversational response to display to the user.",
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
    systemInstruction: "You are an AI assistant for an e-commerce admin panel. Your job is to parse natural language requests from the admin and figure out what page they want to see, and what filters to apply. For example, 'Show me pending orders' -> navigate to orders with status=pending. 'Look for brake parts' -> navigate to products with search='brake part'. If the user asks a general question, just give a helpful answer.",
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
        const responseText = result.response.text();
        
        console.log(`🤖 AI Raw Response: ${responseText}`);

        // Parse and return back to frontend
        const parsedResponse = JSON.parse(responseText);

        res.status(200).json({
            success: true,
            data: parsedResponse
        });

    } catch (error) {
        console.error('❌ AI API error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process AI query',
            error: error.message
        });
    }
};
