import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import https from 'https';

const args = process.argv.slice(2);
const instanceId = args[0];
const mrpackPath = args[1];
const instancesDir = args[2];

if (!instanceId || !mrpackPath || !instancesDir) {
  console.error("Missing arguments");
  process.exit(1);
}

const targetDir = path.join(instancesDir, instanceId, "minecraft");
fs.mkdirSync(targetDir, { recursive: true });

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location as string, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function runImport() {
  try {
    console.log(`[IMPORT] Чтение архива Modrinth/Omega (.mrpack) ${mrpackPath}...`);
    const zip = new AdmZip(mrpackPath);
    const zipEntries = zip.getEntries();
    
    let mcVersion = "1.20.1";
    let loader = "Vanilla";
    let name = path.basename(mrpackPath, '.mrpack');
    let indexData: any = null;

    // Parse modrinth.index.json
    const indexEntry = zipEntries.find(e => e.entryName === 'modrinth.index.json');
    if (indexEntry) {
      try {
        indexData = JSON.parse(indexEntry.getData().toString('utf8'));
        if (indexData.name) name = indexData.name;
        if (indexData.dependencies) {
          if (indexData.dependencies.minecraft) mcVersion = indexData.dependencies.minecraft;
          if (indexData.dependencies.fabric) loader = 'Fabric';
          else if (indexData.dependencies.forge) loader = 'Forge';
          else if (indexData.dependencies.neoforge) loader = 'NeoForge';
          else if (indexData.dependencies.quilt) loader = 'Quilt';
        }
      } catch (e) {
        console.log(`[IMPORT] Ошибка чтения modrinth.index.json: ${e}`);
      }
    }

    if (!indexData || !indexData.files) {
      console.log("[IMPORT] Это не валидный .mrpack (отсутствует modrinth.index.json или files)!");
      process.exit(1);
    }

    // Download mods from index
    console.log(`[IMPORT] Найдено ${indexData.files.length} файлов для скачивания...`);
    let downloaded = 0;
    
    const BATCH_SIZE = 5;
    for (let i = 0; i < indexData.files.length; i += BATCH_SIZE) {
      const batch = indexData.files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (file: any) => {
        if (!file.downloads || file.downloads.length === 0) return;
        const filePath = path.join(targetDir, file.path);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        
        const url = file.downloads[0];
        try {
          await downloadFile(url, filePath);
          downloaded++;
          if (downloaded % 10 === 0) {
            console.log(`[IMPORT] Скачано ${downloaded}/${indexData.files.length} файлов...`);
          }
        } catch(e) {
          console.log(`[IMPORT] Ошибка загрузки ${url}: ${e}`);
        }
      }));
    }
    console.log(`[IMPORT] Успешно скачано ${downloaded} файлов модов.`);

    // Extract overrides
    console.log(`[IMPORT] Извлечение папки overrides (конфиги, текстуры)...`);
    let extractedFiles = 0;
    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      const parts = entry.entryName.split('/');
      const overIndex = parts.indexOf("overrides");
      
      if (overIndex !== -1) {
        const relativePath = parts.slice(overIndex + 1).join('/');
        if (!relativePath) continue;
        
        const destPath = path.join(targetDir, relativePath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, entry.getData());
        extractedFiles++;
      }
    }
    
    console.log(`[IMPORT] Успешно извлечено ${extractedFiles} дополнительных файлов.`);
    
    // Return a special SUCCESS JSON line for the frontend to parse
    console.log(`SUCCESS_JSON:${JSON.stringify({ mcVersion, loader, name })}`);
    
  } catch (error) {
    console.error(`[IMPORT] Ошибка импорта .mrpack: ${error}`);
    process.exit(1);
  }
}

runImport();
