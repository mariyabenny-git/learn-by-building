#!/usr/bin/env node
// .github/validator/index.js
// Entry point — parses args, calls the right validator, writes result to file

import { writeFileSync } from "fs";
import { validatePortfolio } from "./validators/portfolio.js";
import { validateRecipe } from "./validators/recipe.js";
import { validateQuiz } from "./validators/quiz.js";

const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
}

const submissionId = getArg("submission-id");
const username     = getArg("username");
const projectType  = getArg("project-type");
const repoPath     = getArg("repo-path");
const outputFile   = getArg("output");

if (!submissionId || !username || !projectType || !repoPath || !outputFile) {
  console.error("Missing required arguments");
  console.error("Usage: node index.js --submission-id <id> --username <u> --project-type <p> --repo-path <path> --output <file>");
  process.exit(1);
}

const validators = {
  portfolio: validatePortfolio,
  recipe:   validateRecipe,
  quiz:     validateQuiz,
};

const validator = validators[projectType];

if (!validator) {
  const result = {
    success: false,
    score: 0,
    bonus_score: 0,
    breakdown: {},
    error_message: `Unsupported project type: ${projectType}`,
  };
  writeFileSync(outputFile, JSON.stringify(result));
  process.exit(0);
}

try {
  console.log(`Running ${projectType} validator for ${username}...`);
  const result = await validator(repoPath);
  writeFileSync(outputFile, JSON.stringify({ success: true, ...result }));
  console.log(`Validation complete. Score: ${result.score} + ${result.bonus_score} bonus`);
  console.log("Breakdown:", JSON.stringify(result.breakdown, null, 2));
} catch (err) {
  console.error("Validator threw an error:", err.message);
  const result = {
    success: false,
    score: 0,
    bonus_score: 0,
    breakdown: {},
    error_message: `Validator error: ${err.message}`,
  };
  writeFileSync(outputFile, JSON.stringify(result));
}
