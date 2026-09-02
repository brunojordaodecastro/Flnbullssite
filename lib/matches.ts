export type MatchTeam = {
  name: string;
  mark: string;
  crest?: string;
};

export type RecentMatch = {
  date: string;
  time?: string;
  home: MatchTeam;
  away: MatchTeam;
  score: string;
  result: "Vitória" | "Empate" | "Derrota" | "Agendado";
  link?: string;
};

export type PitchPlayer = {
  id: string;
  name: string;
  number: number;
  position: string;
  gridArea?: string;
  x: number; // percentage from left 0 - 100
  y: number; // percentage from top 0 - 100
  goals?: number;
  assists?: number;
  rating?: number;
  avatarUrl?: string | null;
};

export type MatchEvent = {
  id: string;
  minute: string;
  type: "goal" | "assist" | "yellow_card" | "red_card" | "sub";
  team: "bulls" | "opponent";
  playerName: string;
  assistPlayerName?: string;
  scoreSnapshot: string;
  detail?: string;
};

export type MatchTactics = {
  formation: string;
  starters: PitchPlayer[];
  bench: PitchPlayer[];
  events: MatchEvent[];
};

export const bulls: MatchTeam = {
  name: "FLN BULLS",
  mark: "FB",
  crest: "/fln-bulls-shield.png",
};

// Semente do banco e fallback de render quando o D1 não está acessível.
// O estado real das partidas vive no D1 — ver lib/match-store.ts.
export const DEFAULT_RECENT_MATCHES: RecentMatch[] = [
  {
    date: "15 mar 2026",
    home: bulls,
    away: {
      name: "Marcível Dias",
      mark: "MD",
      crest: "/team-marcivel-dias.png",
    },
    score: "6–4",
    result: "Vitória",
    link: "https://www.instagram.com/fln_bulls/p/DV7VriVAC9d/",
  },
  {
    date: "19 mai 2025",
    home: bulls,
    away: { name: "Amigos Vitão", mark: "AV" },
    score: "6–5",
    result: "Vitória",
    link: "https://www.instagram.com/fln_bulls/p/DJ0b3fXOz56/",
  },
  {
    date: "23 mar 2025",
    home: bulls,
    away: {
      name: "Tanquinho FC",
      mark: "TF",
      crest: "/team-tanquinho.png",
    },
    score: "5–3",
    result: "Vitória",
    link: "https://www.instagram.com/fln_bulls/p/DHjqcnGucD5/",
  },
  {
    date: "20 mar 2025",
    home: {
      name: "Tanquinho FC",
      mark: "TF",
      crest: "/team-tanquinho.png",
    },
    away: bulls,
    score: "1–6",
    result: "Vitória",
    link: "https://www.instagram.com/fln_bulls/p/DHjqcnGucD5/",
  },
  {
    date: "25 fev 2025",
    home: {
      name: "Moka FC",
      mark: "MF",
      crest: "/team-moka-fc.png",
    },
    away: bulls,
    score: "6–4",
    result: "Derrota",
  },
  {
    date: "17 mai 2024",
    home: {
      name: "AE Falcões",
      mark: "AE",
      crest: "/team-ae-falcoes.png",
    },
    away: bulls,
    score: "6–3",
    result: "Derrota",
    link: "https://www.instagram.com/fln_bulls/p/C6zjw5mu9OE/",
  },
  {
    date: "10 mai 2024",
    home: bulls,
    away: {
      name: "AE Falcões",
      mark: "AE",
      crest: "/team-ae-falcoes.png",
    },
    score: "3–12",
    result: "Derrota",
    link: "https://www.instagram.com/fln_bulls/p/C6zjw5mu9OE/",
  },
  {
    date: "21 abr 2024",
    home: bulls,
    away: {
      name: "Never Broken FC",
      mark: "NB",
      crest: "/team-never-broken.png",
    },
    score: "6–2",
    result: "Vitória",
    link: "https://www.instagram.com/fln_bulls/p/C6CoHUoOWVf/",
  },
  {
    date: "03 out 2023",
    home: {
      name: "Vasco da Brahma",
      mark: "VB",
      crest: "/team-vasco-brahma.png",
    },
    away: bulls,
    score: "3–6",
    result: "Vitória",
    link: "https://www.instagram.com/fln_bulls/p/Cx8ze5kuKQ-/",
  },
  {
    date: "28 mai 2023",
    home: bulls,
    away: {
      name: "Bangu",
      mark: "BA",
      crest: "/team-bangu.png",
    },
    score: "5–3",
    result: "Vitória",
    link: "https://www.instagram.com/fln_bulls/p/Cszfb_DO4DY/",
  },
];

