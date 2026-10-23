// src/features/pet/lib/avatarShopCatalog.ts
// Comprehensive Cyber-Fantasy Catalog for Avatar & Pet Cosmetic Shop.
// Pure data — safe to import from both server and client.

export type ShopTabKey = 'student' | 'pet' | 'title';

export type AccessoryCategory =
  | 'hat'
  | 'visor'
  | 'hood'
  | 'headset'
  | 'crown'
  | 'outfit'
  | 'aura'
  | 'pet-species'
  | 'pet-acc'
  | 'title';

export type ItemRarity = 'starter' | 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticItem {
  id:          string;
  name:        string;
  category:    AccessoryCategory;
  tab:         ShopTabKey;
  price:       number;
  minLevel:    number;
  rarity:      ItemRarity;
  description: string;
  accentColor: string;
  glowColor:   string;
  iconType:    string;
  badge?:      string;
  iconEmoji?:  string;
}

// Backward-compatibility alias
export type AccessoryItem = CosmeticItem;

// ── Archetypes for Student Avatar ───────────────────────────────────────────

export interface CharacterArchetype {
  id:          string;
  name:        string;
  title:       string;
  description: string;
  primaryColor: string;
  accentColor: string;
  iconEmoji:   string;
}

export const CHARACTER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: 'cyber-mage',
    name: 'Code Wizard',
    title: 'Penyihir Algoritma',
    description: 'Mengendalikan mantra biner dan kristal data kuantum.',
    primaryColor: '#8b5cf6',
    accentColor: '#c084fc',
    iconEmoji: '🧙‍♂️',
  },
  {
    id: 'astral-knight',
    name: 'Pixel Adventurer',
    title: 'Petualang Utama Peta',
    description: 'Karakter petualang berani penjelajah seluruh biome dan pulau ilmu di Quest Map.',
    primaryColor: '#0891b2',
    accentColor: '#22d3ee',
    iconEmoji: '🗺️',
  },
  {
    id: 'shadow-glitcher',
    name: 'Binary Shinobi',
    title: 'Ninja Dunia Maya',
    description: 'Menyusup melalui jalur optik dengan teknik stealth glitch.',
    primaryColor: '#f43f5e',
    accentColor: '#fb7185',
    iconEmoji: '🥷',
  },
  {
    id: 'chrono-alchemist',
    name: 'Chrono Elf',
    title: 'Alkimiawan Waktu',
    description: 'Memanipulasi runtime dan thread waktu komputasi berkat sihir digital.',
    primaryColor: '#10b981',
    accentColor: '#34d399',
    iconEmoji: '🧝',
  },
];

// ── Master Catalog ──────────────────────────────────────────────────────────

