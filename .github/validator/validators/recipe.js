const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

module.exports = async function validateRecipeBookWorkspace(basePath) {
  let baseScore = 0;
  let extraPoints = 0;
  const assertionsPassed = [];
  const systemFailures = [];

  const coreFiles = ['index.html', 'style.css', 'script.js', 'recipes.json'];
  coreFiles.forEach(file => {
    if (fs.existsSync(path.join(basePath, file))) {
      baseScore += 10;
      assertionsPassed.push(`File System Verification: Presence of structural asset ${file} confirmed.`);
    } else {
      systemFailures.push(`Missing structural workspace file: ${file}`);
    }
  });

  const jsonPath = path.join(basePath, 'recipes.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const parsedRecipes = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const rootRecipesArray = parsedRecipes.recipes || parsedRecipes;
      if (Array.isArray(rootRecipesArray) && rootRecipesArray.length >= 3) {
        baseScore += 25;
        assertionsPassed.push(`JSON Engine: Found matching object structures holding ${rootRecipesArray.length} recipe configurations.`);
      } else {
        systemFailures.push('JSON Validation Engine Error: recipe data source array length should scale to >= 3 entries.');
      }
    } catch {
      systemFailures.push('JSON Schema Engine Exception: Broken structural formatting detected inside recipes.json');
    }
  }

  const htmlPath = path.join(basePath, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    const $ = cheerio.load(htmlContent);

    const inputElementsFound = $('input, select, button').length;
    if (inputElementsFound >= 2) {
      baseScore += 20;
      assertionsPassed.push(`DOM Interaction Mapping: Valid filtering dashboard surface maps identified using target input elements.`);
    } else {
      systemFailures.push('DOM Component Fault: Filtering engine interfaces require dedicated category selectors or input fields');
    }
  }

  const jsPath = path.join(basePath, 'script.js');
  if (fs.existsSync(jsPath)) {
    const jsContent = fs.readFileSync(jsPath, 'utf-8');
    if (jsContent.includes('.filter') || jsContent.includes('.toLowerCase(') || jsContent.includes('addEventListener')) {
      baseScore += 30;
      assertionsPassed.push('JS Filter Framework Engine: Found valid search tracking or state modification listeners.');
    } else {
      systemFailures.push('JS Engine Fault: Missing matching query rules for computing item filter calculations');
    }
  }

  if (fs.existsSync(jsPath)) {
    const jsContent = fs.readFileSync(jsPath, 'utf-8');
    if (jsContent.includes('localStorage')) {
      extraPoints += 15;
      assertionsPassed.push('Bonus Checklist Goal Met: Persistent browser saving patterns verified using localStorage tracking definitions.');
    }
  }

  return { baseScore, extraPoints, assertionsPassed, systemFailures };
};
