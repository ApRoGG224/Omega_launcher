import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const modId = process.argv[2];
const mcVersion = process.argv[3];
const loader = process.argv[4].toLowerCase();
const instanceId = process.argv[5];

if (!modId || !mcVersion || !loader || !instanceId) {
    console.error("Missing arguments!");
    process.exit(1);
}

const API_URL = `https://api.modrinth.com/v2/project/${modId}/version`;

function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadFile(response.headers.location as string, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

function fetchVersions(): Promise<any[]> {
    return new Promise((resolve, reject) => {
        https.get(API_URL, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    try {
        console.log(`[DOWNLOADER] Fetching versions for mod ${modId}...`);
        const versions = await fetchVersions();
        
        const valid = versions.find(v => 
            v.game_versions.includes(mcVersion) && 
            v.loaders.includes(loader)
        );

        if (!valid) {
            console.error(`[ERROR] Не найдено подходящей версии мода для ${mcVersion} (${loader})`);
            process.exit(1);
        }

        const fileInfo = valid.files.find((f: any) => f.primary) || valid.files[0];
        const downloadUrl = fileInfo.url;
        const filename = fileInfo.filename;

        // Path where mods should go for this instance
        const modsDir = path.join(process.cwd(), "minecraft_data", "instances", instanceId, "mods");
        
        if (!fs.existsSync(modsDir)) {
            fs.mkdirSync(modsDir, { recursive: true });
        }

        const destFile = path.join(modsDir, filename);

        if (fs.existsSync(destFile)) {
            console.error(`[ERROR] ALREADY_EXISTS`);
            process.exit(1);
        }

        console.log(`[DOWNLOADER] Downloading ${filename}...`);
        await downloadFile(downloadUrl, destFile);
        console.log(`[SUCCESS] Mod saved to ${destFile}`);
        process.exit(0);
    } catch (e: any) {
        console.error("[ERROR]", e.message);
        process.exit(1);
    }
}

main();
