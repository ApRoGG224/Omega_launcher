import { Auth } from 'msmc';
import * as fs from 'fs';
import { exec } from 'child_process';
import os from 'os';

function openUrl(url: string) {
    const platform = os.platform();
    if (platform === 'win32') {
        exec(`start "" "${url}"`);
    } else if (platform === 'darwin') {
        exec(`open "${url}"`);
    } else {
        // Try Firefox first, then Chrome, then xdg-open
        exec(`firefox "${url}"`, (err) => {
            if (err) {
                exec(`google-chrome "${url}"`, (err2) => {
                    if (err2) exec(`xdg-open "${url}"`);
                });
            }
        });
    }
}

async function login() {
    try {
        const authManager = new Auth("select_account");
        
        const serverInfo = await authManager.setServer(async (xboxManager) => {
            try {
                const token = await xboxManager.getMinecraft();
                const mclc = token.mclc();
                fs.writeFileSync("ms_auth.json", JSON.stringify(mclc));
                console.log("SUCCESS:" + mclc.name);
                serverInfo.server.close();
                process.exit(0);
            } catch (err: any) {
                console.log("ERROR:" + err.message);
                serverInfo.server.close();
                process.exit(1);
            }
        });
        
        console.log("LINK:" + serverInfo.link);
        process.stdout.write("LINK:" + serverInfo.link + "\n");
        openUrl(serverInfo.link);
    } catch (e: any) {
        console.log("ERROR:" + e.message);
        process.exit(1);
    }
}

login();
