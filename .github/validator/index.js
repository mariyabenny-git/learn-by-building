import { writeFileSync } from "fs";
import { validatePortfolio } from "./validators/portfolio.js";
import { validateRecipe } from "./validators/recipe.js";
import { validateQuiz } from "./validators/quiz.js";

const args = process.argv.slice(2);
const type = args[args.indexOf("--type") + 1];
const path = args[args.indexOf("--path") + 1];
const out = args[args.indexOf("--output") + 1];

async function run() {
    let result;
    try {
        if (type === 'portfolio') result = await validatePortfolio(path);
        else if (type === 'recipe') result = await validateRecipe(path);
        else if (type === 'quiz') result = await validateQuiz(path);
        
        writeFileSync(out, JSON.stringify({ status: "success", ...result }));
    } catch (err) {
        writeFileSync(out, JSON.stringify({ status: "error", msg: err.message }));
    }
}
run();
