import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function ensureJava(mcVersion: string, root: string): Promise<string> {
    // 1.20.5 and newer need Java 21
    // 1.17 to 1.20.4 need Java 17
    // Older need Java 8
    
    let javaVersion = 8;
    const parts = mcVersion.split('.');
    const minor = parseInt(parts[1] || "0");
    const patch = parseInt(parts[2] || "0");
    
    if (minor > 20 || (minor === 20 && patch >= 5)) {
        javaVersion = 21;
    } else if (minor >= 17) {
        javaVersion = 17;
    }

    const runtimeDir = path.join(root, 'runtime');
    const jreDir = path.join(runtimeDir, `jre${javaVersion}`);
    const ext = os.platform() === 'win32' ? '.exe' : '';
    const javaPath = path.resolve(path.join(jreDir, 'bin', `java${ext}`));

    if (fs.existsSync(javaPath)) {
        console.log(`[java/INFO] Found cached Java ${javaVersion} at ${javaPath}`);
        return javaPath;
    }

    console.log(`[java/INFO] Java ${javaVersion} not found. Downloading from Adoptium...`);
    if (!fs.existsSync(runtimeDir)) fs.mkdirSync(runtimeDir, { recursive: true });

    // Adoptium API URL
    const osName = os.platform() === 'win32' ? 'windows' : (os.platform() === 'darwin' ? 'mac' : 'linux');
    const arch = os.arch() === 'x64' ? 'x64' : (os.arch() === 'arm64' ? 'aarch64' : 'x86');
    const apiUrl = `https://api.adoptium.net/v3/binary/latest/${javaVersion}/ga/${osName}/${arch}/jre/hotspot/normal/eclipse`;

    const archivePath = path.join(runtimeDir, `jre${javaVersion}.archive`);
    
    // Download
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Failed to download Java: ${response.statusText}`);
    
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(archivePath, Buffer.from(arrayBuffer));
    
    console.log(`[java/INFO] Downloaded archive. Extracting...`);
    const tempExtractDir = path.join(runtimeDir, `temp_jre${javaVersion}`);
    if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
    fs.mkdirSync(tempExtractDir);

    try {
        if (os.platform() === 'win32') {
            await execAsync(`tar -xf "${archivePath}" -C "${tempExtractDir}"`);
        } else {
            await execAsync(`tar -xzf "${archivePath}" -C "${tempExtractDir}"`);
        }
    } catch (e) {
        throw new Error(`Failed to extract Java archive: ${e}`);
    }

    // Adoptium extracts to a folder like "jdk-21.0.3+9-jre" inside the temp dir. We move its contents to jreDir.
    const extractedFolders = fs.readdirSync(tempExtractDir);
    if (extractedFolders.length > 0) {
        const innerFolder = path.join(tempExtractDir, extractedFolders[0]);
        fs.renameSync(innerFolder, jreDir);
    }
    
    fs.rmSync(tempExtractDir, { recursive: true, force: true });
    fs.unlinkSync(archivePath);

    // Make executable on Linux/Mac
    if (os.platform() !== 'win32') {
        await execAsync(`chmod +x "${javaPath}"`);
    }

    console.log(`[java/INFO] Java ${javaVersion} installed successfully to ${javaPath}!`);
    return javaPath;
}
