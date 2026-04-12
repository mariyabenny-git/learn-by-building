// .github/validator/validators/portfolio.js
// Validates the Student Portfolio project against the checklist

import { existsSync, readFileSync } from "fs";
import { join } from "path";

// ── Scoring weights (total = 100 base + 15 bonus) ────────────
const WEIGHTS = {
  file_structure:   10,  // required files exist
  json_schema:      15,  // profile.json has required keys + non-empty values
  html_semantics:   20,  // semantic tags used
  css_responsive:   20,  // flexbox/grid + media queries
  js_fetch_dom:     20,  // fetch() used + DOM manipulation
  deployed_live:    15,  // GitHub Pages URL responds 200
};

const BONUS_WEIGHTS = {
  theme_toggle:     5,   // dark/light toggle
  scroll_nav:       5,   // scroll-based nav highlight
  resume_download:  5,   // downloadable resume button
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

// ── Individual checks ────────────────────────────────────────

function checkFileStructure(repoPath) {
  const required = ["index.html", "style.css", "script.js", "profile.json"];
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
  const profile = readJSON(repoPath, "profile.json");
  if (!profile) return { score: 0, detail: { error: "profile.json missing or invalid JSON" } };

  const checks = {
    has_name:         typeof profile.name === "string" && profile.name.trim().length > 0,
    has_bio:          typeof profile.bio === "string" && profile.bio.trim().length > 0,
    has_avatar:       typeof profile.avatar === "string" && profile.avatar.trim().length > 0,
    has_skills:       Array.isArray(profile.skills) && profile.skills.length > 0,
    skills_have_name: Array.isArray(profile.skills) && profile.skills.every(s => s.name),
    has_projects:     Array.isArray(profile.projects) && profile.projects.length > 0,
    projects_have_title: Array.isArray(profile.projects) && profile.projects.every(p => p.title),
    has_social_links: Array.isArray(profile.socialLinks) && profile.socialLinks.length > 0,
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
    has_nav:      lower.includes("<nav"),
    has_main:     lower.includes("<main"),
    has_section:  lower.includes("<section"),
    has_footer:   lower.includes("<footer"),
    has_h1:       lower.includes("<h1"),
    has_meta_viewport: lower.includes('name="viewport"') || lower.includes("name='viewport'"),
    links_css:    lower.includes("style.css"),
    links_js:     lower.includes("script.js"),
    not_all_divs: (lower.match(/<div/g) || []).length < 20, // penalise div soup
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
    min_lines:        css.split("\n").length >= 30,
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total  = Object.keys(checks).length;

  return {
    score: Math.round((passed / total) * WEIGHTS.css_responsive),
    detail: checks,
  };
}

function checkJSFetchDOM(repoPath) {
  const js = readFile(repoPath, "script.js");
  if (!js) return { score: 0, detail: { error: "script.js missing" } };

  const lower = js.toLowerCase();

  const checks = {
    has_fetch:            lower.includes("fetch("),
    fetches_profile_json: lower.includes("profile.json"),
    has_dom_query:        lower.includes("queryselector") || lower.includes("getelementbyid"),
    has_innerhtml:        lower.includes("innerhtml") || lower.includes("textcontent"),
    has_foreach_or_map:   lower.includes(".foreach") || lower.includes(".map("),
    has_then_or_async:    lower.includes(".then(") || lower.includes("async "),
    has_error_handling:   lower.includes(".catch(") || lower.includes("try {") || lower.includes("try{"),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total  = Object.keys(checks).length;

  return {
    score: Math.round((passed / total) * WEIGHTS.js_fetch_dom),
    detail: checks,
  };
}

async function checkDeployedLive(repoPath) {
  // Try to infer GitHub Pages URL from git remote
  try {
    const { execSync } = await import("child_process");
    const remote = execSync("git remote get-url origin", {
      cwd: repoPath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    // Extract owner/repo from remote URL
    const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
    if (!match) return { score: 0, detail: { error: "Could not parse remote URL" } };

    const [, owner, repo] = match;

    // Check if it's a user pages repo (username.github.io) or project page
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
  const html = readFile(repoPath, "index.html") ?? "";

  const jsLower   = js.toLowerCase();
  const cssLower  = css.toLowerCase();
  const htmlLower = html.toLowerCase();

  const checks = {
    // Theme toggle: looks for data-theme or CSS variable switching in JS
    theme_toggle: (
      jsLower.includes("dark") && jsLower.includes("light") ||
      jsLower.includes("data-theme") ||
      cssLower.includes('[data-theme="dark"]') ||
      cssLower.includes("[data-theme='dark']")
    ),

    // Scroll-based nav: IntersectionObserver or scroll event with active class
    scroll_nav: (
      jsLower.includes("intersectionobserver") ||
      (jsLower.includes("scroll") && jsLower.includes("active"))
    ),

    // Downloadable resume: link to a PDF
    resume_download: (
      htmlLower.includes(".pdf") && (
        htmlLower.includes("download") ||
        htmlLower.includes("resume") ||
        htmlLower.includes("cv")
      )
    ),
  };

  let bonusScore = 0;
  if (checks.theme_toggle)    bonusScore += BONUS_WEIGHTS.theme_toggle;
  if (checks.scroll_nav)      bonusScore += BONUS_WEIGHTS.scroll_nav;
  if (checks.resume_download) bonusScore += BONUS_WEIGHTS.resume_download;

  return {
    bonus_score: bonusScore,
    detail: checks,
  };
}

// ── Main export ──────────────────────────────────────────────

export async function validatePortfolio(repoPath) {
  const fileCheck    = checkFileStructure(repoPath);
  const jsonCheck    = checkJSONSchema(repoPath);
  const htmlCheck    = checkHTMLSemantics(repoPath);
  const cssCheck     = checkCSSResponsive(repoPath);
  const jsCheck      = checkJSFetchDOM(repoPath);
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
    file_structure:  { score: fileCheck.score,   max: WEIGHTS.file_structure,  detail: fileCheck.detail },
    json_schema:     { score: jsonCheck.score,    max: WEIGHTS.json_schema,     detail: jsonCheck.detail },
    html_semantics:  { score: htmlCheck.score,    max: WEIGHTS.html_semantics,  detail: htmlCheck.detail },
    css_responsive:  { score: cssCheck.score,     max: WEIGHTS.css_responsive,  detail: cssCheck.detail },
    js_fetch_dom:    { score: jsCheck.score,      max: WEIGHTS.js_fetch_dom,    detail: jsCheck.detail },
    deployed_live:   { score: deployCheck.score,  max: WEIGHTS.deployed_live,   detail: deployCheck.detail },
    bonus:           { score: bonusCheck.bonus_score, max: 15,                  detail: bonusCheck.detail },
  };

  return {
    score:       Math.min(score, 100),
    bonus_score: bonusCheck.bonus_score,
    breakdown,
  };
}
