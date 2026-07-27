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

function fetchProjectVersions(projectId: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        https.get(`https://api.modrinth.com/v2/project/${projectId}/version`, (res) => {
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

async function downloadRequiredDependencies(
    dependencies: any[],
    mcVersion: string,
    loader: string,
    instanceModsDir: string,
    downloaded: Set<string>
) {
    for (const dep of dependencies || []) {
        if (!dep || dep.dependency_type !== "required" || !dep.project_id || downloaded.has(dep.project_id)) {
            continue;
        }

        downloaded.add(dep.project_id);
        const depVersions = await fetchProjectVersions(dep.project_id);
        const depValid = depVersions.find(v =>
            v.game_versions.includes(mcVersion) &&
            v.loaders.includes(loader)
        );

        if (!depValid) {
            console.log(`[DOWNLOADER] Skipping dependency ${dep.project_id}: no compatible version found`);
            continue;
        }

        const depFile = depValid.files.find((f: any) => f.primary) || depValid.files[0];
        if (!depFile) continue;

        const depDest = path.join(instanceModsDir, depFile.filename);
        if (!fs.existsSync(depDest)) {
            console.log(`[DOWNLOADER] Downloading required dependency ${dep.project_id} -> ${depFile.filename}`);
            await downloadFile(depFile.url, depDest);
        }

        await downloadRequiredDependencies(depValid.dependencies, mcVersion, loader, instanceModsDir, downloaded);
    }
}

async function main() {
    try {
        console.log(`[DOWNLOADER] Fetching versions for mod ${modId}...`);
        const versions = await fetchVersions();
        
        const projectType = process.argv[7] || "mod";
        const worldName = process.argv[8] || "";
        
        const valid = versions.find(v => 
            v.game_versions.includes(mcVersion) && 
            (projectType === "resourcepack" || projectType === "shader" || v.loaders.includes(loader))
        );

        if (!valid) {
            console.error(`[ERROR] Не найдено подходящей версии мода для ${mcVersion} (${loader})`);
            process.exit(1);
        }

        const fileInfo = valid.files.find((f: any) => f.primary) || valid.files[0];
        const downloadUrl = fileInfo.url;
        const filename = fileInfo.filename;

        const targetDataDir = process.argv[6] || path.join(process.cwd(), "minecraft_data");

        // Path where files should go for this instance
        const modsDir = projectType === "resourcepack"
          ? path.join(targetDataDir, "instances", instanceId, "minecraft", "resourcepacks")
          : projectType === "shader"
            ? path.join(targetDataDir, "instances", instanceId, "minecraft", "shaderpacks")
          : projectType === "datapack"
            ? path.join(targetDataDir, "instances", instanceId, "minecraft", "saves", worldName, "datapacks")
            : path.join(targetDataDir, "instances", instanceId, "minecraft", "mods");

        if (projectType === "datapack" && !worldName) {
            console.error(`[ERROR] WORLD_REQUIRED`);
            process.exit(1);
        }
        
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

        if (projectType === "mod") {
            const downloaded = new Set<string>([modId]);
            await downloadRequiredDependencies(valid.dependencies, mcVersion, loader, modsDir, downloaded);
        } else if (projectType === "shader" && loader === "fabric") {
            const downloaded = new Set<string>();
            const irisVersions = await fetchProjectVersions("iris");
            const irisValid = irisVersions.find(v =>
                v.game_versions.includes(mcVersion) &&
                v.loaders.includes("fabric")
            );

            if (irisValid) {
                const irisFile = irisValid.files.find((f: any) => f.primary) || irisValid.files[0];
                if (irisFile) {
                    const modsPath = path.join(targetDataDir, "instances", instanceId, "minecraft", "mods");
                    if (!fs.existsSync(modsPath)) {
                        fs.mkdirSync(modsPath, { recursive: true });
                    }
                    const irisDest = path.join(modsPath, irisFile.filename);
                    if (!fs.existsSync(irisDest)) {
                        console.log(`[DOWNLOADER] Downloading Iris for Fabric shaders...`);
                        await downloadFile(irisFile.url, irisDest);
                    }
                    downloaded.add("iris");
                    await downloadRequiredDependencies(irisValid.dependencies, mcVersion, "fabric", modsPath, downloaded);
                }
            } else {
                console.log(`[DOWNLOADER] Iris not found for ${mcVersion}, skipping automatic install`);
            }
        }
        console.log(`[SUCCESS] Mod saved to ${destFile}`);
        process.exit(0);
    } catch (e: any) {
        console.error("[ERROR]", e.message);
        process.exit(1);
    }
}

main();
