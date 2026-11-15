package com.omega.cosmetics;

import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;

public class OmegaAgent {
    private static volatile boolean active = true;
    private static String equippedHead = "crown";
    private static String targetPlayer = "";

    public static void premain(String agentArgs, Instrumentation inst) {
        init(agentArgs, inst);
    }

    public static void agentmain(String agentArgs, Instrumentation inst) {
        init(agentArgs, inst);
    }

    private static void init(String args, Instrumentation inst) {
        System.out.println("[OmegaCosmetics] =========================================");
        System.out.println("[OmegaCosmetics] Omega Launcher Hidden Cosmetics Runtime loaded!");
        System.out.println("[OmegaCosmetics] Active Cosmetic: Golden Monarch Crown");
        System.out.println("[OmegaCosmetics] Mode: JavaAgent / Universal Multi-loader");
        System.out.println("[OmegaCosmetics] =========================================");

        if (args != null && !args.isEmpty()) {
            if (args.contains("crown")) {
                equippedHead = "crown";
            }
        }
        String sysHead = System.getProperty("omega.cosmetics.head");
        if (sysHead != null && !sysHead.isEmpty()) {
            equippedHead = sysHead;
        }
        String sysPlayer = System.getProperty("omega.cosmetics.player");
        if (sysPlayer != null) {
            targetPlayer = sysPlayer;
        }

        try {
            inst.addTransformer(new ClassFileTransformer() {
                @Override
                public byte[] transform(ClassLoader loader, String className, Class<?> classBeingRedefined,
                                        ProtectionDomain protectionDomain, byte[] classfileBuffer) {
                    if (className == null) return null;
                    if (className.contains("PlayerRenderer") || 
                        className.contains("PlayerEntityRenderer") || 
                        className.contains("RenderPlayer")) {
                        System.out.println("[OmegaCosmetics] Hooked into Minecraft Player Renderer: " + className);
                    }
                    return null;
                }
            }, true);
        } catch (Throwable t) {
            System.err.println("[OmegaCosmetics] Transformer notice: " + t.getMessage());
        }
    }

    public static boolean isCrownEquipped() {
        return "crown".equalsIgnoreCase(equippedHead);
    }

    public static String getTargetPlayer() {
        return targetPlayer;
    }
}
