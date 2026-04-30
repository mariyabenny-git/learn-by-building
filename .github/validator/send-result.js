import { readFileSync } from "fs";
import { createHmac } from "crypto";

const resultPath = process.argv[process.argv.indexOf("--file") + 1];
const secret = process.env.WEBHOOK_SECRET;

async function send() {
    const body = readFileSync(resultPath, "utf-8");
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/update-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-signature": signature },
        body
    });
    console.log(`Payload status: ${res.status}`);
}
send();
