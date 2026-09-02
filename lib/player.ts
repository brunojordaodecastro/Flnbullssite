export const PLAYER_POSITIONS = [
  "Goleiro",
  "Zagueiro/Fixo",
  "Ala Direito",
  "Ala Esquerdo",
  "Meia",
  "Atacante/Pivô",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

const LEGACY_PLAYER_POSITIONS: Record<string, PlayerPosition> = {
  "Meia Direito": "Meia",
  "Meia Esquerdo": "Meia",
};

export function normalizePlayerPosition(position: string | null | undefined) {
  if (!position) {
    return "";
  }
  return LEGACY_PLAYER_POSITIONS[position] ?? position;
}

export const DOMINANT_FEET = ["Destro", "Canhoto", "Ambidestro"] as const;

export type DominantFoot = (typeof DOMINANT_FEET)[number];
