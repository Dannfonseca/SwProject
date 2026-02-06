import { GoogleGenerativeAI } from '@google/generative-ai';

const getClient = (apiKey?: string) => {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Gemini API Key is missing.');
    return new GoogleGenerativeAI(key);
};

export const analyzeScreenshot = async (imageBuffer: Buffer, mimeType: string, apiKey?: string) => {
    const genAI = getClient(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    Analyze this Summoners War monster box screenshot.
    Identify all the monsters visible in the image.
    Return a JSON array of objects, where each object has:
    - "name": The name of the monster (e.g., "Veromos", "Lushen").
    - "element": The element (Fire, Water, Wind, Light, Dark).
    - "stars": The star grade (number).
    - "level": The level (number).
    
    Output strictly JSON code block.
  `;

    const imagePart = {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType
        },
    };

    try {
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Basic cleanup to extract JSON if wrapped in markdown
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        const jsonString = (jsonMatch ? jsonMatch[1] : text) || '';

        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Error analyzing image with Gemini:', error);
        throw error;
    }
};

export const translateSkills = async (skills: { id: string, name: string, description: string }[], apiKey?: string) => {
    const genAI = getClient(apiKey);
    if (skills.length === 0) return [];

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    Translate the following Summoners War skill names and descriptions to Portuguese (Brazil).
    Maintain standard Summoners War terminology (e.g., "Attack Bar", "Glancing Hit", "Stun").
    
    Input JSON:
    ${JSON.stringify(skills)}

    Return a JSON array of objects with the following structure:
    [
        {
            "id": "original_id",
            "name_pt": "translated name",
            "description_pt": "translated description"
        }
    ]
    Output strictly JSON code block.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        const jsonString = (jsonMatch ? jsonMatch[1] : text) || '';

        return JSON.parse(jsonString) as { id: string, name_pt: string, description_pt: string }[];
    } catch (error) {
        console.error('Error translating skills:', error);
        return [];
    }
};

export const generateDefenseSuggestions = async (userInput: string, allMonsterNames: string[], apiKey?: string) => {
    const key = apiKey || process.env.GEMINI_API_KEY;
    console.log(`[AI] Request - Input: ${userInput.length} chars, Context: ${allMonsterNames.length} monsters, Key Source: ${apiKey ? 'Frontend' : 'Backend .env'}`);

    if (!key) {
        console.error('[AI] Error: No Gemini API Key provided.');
        return [];
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.1
        }
    });

    // Strategy: Chunk input by lines to avoid token limits
    const lines = userInput.split('\n').filter(l => l.trim().length > 0);
    const CHUNK_SIZE = 50; // 50 lines per request
    const chunks = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
        chunks.push(lines.slice(i, i + CHUNK_SIZE).join('\n'));
    }

    console.log(`[AI] Split input into ${chunks.length} chunks of ~${CHUNK_SIZE} lines.`);

    const validMonstersStr = allMonsterNames.length > 0 ? allMonsterNames.slice(0, 1500).join(', ') : 'Any SW monster.';

    const processChunk = async (chunkText: string, index: number) => {
        const prompt = `
        Summoners War Siege Expert.
        
        COLLAB_MAPPING_REFERENCE:
        Use this list to convert Collab Monsters to their SW Counterparts. Order is: Fire, Water, Wind, Light, Dark.
        
        [Street Fighter]
        Ryu: Douglas, Moore, Kashmir, Talisman, Vancliffe
        Ken: Bernadotte
        M. Bison: Karnal, Borgnine, Sagar, Craig, Gurkha
        Chun-li: Berenice, Lariel, Cordelia, Leah, Veressa
        Dhalsim: Todd, Kyle, Jarrett, Hekerson, Cayde

        [Cookie Run: Kingdom]
        GingerBrave: Thomas
        Pure Vanilla: Lucia, Adriana, Angela, Ariana, Elena
        Hollyberry: Alice, Manon, Jade, Audrey, Giselle
        Espresso: Hibiscus, Rosemary, Chamomilea, Jasmine, Lavender
        Madeleine: Pavé, Ganache, Praline, Fudge, Truffle

        [Assassin's Creed]
        Altair: Frederic
        Ezio: Patric, Lionel, Hector, Ian, Evan
        Bayek: Ashour, Omar, Shahat, Ahmed, Salah
        Kassandra: Federica, Kalantatze, Eleni, Aurelia, Kiara
        Eivor: Solveig, Brita, Astrid, Berghild, Sigrid

        [The Witcher 3]
        Geralt: Magnus, Anders, Henrik, Lars, Valdemar
        Ciri: Reyka, Rigna, Tirsa, Birgitta, Fiona
        Triss: Enshia, Lumina, Nobella, Groa, Celestara
        Yennefer: Tarnisha, Johanna, Hexarina, Arcana, Hilda

        [Tekken 8] (SW Equivalent Family: Indras?)
        Jin Kazama: Kai (Fire), Suiki (Water), Kinki (Wind), Deva (Light), Ongyouki (Dark)
        Hwoarang: Taebaek (Fire), ... Use SW knowledge for others if generic provided.
        *User Note: Jin mapped to Kai, etc. Use provided names or correct SW Awakened name if generic.*

        [Jujutsu Kaisen] (SW Equivalent: Dokkaebi Lords/etc)
        Yuji Itadori: Rick (Fire)...
        Gojo: Werner...
        *Use known SW equivalents for these families (Dokkaebi Lord, Cursed Spirit, etc)*

        [Demon Slayer] (SW Equivalent: Blade Master, etc)
        Tanjiro: Azure Dragon Swordsman (Family). Awakened: Tomalik(Fire), Haegang(Water), Liam(Wind), ...
        Nezuko: Vermilion Bird Dancer (Family).
        Zenitsu: Qilin Slasher (Family). Wind = Shun.
        Inosuke: White Tiger (Family).
        Gyomei: Black Tortoise (Family).

        [Lord of the Rings]
        Gandalf, Aragorn, Legolas... Use internal knowledge to map to SW equivalents.

        MANDATORY_SUBSTITUTIONS (Apply these strictly):
        // Demon Slayer Collab Reverse Mapping (SW Name -> Collab Name for Images)
        "Wind Qilin Slasher" -> "Zenitsu Agatsuma"
        "Fire Qilin Slasher" -> "Zenitsu Agatsuma"
        "Water Qilin Slasher" -> "Zenitsu Agatsuma"
        "Light Qilin Slasher" -> "Zenitsu Agatsuma"
        "Dark Qilin Slasher" -> "Zenitsu Agatsuma"
        "Qilin Slasher" -> "Zenitsu Agatsuma"

        "White Tiger Blade Master" -> "Inosuke Hashibira"
        "Azure Dragon Swordsman" -> "Tanjiro Kamado"
        "Vermilion Bird Dancer" -> "Nezuko Kamado"
        "Black Tortoise Champion" -> "Gyomei Himejima"

        // Handle Accents (DB has "Irène" with accent)
        "Irene" -> "Irène"
        "Irène" -> "Irène"
        
        // Fix potential AI mixups
        "Dark Rick" -> "Vancliffe" 
        "Wind Rick" -> "Kashmir"
        "Dark Werner" -> "Xiana"
        
        INPUT:
        ${chunkText}
        
        VALID MONSTERS: ${validMonstersStr}
        
        TASK: Extract all 3-monster defense teams.
        CONTEXT: The input is a CSV list.
        
        INSTRUCTIONS:
        1. Parse input line by line.
        2. Extract 3 monster names.
        3. NORMALIZE NAMES: 
           - **CRITICAL**: Use the MANDATORY_SUBSTITUTIONS list above.
           - If the input is "Wind Qilin Slasher", return "Zenitsu Agatsuma".
           - Ensure names match valid monsters if possible.
           - **IF A TEAM HAS A MONSTER NOT IN MAPPING**: First try to match closely to a valid monster. If still unsure, output the name as is (don't skip the team).
        4. Return ALL teams found.
        
        FORMAT: Return ONLY a MINIFIED JSON array: [{"monsters":["Leader","Mon2","Mon3"],"note":"List"}]
        `;

        try {
            console.log(`[AI] Processing Chunk ${index + 1}/${chunks.length}...`);
            const result = await model.generateContent(prompt);
            const text = result.response.text();

            const jsonMatch = text.match(/\[[\s\S]*\]/);
            const jsonString = jsonMatch ? jsonMatch[0] : text;
            return JSON.parse(jsonString);
        } catch (error: any) {
            console.error(`[AI] Chunk ${index + 1} Failed:`, error.message);
            return [];
        }
    };

    // run in parallel with concurrency limit if needed, but for now Promise.all is okay for small batch counts
    // For very large lists, Promise.all might hit rate limits. Let's do batching of promises?
    // Gemini 2.0 Flash is fast. Let's try direct Promise.all for simple implementation.

    const normalizeName = (name: string): string => {
        const cleanName = name.trim();
        const lowerName = cleanName.toLowerCase();

        // Hardcoded Collab Forward/Reverse Map (Keys must be lowercase)
        const mapping: Record<string, string> = {
            // Demon Slayer (SW -> Collab)
            "wind qilin slasher": "Zenitsu Agatsuma",
            "fire qilin slasher": "Zenitsu Agatsuma",
            "water qilin slasher": "Zenitsu Agatsuma",
            "light qilin slasher": "Zenitsu Agatsuma",
            "dark qilin slasher": "Zenitsu Agatsuma",
            "qilin slasher": "Zenitsu Agatsuma",
            "zenitsu": "Zenitsu Agatsuma",

            "white tiger blade master": "Inosuke Hashibira",
            "water white tiger blade master": "Inosuke Hashibira",
            "l.w.t. blade master": "Inosuke Hashibira",
            "l.w.t.": "Inosuke Hashibira",
            "light white tiger": "Inosuke Hashibira",
            "light white tiger blade master": "Inosuke Hashibira",
            "dark white tiger blade master": "Inosuke Hashibira",
            "wind white tiger blade master": "Inosuke Hashibira",
            "fire white tiger blade master": "Inosuke Hashibira",
            "inosuke": "Inosuke Hashibira",

            "azure dragon swordsman": "Tanjiro Kamado",
            "water azure dragon swordsman": "Tanjiro Kamado",
            "tanjiro": "Tanjiro Kamado",

            "vermilion bird dancer": "Nezuko Kamado",
            "fire vermilion bird dancer": "Nezuko Kamado",
            "nezuko": "Nezuko Kamado",

            "black tortoise champion": "Gyomei Himejima",
            "gyomei": "Gyomei Himejima",

            // Accents
            "irene": "Irène",
            "irène": "Irène",

            // Others
            "dark rick": "Vancliffe",
            "wind rick": "Kashmir",
            "dark werner": "Xiana",

            // Twins
            "ramael and judiah": "Ramael and Judiah",
            "ramael & judiah": "Ramael and Judiah",
            "twin angels": "Ramael and Judiah", // Generalizing to Water version

            // AC Collab (Renamed in DB to original SW names)
            "brita": "Brita", // Water
            "white brita": "Brita",
            "white bayek": "Brita",
            "water bayek": "Brita",
            "water eivor": "Brita",

            "kassandra": "Kassandra", // Fire 
            "fire bayek": "Ashour", // User prefers Ashour for Fire Bayek
            "ashour": "Ashour",

            "cordelia": "Cordelia", // Wind
            "wind bayek": "Shahat",

            "varin": "Varin", // Light
            "light bayek": "Ahmed",

            "havi": "Havi", // Dark
            "dark bayek": "Salah",

            // Generic "Eivor" input -> Map to Water (Brita) or handle ambiguity
            "eivor": "Brita",
            "bayek": "Ashour", // Defaulting 'Bayek' to Ashour/Fire if generic

            "astrid": "Cordelia", // Correction if needed
            "solveig": "Kassandra", // Correction if needed
            "berghild": "Varin",
            "sigrid": "Havi"
        };

        // Match lowercase key
        if (mapping[lowerName]) return mapping[lowerName];

        // Partial match for Qilin/etc if AI adds extra words? 
        // e.g. "Wind Qilin Slasher (Unawakened)" -> check includes?
        // for now strict map is safer.

        return cleanName;
    };

    const results = await Promise.all(chunks.map((chunk, i) => processChunk(chunk, i)));

    // Post-process all teams to normalize names
    const allTeams = results.flat().map((team: any) => ({
        ...team,
        monsters: team.monsters.map((m: string) => normalizeName(m))
    }));

    console.log(`[AI] Success: Extracted total ${allTeams.length} teams from ${chunks.length} chunks.`);
    return allTeams;
};

export const extractMonstersFromImages = async (images: { buffer: Buffer, mimeType: string }[], knownMonsters: string[] = [], apiKey?: string) => {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Gemini API Key is missing.');

    console.log(`[AI] Analyzing ${images.length} images...`);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Helper to process a single image
    const processImage = async (img: { buffer: Buffer, mimeType: string }, index: number, validNames: string[]) => {
        const prompt = `
        Analyze this Summoners War screenshot of a monster box.
        
        TASK:
        Identify which of the following VALID MONSTERS are visible in the image.
        
        VOCABULARY (Use ONLY these names):
        ${JSON.stringify(validNames)}
        
        INSTRUCTIONS:
        1. Scan the image thoroughly for every single monster.
        2. Match them against the provided VOCABULARY list.
        3. BE COMPREHENSIVE: Try to identify as many units as possible.
        4. If a monster is partially visible but recognizable, INCLUDE IT.
        5. Return a JSON array of the matched names.
        
        OUTPUT FORMAT:
        Strictly JSON array of strings: ["Name1", "Name2"]
        `;

        const imagePart = {
            inlineData: {
                data: img.buffer.toString('base64'),
                mimeType: img.mimeType
            }
        };

        try {
            console.log(`[AI] Processing Image ${index + 1} with vocabulary of ${validNames.length} names...`);
            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Improve JSON extraction to handle potential "```json" wrapping
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            const jsonString = jsonMatch ? jsonMatch[0] : "[]";
            const parsed = JSON.parse(jsonString);

            // Validate it's an array of strings
            if (Array.isArray(parsed) && parsed.every(i => typeof i === 'string')) {
                return parsed as string[];
            }
            console.warn(`[AI] Image ${index + 1} returned invalid format, fallback to empty.`);
            return [];
        } catch (error: any) {
            console.error(`[AI] Image ${index + 1} Error:`, error.message);
            return [];
        }
    };

    // Run parallel
    const results = await Promise.all(images.map((img, i) => processImage(img, i, knownMonsters)));

    // Flatten and Deduplicate
    const rawNames = Array.from(new Set(results.flat()));
    console.log(`[AI] Found ${rawNames.length} unique raw names.`);

    // Reuse the internal normalize function? 
    // We need to extract the logic or duplicate it. 
    // Since 'normalizeName' is inside specific functions, let's duplicate the relevant mapping logic here
    // or better, Refactor AiService to have a shared 'normalizeName' helper.
    // For now, I'll include the mapping here for safety and speed.

    const normalize = (name: string) => {
        const clean = name.trim();
        const lower = clean.toLowerCase();

        const mapping: Record<string, string> = {
            // AC Collab
            "brita": "Brita", "white brita": "Brita", "water eivor": "Brita",
            "kassandra": "Kassandra", "fire eivor": "Kassandra",
            "cordelia": "Cordelia", "wind eivor": "Cordelia",
            "varin": "Varin", "light eivor": "Varin",
            "havi": "Havi", "dark eivor": "Havi",
            "ashour": "Ashour", "fire bayek": "Ashour", "bayek": "Ashour",

            // Standard
            "ramael and judiah": "Ramael and Judiah",
            "ramael & judiah": "Ramael and Judiah"
        };

        return mapping[lower] || clean;
    };

    const normalizedNames = Array.from(new Set(rawNames.map(n => normalize(n))));
    return normalizedNames;
};
