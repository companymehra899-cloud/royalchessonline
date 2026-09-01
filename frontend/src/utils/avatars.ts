// Avatar definitions — each maps an avatar_id to an illustrated character
// portrait image URL (DiceBear "adventurer" style).
// Used in ProfileScreen (picker), MatchScreen, HomeScreen, and LeaderboardScreen.
export interface AvatarDef {
  id: string;
  label: string;
  image: string;
}

const DICEBEAR = 'https://api.dicebear.com/9.x/adventurer/png';
const DICEBEAR_LORELEI = 'https://api.dicebear.com/9.x/lorelei/png';

function avatarUrl(seed: string): string {
  return `${DICEBEAR}?seed=${seed}&size=256&radius=12`;
}

function realisticUrl(seed: string): string {
  return `${DICEBEAR_LORELEI}?seed=${seed}&size=256&radius=12`;
}

export const AVATARS: AvatarDef[] = [
  { id: 'warrior',     label: 'Warrior',     image: avatarUrl('Warrior') },
  { id: 'mage',        label: 'Mage',        image: avatarUrl('Mage42') },
  { id: 'ranger',      label: 'Ranger',      image: avatarUrl('Ranger') },
  { id: 'knight',      label: 'Knight',      image: avatarUrl('Knight') },
  { id: 'archer',      label: 'Archer',      image: avatarUrl('Archer') },
  { id: 'rogue',       label: 'Rogue',       image: avatarUrl('Rogue') },
  { id: 'paladin',     label: 'Paladin',     image: avatarUrl('Paladin') },
  { id: 'sorcerer',    label: 'Sorcerer',    image: avatarUrl('Sorcerer') },
  { id: 'barbarian',   label: 'Barbarian',   image: avatarUrl('Barbarian') },
  { id: 'druid',       label: 'Druid',       image: avatarUrl('Druid') },
  { id: 'monk',        label: 'Monk',        image: avatarUrl('Monk') },
  { id: 'bard',        label: 'Bard',        image: avatarUrl('Bard') },
  { id: 'necromancer', label: 'Necromancer', image: avatarUrl('Necromancer') },
  { id: 'assassin',    label: 'Assassin',    image: avatarUrl('Assassin') },
  { id: 'templar',     label: 'Templar',     image: avatarUrl('Templar') },
  { id: 'hunter',      label: 'Hunter',      image: avatarUrl('Hunter') },
  { id: 'sage',        label: 'Sage',        image: avatarUrl('Sage') },
  { id: 'champion',    label: 'Champion',    image: avatarUrl('Champion') },
  // Realistic male portraits — diverse ethnicities
  { id: 'indian_boy',      label: 'Indian Boy',      image: realisticUrl('Arjun') },
  { id: 'indian_boy_2',    label: 'Indian Boy 2',    image: realisticUrl('Rahul') },
  { id: 'african_boy',     label: 'African Boy',     image: realisticUrl('Kwame') },
  { id: 'american_boy',    label: 'American',       image: realisticUrl('Tyler') },
  { id: 'russian_boy',     label: 'Russian',        image: realisticUrl('Dmitri') },
  { id: 'european_boy',    label: 'European',       image: realisticUrl('Hans') },
];

const AVATAR_MAP: Record<string, AvatarDef> = AVATARS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {}
);

const DEFAULT_AVATAR: AvatarDef = AVATARS[0];

export function getAvatar(avatarId?: string): AvatarDef {
  return AVATAR_MAP[avatarId || ''] || DEFAULT_AVATAR;
}
