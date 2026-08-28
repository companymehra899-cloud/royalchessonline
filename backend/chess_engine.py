import chess
import random
import time
from typing import Optional, Tuple, Dict, Any, List

# Piece-Square Tables for positional evaluation
PAWN_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
]

KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
]

BISHOP_TABLE = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
]

ROOK_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
]

QUEEN_TABLE = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
]

KING_TABLE = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20,  20,   0,   0,   0,   0,  20,  20,
    20,  30,  10,   0,   0,  10,  30,  20
]

PIECE_VALUES = {
    chess.PAWN: 100,
    chess.KNIGHT: 320,
    chess.BISHOP: 330,
    chess.ROOK: 500,
    chess.QUEEN: 900,
    chess.KING: 20000
}

def evaluate_board(board: chess.Board) -> int:
    if board.is_checkmate():
        return -99999 if board.turn == chess.WHITE else 99999
    if board.is_stalemate() or board.is_insufficient_material() or board.can_claim_threefold_repetition():
        return 0

    evaluation = 0
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if not piece:
            continue
        
        val = PIECE_VALUES.get(piece.piece_type, 0)
        pos_val = 0
        sq_idx = square if piece.color == chess.WHITE else chess.square_mirror(square)
        
        if piece.piece_type == chess.PAWN:
            pos_val = PAWN_TABLE[sq_idx]
        elif piece.piece_type == chess.KNIGHT:
            pos_val = KNIGHT_TABLE[sq_idx]
        elif piece.piece_type == chess.BISHOP:
            pos_val = BISHOP_TABLE[sq_idx]
        elif piece.piece_type == chess.ROOK:
            pos_val = ROOK_TABLE[sq_idx]
        elif piece.piece_type == chess.QUEEN:
            pos_val = QUEEN_TABLE[sq_idx]
        elif piece.piece_type == chess.KING:
            pos_val = KING_TABLE[sq_idx]

        total = val + pos_val
        if piece.color == chess.WHITE:
            evaluation += total
        else:
            evaluation -= total

    return evaluation

def minimax(board: chess.Board, depth: int, alpha: float, beta: float, is_maximizing: bool) -> Tuple[float, Optional[chess.Move]]:
    if depth == 0 or board.is_game_over():
        return evaluate_board(board), None

    best_move = None
    legal_moves = list(board.legal_moves)
    
    # Move ordering: captures first
    legal_moves.sort(key=lambda m: board.is_capture(m), reverse=True)

    if is_maximizing:
        max_eval = -float('inf')
        for move in legal_moves:
            board.push(move)
            eval_score, _ = minimax(board, depth - 1, alpha, beta, False)
            board.pop()
            if eval_score > max_eval:
                max_eval = eval_score
                best_move = move
            alpha = max(alpha, eval_score)
            if beta <= alpha:
                break
        return max_eval, best_move
    else:
        min_eval = float('inf')
        for move in legal_moves:
            board.push(move)
            eval_score, _ = minimax(board, depth - 1, alpha, beta, True)
            board.pop()
            if eval_score < min_eval:
                min_eval = eval_score
                best_move = move
            beta = min(beta, eval_score)
            if beta <= alpha:
                break
        return min_eval, best_move

def get_best_move(fen: str, difficulty: str = "easy") -> Dict[str, Any]:
    board = chess.Board(fen)
    if board.is_game_over():
        return {"move": None, "uci": None, "san": None, "eval": 0, "is_game_over": True}

    legal_moves = list(board.legal_moves)
    if not legal_moves:
        return {"move": None, "uci": None, "san": None, "eval": 0, "is_game_over": True}

    is_white = board.turn == chess.WHITE
    diff = difficulty.lower()

    if diff == "easy":
        # 70% random legal move, 30% shallow eval
        if random.random() < 0.7:
            chosen_move = random.choice(legal_moves)
            eval_score = evaluate_board(board)
        else:
            eval_score, chosen_move = minimax(board, depth=1, alpha=-float('inf'), beta=float('inf'), is_maximizing=is_white)
            if chosen_move is None:
                chosen_move = random.choice(legal_moves)

    elif diff == "medium":
        # Depth 2 minimax with 15% random blunder
        if random.random() < 0.15:
            captures = [m for m in legal_moves if board.is_capture(m)]
            chosen_move = random.choice(captures) if captures else random.choice(legal_moves)
            eval_score = evaluate_board(board)
        else:
            eval_score, chosen_move = minimax(board, depth=2, alpha=-float('inf'), beta=float('inf'), is_maximizing=is_white)
            if chosen_move is None:
                chosen_move = random.choice(legal_moves)

    elif diff == "hard":
        # Depth 3 minimax
        eval_score, chosen_move = minimax(board, depth=3, alpha=-float('inf'), beta=float('inf'), is_maximizing=is_white)
        if chosen_move is None:
            chosen_move = random.choice(legal_moves)

    else: # "master" or default
        # Depth 4 minimax
        eval_score, chosen_move = minimax(board, depth=4, alpha=-float('inf'), beta=float('inf'), is_maximizing=is_white)
        if chosen_move is None:
            chosen_move = random.choice(legal_moves)

    san = board.san(chosen_move)
    uci = chosen_move.uci()
    from_sq = chess.square_name(chosen_move.from_square)
    to_sq = chess.square_name(chosen_move.to_square)
    promotion = chosen_move.promotion

    return {
        "move": {
            "from": from_sq,
            "to": to_sq,
            "promotion": chess.piece_symbol(promotion).lower() if promotion else None
        },
        "uci": uci,
        "san": san,
        "eval": round(eval_score / 100.0, 2) if is_white else round(-eval_score / 100.0, 2),
        "is_check": board.gives_check(chosen_move),
        "is_game_over": False
    }

