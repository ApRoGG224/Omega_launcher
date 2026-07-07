import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import AdmZip from 'adm-zip';

const instanceId = process.argv[2];
const dataDir = process.argv[3];
const instanceName = process.argv[4] || instanceId;

if (!instanceId || !dataDir) {
    console.error("Missing arguments!");
    process.exit(1);
}

const instanceDir = path.join(dataDir, "instances", instanceId, "minecraft");

if (!fs.existsSync(instanceDir)) {
    console.error(`[ERROR] Директория сборки не найдена: ${instanceDir}`);
    process.exit(1);
}

const downloadsDir = path.join(os.homedir(), 'Downloads');
const safeName = instanceName.replace(/[^a-z0-9а-яё_-]/gi, '_');
const mrpackPath = path.join(downloadsDir, `${safeName}_modpack.mrpack`);

try {
    console.log(`[EXPORT] Подготовка к экспорту сборки "${instanceName}"...`);
    const zip = new AdmZip();
    
    // Add minimal modrinth.index.json
    const indexJson = {
        formatVersion: 1,
        game: "minecraft",
        versionId: "1.0.0",
        name: instanceName,
        dependencies: {
            minecraft: "1.21.4", // default, could be dynamic
        },
        files: []
    };
    zip.addFile("modrinth.index.json", Buffer.from(JSON.stringify(indexJson, null, 2), "utf8"));
    
    // Put everything in overrides/ folder to be a valid mrpack
    const modsDir = path.join(instanceDir, "mods");
    if (fs.existsSync(modsDir)) {
        zip.addLocalFolder(modsDir, "overrides/mods");
    }
    
    const configDir = path.join(instanceDir, "config");
    if (fs.existsSync(configDir)) {
        zip.addLocalFolder(configDir, "overrides/config");
    }
    
    const resourcepacksDir = path.join(instanceDir, "resourcepacks");
    if (fs.existsSync(resourcepacksDir)) {
        zip.addLocalFolder(resourcepacksDir, "overrides/resourcepacks");
    }
    
    const shaderpacksDir = path.join(instanceDir, "shaderpacks");
    if (fs.existsSync(shaderpacksDir)) {
        zip.addLocalFolder(shaderpacksDir, "overrides/shaderpacks");
    }

    console.log(`[EXPORT] Формирование .mrpack архива...`);
    zip.writeZip(mrpackPath);
    
    console.log(`[SUCCESS] Сборка успешно сохранена в загрузки: ${mrpackPath}`);
    process.exit(0);
} catch (e: any) {
    console.error("[ERROR]", e.message);
    process.exit(1);
}
