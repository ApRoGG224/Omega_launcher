import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const instanceId = args[0];
const zipPath = args[1];
const instancesDir = args[2]; // Path to instances directory

if (!instanceId || !zipPath || !instancesDir) {
  console.error("Missing arguments");
  process.exit(1);
}

const targetDir = path.join(instancesDir, instanceId, "minecraft");
fs.mkdirSync(targetDir, { recursive: true });

try {
  console.log(`[IMPORT] Чтение архива ${zipPath}...`);
  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();
  
  let mcVersion = "1.20.1";
  let loader = "Vanilla";
  let name = path.basename(zipPath, '.zip');

  // Parse mmc-pack.json
  const mmcPackEntry = zipEntries.find(e => e.entryName === 'mmc-pack.json' || e.entryName.endsWith('/mmc-pack.json'));
  if (mmcPackEntry) {
    try {
      const mmcPackData = JSON.parse(mmcPackEntry.getData().toString('utf8'));
      const components = mmcPackData.components || [];
      const mcComponent = components.find((c: any) => c.uid === 'net.minecraft');
      if (mcComponent) mcVersion = mcComponent.version;
      
      if (components.find((c: any) => c.uid === 'net.fabricmc.fabric-loader')) loader = 'Fabric';
      else if (components.find((c: any) => c.uid === 'net.minecraftforge')) loader = 'Forge';
      else if (components.find((c: any) => c.uid === 'net.neoforged')) loader = 'NeoForge';
      else if (components.find((c: any) => c.uid === 'com.quiltmc.quilt-loader')) loader = 'Quilt';
    } catch (e) {
      console.log(`[IMPORT] Ошибка чтения mmc-pack.json: ${e}`);
    }
  }

  // Parse instance.cfg for name
  const cfgEntry = zipEntries.find(e => e.entryName === 'instance.cfg' || e.entryName.endsWith('/instance.cfg'));
  if (cfgEntry) {
    try {
      const cfgText = cfgEntry.getData().toString('utf8');
      const nameMatch = cfgText.match(/name=(.+)/);
      if (nameMatch) name = nameMatch[1].trim();
    } catch (e) {}
  }

  // Extract .minecraft folder contents
  console.log(`[IMPORT] Распаковка файлов в ${targetDir}...`);
  let extractedFiles = 0;
  for (const entry of zipEntries) {
    // Usually Prism exports have a root folder (e.g., "MyModpack/.minecraft/...")
    // or just ".minecraft/..."
    if (entry.isDirectory) continue;
    
    const parts = entry.entryName.split('/');
    let rootIndex = parts.indexOf('.minecraft');
    if (rootIndex === -1) rootIndex = parts.indexOf('minecraft');
    if (rootIndex === -1) rootIndex = parts.indexOf('overrides');
    
    if (rootIndex !== -1) {
      const relativePath = parts.slice(rootIndex + 1).join('/');
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
  
  // Return a special SUCCESS JSON line for the frontend to parse
  console.log(`SUCCESS_JSON:${JSON.stringify({ mcVersion, loader, name })}`);
  
} catch (error) {
  console.error(`[IMPORT] Ошибка импорта: ${error}`);
  process.exit(1);
}
