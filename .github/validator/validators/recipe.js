// .github/validator/validators/recipe.js
// Validates the Recipe Book project against the checklist

import { existsSync, readFileSync } from "fs";
import { join } from "path";

// ── Scoring weights (total = 100 base + 15 bonus) ────────────
const WEIGHTS = {
  file_structure:   10,  // required files exist
  json_schema:      15,  // recipes.json has required keys + non-empty values
  html_semantics:   20,  // semantic tags, search bar, filter buttons
  css_responsive:   20,  // flexbox/grid + media queries
  js_functionality: 25,  // fetch, filter, search, detail view
  deployed_live:    10,  // GitHub Pages URL responds 200
};

const BONUS_WEIGHTS = {
  favorites_localstorage: 5,   // localStorage favorites
  print_friendly:        5,   // @media print
  ingredient_checklist:  5,   // clickable ingredients
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
  const required = ["index.html", "style.css", "script.js", "recipes.json"];
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
  const data = readJSON(repoPath, "recipes.json");
  if (!data) return { score: 0, detail: { error: "recipes.json missing or invalid JSON" } };

  const recipes = data.recipes;
  if (!Array.isArray(recipes) || recipes.length === 0) {
    return { score: 0, detail: { error: "recipes.json must have a non-empty recipes array" } };
  }

  const checks = {
    has_recipes_array: Array.isArray(recipes),
    recipes_have_id: recipes.every(r => typeof r.id !== "undefined"),
    recipes_have_name: recipes.every(r => r.name && r.name.trim().length > 0),
    recipes_have_category: recipes.every(r => r.category && r.category.trim().length > 0),
    recipes_have_ingredients: recipes.every(r => Array.isArray(r.ingredients) && r.ingredients.length > 0),
    recipes_have_steps: recipes.every(r => Array.isArray(r.steps) && r.steps.length > 0),
    has_multiple_recipes: recipes.length >= 3,
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
    has_search_input: lower.includes("<input") && (lower.includes("search") || lower.includes("placeholder")),
    has_filter_buttons: lower.includes("<button"),
    has_recipe_container: lower.includes("class=") && (
      lower.includes("recipe") || lower.includes("card") || lower.includes("grid")
    ),
    has_footer:   lower.includes("<footer"),
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
    has_fetch:            lower.includes("fetch("),
    fetches_recipes_json: lower.includes("recipes.json"),
    has_dom_query:        lower.includes("queryselector") || lower.includes("getelementbyid"),
    has_innerhtml:        lower.includes("innerhtml") || lower.includes("textcontent"),
    has_category_filter:  lower.includes("filter") || lower.includes("category"),
    has_search:           lower.includes("search") || lower.includes("includes("),
    has_foreach_or_map:   lower.includes(".foreach") || lower.includes(".map("),
    has_then_or_async:    lower.includes(".then(") || lower.includes("async "),
    has_error_handling:   lower.includes(".catch(") || lower.includes("try {") || lower.includes("try{"),
    has_detail_view:      lower.includes("modal") || lower.includes("detail") || lower.includes("click"),
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
  const html = readFile(repoPath, "index.html") ?? "";

  const jsLower   = js.toLowerCase();
  const cssLower  = css.toLowerCase();
  const htmlLower = html.toLowerCase();

  const checks = {
    // Favorites: localStorage storage for favorites
    favorites_localstorage: (
      jsLower.includes("localstorage") && (
        jsLower.includes("favorite") ||
        jsLower.includes("favorites") ||
        jsLower.includes("bookmark")
      )
    ),

    // Print-friendly: @media print CSS
    print_friendly: (
      cssLower.includes("@media print") ||
      cssLower.includes("@mediaprint")
    ),

    // Ingredient checklist: clickable/checkable ingredients in detail view
    ingredient_checklist: (
      (jsLower.includes("checkbox") || jsLower.includes("checked")) &&
      (jsLower.includes("ingredient") || lowerIncludesPartOf(jsLower, "ingredient"))
    ),
  };

  let bonusScore = 0;
  if (checks.favorites_localstorage) bonusScore += BONUS_WEIGHTS.favorites_localstorage;
  if (checks.print_friendly)        bonusScore += BONUS_WEIGHTS.print_friendly;
  if (checks.ingredient_checklist) bonusScore += BONUS_WEIGHTS.ingredient_checklist;

  return {
    bonus_score: bonusScore,
    detail: checks,
  };
}

function lowerIncludesPartOf(str, word) {
  const parts = word.split("");
  return parts.some(p => str.includes(p));
}

// ── Main export ──────────────────────────────────────────────

export async function validateRecipe(repoPath) {
  const fileCheck    = checkFileStructure(repoPath);
  const jsonCheck    = checkJSONSchema(repoPath);
  const htmlCheck    = checkHTMLSemantics(repoPath);
  const cssCheck     = checkCSSResponsive(repoPath);
  const jsCheck      = checkJSFunctionality(repoPath);
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