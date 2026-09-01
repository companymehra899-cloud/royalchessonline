export type GameMode = 'computer' | 'friend' | 'online' | 'puzzle' | 'daily';
export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'master';
export type PlayerColor = 'white' | 'black';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  rating: number;
  best_rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  puzzles_solved?: number;
  avatar_id?: string;
  avatar_url?: string;
  country?: string;
  joined_date?: string;
  is_guest?: boolean;
  board_theme?: string;
  piece_theme?: string;
  difficulty?: string;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  hints_enabled?: boolean;
  move_confirm?: boolean;
}

export interface GameHistoryItem {
  id: string;
  mode: string;
  opponent_name: string;
  player_color: string;
  result: 'win' | 'loss' | 'draw';
  reason: string;
  moves_count: number;
  duration_seconds: number;
  difficulty?: string;
  rating_before: number;
  rating_after: number;
  elo_delta: number;
  created_at: string;
}

export interface Puzzle {
  id: string;
  title: string;
  theme: string;
  difficulty: string;
  rating: number;
  fen: string;
  turn: 'w' | 'b';
  solution_from: string;
  solution_to: string;
  solution_san: string;
  hint: string;
  description: string;
  is_daily?: boolean;
  reward_elo?: number;
}

export interface OnlineRoom {
  room_code: string;
  status: 'waiting' | 'active' | 'completed';
  fen: string;
  turn: 'w' | 'b';
  white_player?: { id: string; name: string; rating: number };
  black_player?: { id: string; name: string; rating: number };
  time_seconds: number;
  white_time: number;
  black_time: number;
  last_move?: { from: string; to: string; san: string; uci: string };
  move_history: Array<{ from: string; to: string; san: string; uci: string }>;
  winner?: string;
  end_reason?: string;
}