def get_hint(fen: str) -> Dict[str, Any]:
    board = chess.Board(fen)
    if board.is_game_over():
        return {"hint": None, "description": "Game is already over."}

    is_white = board.turn == chess.WHITE
    eval_score, best_move = minimax(board, depth=3, alpha=-float('inf'), beta=float('inf'), is_maximizing=is_white)
    
    if not best_move:
        best_move = list(board.legal_moves)[0]

    san = board.san(best_move)
    from_sq = chess.square_name(best_move.from_square)
    to_sq = chess.square_name(best_move.to_square)
    piece = board.piece_at(best_move.from_square)
    piece_name = chess.piece_name(piece.piece_type).capitalize() if piece else "Piece"

    description = f"Play {piece_name} from {from_sq.upper()} to {to_sq.upper()} ({san})"
    if board.is_capture(best_move):
        captured = board.piece_at(best_move.to_square)
        cap_name = chess.piece_name(captured.piece_type).capitalize() if captured else "piece"
        description = f"Capture the {cap_name} on {to_sq.upper()} with your {piece_name} ({san})"
    elif board.gives_check(best_move):
        description = f"Deliver check with {piece_name} to {to_sq.upper()} ({san})!"

    return {
        "from": from_sq,
        "to": to_sq,
        "san": san,
        "description": description,
        "eval": round(eval_score / 100.0, 2) if is_white else round(-eval_score / 100.0, 2)
    }

# Tactical Puzzles database
CURATED_PUZZLES = [
    {
        "id": "puz_1",
        "title": "Scholar's Checkmate",
        "theme": "Checkmate in 1",
        "difficulty": "Easy",
        "rating": 800,
        "fen": "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4",
        "turn": "w",
        "solution_from": "f3",
        "solution_to": "f7",
        "solution_san": "Qxf7#",
        "hint": "Attack the weak f7 square defended only by the King!",
        "description": "Deliver a swift checkmate using Queen and Bishop battery."
    },
    {
        "id": "puz_2",
        "title": "Rook Back-Rank Mate",
        "theme": "Checkmate in 1",
        "difficulty": "Easy",
        "rating": 900,
        "fen": "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
        "turn": "w",
        "solution_from": "e1",
        "solution_to": "e8",
        "solution_san": "Re8#",
        "hint": "The black king is trapped behind its own pawns. Advance the rook!",
        "description": "Exploit the trapped king on the 8th rank."
    },
    {
        "id": "puz_3",
        "title": "Queen Smothered Attack",
        "theme": "Checkmate in 1",
        "difficulty": "Easy",
        "rating": 950,
        "fen": "r1b2rk1/pp3ppp/8/8/8/8/PPP2QPP/1K1R1B1R w - - 0 1",
        "turn": "w",
        "solution_from": "f2",
        "solution_to": "f7",
        "solution_san": "Qxf7+",
        "hint": "Smash into the f7 square with the Queen!",
        "description": "Penetrate the opponent's kingside defense."
    },
    {
        "id": "puz_4",
        "title": "Knight Royal Fork",
        "theme": "Tactics / Fork",
        "difficulty": "Medium",
        "rating": 1300,
        "fen": "r1bqkb1r/pp3ppp/2n5/2p1p3/3pP3/2NP1N2/PPP1BPPP/R2QK2R w KQkq - 0 8",
        "turn": "w",
        "solution_from": "c3",
        "solution_to": "d5",
        "solution_san": "Nd5",
        "hint": "Jump into the powerful center outpost with your Knight!",
        "description": "Establish a dominating knight on the central d5 outpost."
    },
    {
        "id": "puz_5",
        "title": "Bishop Skewer",
        "theme": "Tactics / Skewer",
        "difficulty": "Medium",
        "rating": 1400,
        "fen": "4k3/8/8/8/8/8/1B6/4K2r w - - 0 1",
        "turn": "w",
        "solution_from": "e1",
        "solution_to": "d2",
        "solution_san": "Kd2",
        "hint": "Step out of check while protecting key files.",
        "description": "Defend accurately under pressure."
    },
    {
        "id": "puz_6",
        "title": "Grandmaster Double Attack",
        "theme": "Endgame Tactics",
        "difficulty": "Hard",
        "rating": 1750,
        "fen": "8/8/5k2/8/8/2K5/1R6/8 w - - 0 1",
        "turn": "w",
        "solution_from": "b2",
        "solution_to": "f2",
        "solution_san": "Rf2+",
        "hint": "Check the king to cut off escape squares!",
        "description": "Execute precise rook cutting in an open board endgame."
    }
]