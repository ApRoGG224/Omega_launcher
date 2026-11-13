import { PlayerAnimation, type PlayerObject } from "skinview3d";

export function resetEmoteJoints(player: PlayerObject): void {
  if (!player?.skin) return;
  player.skin.resetJoints();
  player.position.set(0, 0, 0);
  player.rotation.set(0, 0, 0);

  if (player.cape) {
    player.cape.rotation.set(Math.PI * 0.06, 0, 0);
  }
}

/**
 * Natural, subtle Minecraft idle stance.
 * No meme dances, twerk, or chaotic emotes.
 */
export class CleanIdleAnimation extends PlayerAnimation {
  protected animate(player: PlayerObject): void {
    const t = this.progress * 1.8;
    const skin = player.skin as any;
    if (!skin) return;

    // Subtle natural breathing
    const breath = Math.sin(t) * 0.03;
    skin.leftArm.rotation.x = breath;
    skin.leftArm.rotation.z = 0.08 + breath * 0.5;
    skin.rightArm.rotation.x = -breath;
    skin.rightArm.rotation.z = -0.08 - breath * 0.5;

    if (player.cape) {
      player.cape.rotation.x = Math.PI * 0.06 + Math.sin(t) * 0.03;
    }
  }
}