export const AVATAR_ACCESSORIES: CosmeticItem[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 1: PERLENGKAPAN SISWA (Headwear, Outfits, Auras)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Headwear & Hats ──
  {
    id: 'rookie-band', name: 'Bandana Coder Pemula', category: 'hat', tab: 'student', price: 0, minLevel: 1, rarity: 'starter',
    description: 'Bandana rajut semangat pantang menyerah untuk coder pemula.',
    accentColor: '#3b82f6', glowColor: 'rgba(59,130,246,0.4)', iconType: 'rookie-band', badge: 'Starter', iconEmoji: '🎗️',
  },
  {
    id: 'topi-hacker', name: 'Topi Hacker Cyberpunk', category: 'hat', tab: 'student', price: 50, minLevel: 1, rarity: 'common',
    description: 'Topi baseball cyber dengan visor HUD neon transparan.',
    accentColor: '#06b6d4', glowColor: 'rgba(6,182,212,0.4)', iconType: 'hacker-cap', badge: 'Popular', iconEmoji: '🧢',
  },
  {
    id: 'dino-cap', name: 'Topi Dino Kawaii', category: 'hat', tab: 'student', price: 55, minLevel: 1, rarity: 'common',
    description: 'Topi lucu bergigi dinosaurus mini dengan sirip hijau neon.',
    accentColor: '#10b981', glowColor: 'rgba(16,185,129,0.4)', iconType: 'dino-cap', badge: 'Cute', iconEmoji: '🦖',
  },
  {
    id: 'ninja-headband', name: 'Ikat Kepala Shinobi', category: 'hat', tab: 'student', price: 40, minLevel: 2, rarity: 'rare',
    description: 'Ikat kepala shinobi modern bertuliskan kanji biner berkilau.',
    accentColor: '#ef4444', glowColor: 'rgba(239,68,68,0.4)', iconType: 'ninja-band', iconEmoji: '🥷',
  },
  {
    id: 'tudung-wizard', name: 'Tudung Code Archmage', category: 'hood', tab: 'student', price: 75, minLevel: 2, rarity: 'rare',
    description: 'Tudung mistis dengan rune biner bersinar dan kristal logika.',
    accentColor: '#a855f7', glowColor: 'rgba(168,85,247,0.5)', iconType: 'wizard-hood', badge: 'Mystic', iconEmoji: '🧙',
  },
  {
    id: 'headset-cat', name: 'Cyber Cat RGB Headset', category: 'headset', tab: 'student', price: 60, minLevel: 2, rarity: 'rare',
    description: 'Headset telinga kucing dengan equalizer audio RGB.',
    accentColor: '#ec4899', glowColor: 'rgba(236,72,153,0.5)', iconType: 'cyber-cat', badge: 'Trending', iconEmoji: '🎧',
  },
  {
    id: 'headset-pro', name: 'Headset Pro Gamer', category: 'headset', tab: 'student', price: 65, minLevel: 2, rarity: 'rare',
    description: 'Headset gaming peredam bising dengan bantalan busa nyaman.',
    accentColor: '#f59e0b', glowColor: 'rgba(245,158,11,0.4)', iconType: 'gamer-headset', iconEmoji: '🎮',
  },
  {
    id: 'visor-neon', name: 'Kacamata HUD Scouter', category: 'visor', tab: 'student', price: 45, minLevel: 1, rarity: 'common',
    description: 'Kacamata visor neon satu mata memproyeksikan baris variabel.',
    accentColor: '#00f0ff', glowColor: 'rgba(0,240,255,0.5)', iconType: 'neon-visor', iconEmoji: '🥽',
  },
  {
    id: 'vr-goggles', name: 'Kacamata VR Metaverse', category: 'visor', tab: 'student', price: 80, minLevel: 3, rarity: 'epic',
    description: 'Perangkat VR futuristik untuk melihat dunia simulasi 3D.',
    accentColor: '#8b5cf6', glowColor: 'rgba(139,92,246,0.5)', iconType: 'vr-goggles', badge: 'High-Tech', iconEmoji: '🕶️',
  },
  {
    id: 'golden-halo', name: 'Lingkaran Halo Kuantum', category: 'crown', tab: 'student', price: 90, minLevel: 4, rarity: 'epic',
    description: 'Lingkaran suci data emas melayang anggun di atas kepala.',
    accentColor: '#eab308', glowColor: 'rgba(234,179,8,0.6)', iconType: 'golden-halo', badge: 'Epic', iconEmoji: '✨',
  },
  {
    id: 'cyber-crown', name: 'Mahkota Juara Algoritma', category: 'crown', tab: 'student', price: 120, minLevel: 5, rarity: 'legendary',
    description: 'Mahkota megah bertatahkan batu kristal kuantum murni.',
    accentColor: '#ffd700', glowColor: 'rgba(255,215,0,0.7)', iconType: 'cyber-crown', badge: 'Legendary', iconEmoji: '👑',
  },

  // ── Outfits & Robes ──
  {
    id: 'outfit-cyber-hoodie', name: 'Tunik Petualang Biru', category: 'outfit', tab: 'student', price: 0, minLevel: 1, rarity: 'starter',
    description: 'Tunik biru ikonik petualang Quest Map lengkap dengan tas ransel dan sabuk gesper emas.',
    accentColor: '#0891b2', glowColor: 'rgba(8,145,178,0.4)', iconType: 'cyber-hoodie', badge: 'Map Default', iconEmoji: '🎒',
  },
  {
    id: 'outfit-wizard-robe', name: 'Jubah Archmage Pixel', category: 'outfit', tab: 'student', price: 70, minLevel: 2, rarity: 'rare',
    description: 'Jubah sutra ungu mistis petualang biner dengan sulaman rune bercahaya.',
    accentColor: '#8b5cf6', glowColor: 'rgba(139,92,246,0.5)', iconType: 'wizard-robe', badge: 'Mystic', iconEmoji: '👘',
  },
  {
    id: 'outfit-astral-plate', name: 'Zirah Ksatria Pixel', category: 'outfit', tab: 'student', price: 95, minLevel: 3, rarity: 'epic',
    description: 'Zirah plat baja kobalt berdaya inti mana bercahaya untuk melindungi petualang.',
    accentColor: '#0ea5e9', glowColor: 'rgba(14,165,233,0.5)', iconType: 'astral-plate', badge: 'Epic', iconEmoji: '🛡️',
  },
  {
    id: 'outfit-shinobi-suit', name: 'Pakaian Shinobi Shadow', category: 'outfit', tab: 'student', price: 65, minLevel: 2, rarity: 'rare',
    description: 'Seragam ninja siluman dengan sabuk merah khas untuk petualangan bayangan.',
    accentColor: '#f43f5e', glowColor: 'rgba(244,63,94,0.5)', iconType: 'shinobi-suit', iconEmoji: '🥷',
  },
  {
    id: 'outfit-chrono-coat', name: 'Mantel Alkimia Waktu', category: 'outfit', tab: 'student', price: 110, minLevel: 4, rarity: 'legendary',
    description: 'Mantel hijau zamrud berhias roda gigi kuningan dan jimat petualang waktu.',
    accentColor: '#10b981', glowColor: 'rgba(16,185,129,0.6)', iconType: 'chrono-coat', badge: 'Legendary', iconEmoji: '🧥',
  },

  // ── Auras & FX ──
  {
    id: 'aura-matrix', name: 'Aura Hujan Kode Biner', category: 'aura', tab: 'student', price: 50, minLevel: 2, rarity: 'common',
    description: 'Aliran karakter biner neon hijau yang mengalir di sekitar tubuh.',
    accentColor: '#22c55e', glowColor: 'rgba(34,197,94,0.5)', iconType: 'aura-matrix', iconEmoji: '🟢',
  },
  {
    id: 'aura-quantum', name: 'Aura Orbit Kuantum', category: 'aura', tab: 'student', price: 85, minLevel: 3, rarity: 'epic',
    description: 'Lingkaran cincin partikel ungu-biru yang berputar dinamis.',
    accentColor: '#8b5cf6', glowColor: 'rgba(139,92,246,0.6)', iconType: 'aura-quantum', badge: 'Dynamic', iconEmoji: '🟣',
  },
  {
    id: 'aura-glitch', name: 'Aura Distorsi Glitch', category: 'aura', tab: 'student', price: 105, minLevel: 4, rarity: 'epic',
    description: 'Percikan petir digital dan efek pembelokan sinyal neon merah-cyan.',
    accentColor: '#06b6d4', glowColor: 'rgba(6,182,212,0.6)', iconType: 'aura-glitch', iconEmoji: '⚡',
  },
  {
    id: 'aura-celestial', name: 'Aura Holy Supernova', category: 'aura', tab: 'student', price: 150, minLevel: 5, rarity: 'legendary',
    description: 'Pancaran pendar cahaya suci emas yang memancarkan aura juara.',
    accentColor: '#fbbf24', glowColor: 'rgba(251,191,36,0.7)', iconType: 'aura-celestial', badge: 'Legendary', iconEmoji: '🌟',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 2: COMPANION PET (Species & Pet Accessories)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Pet Species ──
  {
    id: 'pet-cat', name: 'Cyber Neko', category: 'pet-species', tab: 'pet', price: 0, minLevel: 1, rarity: 'starter',
    description: 'Kucing digital lincah yang suka mendengkurkan frekuensi WiFi.',
    accentColor: '#6366f1', glowColor: 'rgba(99,102,241,0.5)', iconType: 'pet-cat', badge: 'Default', iconEmoji: '🐱',
  },
  {
    id: 'pet-fox', name: 'Kitsune Neon', category: 'pet-species', tab: 'pet', price: 60, minLevel: 2, rarity: 'rare',
    description: 'Rubah api data yang lincah dan membimbing logika algoritma.',
    accentColor: '#f97316', glowColor: 'rgba(249,115,22,0.5)', iconType: 'pet-fox', iconEmoji: '🦊',
  },
  {
    id: 'pet-dragon', name: 'Quantum Drake', category: 'pet-species', tab: 'pet', price: 130, minLevel: 4, rarity: 'legendary',
    description: 'Naga kuantum mini bersisik kristal yang menyemburkan api biner.',
    accentColor: '#ef4444', glowColor: 'rgba(239,68,68,0.6)', iconType: 'pet-dragon', badge: 'Legendary', iconEmoji: '🐲',
  },
  {
    id: 'pet-robot', name: 'Mech Bot-404', category: 'pet-species', tab: 'pet', price: 75, minLevel: 2, rarity: 'rare',
    description: 'Robot asisten terbang beroda bola dengan antena pemancar ide.',
    accentColor: '#0ea5e9', glowColor: 'rgba(14,165,233,0.5)', iconType: 'pet-robot', iconEmoji: '🤖',
  },
  {
    id: 'pet-bunny', name: 'Holo Bunny', category: 'pet-species', tab: 'pet', price: 50, minLevel: 1, rarity: 'common',
    description: 'Kelinci holografik lucu bertelinga panjang yang melompat tinggi.',
    accentColor: '#ec4899', glowColor: 'rgba(236,72,153,0.5)', iconType: 'pet-bunny', iconEmoji: '🐰',
  },
  {
    id: 'pet-owl', name: 'Athena Owl', category: 'pet-species', tab: 'pet', price: 80, minLevel: 3, rarity: 'epic',
    description: 'Burung hantu cyber bermata lensa telemetri penemu bug.',
    accentColor: '#a855f7', glowColor: 'rgba(168,85,247,0.5)', iconType: 'pet-owl', badge: 'Wise', iconEmoji: '🦉',
  },
  {
    id: 'pet-dog', name: 'Cyber Shiba', category: 'pet-species', tab: 'pet', price: 55, minLevel: 1, rarity: 'common',
    description: 'Anjing penjaga setia yang melacak memory leak dengan hidungnya.',
    accentColor: '#eab308', glowColor: 'rgba(234,179,8,0.5)', iconType: 'pet-dog', iconEmoji: '🐶',
  },

  // ── Pet Accessories ──
  {
    id: 'pet-bowtie', name: 'Dasi Kupu-Kupu Neon', category: 'pet-acc', tab: 'pet', price: 30, minLevel: 1, rarity: 'common',
    description: 'Dasi kupu-kupu modis menyala untuk pet kesayanganmu.',
    accentColor: '#ec4899', glowColor: 'rgba(236,72,153,0.4)', iconType: 'pet-bowtie', iconEmoji: '🎀',
  },
  {
    id: 'pet-mini-scouter', name: 'Scouter HUD Mini Pet', category: 'pet-acc', tab: 'pet', price: 40, minLevel: 2, rarity: 'rare',
    description: 'Kacamata scouter satu mata khusus pet untuk membaca daya musuh.',
    accentColor: '#06b6d4', glowColor: 'rgba(6,182,212,0.4)', iconType: 'pet-scouter', iconEmoji: '🥽',
  },
  {
    id: 'pet-mini-crown', name: 'Mahkota Mini Royal Pet', category: 'pet-acc', tab: 'pet', price: 70, minLevel: 3, rarity: 'epic',
    description: 'Mahkota pangeran/putri mungil bersinar di atas kepala pet.',
    accentColor: '#eab308', glowColor: 'rgba(234,179,8,0.6)', iconType: 'pet-crown', badge: 'Cute', iconEmoji: '👑',
  },
  {
    id: 'pet-angel-halo', name: 'Halo Suci Pet', category: 'pet-acc', tab: 'pet', price: 85, minLevel: 4, rarity: 'legendary',
    description: 'Lingkaran cahaya malaikat melayang lembut di atas pet.',
    accentColor: '#38bdf8', glowColor: 'rgba(56,189,248,0.6)', iconType: 'pet-halo', badge: 'Celestial', iconEmoji: '✨',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB 3: GELAR & TITLES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'title-novice', name: 'Novice Byte', category: 'title', tab: 'title', price: 0, minLevel: 1, rarity: 'starter',
    description: 'Gelar kehormatan langkah pertama mengarungi samudera kode.',
    accentColor: '#64748b', glowColor: 'rgba(100,116,139,0.3)', iconType: 'title', badge: 'Starter', iconEmoji: '🌱',
  },
  {
    id: 'title-script-kid', name: 'Script Explorer', category: 'title', tab: 'title', price: 35, minLevel: 2, rarity: 'common',
    description: 'Penjelajah skrip sintaks dan pemecah misteri algoritma.',
    accentColor: '#3b82f6', glowColor: 'rgba(59,130,246,0.4)', iconType: 'title', iconEmoji: '🧭',
  },
  {
    id: 'title-shinobi', name: 'Binary Shinobi', category: 'title', tab: 'title', price: 70, minLevel: 3, rarity: 'rare',
    description: 'Ahli penyusup logika tanpa cela, cepat dan tanpa jejak error.',
    accentColor: '#f43f5e', glowColor: 'rgba(244,63,94,0.5)', iconType: 'title', badge: 'Popular', iconEmoji: '⚔️',
  },
  {
    id: 'title-quantum', name: 'Quantum Wizard', category: 'title', tab: 'title', price: 100, minLevel: 4, rarity: 'epic',
    description: 'Penguasa komputasi kuantum yang memanipulasi probabilitas logika.',
    accentColor: '#8b5cf6', glowColor: 'rgba(139,92,246,0.6)', iconType: 'title', badge: 'Epic', iconEmoji: '🔮',
  },
  {
    id: 'title-archmage', name: 'Cyber Archmage', category: 'title', tab: 'title', price: 160, minLevel: 5, rarity: 'legendary',
    description: 'Penyihir agung dunia cyber yang dihormati di seantero realm Bits2Bytes.',
    accentColor: '#ffd700', glowColor: 'rgba(255,215,0,0.7)', iconType: 'title', badge: 'Legendary', iconEmoji: '⚜️',
  },
];

export const CATEGORY_LABEL: Record<AccessoryCategory, string> = {
  hat:           'Topi & Bandana',
  visor:         'Kacamata & Visor',
  hood:          'Tudung Mistis',
  headset:       'Headset Gamer',
  crown:         'Mahkota & Halo',
  outfit:        'Jubah & Pakaian',
  aura:          'Aura & Efek FX',
  'pet-species': 'Spesies Pet',
  'pet-acc':     'Aksesoris Pet',
  title:         'Gelar & Julukan',
};

export function getAccessoryById(id: string | null | undefined): CosmeticItem | null {
  if (!id) return null;
  return AVATAR_ACCESSORIES.find((a) => a.id === id) ?? null;
}

export function getItemsByTab(tab: ShopTabKey): CosmeticItem[] {
  return AVATAR_ACCESSORIES.filter((item) => item.tab === tab);
}
