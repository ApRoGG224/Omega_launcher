import { Auth } from 'msmc';
import * as fs from 'fs';

async function login() {
    try {
        const authManager = new Auth("select_account");
        const xboxManager = await authManager.launch("raw");
        const token = await xboxManager.getMinecraft();
        const mclc = token.mclc();
        
        fs.writeFileSync("ms_auth.json", JSON.stringify(mclc));
        console.log("SUCCESS:" + mclc.name);
    } catch (e: any) {
        console.log("ERROR:" + e.message);
    }
}

login();
