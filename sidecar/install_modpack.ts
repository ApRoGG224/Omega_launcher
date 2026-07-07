import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import AdmZip from 'adm-zip';

const modId = process.argv[2];
const mcVersion = process.argv[3];
const loader = process.argv[4].toLowerCase();
const instanceId = process.argv[5];
const dataDir = process.argv[6];

if (!modId || !mcVersion || !loader || !instanceId || !dataDir) {
    console.error("Missing arguments!");
    process.exit(1);
}

const API_URL = `https://api.modrinth.com/v2/project/${modId}/version`;
const instanceDir = path.join(dataDir, "instances", instanceId, "minecraft");

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
        console.log(`[DOWNLOADER] Получение манифеста сборки...`);
        const versions = await fetchVersions();
        
        // Find suitable version
        const valid = versions.find(v => 
            v.game_versions.includes(mcVersion) && 
            v.loaders.includes(loader)
        );

        if (!valid) {
            console.error(`[ERROR] Не найдено подходящей версии сборки для ${mcVersion} (${loader})`);
            process.exit(1);
        }

        const fileInfo = valid.files.find((f: any) => f.primary) || valid.files[0];
        const downloadUrl = fileInfo.url;
        const filename = fileInfo.filename;

        if (!fs.existsSync(instanceDir)) {
            fs.mkdirSync(instanceDir, { recursive: true });
        }

        const mrpackPath = path.join(instanceDir, filename);

        console.log(`[DOWNLOADER] Скачивание архива сборки...`);
        await downloadFile(downloadUrl, mrpackPath);
        
        console.log(`[DOWNLOADER] Распаковка сборки...`);
        const zip = new AdmZip(mrpackPath);
        
        // Read modrinth.index.json
        const indexEntry = zip.getEntry("modrinth.index.json");
        if (!indexEntry) {
            throw new Error("Invalid .mrpack: missing modrinth.index.json");
        }
        
        const indexData = JSON.parse(indexEntry.getData().toString("utf8"));
        const filesToDownload = indexData.files || [];
        
        console.log(`[DOWNLOADER] Найдено ${filesToDownload.length} модов для скачивания.`);
        
        for (let i = 0; i < filesToDownload.length; i++) {
            const fileInfo = filesToDownload[i];
            const targetPath = path.join(instanceDir, fileInfo.path);
            const targetDir = path.dirname(targetPath);
            
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            
            if (!fs.existsSync(targetPath)) {
                console.log(`[DOWNLOADER] Мод ${i+1}/${filesToDownload.length}: ${path.basename(targetPath)}`);
                await downloadFile(fileInfo.downloads[0], targetPath);
            }
        }
        
        console.log(`[DOWNLOADER] Применение конфигураций и настроек (overrides)...`);
        
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
            if (entry.entryName.startsWith("overrides/") && !entry.isDirectory) {
                const relativePath = entry.entryName.substring("overrides/".length);
                const extractPath = path.join(instanceDir, relativePath);
                const extractDir = path.dirname(extractPath);
                
                if (!fs.existsSync(extractDir)) {
                    fs.mkdirSync(extractDir, { recursive: true });
                }
                
                fs.writeFileSync(extractPath, entry.getData());
            }
        }
        
        // Cleanup mrpack
        fs.unlinkSync(mrpackPath);

        console.log(`[SUCCESS] Сборка успешно скачана!`);
        process.exit(0);
    } catch (e: any) {
        console.error("[ERROR]", e.message);
        process.exit(1);
    }
}

main();
