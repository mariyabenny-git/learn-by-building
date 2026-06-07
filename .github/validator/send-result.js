#!/usr/bin/env node

// .github/validator/send-result.js
// Reads result JSON, signs it with HMAC-SHA256, POSTs to Supabase result endpoint

import { readFileSync, existsSync } from "fs";
import { createHmac } from "crypto";
import fetch from "node-fetch"; // Enforce predictable network execution across all Node runtime environments

// Professional, robust argument parser mapping keys directly to prevent string indexing bugs
function parseCliArgs() {
    const args = process.argv.slice(2);
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].replace('--', '');
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                flags[key] = value;
                i++;
            }
        }
    }
    return flags;
}

const flags = parseCliArgs();
const resultFile   = flags["result-file"];
const submissionId = flags["submission-id"];
const username     = flags["username"];
const projectType  = flags["project-type"];

// Validate CLI Argument Integrity
if (!resultFile || !submissionId || !username || !projectType) {
    console.error("❌ Operational Error: Missing mandatory arguments for send-result execution pipeline.");
    console.error("Required: --result-file <path> --submission-id <id> --username <user> --project-type <type>");
    process.exit(1);
}

// Read Core System Environments
const supabaseResultUrl = process.env.SUPABASE_RESULT_URL;
const webhookSecret     = process.env.WEBHOOK_SECRET;

if (!supabaseResultUrl || !webhookSecret) {
    console.error("❌ Configuration Error: Missing SUPABASE_RESULT_URL or WEBHOOK_SECRET system environment variables.");
    process.exit(1);
}

const resultEndpoint = `${supabaseResultUrl}/functions/v1/result`;
let payload;

// Process the Validator Output Stream
if (existsSync(resultFile)) {
    try {
        const fileContent = readFileSync(resultFile, "utf-8");
        const fileResult  = JSON.parse(fileContent);

        // SCHEMA ALIGNMENT: Mapping internal status strings ("success"/"error") and errors ("msg")
        const isSuccessful = fileResult.status === "success";
        const systemMessage = fileResult.msg || fileResult.error_message || null;

        payload = {
            submission_id:   submissionId,
            github_username: username,
            project_type:    projectType,
            success:         isSuccessful,
            score:           fileResult.score ?? (isSuccessful ? 100 : 0), // Fallback safety logic
            bonus_score:     fileResult.bonus_score ?? 0,
            breakdown:       fileResult.breakdown ?? (fileResult.status ? { status: fileResult.status } : {}),
            error_message:   systemMessage,
        };
    } catch (err) {
        console.error("⚠️ Data Contamination: Failed to parse structural validator output result file:", err.message);
        payload = {
            submission_id:   submissionId,
            github_username: username,
            project_type:    projectType,
            success:         false,
            score:           0,
            bonus_score:     0,
            breakdown:       {},
            error_message:   `Validator output file was corrupted or unreadable JSON: ${err.message}`,
        };
    }
} else {
    // Pipeline Failure Safeguard (Validator encountered a critical script crash or out-of-memory termination)
    console.error(`⚠️ Execution Interrupted: Target validation file matching "${resultFile}" does not exist on disk.`);
    payload = {
        submission_id:   submissionId,
        github_username: username,
        project_type:    projectType,
        success:         false,
        score:           0,
        bonus_score:     0,
        breakdown:       {},
        error_message:   "Critical Operational Crash: The validation sub-engine terminated abruptly before output assignment.",
    };
}

const body = JSON.stringify(payload);

// Secure Data Payload Integrity via HMAC-SHA256 Cryptographic Handshake
const signature = createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

console.log(`📡 Shipping execution metrics securely to production endpoint: ${resultEndpoint}`);

// Dispatch payload safely across remote boundary
try {
    const res = await fetch(resultEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-signature-256": signature,
        },
        body,
        signal: AbortSignal.timeout(15000), // Enforces a tight 15-second infrastructure timeout wall
    });

    const responseText = await res.text();
    console.log(`📥 Endpoint Handshake Completed: HTTP ${res.status} — ${responseText}`);

    if (!res.ok) {
        console.error("❌ Transmission Rejection: Gateway returned a non-200 transaction record status.");
        process.exit(1);
    }

    console.log("🚀 Pipeline Complete: Grade data successfully dispatched and verified by edge network.");
} catch (err) {
    console.error("❌ Telemetry Failure: Failed to transmit signed report stream packet over interface connection:", err.message);
    process.exit(1);
}
