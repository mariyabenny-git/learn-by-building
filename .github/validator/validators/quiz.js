// .github/validator/validators/quiz.js
// Validates the Quiz App project against the checklist

import { existsSync, readFileSync } from "fs";
import { join } from "path";

// ── Scoring weights (total = 100 base + 15 bonus) ────────────
const WEIGHTS = {
  file_structure:   10,  // required files exist
  json_schema:      15,  // questions.json has required keys + non-empty values
  html_semantics:   20,  // semantic tags, quiz UI elements
  css_responsive:   20,  // flexbox/grid + media queries
  js_functionality: 25,  // quiz logic, scoring, progress
  deployed_live:    10,  // GitHub Pages URL responds 200
};

const BONUS_WEIGHTS = {
  countdown_timer:  5,   // per-question countdown
  shuffle_order:    5,   // shuffle questions/options
  score_history:    5,   // localStorage score history
};

// ── File readers ─────────────────────────────────────────────

function readFile(repoPath, filename) {
  const filePath = join(repoPath, filename);
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, "utf-8");
}

function readJSON(repoPath, filename) {
  const content = readFile(repoPath, filename);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ── Individual checks ───────────────────────────────────────

function checkFileStructure(repoPath) {
  const required = ["index.html", "style.css", "script.js", "questions.json"];
  const results = {};
  let allPresent = true;

  for (const file of required) {
    const exists = existsSync(join(repoPath, file));
    results[file] = exists;
    if (!exists) allPresent = false;
  }

  return {
    score: allPresent ? WEIGHTS.file_structure : Math.round(
      (Object.values(results).filter(Boolean).length / required.length) * WEIGHTS.file_structure
    ),
    detail: results,
  };
}

function checkJSONSchema(repoPath) {
  const data = readJSON(repoPath, "questions.json");
  if (!data) return { score: 0, detail: { error: "questions.json missing or invalid JSON" } };

  const questions = data.questions;
  if (!Array.isArray(questions) || questions.length < 3) {
    return { score: 0, detail: { error: "questions.json must have at least 3 questions" } };
  }

  const checks = {
    has_questions_array: Array.isArray(questions),
    questions_have_id: questions.every(q => typeof q.id !== "undefined"),
    questions_have_question: questions.every(q => q.question && q.question.trim().length > 0),
    questions_have_options: questions.every(q => Array.isArray(q.options) && q.options.length >= 2),
    questions_have_correct: questions.every(q => typeof q.correctAnswer !== "undefined"),
    has_multiple_questions: questions.length >= 3,
    all_questions_valid_options: questions.every(q => 
      Array.isArray(q.options) && 
      q.correctAnswer >= 0 && 
      q.correctAnswer < q.options.length
    ),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total  = Object.keys(checks).length;

  return {
    score: Math.round((passed / total) * WEIGHTS.json_schema),
    detail: checks,
  };
}

function checkHTMLSemantics(repoPath) {
  const html = readFile(repoPath, "index.html");
  if (!html) return { score: 0, detail: { error: "index.html missing" } };

  const lower = html.toLowerCase();

  const checks = {
    has_header:   lower.includes("<header"),
    has_main:     lower.includes("<main"),
    has_start_screen: lower.includes("start") || lower.includes("begin") || lower.includes("quiz"),
    has_question_area: lower.includes("question") || lower.includes("question-container"),
    has_options:      lower.includes("option") || lower.includes("answer"),
    has_results:      lower.includes("result") || lower.includes("score"),
    has_progress:     lower.includes("progress") || lower.includes("question") && lower.includes("/"),
    has_meta_viewport: lower.includes('name="viewport"') || lower.includes("name='viewport'"),
    links_css:    lower.includes("style.css"),
    links_js:     lower.includes("script.js"),
    not_all_divs: (lower.match(/<div/g) || []).length < 25,
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total  = Object.keys(checks).length;

  return {
    score: Math.round((passed / total) * WEIGHTS.html_semantics),
    detail: checks,
  };
}

function checkCSSResponsive(repoPath) {
  const css = readFile(repoPath, "style.css");
  if (!css) return { score: 0, detail: { error: "style.css missing" } };

  const lower = css.toLowerCase();

  const checks = {
    has_flexbox:      lower.includes("display: flex") || lower.includes("display:flex"),
    has_grid:         lower.includes("display: grid") || lower.includes("display:grid"),
    has_media_query:  lower.includes("@media"),
    has_mobile_query: lower.includes("max-width") || lower.includes("min-width"),
    has_variables:    lower.includes("--") && lower.includes(":root"),
    has_hover:        lower.includes(":hover"),
    has_correct_style: lower.includes("correct") || lower.includes("right"),
    has_wrong_style:   lower.includes("wrong") || lower.includes("incorrect"),
    min_lines:        css.split("\n").length >= 30,
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total  = Object.keys(checks).length;

  return {
    score: Math.round((passed / total) * WEIGHTS.css_responsive),
    detail: checks,
  };
}

function checkJSFunctionality(repoPath) {
  const js = readFile(repoPath, "script.js");
  if (!js) return { score: 0, detail: { error: "script.js missing" } };

  const lower = js.toLowerCase();

  const checks = {
    has_fetch:              lower.includes("fetch("),
    fetches_questions_json: lower.includes("questions.json"),
    has_dom_query:          lower.includes("queryselector") || lower.includes("getelementbyid"),
    has_innerhtml:          lower.includes("innerhtml") || lower.includes("textcontent"),
    has_question_display:   lower.includes("question") && (lower.includes("innerhtml") || lower.includes("textcontent")),
    has_option_buttons:    lower.includes("button") || lower.includes("click"),
    has_answer_handling:   lower.includes("click") || lower.includes("addeventlistener"),
    has_correct_check:     lower.includes("correct") || lower.includes("===") || lower.includes("=="),
    has_score_tracking:     lower.includes("score") || lower.includes("points"),
    has_progress_display:  lower.includes("progress") || lower.includes("current") || lower.includes("question"),
    has_then_or_async:     lower.includes(".then(") || lower.includes("async "),
    has_error_handling:    lower.includes(".catch(") || lower.includes("try {") || lower.includes("try{"),
    has_results_screen:     lower.includes("result") || lower.includes("final") || lower.includes("end"),
    has_restart:           lower.includes("restart") || lower.includes("reset") || lower.includes("try again"),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total  = Object.keys(checks).length;

  return {
    score: Math.round((passed / total) * WEIGHTS.js_functionality),
    detail: checks,
  };
}

async function checkDeployedLive(repoPath) {
  try {
    const { execSync } = await import("child_process");
    const remote = execSync("git remote get-url origin", {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    if (!match) return { score: 0, detail: { error: "Could not parse remote URL" } };

    const [, owner, repo] = match;

    let pagesUrl;
    if (repo.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
      pagesUrl = `https://${owner}.github.io/`;
    } else {
      pagesUrl = `https://${owner}.github.io/${repo}/`;
    }

    const res = await fetch(pagesUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
    });

    const isLive = res.status === 200 || res.status === 301 || res.status === 302;

    return {
      score: isLive ? WEIGHTS.deployed_live : 0,
      detail: {
        pages_url: pagesUrl,
        status_code: res.status,
        is_live: isLive,
      },
    };
  } catch (err) {
    return {
      score: 0,
      detail: { error: `Could not check deployment: ${err.message}` },
    };
  }
}

function checkBonusChallenges(repoPath) {
  const js  = readFile(repoPath, "script.js") ?? "";
  const css = readFile(repoPath, "style.css") ?? "";

  const jsLower  = js.toLowerCase();
  const cssLower = css.toLowerCase();

  const checks = {
    // Countdown timer: setTimeout/setInterval for time limit
    countdown_timer: (
      (jsLower.includes("settimeout") || jsLower.includes("setinterval")) &&
      (jsLower.includes("timer") || jsLower.includes("time") || jsLower.includes("countdown") || jsLower.includes("second"))
    ),

    // Shuffle: random or shuffle function
    shuffle_order: (
      jsLower.includes("sort") && jsLower.includes("random") ||
      jsLower.includes("shuffle") ||
      jsLower.includes("math.random")
    ),

    // Score history: localStorage with score/date
    score_history: (
      jsLower.includes("localstorage") && (
        jsLower.includes("score") ||
        jsLower.includes("history") ||
        jsLower.includes("attempt")
      )
    ),
  };

  let bonusScore = 0;
  if (checks.countdown_timer)  bonusScore += BONUS_WEIGHTS.countdown_timer;
  if (checks.shuffle_order)    bonusScore += BONUS_WEIGHTS.shuffle_order;
  if (checks.score_history)    bonusScore += BONUS_WEIGHTS.score_history;

  return {
    bonus_score: bonusScore,
    detail: checks,
  };
}

// ── Main export ──────────────────────────────────────────────

export async function validateQuiz(repoPath) {
  const fileCheck    = checkFileStructure(repoPath);
  const jsonCheck    = checkJSONSchema(repoPath);
  const htmlCheck    = checkHTMLSemantics(repoPath);
  const cssCheck     = checkCSSResponsive(repoPath);
  const jsCheck       = checkJSFunctionality(repoPath);
  const deployCheck  = await checkDeployedLive(repoPath);
  const bonusCheck   = checkBonusChallenges(repoPath);

  const score =
    fileCheck.score +
    jsonCheck.score +
    htmlCheck.score +
    cssCheck.score +
    jsCheck.score +
    deployCheck.score;

  const breakdown = {
    file_structure:   { score: fileCheck.score,   max: WEIGHTS.file_structure,   detail: fileCheck.detail },
    json_schema:      { score: jsonCheck.score,  max: WEIGHTS.json_schema,      detail: jsonCheck.detail },
    html_semantics:   { score: htmlCheck.score,  max: WEIGHTS.html_semantics,   detail: htmlCheck.detail },
    css_responsive:   { score: cssCheck.score,   max: WEIGHTS.css_responsive,   detail: cssCheck.detail },
    js_functionality: { score: jsCheck.score,    max: WEIGHTS.js_functionality, detail: jsCheck.detail },
    deployed_live:    { score: deployCheck.score, max: WEIGHTS.deployed_live,    detail: deployCheck.detail },
    bonus:            { score: bonusCheck.bonus_score, max: 15,                  detail: bonusCheck.detail },
  };

  return {
    score:       Math.min(score, 100),
    bonus_score: bonusCheck.bonus_score,
    breakdown,
  };
}