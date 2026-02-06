const NAME_MAP: Record<string, string> = {
  "Ryu": "Douglas",
  "Vancliffe": "Vancliffe",
  "Bernadotte": "Bernadotte",
  "Karnal": "Karnal",
  "Borgnine": "Borgnine",
  "Sagar": "Sagar",
  "Craig": "Craig",
  "Gurkha": "Gurkha",
  "Berenice": "Berenice",
  "Lariel": "Lariel",
  "Cordelia": "Cordelia",
  "Leah": "Leah",
  "Veressa": "Veressa",
  "Todd": "Todd",
  "Kyle": "Kyle",
  "Jarrett": "Jarrett",
  "Hekerson": "Hekerson",
  "Cayde": "Cayde",
  "GingerBrave": "Thomas",
  "Pure Vanilla Cookie": "Lucia",
  "Hollyberry Cookie": "Alice",
  "Espresso Cookie": "Hibiscus",
  "Madeleine Cookie": "Pave",
  "Altair": "Frederic",
  "Ezio": "Patric",
  "Bayek": "Ashour",
  "Kassandra": "Federica",
  "Eivor": "Solveig",
  "Geralt": "Magnus",
  "Ciri": "Reyka",
  "Triss": "Enshia",
  "Yennefer": "Tarnisha",
  "Jin Kazama": "Kai",
  "Hwoarang": "Taebaek",
  "Paul Phoenix": "Duke",
  "Nina Williams": "Shasha",
  "Heihachi Mishima": "Daimon",
  "Yuji Itadori": "Rick",
  "Satoru Gojo": "Werner",
  "Megumi Fushiguro": "Tetsuya",
  "Romen Sukuna": "Haato",
  "Nobara Kugisaki": "Aya",
  "Tanjiro Kamado": "Azure Dragon Swordsman",
  "Inosuke Hashibira": "White Tiger Blade Master",
  "Nezuko Kamado": "Vermilion Bird Dancer",
  "Zenitsu Agatsuma": "Qilin Slasher",
  "Gyomei Himejima": "Black Tortoise Champion",
  "Gandalf": "Gandalf",
  "Aragorn": "Aragorn",
  "Legolas": "Legolas",
  "Frodo": "Frodo",
  "Gollum": "Gollum",
  "Wind Qilin Slasher": "Sagar",
  "Ashour": "Ashour",
  "Brita": "Berta",
  "Dark Rick": "Vancliffe",
  "7R1X": "ROBO-G92",
  "L.W.T. Blade Master": "Blade Master",
  "Smicer": "Smicer",
  "Gapsoo": "Gapsoo",
  "Byungchul": "Byungchul",
  "Ren": "Ren",
  "Ramael and Judiah": "Twin Angels",
  "Shun": "Shun",
  "Zen": "Zen",
  "Audrey": "Audrey",
  "Dark Werner": "Dragunov",
  "Fire Werner": "Carcano",
  "Dyeus": "Valantis",
  "Vendhan": "Wedjat",
  "Lamiella": "Laima"
};

const normalizeKey = (value: string) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/[^a-z0-9\s\-_.]/g, '')
  .trim();

export const normalizeMonsterName = (name: string) => {
  const direct = NAME_MAP[name];
  if (direct) return direct;

  const key = normalizeKey(name);
  if (!key) return name;

  const directKey = Object.keys(NAME_MAP).find((k) => normalizeKey(k) === key);
  if (directKey) return NAME_MAP[directKey] || name;

  return name;
};

export const normalizeMonsterNames = (names: string[]) => names.map(normalizeMonsterName);

const levenshtein = (a: string, b: string) => {
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;

  const dp = new Array(blen + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= alen; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= blen; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[blen];
};

export const fuzzyMatchNames = (names: string[], validNames: string[], maxDistanceRatio = 0.3) => {
  const normalizedValid = validNames.map((n) => ({
    name: n,
    key: normalizeKey(n)
  }));
  const validKeySet = new Set(normalizedValid.map((n) => n.key));

  return names.map((name) => {
    const key = normalizeKey(name);
    if (!key) return name;

    if (validKeySet.has(key)) {
      const exact = normalizedValid.find((n) => n.key === key);
      return exact?.name || name;
    }

    let best = { name, score: Number.POSITIVE_INFINITY };
    for (const cand of normalizedValid) {
      const distance = levenshtein(key, cand.key);
      const ratio = distance / Math.max(key.length, cand.key.length, 1);
      if (ratio < best.score) {
        best = { name: cand.name, score: ratio };
      }
    }

    return best.score <= maxDistanceRatio ? best.name : name;
  });
};