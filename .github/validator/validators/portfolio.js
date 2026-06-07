const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

module.exports = async function validatePortfolioWorkspace(basePath) {
  let baseScore = 0;
  let extraPoints = 0;
  const assertionsPassed = [];
  const systemFailures = [];

  const filesToCheck = ['index.html', 'style.css', 'script.js', 'profile.json'];
  filesToCheck.forEach(file => {
    if (fs.existsSync(path.join(basePath, file))) {
      baseScore += 10;
      assertionsPassed.push(`File system matching: Presence of ${file} confirmed.`);
    } else {
      systemFailures.push(`Missing structural workspace file: ${file}`);
    }
  });

  const htmlPath = path.join(basePath, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    const $ = cheerio.load(htmlContent);

    const semanticElements = ['header', 'nav', 'main', 'section', 'footer'];
    semanticElements.forEach(element => {
      if ($(element).length > 0) {
        baseScore += 5;
        assertionsPassed.push(`DOM Tree Parsing: Found semantic <${element}> component structure.`);
      } else {
        systemFailures.push(`Semantic DOM structural standard missing: <${element}> element target not found`);
      }
    });

    if ($('script[src*="script.js"]').length > 0 || $('script').text().includes('fetch')) {
      baseScore += 10;
      assertionsPassed.push('DOM Architecture: Main runtime asset linkage confirmed via script element.');
    } else {
      systemFailures.push('DOM Linkage Violation: script.js runtime target link mapping missing inside document');
    }
  }

  const jsonPath = path.join(basePath, 'profile.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const rawJson = fs.readFileSync(jsonPath, 'utf-8');
      const parsedProfile = JSON.parse(rawJson);
      if (parsedProfile.name && parsedProfile.projects && Array.isArray(parsedProfile.projects)) {
        baseScore += 25;
        assertionsPassed.push('JSON Validation Engine: profile.json matches strict platform structural data models schema.');
      } else {
        systemFailures.push('JSON Schema Validation: Found unexpected schema structure inside profile.json');
      }
    } catch {
      systemFailures.push('JSON Core Engine: Syntax structural parsing error reading target data stream inside profile.json');
    }
  }

  const cssPath = path.join(basePath, 'style.css');
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    if (cssContent.includes('display: flex') || cssContent.includes('display: grid')) {
      baseScore += 10;
      assertionsPassed.push('UI Layout Engine: Found valid flexbox or grid structural alignments.');
    } else {
      systemFailures.push('Layout Engine Refusal: Responsive style declarations must implement flexbox/grid layout paradigms');
    }

    if (cssContent.includes('@media')) {
      baseScore += 10;
      assertionsPassed.push('UI Layout Engine: Responsive design rules defined via breakpoint query rules.');
    } else {
      systemFailures.push('Layout Engine Warning: Missing explicit media viewport tracking configuration breakpoints');
    }
  }

  const jsPath = path.join(basePath, 'script.js');
  if (fs.existsSync(jsPath)) {
    const jsContent = fs.readFileSync(jsPath, 'utf-8');
    if (jsContent.includes('fetch(') || jsContent.includes('.innerHTML') || jsContent.includes('createElement')) {
      baseScore += 10;
      assertionsPassed.push('JS Structural Runtime: Dynamic profile data parsing strategy confirmed.');
    } else {
      systemFailures.push('JS Structural Warning: Application processing runtime should handle DOM nodes dynamically using fetch actions');
    }
  }

  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    if (cssContent.includes('--') && (cssContent.includes('dark') || cssContent.includes('theme'))) {
      extraPoints += 15;
      assertionsPassed.push('Bonus Checklist Goal Met: Managed style variations natively via CSS root variables.');
    }
  }

  return { baseScore, extraPoints, assertionsPassed, systemFailures };
};
