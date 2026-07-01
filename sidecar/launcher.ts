import core from 'minecraft-launcher-core';
import * as fs from 'fs';
import { installLoader } from './installer';
import { ensureJava } from './java_installer';

// Save the Node.js process ID immediately so the frontend can abort the launch!
fs.writeFileSync("node_pid.txt", process.pid.toString());

const { Client, Authenticator } = core;
const launcher = new Client();

const targetVersion = process.argv[2] || "1.21.1";
const targetServer = process.argv[3] || "";
const targetUsername = process.argv[4] || "OmegaPlayer";
const targetRam = process.argv[5] || "4";

async function startMinecraft() {
    let authOpts;

    try {
        const msAuthData = JSON.parse(fs.readFileSync("ms_auth.json", "utf-8"));
        if (msAuthData && msAuthData.name === targetUsername) {
            authOpts = msAuthData;
            console.log("Using cached Microsoft Auth for " + targetUsername);
        }
    } catch (e) {
        // Not a MS account or file missing
    }

    if (!authOpts) {
        authOpts = await Authenticator.getAuth(targetUsername);
        console.log("Using Offline Auth for " + targetUsername);
    }

    const vanillaVersion = targetVersion.split('-')[0];
    
    // Check if an instance ID was passed as the 5th argument
    const targetInstanceId = process.argv[6];

    // Automatically download and select the correct Java version!
    const javaPath = await ensureJava(vanillaVersion, "./minecraft_data");

    let opts: any = {
        clientPackage: null,
        authorization: authOpts,
        root: "./minecraft_data",
        javaPath: javaPath,
        version: {
            number: vanillaVersion,
            type: "release"
        },
        memory: {
            max: `${targetRam}G`,
            min: "1G"
        }
    };

    if (targetInstanceId && targetInstanceId.trim() !== "") {
        opts.overrides = {
            gameDirectory: `./minecraft_data/instances/${targetInstanceId}`
        };
        console.log(`[LAUNCHER] Using instance isolation: ${targetInstanceId}`);
    }

    if (targetVersion.includes('-')) {
        opts.version.custom = targetVersion;
    }

    if (targetServer && targetServer.trim() !== "") {
        const parts = targetServer.split(":");
        opts.server = {
            host: parts[0],
            port: parts.length > 1 ? parseInt(parts[1]) : 25565
        };
        console.log("Auto-connecting to server: " + targetServer);
    }

    launcher.on('debug', (e) => console.log(e));
    launcher.on('data', (e) => console.log(e));
    launcher.on('download-status', (e) => console.log(`Downloading: ${e.type} - ${e.name} (${Math.round(e.downloadedBytes/e.totalBytes * 100)}%)`));

    try {
        if (targetVersion.includes('-')) {
            const parts = targetVersion.split('-');
            const vVersion = parts[0];
            const lType = parts[1];
            const installedVersion = await installLoader(vVersion, lType, "./minecraft_data", javaPath);
            opts.version.custom = installedVersion; // Tell MCLC exactly where to look!
            
            // FIX for MCLC ignoring JVM arguments in modern Forge/NeoForge JSONs
            const path = await import('path');
            const os = await import('os');
            const jsonPath = path.join("./minecraft_data", "versions", installedVersion, `${installedVersion}.json`);
            if (fs.existsSync(jsonPath)) {
                const profile = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
                if (profile.arguments && Array.isArray(profile.arguments.jvm)) {
                    const sep = os.platform() === "win32" ? ";" : ":";
                    const libDir = path.resolve("./minecraft_data/libraries");
                    let extraArgs = [];
                    for (const arg of profile.arguments.jvm) {
                        if (typeof arg === "string") {
                            let parsedArg = arg.replace(/\$\{library_directory\}/g, libDir)
                                               .replace(/\$\{version_name\}/g, installedVersion)
                                               .replace(/\$\{classpath_separator\}/g, sep);
                            extraArgs.push(parsedArg);
                        }
                    }
                    if (extraArgs.length > 0) {
                        console.log(`[launcher/INFO] Injected ${extraArgs.length} custom JVM arguments from profile!`);
                        opts.customArgs = extraArgs;
                    }
                }
            }
        }

        const mcProcess = await launcher.launch(opts);
        if (mcProcess) {
            fs.writeFileSync("mc_pid.txt", mcProcess.pid.toString());
            console.log(`[launcher/INFO] Minecraft process spawned with PID: ${mcProcess.pid}`);
            console.log("Have fun!");
            
            mcProcess.on('close', (code: any) => {
                console.log(`[launcher/INFO] Minecraft process exited with code ${code}`);
                if (fs.existsSync("mc_pid.txt")) fs.unlinkSync("mc_pid.txt");
                process.exit(0);
            });
        } else {
            console.log("[launcher/INFO] No process returned.");
        }
    } catch (error) {
        console.error(error);
    }
}

startMinecraft();
