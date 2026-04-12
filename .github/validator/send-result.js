#!/usr/bin/env node
// .github/validator/send-result.js
// Reads result JSON, signs it with HMAC-SHA256, POSTs to Supabase result endpoint

import { readFileSync, existsSync } from "fs";
import { createHmac } from "crypto";

function getArg(name) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const resultFile   = getArg("result-file");
const submissionId = getArg("submission-id");
const username     = getArg("username");
const projectType  = getArg("project-type");

// Validate args
if (!resultFile || !submissionId || !username || !projectType) {
  console.error("Missing required arguments for send-result");
  process.exit(1);
}

// Read environment
const supabaseResultUrl = process.env.SUPABASE_RESULT_URL;
const webhookSecret     = process.env.WEBHOOK_SECRET;

if (!supabaseResultUrl || !webhookSecret) {
  console.error("Missing SUPABASE_RESULT_URL or WEBHOOK_SECRET env vars");
  process.exit(1);
}

const resultEndpoint = `${supabaseResultUrl}/functions/v1/result`;

// Build payload — use file result if it exists, otherwise send failure
let payload;

if (existsSync(resultFile)) {
  try {
    const fileContent = readFileSync(resultFile, "utf-8");
    const fileResult  = JSON.parse(fileContent);

    payload = {
      submission_id:  submissionId,
      github_username: username,
      project_type:   projectType,
      success:        fileResult.success ?? false,
      score:          fileResult.score ?? 0,
      bonus_score:    fileResult.bonus_score ?? 0,
      breakdown:      fileResult.breakdown ?? {},
      error_message:  fileResult.error_message ?? null,
    };
  } catch (err) {
    console.error("Failed to parse result file:", err.message);
    payload = {
      submission_id:   submissionId,
      github_username: username,
      project_type:    projectType,
      success:         false,
      score:           0,
      bonus_score:     0,
      breakdown:       {},
      error_message:   "Validator output was unreadable",
    };
  }
} else {
  // Validator crashed before writing output
  payload = {
    submission_id:   submissionId,
    github_username: username,
    project_type:    projectType,
    success:         false,
    score:           0,
    bonus_score:     0,
    breakdown:       {},
    error_message:   "Validator did not produce output (likely crashed)",
  };
}

const body = JSON.stringify(payload);

// Sign with HMAC-SHA256
const signature = createHmac("sha256", webhookSecret)
  .update(body)
  .digest("hex");

console.log(`Sending result to ${resultEndpoint}`);
console.log(`Payload: ${body}`);

// Send to Supabase
try {
  const res = await fetch(resultEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-signature-256": signature,
    },
    body,
    signal: AbortSignal.timeout(15000),
  });

  const responseText = await res.text();
  console.log(`Result endpoint responded: ${res.status} — ${responseText}`);

  if (!res.ok) {
    console.error("Result endpoint returned non-200. Score may not have been recorded.");
    process.exit(1);
  }

  console.log("Result successfully delivered.");
} catch (err) {
  console.error("Failed to send result:", err.message);
  process.exit(1);
}
