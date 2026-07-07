import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const instanceId = args[0];
const zipPath = args[1];
const instancesDir = args[2];

if (!instanceId || !zipPath || !instancesDir) {
  console.error("Missing arguments");
  process.exit(1);
}

const targetDir = path.join(instancesDir, instanceId, "minecraft");
fs.mkdirSync(targetDir, { recursive: true });

try {
  console.log(`[IMPORT] Чтение архива CurseForge ${zipPath}...`);
  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();
  
  let mcVersion = "1.20.1";
  let loader = "Vanilla";
  let name = path.basename(zipPath, '.zip');
  let overridesFolder = "overrides";

  // Parse manifest.json
  const manifestEntry = zipEntries.find(e => e.entryName === 'manifest.json' || e.entryName.endsWith('/manifest.json'));
  if (manifestEntry) {
    try {
      const manifestData = JSON.parse(manifestEntry.getData().toString('utf8'));
      if (manifestData.name) name = manifestData.name;
      if (manifestData.minecraft) {
        if (manifestData.minecraft.version) mcVersion = manifestData.minecraft.version;
        if (manifestData.minecraft.modLoaders && manifestData.minecraft.modLoaders.length > 0) {
          const lId = manifestData.minecraft.modLoaders[0].id;
          if (lId.startsWith('forge')) loader = 'Forge';
          else if (lId.startsWith('fabric')) loader = 'Fabric';
          else if (lId.startsWith('neoforge')) loader = 'NeoForge';
          else if (lId.startsWith('quilt')) loader = 'Quilt';
        }
      }
      if (manifestData.overrides) overridesFolder = manifestData.overrides;
    } catch (e) {
      console.log(`[IMPORT] Ошибка чтения manifest.json: ${e}`);
    }
  }

  // Extract overrides
  console.log(`[IMPORT] Извлечение папки ${overridesFolder}...`);
  let extractedFiles = 0;
  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    
    const parts = entry.entryName.split('/');
    const overIndex = parts.indexOf(overridesFolder);
    
    if (overIndex !== -1) {
      const relativePath = parts.slice(overIndex + 1).join('/');
      if (!relativePath) continue;
      
      const destPath = path.join(targetDir, relativePath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, entry.getData());
      extractedFiles++;
      
      if (extractedFiles % 100 === 0) {
        console.log(`[IMPORT] Извлечено ${extractedFiles} файлов...`);
      }
    }
  }
  
  console.log(`[IMPORT] Успешно извлечено ${extractedFiles} файлов.`);
  console.log(`[IMPORT] Внимание: Из-за ограничений CurseForge API автоматическое скачивание самих модов (.jar) отключено. Извлечены только настройки и дополнительные файлы.`);
  
  // Return a special SUCCESS JSON line for the frontend to parse
  console.log(`SUCCESS_JSON:${JSON.stringify({ mcVersion, loader, name })}`);
  
} catch (error) {
  console.error(`[IMPORT] Ошибка импорта: ${error}`);
  process.exit(1);
}
