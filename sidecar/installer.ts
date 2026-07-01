import { getFabricLoaders, installFabric, getQuiltLoaders, installQuiltVersion } from '@xmcl/installer';

export async function installLoader(mcVersion: string, loaderType: string, root: string, javaPath?: string): Promise<string> {
    if (loaderType === "Fabric") {
        console.log(`[installer/INFO] Fetching latest Fabric loader for ${mcVersion}...`);
        const loaders = await getFabricLoaders();
        if (!loaders || loaders.length === 0) throw new Error("No Fabric loaders found");
        
        const latestLoader = loaders[0].version;
        console.log(`[installer/INFO] Installing Fabric ${latestLoader}...`);
        
        const versionName = `fabric-loader-${latestLoader}-${mcVersion}`;
        const profileUrl = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${latestLoader}/profile/json`;
        const response = await fetch(profileUrl);
        if (!response.ok) throw new Error(`Failed to fetch Fabric profile: ${response.statusText}`);
        
        const profileData = await response.json();
        profileData.id = versionName;
        
        const fs = await import('fs');
        const path = await import('path');
        const versionDir = path.join(root, 'versions', versionName);
        if (!fs.existsSync(versionDir)) {
            fs.mkdirSync(versionDir, { recursive: true });
        }
        fs.writeFileSync(path.join(versionDir, `${versionName}.json`), JSON.stringify(profileData, null, 2));
        
        console.log(`[installer/INFO] Fabric installed successfully as ${versionName}!`);
        return versionName;
    } 
    else if (loaderType === "Quilt") {
        console.log(`[installer/INFO] Fetching latest Quilt loader for ${mcVersion}...`);
        const loaders = await getQuiltLoaders();
        if (!loaders || loaders.length === 0) throw new Error("No Quilt loaders found");

        const latestLoader = loaders[0].version; // getQuiltLoaders returns FabricArtifactVersion[]
        console.log(`[installer/INFO] Installing Quilt ${latestLoader}...`);
        
        const installedVersion = await installQuiltVersion({
            minecraftVersion: mcVersion,
            version: latestLoader,
            minecraft: root
        });
        console.log(`[installer/INFO] Quilt installed successfully as ${installedVersion}!`);
        return installedVersion;
    }
    else if (loaderType === "Forge") {
        console.log(`[installer/INFO] Fetching latest Forge loader for ${mcVersion}...`);
        const { getForgeVersionList, installForge, getVersionList, installVersion } = await import('@xmcl/installer');
        
        console.log(`[installer/INFO] Downloading Vanilla ${mcVersion} first (Forge requires it)...`);
        const vList = await getVersionList();
        const vMeta = vList.versions.find(v => v.id === mcVersion);
        if (vMeta) await installVersion(vMeta, root);

        const list = await getForgeVersionList({ minecraft: mcVersion });
        if (!list || !list.versions || list.versions.length === 0) throw new Error("No Forge loaders found");

        const latestLoader = list.versions[0];
        console.log(`[installer/INFO] Installing Forge ${latestLoader.version}...`);

        const installedVersion = await installForge(latestLoader, root, {
            java: javaPath || process.env.JAVA_HOME || "java"
        });
        console.log(`[installer/INFO] Forge installed successfully as ${installedVersion}!`);
        return installedVersion;
    }
    else if (loaderType === "NeoForge") {
        console.log(`[installer/INFO] Fetching NeoForge via XMCL...`);
        const { installNeoForged, getVersionList, installVersion } = await import('@xmcl/installer');
        
        console.log(`[installer/INFO] Downloading Vanilla ${mcVersion} first (NeoForge requires it)...`);
        const vList = await getVersionList();
        const vMeta = vList.versions.find(v => v.id === mcVersion);
        if (vMeta) await installVersion(vMeta, root);
        
        // NeoForge dropped the '1.' prefix for their versions. e.g. 1.21.1 -> 21.1
        const versionMatch = mcVersion.match(/1\.(\d+\.\d+|\d+)/);
        if (!versionMatch) throw new Error("Invalid Minecraft version for NeoForge");
        const neoPrefix = versionMatch[1]; // e.g. 21.1

        const response = await fetch("https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge");
        const data = await response.json();
        const versions: string[] = data.versions || [];
        
        // Find the latest version that starts with our prefix
        const compatibleVersions = versions.filter(v => v.startsWith(neoPrefix));
        if (compatibleVersions.length === 0) throw new Error(`No NeoForge version found for ${mcVersion}`);
        
        const latestLoader = compatibleVersions[compatibleVersions.length - 1]; // Usually sorted chronologically
        console.log(`[installer/INFO] Installing NeoForge ${latestLoader}...`);
        
        const installedVersion = await installNeoForged('neoforge', latestLoader, root, {
            // @ts-ignore - Some options might be required but we pass basic empty ones
            java: javaPath || process.env.JAVA_HOME || "java"
        });
        console.log(`[installer/INFO] NeoForge installed successfully as ${installedVersion}!`);
        return installedVersion;
    }

    return mcVersion;
}
