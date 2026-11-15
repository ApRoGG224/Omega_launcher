package com.omega.cosmetics;

public class OmegaCrownMod {
    public static final String MOD_ID = "omega_crown";
    public static final String MOD_NAME = "Omega Monarch Crown";
    public static final String VERSION = "1.0.0";

    public void onInitializeClient() {
        System.out.println("[OmegaCosmetics] Fabric Client Mod Initialized: " + MOD_NAME);
    }

    public static void initForge() {
        System.out.println("[OmegaCosmetics] Forge/NeoForge Mod Initialized: " + MOD_NAME);
    }
}
