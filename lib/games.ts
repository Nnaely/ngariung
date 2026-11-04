/* Logika permainan — murni, tanpa React. */

export type Cell = "X" | "O" | null;
export type RpsChoice = "batu" | "gunting" | "kertas";

export const KATA_WORDS = [
  "BUNGA",
  "HUJAN",
  "PANAS",
  "SENJA",
  "TAMAN",
  "KOTAK",
  "KURSI",
  "LAMPU",
  "PINTU",
  "JALAN",
  "BULAN",
  "BAKSO",
  "SAYUR",
  "JERUK",
  "SALAK",
  "GARAM",
  "CABAI",
  "TOMAT",
  "BAYAM",
  "TEMPE",
  "ONCOM",
  "KECAP",
  "BUBUR",
  "DONAT",
  "UDARA",
  "ANGIN",
  "BADAI",
  "PETIR",
  "GEMPA",
  "TANAH",
  "PASIR",
  "PULAU",
  "DANAU",
  "HUTAN",
  "POHON",
  "TUNAS",
  "SEMAK",
  "KELAS",
  "DOSEN",
  "TUGAS",
  "UJIAN",
  "NILAI",
  "ABSEN",
  "RAPAT",
  "LEMON",
] as const;

export type Teka = { q: string; a: string[] };

export const TEKA_LIST: Teka[] = [
  {
    q: "Ibu punya empat anak: Januari, Februari, Maret. Siapa nama anak keempat?",
    a: ["ibu"],
  },
  {
    q: "Semakin banyak diambil, semakin besar. Apa itu?",
    a: ["lubang"],
  },
  {
    q: "Punya banyak gigi tapi tidak bisa menggigit. Apa?",
    a: ["sisir"],
  },
  {
    q: "Selalu ada di depanmu, tapi tidak pernah bisa kamu lihat. Apa?",
    a: ["masadepan"],
  },
  {
    q: "Berapa banyak bulan dalam setahun yang punya 28 hari?",
    a: ["12", "duabelas"],
  },
  {
    q: "Bisa dipegang tapi tidak bisa dilihat, bisa habis tanpa dipakai. Apa?",
    a: ["waktu"],
  },
  {
    q: "Makin besar, makin sulit dibawa. Apa?",
    a: ["masalah"],
  },
];

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hashDate(date: string, salt: string): number {
  let h = 2166136261;
  const s = `${date}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function dailyWord(date: string): string {
  return KATA_WORDS[hashDate(date, "kata") % KATA_WORDS.length];
}

export function dailyTeka(date: string): Teka {
  return TEKA_LIST[hashDate(date, "teka") % TEKA_LIST.length];
}

export type LetterMark = "hit" | "present" | "miss";

export function scoreGuess(guess: string, answer: string): LetterMark[] {
  const g = guess.toUpperCase().split("");
  const a = answer.toUpperCase().split("");
  const marks: LetterMark[] = Array(g.length).fill("miss");
  const pool: Record<string, number> = {};

  g.forEach((ch, i) => {
    if (ch === a[i]) marks[i] = "hit";
    else pool[a[i]] = (pool[a[i]] ?? 0) + 1;
  });

  g.forEach((ch, i) => {
    if (marks[i] === "hit") return;
    if ((pool[ch] ?? 0) > 0) {
      marks[i] = "present";
      pool[ch] -= 1;
    }
  });

  return marks;
}

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function tttWinner(board: Cell[]): "X" | "O" | "draw" | null {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as "X" | "O";
    }
  }
  return board.every(Boolean) ? "draw" : null;
}

export function rpsResult(a: RpsChoice, b: RpsChoice): "A" | "B" | "draw" {
  if (a === b) return "draw";
  const wins: Record<RpsChoice, RpsChoice> = {
    batu: "gunting",
    gunting: "kertas",
    kertas: "batu",
  };
  return wins[a] === b ? "A" : "B";
}

export const RPS_LABEL: Record<RpsChoice, string> = {
  batu: "Batu",
  gunting: "Gunting",
  kertas: "Kertas",
};
