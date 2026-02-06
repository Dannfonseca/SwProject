type CollabEntry = {
  collab: string;
  variants: string[];
};

const ELEMENTS = ['Fire', 'Water', 'Wind', 'Light', 'Dark'];

const normalizeKey = (value: string) => value
  .toLowerCase()
  .normalize('NFKD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/[^a-z0-9\s\-_.]/g, '')
  .trim();

const fillVariants = (variants: string[]) => {
  if (variants.length === 1) {
    return Array(5).fill(variants[0]);
  }
  if (variants.length >= 5) return variants;
  const filled = variants.slice();
  while (filled.length < 5) {
    filled.push(variants[variants.length - 1] ?? '');
  }
  return filled;
};

const COLLAB_MAP: CollabEntry[] = [
  // Street Fighter
  { collab: 'Ryu', variants: ['Moore', 'Douglas', 'Kashmir', 'Talisman', 'Vancliffe'] },
  { collab: 'Ken', variants: ['Bernadotte'] },
  { collab: 'M. Bison', variants: ['Karnal', 'Borgnine', 'Sagar', 'Craig', 'Gurkha'] },
  { collab: 'Chun-li', variants: ['Berenice', 'Lariel', 'Cordelia', 'Leah', 'Veressa'] },
  { collab: 'Dhalsim', variants: ['Todd', 'Kyle', 'Jarrett', 'Hekerson', 'Cayde'] },

  // Cookie Run: Kingdom
  { collab: 'GingerBrave', variants: ['Thomas'] },
  { collab: 'Pure Vanilla Cookie', variants: ['Lucia', 'Adriana', 'Angela', 'Ariana', 'Elena'] },
  { collab: 'Hollyberry Cookie', variants: ['Alice', 'Manon', 'Jade', 'Audrey', 'Giselle'] },
  { collab: 'Espresso Cookie', variants: ['Hibiscus', 'Rosemary', 'Chamomilea', 'Jasmine', 'Lavender'] },
  { collab: 'Madeleine Cookie', variants: ['Pave', 'Ganache', 'Praline', 'Fudge', 'Truffle'] },

  // Assassin's Creed
  { collab: 'Altair', variants: ['Frederic'] },
  { collab: 'Ezio', variants: ['Patric', 'Lionel', 'Hector', 'Ian', 'Evan'] },
  { collab: 'Bayek', variants: ['Ashour', 'Omar', 'Shahat', 'Ahmed', 'Salah'] },
  { collab: 'Kassandra', variants: ['Federica', 'Kalantatze', 'Eleni', 'Aurelia', 'Kiara'] },
  { collab: 'Eivor', variants: ['Solveig', 'Brita', 'Astrid', 'Berghild', 'Sigrid'] },

  // The Witcher 3: Wild Hunt
  { collab: 'Geralt', variants: ['Magnus', 'Anders', 'Henrik', 'Lars', 'Valdemar'] },
  { collab: 'Ciri', variants: ['Reyka', 'Rigna', 'Tirsa', 'Birgitta', 'Fiona'] },
  { collab: 'Triss', variants: ['Enshia', 'Lumina', 'Nobella', 'Groa', 'Celestara'] },
  { collab: 'Yennefer', variants: ['Tarnisha', 'Johanna', 'Hexarina', 'Arcana', 'Hilda'] },

  // Tekken 8
  { collab: 'Jin Kazama', variants: ['Kai', 'Kai', 'Kai', 'Kai', 'Kai'] },
  { collab: 'Hwoarang', variants: ['Taebaek', 'Taebaek', 'Taebaek', 'Taebaek', 'Taebaek'] },
  { collab: 'Paul Phoenix', variants: ['Duke', 'Duke', 'Duke', 'Duke', 'Duke'] },
  { collab: 'Nina Williams', variants: ['Shasha', 'Shasha', 'Shasha', 'Shasha', 'Shasha'] },
  { collab: 'Heihachi Mishima', variants: ['Daimon'] },

  // Jujutsu Kaisen
  { collab: 'Yuji Itadori', variants: ['Rick', 'Rick', 'Rick', 'Rick', 'Rick'] },
  { collab: 'Satoru Gojo', variants: ['Werner', 'Werner', 'Werner', 'Werner', 'Werner'] },
  { collab: 'Megumi Fushiguro', variants: ['Tetsuya', 'Tetsuya', 'Tetsuya', 'Tetsuya', 'Tetsuya'] },
  { collab: 'Romen Sukuna', variants: ['Haato'] },
  { collab: 'Nobara Kugisaki', variants: ['Aya', 'Aya', 'Aya', 'Aya', 'Aya'] },

  // Demon Slayer: Kimetsu no Yaiba
  { collab: 'Tanjiro Kamado', variants: ['Azure Dragon Swordsman', 'Azure Dragon Swordsman', 'Azure Dragon Swordsman', 'Azure Dragon Swordsman', 'Azure Dragon Swordsman'] },
  { collab: 'Inosuke Hashibira', variants: ['White Tiger Blade Master', 'White Tiger Blade Master', 'White Tiger Blade Master', 'White Tiger Blade Master', 'White Tiger Blade Master'] },
  { collab: 'Nezuko Kamado', variants: ['Vermilion Bird Dancer', 'Vermilion Bird Dancer', 'Vermilion Bird Dancer', 'Vermilion Bird Dancer', 'Vermilion Bird Dancer'] },
  { collab: 'Zenitsu Agatsuma', variants: ['Qilin Slasher', 'Qilin Slasher', 'Qilin Slasher', 'Qilin Slasher', 'Qilin Slasher'] },
  { collab: 'Gyomei Himejima', variants: ['Black Tortoise Champion'] },

  // Lord of the Rings
  { collab: 'Gandalf', variants: ['Gandalf', 'Gandalf', 'Gandalf', 'Gandalf', 'Gandalf'] },
  { collab: 'Aragorn', variants: ['Aragorn', 'Aragorn', 'Aragorn', 'Aragorn', 'Aragorn'] },
  { collab: 'Legolas', variants: ['Legolas', 'Legolas', 'Legolas', 'Legolas', 'Legolas'] },
  { collab: 'Frodo', variants: ['Frodo'] },
  { collab: 'Gollum', variants: ['Gollum', 'Gollum', 'Gollum', 'Gollum', 'Gollum'] }
];

export const getCollabEntry = (term: string) => {
  const key = normalizeKey(term);
  if (!key) return null;
  let entry = COLLAB_MAP.find((item) => normalizeKey(item.collab) === key);
  if (!entry && key.length >= 4) {
    entry = COLLAB_MAP.find((item) => normalizeKey(item.collab).includes(key));
  }
  if (!entry) return null;
  const variants = fillVariants(entry.variants).filter(Boolean);
  return {
    collab: entry.collab,
    variants
  };
};

export const collabElements = ELEMENTS;
