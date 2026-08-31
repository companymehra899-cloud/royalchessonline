# Royal Chess Online — Living Spec

- Expo React Native Web chess app with FastAPI and MongoDB.
- Auth: email/password, guest, and direct Google OAuth authorization-code exchange. Google requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; production domain is pending.
- Chess: computer, local friend, online rooms, puzzles, standard chess.js move validation, promotion, timers, undo, and game records.
- Board: selectable Brown/White and Green/White themes. No selection, legal-move, capture, hint, or last-move overlays during normal matches.
- Pieces: transparent photo-style ivory/ebony Staunton assets rendered by `ChessPiece.tsx`; King/Queen are 20% wider, Bishop 10% wider, and Pawns are compact.
- Preview OAuth callback currently resolves to the login page root: `https://staunton-pieces.preview.emergentagent.com/`.