// Escalação/eventos semente do jogo mais recente (FLN BULLS 6–4 Marcível Dias).
export const DEFAULT_MATCH_TACTICS: MatchTactics = {
  formation: "2-3-1 (Society)",
  starters: [
    {
      id: "neto",
      name: "Neto",
      number: 1,
      position: "Goleiro",
      x: 50,
      y: 86,
      rating: 8.2,
    },
    {
      id: "matheus",
      name: "Matheus",
      number: 4,
      position: "Zagueiro/Fixo",
      x: 28,
      y: 68,
      rating: 7.8,
    },
    {
      id: "vini",
      name: "Vini",
      number: 3,
      position: "Zagueiro/Fixo",
      x: 72,
      y: 68,
      rating: 7.9,
    },
    {
      id: "gui",
      name: "Gui",
      number: 8,
      position: "Ala Esquerdo",
      x: 16,
      y: 44,
      goals: 1,
      assists: 2,
      rating: 8.9,
    },
    {
      id: "rafa",
      name: "Rafa",
      number: 10,
      position: "Meia",
      x: 50,
      y: 42,
      goals: 2,
      assists: 1,
      rating: 9.2,
    },
    {
      id: "lucas",
      name: "Lucas",
      number: 7,
      position: "Ala Direito",
      x: 84,
      y: 44,
      rating: 7.6,
    },
    {
      id: "jordao",
      name: "Jordão",
      number: 11,
      position: "Atacante/Pivô",
      x: 50,
      y: 18,
      goals: 3,
      assists: 1,
      rating: 9.8,
    },
  ],
  bench: [
    {
      id: "biel",
      name: "Biel",
      number: 9,
      position: "Atacante/Pivô",
      x: 0,
      y: 0,
      rating: 7.2,
    },
    {
      id: "leo",
      name: "Leo",
      number: 5,
      position: "Zagueiro/Fixo",
      x: 0,
      y: 0,
      rating: 7.0,
    },
    {
      id: "pedro",
      name: "Pedro",
      number: 14,
      position: "Meia",
      x: 0,
      y: 0,
      rating: 6.9,
    },
    {
      id: "caio",
      name: "Caio",
      number: 22,
      position: "Ala Esquerdo",
      x: 0,
      y: 0,
      rating: 6.8,
    },
  ],
  events: [
    {
      id: "e1",
      minute: "12'",
      type: "goal",
      team: "bulls",
      playerName: "Jordão",
      assistPlayerName: "Gui",
      scoreSnapshot: "1–0",
      detail: "Chute cruzado no canto direito",
    },
    {
      id: "e2",
      minute: "18'",
      type: "goal",
      team: "opponent",
      playerName: "Marcível Dias",
      scoreSnapshot: "1–1",
    },
    {
      id: "e3",
      minute: "24'",
      type: "goal",
      team: "bulls",
      playerName: "Rafa",
      scoreSnapshot: "2–1",
      detail: "Finalização colocada de fora da área",
    },
    {
      id: "e4",
      minute: "31'",
      type: "goal",
      team: "bulls",
      playerName: "Jordão",
      assistPlayerName: "Rafa",
      scoreSnapshot: "3–1",
      detail: "Desvio de cabeça após cobrança de falta",
    },
    {
      id: "e5",
      minute: "38'",
      type: "goal",
      team: "opponent",
      playerName: "Marcível Dias",
      scoreSnapshot: "3–2",
    },
    {
      id: "e6",
      minute: "42'",
      type: "goal",
      team: "bulls",
      playerName: "Gui",
      scoreSnapshot: "4–2",
      detail: "Arrancada pela ala esquerda e chute potente",
    },
    {
      id: "e7",
      minute: "47'",
      type: "goal",
      team: "opponent",
      playerName: "Marcível Dias",
      scoreSnapshot: "4–3",
    },
    {
      id: "e8",
      minute: "52'",
      type: "goal",
      team: "bulls",
      playerName: "Jordão",
      assistPlayerName: "Gui",
      scoreSnapshot: "5–3",
      detail: "Tabelinha rápida e toque de cavadinha",
    },
    {
      id: "e9",
      minute: "56'",
      type: "goal",
      team: "opponent",
      playerName: "Marcível Dias",
      scoreSnapshot: "5–4",
    },
    {
      id: "e10",
      minute: "59'",
      type: "goal",
      team: "bulls",
      playerName: "Rafa",
      assistPlayerName: "Jordão",
      scoreSnapshot: "6–4",
      detail: "Contra-ataque mortal no último minuto",
    },
  ],
};

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

