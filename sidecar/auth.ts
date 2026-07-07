import { Auth } from 'msmc';
import * as fs from 'fs';

const code = process.argv[2];
if (!code) {
    console.log("ERROR:No auth code provided");
    process.exit(1);
}

async function exchangeCode() {
    try {
        const authManager = new Auth("select_account");
        const xboxManager = await authManager.login(code);
        const token = await xboxManager.getMinecraft();
        const mclc = token.mclc();
        fs.writeFileSync("ms_auth.json", JSON.stringify(mclc));
        console.log("SUCCESS:" + mclc.name);
        process.exit(0);
    } catch (e: any) {
        console.log("ERROR:" + (e.message || e));
        process.exit(1);
    }
}

exchangeCode();
