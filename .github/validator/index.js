import { writeFileSync, readFileSync } from "fs";
import { basename } from "path";
import fetch from "node-fetch";

import { validatePortfolio } from "./validators/portfolio.js";
import { validateRecipe } from "./validators/recipe.js";
import { validateQuiz } from "./validators/quiz.js";

// Professional, bulletproof argument parser mapping flags (--flag value) directly to an object
function parseArgs() {
    const args = process.argv.slice(2);
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].replace('--', '');
            const value = args[i + 1];
            // Ensure a value exists and it isn't another flag parameter
            if (value && !value.startsWith('--')) {
                flags[key] = value;
                i++; // Skip the next index since it's consumed as this flag's value
            }
        }
    }
    return flags;
}

// Universal Content Loader supporting both Local File System paths and Remote Networks (HTTP/S URLs)
async function loadContent(sourcePath) {
    if (!sourcePath) {
        throw new Error("Missing required source target file path or network URL.");
    }

    const isRemote = sourcePath.startsWith("http://") || sourcePath.startsWith("https://");

    if (isRemote) {
        try {
            const response = await fetch(sourcePath);
            if (!response.ok) {
                throw new Error(`HTTP Error Status: ${response.status} ${response.statusText}`);
            }
            return await response.text();
        } catch (fetchError) {
            throw new Error(`Network Connectivity Failure: Unable to fetch remote target JSON. (${fetchError.message})`);
        }
    }

    try {
        return readFileSync(sourcePath, "utf-8");
    } catch (fsError) {
        throw new Error(`Local File System Failure: Unable to read file at target path. (${fsError.message})`);
    }
}

// Smart Schema Auto-Detection based on resource name hints and inner data property profiles
function detectType(sourcePath, stringContent) {
    const targetName = basename(sourcePath).toLowerCase();
    
    // Step 1: Detect via filename keyword hooks
    if (targetName.includes('portfolio')) return 'portfolio';
    if (targetName.includes('recipe')) return 'recipe';
    if (targetName.includes('quiz')) return 'quiz';

    // Step 2: Fallback structural duck-typing via internal object signature properties
    try {
        const parsed = JSON.parse(stringContent);
        if (parsed.questions || parsed.quizTitle) return 'quiz';
        if (parsed.ingredients || parsed.instructions) return 'recipe';
        if (parsed.projects || parsed.experience || parsed.skills) return 'portfolio';
    } catch {
        throw new Error("Invalid Format: Target payload does not contain structurally valid JSON.");
    }

    return null;
}

async function run() {
    const { type: inputType, path, output } = parseArgs();
    const outPath = output || "./validation-result.json";

    try {
        // Safe Early-Exit Guard Clauses
        if (!path) {
            throw new Error("Execution Fault: Missing mandatory input argument. Syntax: --path <file_path_or_url>");
        }

        // 1. Ingest Data Stream (Abstracting File vs. Network Operations)
        const rawContent = await loadContent(path);

        // 2. Compute Content Typification Rule
        const targetType = inputType || detectType(path, rawContent);
        if (!targetType) {
            throw new Error("Schema Boundary Error: Could not auto-detect type signature. Please specify explicitly using --type.");
        }

        // 3. Dynamic Execution Dispatcher Matrix
        let validationResults;
        const normalizedType = targetType.toLowerCase();

        switch (normalizedType) {
            case 'portfolio':
                validationResults = await validatePortfolio(rawContent);
                break;
            case 'recipe':
                validationResults = await validateRecipe(rawContent);
                break;
            case 'quiz':
                validationResults = await validateQuiz(rawContent);
                break;
            default:
                throw new Error(`Execution Context Error: Unsupported target type "${targetType}". Valid schemas: portfolio, recipe, quiz.`);
        }

        // 4. Safe Output Committal and Clean Success Logging
        const successPayload = {
            status: "success",
            processedAt: new Date().toISOString(),
            schema: normalizedType,
            source: path,
            ...validationResults
        };

        writeFileSync(outPath, JSON.stringify(successPayload, null, 2));
        console.log(`✅ System Processed Successfully. Output safely generated at: ${outPath}`);

    } catch (globalError) {
        // Universal Error Catch Block to isolate crashing dependencies or broken data integrity states
        const errorPayload = {
            status: "error",
            processedAt: new Date().toISOString(),
            source: path || "undefined",
            msg: globalError.message
        };

        writeFileSync(outPath, JSON.stringify(errorPayload, null, 2));
        console.error(`❌ System Aborted: ${globalError.message}`);
    }
}

run();