// Congelados de propósito: estes objetos já foram usados como store mutável em
// memória, o que não sobrevive entre isolates do Workers. Qualquer escrita agora
// falha em vez de se perder silenciosamente.
deepFreeze(DEFAULT_RECENT_MATCHES);
deepFreeze(DEFAULT_MATCH_TACTICS);

export function organizeLineupByRatings(allPlayers: PitchPlayer[]): {
  starters: PitchPlayer[];
  bench: PitchPlayer[];
} {
  if (!allPlayers || allPlayers.length === 0) {
    return { starters: [], bench: [] };
  }

  // Clone array and sort primarily by rating descending
  const sorted = [...allPlayers].sort(
    (a, b) => (b.rating ?? 7.0) - (a.rating ?? 7.0),
  );

  // Categorize players by primary role
  const goalkeepers = sorted.filter((p) => p.position === "Goleiro");
  const defenders = sorted.filter(
    (p) => p.position.includes("Zagueiro") || p.position.includes("Fixo"),
  );
  const attackers = sorted.filter(
    (p) =>
      p.position.includes("Atacante") ||
      p.position.includes("Pivô") ||
      p.position.includes("Pivo"),
  );
  const midfielders = sorted.filter(
    (p) =>
      !goalkeepers.includes(p) &&
      !defenders.includes(p) &&
      !attackers.includes(p),
  );

  const starters: PitchPlayer[] = [];
  const assignedIds = new Set<string>();

  function pickPlayer(list: PitchPlayer[]): PitchPlayer | null {
    for (const p of list) {
      if (!assignedIds.has(p.id)) {
        assignedIds.add(p.id);
        return p;
      }
    }
    return null;
  }

  // 1. Goalkeeper slot: (x: 50, y: 86)
  const topGk = pickPlayer(goalkeepers) || pickPlayer(sorted);
  if (topGk) {
    starters.push({ ...topGk, x: 50, y: 86, position: "Goleiro" });
  }

  // 2. Defender slots (2 spots): left (x: 28, y: 68), right (x: 72, y: 68)
  const def1 = pickPlayer(defenders) || pickPlayer(sorted);
  if (def1) {
    starters.push({ ...def1, x: 28, y: 68, position: "Zagueiro/Fixo" });
  }
  const def2 = pickPlayer(defenders) || pickPlayer(sorted);
  if (def2) {
    starters.push({ ...def2, x: 72, y: 68, position: "Zagueiro/Fixo" });
  }

  // 3. Midfielders / Wings (3 spots):
  // Left wing (x: 16, y: 44), Central Mid (x: 50, y: 42), Right wing (x: 84, y: 44)
  const mid1 = pickPlayer(midfielders) || pickPlayer(sorted);
  if (mid1) {
    starters.push({ ...mid1, x: 16, y: 44, position: "Ala Esquerdo" });
  }
  const mid2 = pickPlayer(midfielders) || pickPlayer(sorted);
  if (mid2) {
    starters.push({ ...mid2, x: 50, y: 42, position: "Meia" });
  }
  const mid3 = pickPlayer(midfielders) || pickPlayer(sorted);
  if (mid3) {
    starters.push({ ...mid3, x: 84, y: 44, position: "Ala Direito" });
  }

  // 4. Attacker / Pivô (1 spot): (x: 50, y: 18)
  const topAtt = pickPlayer(attackers) || pickPlayer(sorted);
  if (topAtt) {
    starters.push({ ...topAtt, x: 50, y: 18, position: "Atacante/Pivô" });
  }

  // Remaining players go to the bench, sorted by rating descending
  const bench = sorted
    .filter((p) => !assignedIds.has(p.id))
    .map((p) => ({ ...p, x: 0, y: 0 }));

  return { starters, bench };
}

