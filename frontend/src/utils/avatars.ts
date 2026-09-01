import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

// Avatar definitions — each maps an avatar_id to an icon and label.
// Used in ProfileScreen (picker), MatchScreen (player avatar),
// HomeScreen (user card), and LeaderboardScreen (player avatars).
export interface AvatarDef {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
}

export const AVATARS: AvatarDef[] = [
  { id: 'boy', icon: 'face-man', label: 'Boy', color: '#5b9bd5' },
  { id: 'girl', icon: 'face-woman', label: 'Girl', color: '#e875a0' },
  { id: 'uncle', icon: 'face-man-profile', label: 'Uncle', color: '#d4a574' },
  { id: 'lady', icon: 'face-woman-profile', label: 'Lady', color: '#c084d4' },
  { id: 'king_gold', icon: 'chess-king', label: 'King', color: colors.gold },
  { id: 'queen_gold', icon: 'chess-queen', label: 'Queen', color: colors.gold },
  { id: 'knight_gold', icon: 'chess-knight', label: 'Knight', color: colors.gold },
  { id: 'rook_gold', icon: 'chess-rook', label: 'Rook', color: colors.gold },
  { id: 'pawn_gold', icon: 'chess-pawn', label: 'Pawn', color: colors.gold },
];

const AVATAR_MAP: Record<string, AvatarDef> = AVATARS.reduce(
  (acc, a) => ({ ...acc, [a.id]: a }),
  {}
);

export function getAvatar(avatarId?: string): AvatarDef {
  return AVATAR_MAP[avatarId || 'pawn_gold'] || AVATAR_MAP['pawn_gold'];
}
