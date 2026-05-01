const db = require('../../lib/db');

/**
 * AI Category Prediction API
 * Uses Llama (via Groq) as default to predict the best category for a scanned part number.
 * Falls back to Gemini if Groq is unavailable, then keyword matching as final fallback.
 */
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { part_number, name } = req.body;

        if (!part_number && !name) {
            return res.status(400).json({ message: 'part_number or name is required' });
        }

        // Fetch all available categories from database
        const { rows: categories } = await db.query('SELECT id, name, description FROM categories ORDER BY name');

        if (categories.length === 0) {
            return res.json({ category_id: null, category_name: null, confidence: 0, method: 'none' });
        }

        const categoryNames = categories.map(c => c.name).join(', ');
        const inputText = name || part_number;

        const prompt = `You are an auto parts categorization expert for vintage Yamaha motorcycles (especially RD350, RD400, RX100, etc).

Given a part number or name, determine which category it belongs to.

Available categories: ${categoryNames}

Part number: ${part_number || 'N/A'}
Part name: ${inputText}

Instructions:
1. Analyze the part number prefix, name, and any keywords
2. Match it to the BEST category from the list above
3. If unsure, pick the closest match
4. Respond with ONLY a valid JSON object (no markdown, no explanation):
{"category": "exact category name from list", "confidence": 0.0-1.0}

Common patterns:
- Part numbers starting with numbers (e.g., 360-) are usually OEM Yamaha parts
- "CDI", "ignition", "coil" → Electrical
- "piston", "cylinder", "gasket", "ring" → Engine Parts
- "brake", "caliper", "pad" → Brakes
- "cable", "throttle", "clutch cable" → Cables
- "chain", "sprocket" → Chain & Sprockets
- "filter", "oil", "air" → Filters
- "exhaust", "silencer", "muffler", "pipe" → Exhaust
- "handle", "grip", "switch" → Handlebars
- "headlight", "tail light", "indicator" → Lights
- "seat", "tank", "fender", "body" → Body Parts
- "suspension", "shock", "fork" → Suspension
- "tire", "tyre", "wheel", "rim", "spoke" → Wheels & Tires`;

        // Try AI providers in order: Groq (Llama) → Gemini → Keyword fallback
        let aiResult = null;

        // ==========================================
        // PRIMARY: Groq (Llama) - Default AI Provider
        // ==========================================
        if (!aiResult) {
            try {
                const groqKey = process.env.GROQ_API_KEY;
                if (groqKey) {
                    const Groq = require('groq-sdk');
                    const groq = new Groq({ apiKey: groqKey });
                    const groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

                    const chatCompletion = await groq.chat.completions.create({
                        messages: [
                            { role: 'system', content: 'You are a motorcycle parts categorization expert. Respond with ONLY valid JSON, no markdown.' },
                            { role: 'user', content: prompt }
                        ],
                        model: groqModel,
                        temperature: 0.0,
                        response_format: { type: 'json_object' }
                    });

                    const responseText = chatCompletion.choices[0]?.message?.content?.trim();
                    if (responseText) {
                        let cleanJson = responseText;
                        if (cleanJson.startsWith('```')) {
                            cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                        }

                        const parsed = JSON.parse(cleanJson);
                        const matchedCategory = categories.find(c =>
                            c.name.toLowerCase() === parsed.category?.toLowerCase()
                        );

                        if (matchedCategory) {
                            aiResult = {
                                category_id: String(matchedCategory.id),
                                category_name: matchedCategory.name,
                                confidence: parsed.confidence || 0.8,
                                method: 'ai'
                            };
                        }

                        console.log(`🦙 Llama categorized "${inputText}" → ${aiResult?.category_name || 'no match'} (${(aiResult?.confidence || 0) * 100}%)`);
                    }
                }
            } catch (groqError) {
                console.error('Groq/Llama categorization error:', groqError.message);
            }
        }

        // ==========================================
        // FALLBACK: Gemini AI
        // ==========================================
        if (!aiResult) {
            try {
                const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
                if (geminiKey) {
                    const { GoogleGenerativeAI } = require('@google/generative-ai');
                    const genAI = new GoogleGenerativeAI(geminiKey);
                    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                    const result = await model.generateContent(prompt);
                    const responseText = result.response.text().trim();

                    let cleanJson = responseText;
                    if (cleanJson.startsWith('```')) {
                        cleanJson = cleanJson.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
                    }

                    const parsed = JSON.parse(cleanJson);
                    const matchedCategory = categories.find(c =>
                        c.name.toLowerCase() === parsed.category?.toLowerCase()
                    );

                    if (matchedCategory) {
                        aiResult = {
                            category_id: String(matchedCategory.id),
                            category_name: matchedCategory.name,
                            confidence: parsed.confidence || 0.8,
                            method: 'ai'
                        };
                    }

                    console.log(`🤖 Gemini categorized "${inputText}" → ${aiResult?.category_name || 'no match'} (${(aiResult?.confidence || 0) * 100}%)`);
                }
            } catch (geminiError) {
                console.error('Gemini categorization error:', geminiError.message);
            }
        }

        // If AI succeeded, return result
        if (aiResult) {
            return res.json(aiResult);
        }

        // ==========================================
        // FINAL FALLBACK: Keyword-based matching
        // ==========================================
        const keywordResult = keywordMatch(inputText, part_number, categories);
        console.log(`🔤 Keyword categorized "${inputText}" → ${keywordResult.category_name || 'no match'}`);
        return res.json(keywordResult);

    } catch (error) {
        console.error('Categorize API error:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

/**
 * Fallback keyword-based category matching
 */
function keywordMatch(text, partNumber, categories) {
    const input = (text + ' ' + (partNumber || '')).toLowerCase();

    // Keyword → Category mapping
    const keywordMap = {
        'engine': ['piston', 'cylinder', 'gasket', 'ring', 'bearing', 'crankshaft', 'con rod', 'connecting rod', 'valve', 'camshaft', 'engine'],
        'electrical': ['cdi', 'ignition', 'coil', 'stator', 'rectifier', 'regulator', 'spark', 'plug', 'wiring', 'harness', 'switch', 'relay', 'battery', 'electrical'],
        'brakes': ['brake', 'caliper', 'pad', 'disc', 'drum', 'shoe', 'master cylinder', 'lever'],
        'cables': ['cable', 'throttle cable', 'clutch cable', 'brake cable', 'speedometer cable', 'choke cable'],
        'chain': ['chain', 'sprocket', 'front sprocket', 'rear sprocket'],
        'filters': ['filter', 'oil filter', 'air filter', 'fuel filter'],
        'exhaust': ['exhaust', 'silencer', 'muffler', 'pipe', 'expansion chamber', 'header'],
        'lights': ['headlight', 'tail light', 'indicator', 'bulb', 'lens', 'reflector', 'signal'],
        'body': ['seat', 'tank', 'fender', 'side cover', 'mudguard', 'body', 'panel', 'fairing', 'cowl'],
        'suspension': ['suspension', 'shock', 'fork', 'spring', 'damper', 'absorber'],
        'wheels': ['tire', 'tyre', 'wheel', 'rim', 'spoke', 'hub', 'axle', 'bearing'],
        'carburetor': ['carburetor', 'carb', 'jet', 'needle', 'float', 'diaphragm', 'mikuni', 'keihin'],
        'clutch': ['clutch', 'clutch plate', 'friction plate', 'pressure plate', 'clutch spring'],
        'transmission': ['gear', 'transmission', 'shift', 'kickstart', 'kick'],
        'fuel': ['fuel', 'petcock', 'fuel cock', 'fuel tap', 'fuel line', 'fuel pump'],
        'handlebars': ['handlebar', 'handle', 'grip', 'bar end', 'mirror', 'throttle'],
    };

    let bestMatch = null;
    let bestScore = 0;

    for (const [categoryKey, keywords] of Object.entries(keywordMap)) {
        let score = 0;
        for (const keyword of keywords) {
            if (input.includes(keyword)) {
                score += keyword.length;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            const matchedCat = categories.find(c =>
                c.name.toLowerCase().includes(categoryKey) ||
                categoryKey.includes(c.name.toLowerCase())
            );
            if (matchedCat) {
                bestMatch = matchedCat;
            }
        }
    }

    if (bestMatch) {
        return {
            category_id: String(bestMatch.id),
            category_name: bestMatch.name,
            confidence: Math.min(bestScore / 20, 0.9),
            method: 'keyword'
        };
    }

    return {
        category_id: String(categories[0].id),
        category_name: categories[0].name,
        confidence: 0.1,
        method: 'fallback'
    };
}
