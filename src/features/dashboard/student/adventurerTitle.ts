// Shared, lightweight adventurer title mapping.
// Kept separate from the celebration modal so dashboard pages do not eagerly
// include the confetti and Web Audio implementation.

export function getAdventurerTitle(lvl: number): { title: string; subtitle: string; icon: string } {
  if (lvl >= 10) {
    return { title: 'Archmage Cyber Realm', subtitle: 'Penguasa Tertinggi Arsitektur Kode', icon: '👑' };
  }
  if (lvl >= 7) {
    return { title: 'Master Rune Komputasi', subtitle: 'Ahli Logika & Pemecah Masalah Kompleks', icon: '🔮' };
  }
  if (lvl >= 5) {
    return { title: 'Pendekar Logika Biner', subtitle: 'Pemberani Algoritma & Petualang Hebat', icon: '⚔️' };
  }
  if (lvl >= 3) {
    return { title: 'Penjelajah Algoritma', subtitle: 'Penjelajah Pulau Logika & Loop Misterius', icon: '🧭' };
  }
  return { title: 'Pemula Pengembara Kode', subtitle: 'Langkah Pertama Menembus Gerbang Bits2Bytes', icon: '🌱' };
}
