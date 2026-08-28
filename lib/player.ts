export const PLAYER_POSITIONS = [
  "Goleiro",
  "Zagueiro/Fixo",
  "Ala Direito",
  "Ala Esquerdo",
  "Meia Direito",
  "Meia Esquerdo",
  "Atacante/Pivô",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const DOMINANT_FEET = ["Destro", "Canhoto", "Ambidestro"] as const;

export type DominantFoot = (typeof DOMINANT_FEET)[number];
