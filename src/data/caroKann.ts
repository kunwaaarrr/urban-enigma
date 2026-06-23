import type { Opening, Variation } from './types';

const advanceMain: Variation = {
  id: 'ck-advance-bf5',
  name: 'Advance: 3...Bf5 Main Line',
  eco: 'B12',
  side: 'b',
  preamble:
    'Against the Advance Variation, free your light-squared bishop BEFORE playing ...e6. That bishop is the whole point of the Caro-Kann.',
  line: [
    { san: 'e4' },
    {
      san: 'c6',
      explain: 'The Caro-Kann. The c-pawn supports the coming ...d5 strike at the center.',
      arrows: [{ from: 'd7', to: 'd5', color: 'orange' }, { from: 'c6', to: 'd5', color: 'green' }],
      badge: 'book',
    },
    { san: 'd4' },
    {
      san: 'd5',
      explain: 'Strike the center with full support. The e4 pawn is now attacked.',
      arrows: [{ from: 'd5', to: 'e4', color: 'red' }],
      badge: 'book',
    },
    { san: 'e5', explain: 'The Advance Variation. White grabs space and the d5/e5 chain locks the center.' },
    {
      san: 'Bf5',
      explain: 'The key move: develop the bishop OUTSIDE the pawn chain before ...e6 buries it. The e6 square is reserved for the pawn.',
      arrows: [{ from: 'c8', to: 'f5', color: 'green' }],
      highlights: [{ square: 'e6', color: 'blue' }],
      badge: 'best',
    },
    {
      san: 'Nf3',
      branches: [
        {
          name: '5.Bd3 bishop trade',
          line: [
            { san: 'Nf3' },
            {
              san: 'e6',
              explain: 'With the bishop out, lock in the chain. Your structure is rock solid.',
              arrows: [{ from: 'e7', to: 'e6', color: 'green' }],
              badge: 'book',
            },
            { san: 'Bd3', explain: 'White offers a trade of your best-placed piece for theirs.' },
            {
              san: 'Bxd3',
              explain: 'Take it. Trading light-squared bishops leaves White slightly worse on the light squares around e4 and c4.',
              arrows: [{ from: 'f5', to: 'd3', color: 'red' }],
              badge: 'best',
            },
            { san: 'Qxd3' },
            {
              san: 'c5',
              explain: 'Hit the base of the pawn chain. This is THE pawn break in the Advance Caro-Kann.',
              arrows: [{ from: 'c5', to: 'd4', color: 'red' }],
              highlights: [{ square: 'd4', color: 'red' }],
              badge: 'best',
            },
            { san: 'c3', explain: 'White reinforces d4.' },
            {
              san: 'Nc6',
              explain: 'Pile up on d4. Knight pressure plus the c5 pawn keeps White tied down.',
              arrows: [{ from: 'c6', to: 'd4', color: 'red' }],
              badge: 'book',
            },
            { san: 'O-O' },
            {
              san: 'Nge7',
              explain: 'The knight heads for f5 where it eyes d4 and e3. Development complete — you have zero weaknesses.',
              arrows: [{ from: 'e7', to: 'f5', color: 'orange' }],
              highlights: [{ square: 'd4', color: 'blue' }],
              badge: 'book',
            },
          ],
        },
      ],
    },
    {
      san: 'e6',
      explain: 'NOW ...e6 is fine — the bishop is already outside. Your pawn chain c6-d5-e6 is granite.',
      arrows: [{ from: 'e7', to: 'e6', color: 'green' }],
      badge: 'book',
    },
    { san: 'Be2' },
    {
      san: 'c5',
      explain: 'The thematic break: attack the base of White’s chain at d4.',
      arrows: [{ from: 'c5', to: 'd4', color: 'red' }],
      highlights: [{ square: 'd4', color: 'red' }],
      badge: 'best',
    },
    { san: 'Be3', explain: 'White defends d4 and keeps the tension.' },
    {
      san: 'cxd4',
      explain: 'Trade off and give White an isolated target later. Open the c-file for your rooks.',
      arrows: [{ from: 'c5', to: 'd4', color: 'red' }],
      badge: 'book',
    },
    { san: 'Nxd4' },
    {
      san: 'Ne7',
      explain: 'Develop around the e5 pawn. From e7 the knight can jump to c6 or g6.',
      arrows: [{ from: 'g8', to: 'e7', color: 'green' }, { from: 'e7', to: 'c6', color: 'orange' }],
      badge: 'book',
    },
    { san: 'O-O' },
    {
      san: 'Nbc6',
      explain: 'Challenge the strong d4 knight immediately.',
      arrows: [{ from: 'b8', to: 'c6', color: 'green' }, { from: 'c6', to: 'd4', color: 'red' }],
      badge: 'book',
    },
    { san: 'Nxc6' },
    {
      san: 'Nxc6',
      explain: 'Recapture. You are fully developed with the better structure — castle next and pressure e5.',
      arrows: [{ from: 'e7', to: 'c6', color: 'green' }, { from: 'c6', to: 'e5', color: 'red' }],
      badge: 'book',
    },
  ],
};

const advanceH4: Variation = {
  id: 'ck-advance-h4',
  name: 'Advance: 4.h4 Pawn Spike',
  eco: 'B12',
  side: 'b',
  preamble:
    'After 3...Bf5 White can lunge with h4-h5 trying to trap your bishop. One accurate move stops it cold.',
  line: [
    { san: 'e4' },
    { san: 'c6', explain: 'The Caro-Kann setup as always.', badge: 'book' },
    { san: 'd4' },
    { san: 'd5', badge: 'book', explain: 'The central strike.', arrows: [{ from: 'd5', to: 'e4', color: 'red' }] },
    { san: 'e5' },
    { san: 'Bf5', explain: 'Bishop out before ...e6, as always.', badge: 'book', arrows: [{ from: 'c8', to: 'f5', color: 'green' }] },
    { san: 'h4', explain: 'The spike! White threatens h5 followed by g4, smothering your bishop.' },
    {
      san: 'h5',
      explain: 'Stop h5 in its tracks. Your bishop keeps the f5–h7 escape route and the g4 square is now yours.',
      arrows: [{ from: 'h7', to: 'h5', color: 'green' }, { from: 'h4', to: 'h5', color: 'red' }],
      highlights: [{ square: 'g4', color: 'blue' }],
      badge: 'best',
    },
    { san: 'Bd3', explain: 'White wants to trade off your good bishop.' },
    {
      san: 'Bxd3',
      explain: 'Trade happily — White spent two tempi on h4/h5 squares that now mean nothing.',
      arrows: [{ from: 'f5', to: 'd3', color: 'red' }],
      badge: 'best',
    },
    { san: 'Qxd3' },
    {
      san: 'e6',
      explain: 'Solidify. The h4 pawn is a long-term weakness you can target later with ...Be7.',
      highlights: [{ square: 'h4', color: 'red' }],
      badge: 'book',
    },
    { san: 'Bg5', explain: 'Annoying — the bishop eyes your queen on d8.' },
    {
      san: 'Qb6',
      explain: 'Step out of the pin AND counterattack: the queen hits both b2 and d4.',
      arrows: [{ from: 'b6', to: 'b2', color: 'red' }, { from: 'b6', to: 'd4', color: 'red' }],
      badge: 'best',
    },
    { san: 'Nd2', explain: 'White defends b2 indirectly and develops.' },
    {
      san: 'Qa6',
      explain: 'The classic Caro-Kann queen offer! Trading queens kills every attacking idea White had with h4.',
      arrows: [{ from: 'a6', to: 'd3', color: 'red' }],
      badge: 'great',
    },
    { san: 'Qxa6' },
    {
      san: 'Nxa6',
      explain: 'Recapture and head into a comfortable endgame where h4 is weak and your structure is perfect.',
      arrows: [{ from: 'b8', to: 'a6', color: 'green' }],
      highlights: [{ square: 'h4', color: 'red' }],
      badge: 'book',
    },
  ],
};

const exchange: Variation = {
  id: 'ck-exchange',
  name: 'Exchange Variation',
  eco: 'B13',
  side: 'b',
  preamble:
    'White trades on d5 hoping for a quiet game. Develop actively — your bishop belongs on g4 and your queen covers everything from d7.',
  line: [
    { san: 'e4' },
    { san: 'c6', badge: 'book', explain: 'The Caro-Kann.' },
    { san: 'd4' },
    { san: 'd5', badge: 'book', explain: 'The strike.', arrows: [{ from: 'd5', to: 'e4', color: 'red' }] },
    { san: 'exd5', explain: 'The Exchange Variation — White releases the tension immediately.' },
    {
      san: 'cxd5',
      explain: 'Recapture toward the center. You now own a perfect symmetrical structure with easy development.',
      arrows: [{ from: 'c6', to: 'd5', color: 'green' }],
      badge: 'book',
    },
    { san: 'Bd3', explain: 'White grabs the b1–h7 diagonal before you can play ...Bf5.' },
    {
      san: 'Nc6',
      explain: 'Develop with pressure on d4.',
      arrows: [{ from: 'c6', to: 'd4', color: 'red' }],
      badge: 'book',
    },
    { san: 'c3', explain: 'White shores up d4.' },
    {
      san: 'Nf6',
      explain: 'Natural development toward e4.',
      arrows: [{ from: 'f6', to: 'e4', color: 'blue' }],
      badge: 'book',
    },
    { san: 'Bf4', explain: 'White takes the good diagonal and eyes c7.' },
    {
      san: 'Bg4',
      explain: 'Your bishop gets OUT before ...e6 — and there is no knight on f3 to block it. It provokes weaknesses.',
      arrows: [{ from: 'c8', to: 'g4', color: 'green' }, { from: 'g4', to: 'd1', color: 'red' }],
      badge: 'best',
    },
    { san: 'Qb3', explain: 'The critical try: White hits b7 and d5 at the same time.' },
    {
      san: 'Qd7',
      explain: 'One move defends both! The queen covers b7 along the 7th rank and d5 down the file.',
      arrows: [{ from: 'd7', to: 'b7', color: 'green' }, { from: 'd7', to: 'd5', color: 'green' }],
      badge: 'best',
    },
    { san: 'Nd2', explain: 'White develops, keeping f3 free of pins.' },
    {
      san: 'e6',
      explain: 'Solid. Your bishop is already outside the chain.',
      badge: 'book',
    },
    { san: 'Ngf3' },
    {
      san: 'Bd6',
      explain: 'Challenge the strong f4 bishop. Trading it removes White’s only active piece.',
      arrows: [{ from: 'd6', to: 'f4', color: 'red' }],
      badge: 'best',
    },
    { san: 'Bxd6' },
    {
      san: 'Qxd6',
      explain: 'Recapture and castle next. Equality at minimum — and you have the clearer plans on the c-file.',
      badge: 'book',
    },
    { san: 'O-O' },
    {
      san: 'O-O',
      explain: 'King safe. The plan: ...Rac8, ...Bxf3 at the right moment, and minority play with ...b5-b4.',
      arrows: [{ from: 'a8', to: 'c8', color: 'orange' }, { from: 'b7', to: 'b5', color: 'orange' }],
      badge: 'book',
    },
  ],
};

const classical: Variation = {
  id: 'ck-classical',
  name: 'Classical: 4...Bf5 Main Line',
  eco: 'B18',
  side: 'b',
  preamble:
    'The main line of the whole Caro-Kann. You will develop every piece to its best square and castle into total safety. Learn this one cold.',
  line: [
    { san: 'e4' },
    { san: 'c6', badge: 'book', explain: 'The Caro-Kann.' },
    { san: 'd4' },
    { san: 'd5', badge: 'book', explain: 'The strike at e4.', arrows: [{ from: 'd5', to: 'e4', color: 'red' }] },
    { san: 'Nc3', explain: 'White defends e4 with the knight — the Classical approach.' },
    {
      san: 'dxe4',
      explain: 'Take! You win the central tension and develop with tempo against the recapturing knight.',
      arrows: [{ from: 'd5', to: 'e4', color: 'red' }],
      badge: 'book',
    },
    { san: 'Nxe4' },
    {
      san: 'Bf5',
      explain: 'Develop with tempo — the bishop attacks the e4 knight.',
      arrows: [{ from: 'c8', to: 'f5', color: 'green' }, { from: 'f5', to: 'e4', color: 'red' }],
      badge: 'best',
    },
    { san: 'Ng3', explain: 'The knight hits back at your bishop.' },
    {
      san: 'Bg6',
      explain: 'The safest retreat — h7 stays available and the bishop keeps the key diagonal.',
      arrows: [{ from: 'f5', to: 'g6', color: 'green' }],
      badge: 'book',
    },
    { san: 'h4', explain: 'White gains space and threatens h5, trapping the bishop.' },
    {
      san: 'h6',
      explain: 'Make luft for the bishop: after h5 it tucks into h7, safe forever.',
      highlights: [{ square: 'h7', color: 'blue' }],
      arrows: [{ from: 'h4', to: 'h5', color: 'red' }],
      badge: 'book',
    },
    { san: 'Nf3' },
    {
      san: 'Nd7',
      explain: 'The Classical knight: it covers e5 and prepares ...Ngf6 without allowing doubled pawns.',
      arrows: [{ from: 'b8', to: 'd7', color: 'green' }, { from: 'd7', to: 'f6', color: 'orange' }],
      badge: 'book',
    },
    { san: 'h5', explain: 'White pushes anyway.' },
    {
      san: 'Bh7',
      explain: 'Exactly as planned — the bishop is untouchable on h7.',
      arrows: [{ from: 'g6', to: 'h7', color: 'green' }],
      badge: 'book',
    },
    { san: 'Bd3', explain: 'White offers the trade to free their position.' },
    {
      san: 'Bxd3',
      explain: 'Trade — White’s queen must recapture and you gain time for ...e6 and ...Ngf6.',
      arrows: [{ from: 'h7', to: 'd3', color: 'red' }],
      badge: 'book',
    },
    { san: 'Qxd3' },
    {
      san: 'e6',
      explain: 'Open the f8 bishop’s diagonal. Your position has no weaknesses at all.',
      badge: 'book',
    },
    { san: 'Bd2', explain: 'White prepares queenside castling.' },
    {
      san: 'Ngf6',
      explain: 'Finish development. Both knights are perfectly placed.',
      arrows: [{ from: 'g8', to: 'f6', color: 'green' }],
      badge: 'book',
    },
    { san: 'O-O-O', explain: 'Opposite-side castling — but White’s attack is far slower than it looks.' },
    {
      san: 'Be7',
      explain: 'Prepare ...O-O. The full Classical setup: this position has been defended by world champions for a century.',
      arrows: [{ from: 'f8', to: 'e7', color: 'green' }, { from: 'e8', to: 'g8', color: 'orange' }],
      badge: 'book',
    },
  ],
};

const classicalTrap: Variation = {
  id: 'ck-qe2-trap',
  name: '4...Nd7 & the Nd6 Mate Trap',
  eco: 'B17',
  side: 'b',
  preamble:
    'The 4...Nd7 Caro-Kann is solid — but it hides the most famous trap in the whole opening. One wrong knight and you are CHECKMATED in 6 moves. Learn to dodge it.',
  line: [
    { san: 'e4' },
    { san: 'c6', badge: 'book', explain: 'The Caro-Kann.' },
    { san: 'd4' },
    { san: 'd5', badge: 'book', explain: 'The strike.', arrows: [{ from: 'd5', to: 'e4', color: 'red' }] },
    { san: 'Nc3' },
    { san: 'dxe4', badge: 'book', explain: 'Capture as usual.', arrows: [{ from: 'd5', to: 'e4', color: 'red' }] },
    { san: 'Nxe4' },
    {
      san: 'Nd7',
      explain: 'The Karpov move: prepare ...Ngf6 so that after a trade on f6 you recapture with the knight, keeping a clean structure.',
      arrows: [{ from: 'b8', to: 'd7', color: 'green' }, { from: 'g8', to: 'f6', color: 'orange' }],
      badge: 'book',
    },
    {
      san: 'Qe2',
      explain:
        'DANGER! The trap is set. The queen secretly pins your e7 pawn to the king. If you play the natural 5...Ngf6?? White plays 6.Nd6 CHECKMATE — the e7 pawn is pinned and cannot capture!',
      arrows: [{ from: 'e2', to: 'e8', color: 'red' }, { from: 'e4', to: 'd6', color: 'red' }],
      highlights: [{ square: 'd6', color: 'red' }, { square: 'e7', color: 'yellow' }],
    },
    {
      san: 'Ndf6',
      explain:
        'The OTHER knight! 5...Ndf6 attacks the e4 knight and keeps d6 covered. (5...Ngf6?? 6.Nd6# is mate — the pinned e7 pawn can’t take.)',
      arrows: [{ from: 'd7', to: 'f6', color: 'green' }, { from: 'f6', to: 'e4', color: 'red' }],
      badge: 'great',
    },
    { san: 'Nxf6+' },
    {
      san: 'Nxf6',
      explain: 'Recapture with the g8 knight — exactly why 5...Ndf6 was right. Structure intact, danger over.',
      arrows: [{ from: 'g8', to: 'f6', color: 'green' }],
      badge: 'book',
    },
    { san: 'Nf3' },
    {
      san: 'Bg4',
      explain: 'Develop the bishop actively with a pin before ...e6.',
      arrows: [{ from: 'c8', to: 'g4', color: 'green' }, { from: 'g4', to: 'f3', color: 'red' }],
      badge: 'book',
    },
    { san: 'c3' },
    {
      san: 'e6',
      explain: 'Solid as ever. Develop ...Bd6 or ...Be7 next and castle. Trap dodged, game equal.',
      badge: 'book',
    },
  ],
};

const panov: Variation = {
  id: 'ck-panov',
  name: 'Panov-Botvinnik Attack',
  eco: 'B14',
  side: 'b',
  preamble:
    'White goes for an isolated-queen-pawn game with c4. Pin, trade, and castle — the IQP becomes a weakness in every endgame.',
  line: [
    { san: 'e4' },
    { san: 'c6', badge: 'book', explain: 'The Caro-Kann.' },
    { san: 'd4' },
    { san: 'd5', badge: 'book', explain: 'The strike.', arrows: [{ from: 'd5', to: 'e4', color: 'red' }] },
    { san: 'exd5' },
    { san: 'cxd5', badge: 'book', explain: 'Recapture toward the center.' },
    { san: 'c4', explain: 'The Panov-Botvinnik Attack — White accepts an isolated d-pawn for piece activity.' },
    {
      san: 'Nf6',
      explain: 'Develop and defend d5.',
      arrows: [{ from: 'f6', to: 'd5', color: 'green' }],
      badge: 'book',
    },
    { san: 'Nc3', explain: 'More pressure on d5.' },
    {
      san: 'e6',
      explain: 'Reinforce d5 again. (Here the bishop stays home — concrete play matters more than the usual rule.)',
      arrows: [{ from: 'e6', to: 'd5', color: 'green' }],
      badge: 'book',
    },
    { san: 'Nf3' },
    {
      san: 'Bb4',
      explain: 'Pin the c3 knight — the main attacker of d5 is frozen.',
      arrows: [{ from: 'b4', to: 'c3', color: 'red' }, { from: 'c3', to: 'e1', color: 'yellow' }],
      badge: 'best',
    },
    { san: 'cxd5', explain: 'White trades, leaving themselves the isolated d4 pawn.' },
    {
      san: 'Nxd5',
      explain: 'Recapture with the knight — it lands on the best blockading square in front of the isolani.',
      arrows: [{ from: 'f6', to: 'd5', color: 'green' }],
      highlights: [{ square: 'd4', color: 'red' }],
      badge: 'best',
      also: ['exd5'],
    },
    { san: 'Bd2', explain: 'White breaks the pin.' },
    {
      san: 'Nc6',
      explain: 'Develop with pressure on d4 — the isolani needs constant babysitting.',
      arrows: [{ from: 'c6', to: 'd4', color: 'red' }],
      badge: 'book',
    },
    { san: 'Bd3' },
    {
      san: 'O-O',
      explain: 'King to safety. Strategy from here: trade pieces, blockade d5, win the d4 pawn in the endgame.',
      highlights: [{ square: 'd4', color: 'red' }, { square: 'd5', color: 'blue' }],
      badge: 'book',
    },
  ],
};

const fantasy: Variation = {
  id: 'ck-fantasy',
  name: 'Fantasy Variation (3.f3)',
  eco: 'B12',
  side: 'b',
  preamble:
    'The tricky 3.f3 tries to build a huge center. Take, strike back with ...e5, and remember the Bxf7 trick White is praying for.',
  line: [
    { san: 'e4' },
    { san: 'c6', badge: 'book', explain: 'The Caro-Kann.' },
    { san: 'd4' },
    { san: 'd5', badge: 'book', explain: 'The strike.', arrows: [{ from: 'd5', to: 'e4', color: 'red' }] },
    { san: 'f3', explain: 'The Fantasy Variation — White wants to recapture on e4 with the f-pawn and own the center.' },
    {
      san: 'dxe4',
      explain: 'Take anyway. You will hit back in the center immediately.',
      badge: 'book',
    },
    {
      san: 'fxe4',
      branches: [
        {
          name: '4.dxe5?? queen trade punishment',
          line: [
            { san: 'fxe4' },
            {
              san: 'e5',
              explain: 'The counterstrike! White’s center looks big but d4 is now under fire.',
              arrows: [{ from: 'e5', to: 'd4', color: 'red' }],
              badge: 'best',
            },
            { san: 'dxe5', explain: 'White grabs the pawn — a serious mistake.' },
            {
              san: 'Qxd1+',
              explain: 'Trade queens with CHECK. White loses castling rights forever.',
              arrows: [{ from: 'd8', to: 'd1', color: 'red' }],
              badge: 'best',
            },
            { san: 'Kxd1', explain: 'The king is stuck in the center for the rest of the game.' },
            {
              san: 'Nd7',
              explain: 'Attack e5 — you regain the pawn with a clearly better endgame: White’s king is misplaced and e4 is weak.',
              arrows: [{ from: 'd7', to: 'e5', color: 'red' }],
              highlights: [{ square: 'e4', color: 'red' }, { square: 'd1', color: 'red' }],
              badge: 'great',
            },
          ],
        },
      ],
    },
    {
      san: 'e5',
      explain: 'The counterstrike! Hit d4 before White finishes the dream center.',
      arrows: [{ from: 'e5', to: 'd4', color: 'red' }],
      badge: 'best',
    },
    { san: 'Nf3', explain: 'White defends d4 and develops.' },
    {
      san: 'Bg4',
      explain: 'Pin the defender of d4 and e5.',
      arrows: [{ from: 'g4', to: 'f3', color: 'red' }, { from: 'f3', to: 'd1', color: 'yellow' }],
      badge: 'best',
    },
    { san: 'Bc4', explain: 'WARNING: White aims at f7 and prays you grab the pawn. 6...exd4?? loses to 7.Bxf7+! Kxf7 8.Ne5+ forking king and bishop.' },
    {
      san: 'Nd7',
      explain: 'Calm development — it defends e5, covers the Ne5 trick, and keeps every threat under control. Do NOT take d4 yet.',
      arrows: [{ from: 'b8', to: 'd7', color: 'green' }, { from: 'c4', to: 'f7', color: 'red' }],
      highlights: [{ square: 'f7', color: 'yellow' }],
      badge: 'great',
    },
    { san: 'O-O' },
    {
      san: 'Ngf6',
      explain: 'Develop. Your grip on e5 and the f3 pin give you completely equal, easy play.',
      arrows: [{ from: 'g8', to: 'f6', color: 'green' }],
      badge: 'book',
    },
  ],
};

const twoKnights: Variation = {
  id: 'ck-two-knights',
  name: 'Two Knights (2.Nc3 & 3.Nf3)',
  eco: 'B11',
  side: 'b',
  preamble:
    'White develops both knights fast. Pin, trade on f3, and build the same granite structure — their doubled-pawn-free position has no bite.',
  line: [
    { san: 'e4' },
    { san: 'c6', badge: 'book', explain: 'The Caro-Kann.' },
    { san: 'Nc3' },
    {
      san: 'd5',
      explain: 'Strike the center as always — the knight on c3 cannot recapture into a good structure.',
      arrows: [{ from: 'd5', to: 'e4', color: 'red' }],
      badge: 'book',
    },
    { san: 'Nf3', explain: 'The Two Knights — White keeps the tension.' },
    {
      san: 'Bg4',
      explain: 'Pin the f3 knight — it is the only piece supporting an eventual e5 or d4.',
      arrows: [{ from: 'c8', to: 'g4', color: 'green' }, { from: 'g4', to: 'f3', color: 'red' }],
      badge: 'best',
    },
    { san: 'h3', explain: 'The critical question to your bishop.' },
    {
      san: 'Bxf3',
      explain: 'Take! Giving up the bishop pair is fine: White’s queen gets dragged to f3 where it bites on granite.',
      arrows: [{ from: 'g4', to: 'f3', color: 'red' }],
      badge: 'best',
    },
    { san: 'Qxf3' },
    {
      san: 'e6',
      explain: 'Quiet strength. White’s queen stares at your c6/d5/e6 wall with nothing to do.',
      badge: 'book',
    },
    { san: 'd3', explain: 'White keeps the center modest.' },
    {
      san: 'Nf6',
      explain: 'Develop naturally.',
      arrows: [{ from: 'g8', to: 'f6', color: 'green' }],
      badge: 'book',
    },
    { san: 'Be2' },
    {
      san: 'Bb4',
      explain: 'Active development: pin the c3 knight and prepare to castle.',
      arrows: [{ from: 'b4', to: 'c3', color: 'red' }],
      badge: 'book',
    },
    { san: 'O-O' },
    {
      san: 'O-O',
      explain: 'King safe.',
      badge: 'book',
    },
    { san: 'Bd2' },
    {
      san: 'd4',
      explain: 'Gain space with tempo — the c3 knight must retreat to a passive square.',
      arrows: [{ from: 'd4', to: 'c3', color: 'red' }],
      badge: 'best',
    },
    { san: 'Nb1', explain: 'All the way home — but now the d2 bishop stares at yours.' },
    {
      san: 'Bxd2',
      explain: 'Trade before the bishop is taken for free.',
      arrows: [{ from: 'b4', to: 'd2', color: 'red' }],
      badge: 'book',
    },
    { san: 'Nxd2' },
    {
      san: 'e5',
      explain: 'A beautiful space-grabbing chain. You’ve equalized and then some — play ...c5, ...Nc6 and enjoy.',
      arrows: [{ from: 'c6', to: 'c5', color: 'orange' }],
      badge: 'great',
    },
  ],
};

const accelPanov: Variation = {
  id: 'ck-accel-panov',
  name: 'Accelerated Panov (2.c4)',
  eco: 'B10',
  side: 'b',
  preamble:
    'White plays c4 on move two. Trade twice, recapture with the knight, and develop with simple pressure on d4.',
  line: [
    { san: 'e4' },
    { san: 'c6', badge: 'book', explain: 'The Caro-Kann.' },
    { san: 'c4', explain: 'The Accelerated Panov.' },
    {
      san: 'd5',
      explain: 'Strike anyway! Both white pawns are now under tension.',
      arrows: [{ from: 'd5', to: 'e4', color: 'red' }, { from: 'd5', to: 'c4', color: 'red' }],
      badge: 'book',
    },
    { san: 'exd5' },
    { san: 'cxd5', badge: 'book', explain: 'Recapture with the c-pawn first.' },
    { san: 'cxd5', explain: 'White wins the d5 pawn — temporarily.' },
    {
      san: 'Nf6',
      explain: 'Develop with tempo: the knight will collect d5 at its leisure.',
      arrows: [{ from: 'f6', to: 'd5', color: 'red' }],
      badge: 'book',
    },
    { san: 'Nc3', explain: 'White defends d5 for now.' },
    {
      san: 'Nxd5',
      explain: 'Pawn regained. Material equal, and your pieces flow naturally.',
      arrows: [{ from: 'f6', to: 'd5', color: 'green' }],
      badge: 'book',
    },
    { san: 'Nf3' },
    {
      san: 'Nc6',
      explain: 'Develop and restrain d4.',
      arrows: [{ from: 'c6', to: 'd4', color: 'blue' }],
      badge: 'book',
    },
    { san: 'd4', explain: 'White claims the center — and accepts the isolated pawn.' },
    {
      san: 'Bg4',
      explain: 'Pin the defender of d4. The isolani is already creaking.',
      arrows: [{ from: 'c8', to: 'g4', color: 'green' }, { from: 'g4', to: 'f3', color: 'red' }],
      highlights: [{ square: 'd4', color: 'red' }],
      badge: 'best',
    },
    { san: 'Be2' },
    {
      san: 'e6',
      explain: 'Solidify and free the dark-squared bishop.',
      badge: 'book',
    },
    { san: 'O-O' },
    {
      san: 'Be7',
      explain: 'Castle next. Standard anti-IQP play: blockade d5, trade minor pieces, target d4 forever.',
      arrows: [{ from: 'f8', to: 'e7', color: 'green' }, { from: 'e8', to: 'g8', color: 'orange' }],
      badge: 'book',
    },
  ],
};

// ---------------------------------------------------------------------------
// Middlegame guides (shown on the "line complete" screen for select lines).
// ---------------------------------------------------------------------------

advanceMain.middlegame = {
  intro:
    "You've solved the Caro-Kann's eternal problem — the light-squared bishop is active on f5, outside the pawn chain. Now finish developing and play against White's e5 spearhead and on the queenside.",
  plans: [
    {
      name: 'Finish developing & castle',
      idea: 'Drop the dark-squared bishop on e7 and castle. Your pieces are harmonious and White has no real attack — get the king safe first.',
      arrows: [
        { from: 'f8', to: 'e7', color: 'green' },
        { from: 'e8', to: 'g8', color: 'green' },
      ],
      sample: ['Nd2', 'Be7', 'Nb3', 'O-O'],
    },
    {
      name: 'Pressure b2 with …Qb6',
      idea: 'The queen swings to b6, hitting b2 and eyeing the queenside. With …Rc8 to follow it hands you the initiative on that wing.',
      arrows: [
        { from: 'd8', to: 'b6', color: 'orange' },
        { from: 'a8', to: 'c8', color: 'orange' },
      ],
      highlights: [{ square: 'b2', color: 'red' }],
      sample: ['Nd2', 'Qb6'],
    },
    {
      name: 'Undermine e5 with …f6',
      idea: 'Once castled, …f6 challenges the e5 pawn that cramps you. Opening the f-file suits your active pieces.',
      arrows: [{ from: 'f7', to: 'f6', color: 'orange' }],
      highlights: [{ square: 'e5', color: 'yellow' }],
    },
  ],
};

exchange.middlegame = {
  intro:
    'A Carlsbad structure with the dark-squared bishops traded off. The position is balanced and easy to play — fight for the only open file (the c-file) and good squares for your knights.',
  plans: [
    {
      name: 'Seize the c-file',
      idea: 'The c-file is the only open one. Put a rook on c8 and pressure c3/c2; doubling rooks gives you the more pleasant game.',
      arrows: [{ from: 'a8', to: 'c8', color: 'orange' }],
      highlights: [{ square: 'c3', color: 'yellow' }],
      sample: ['Rae1', 'Rac8'],
    },
    {
      name: 'Knight to the e4 outpost',
      idea: '…Ne4 plants a knight in the heart of White’s camp — supported and hard to evict. From e4 it eyes c3, d2 and f2.',
      arrows: [{ from: 'f6', to: 'e4', color: 'green' }],
      highlights: [{ square: 'e4', color: 'blue' }],
      sample: ['Rae1', 'Ne4'],
    },
    {
      name: 'Trade light bishops on f3',
      idea: 'If White’s knight is the best defender of the light squares, …Bxf3 removes it and leaves you a sound, symmetrical structure to grind.',
      arrows: [{ from: 'g4', to: 'f3', color: 'orange' }],
    },
  ],
};

panov.middlegame = {
  intro:
    'White has accepted an isolated queen’s pawn (IQP) on d4. Your strategy is classic: blockade the pawn on d5, trade pieces, and target d4 — in the endgame the isolani is simply weak.',
  plans: [
    {
      name: 'Blockade on d5',
      idea: 'Your knight on d5 is the perfect blockader. Keep a piece anchored there; with the d-pawn frozen it becomes a permanent target.',
      highlights: [
        { square: 'd5', color: 'blue' },
        { square: 'd4', color: 'red' },
      ],
    },
    {
      name: 'Damage the structure with …Bxc3',
      idea: 'Trading on c3 saddles White with doubled c-pawns. You give up the bishop pair but gain a long-term structural target.',
      arrows: [{ from: 'b4', to: 'c3', color: 'orange' }],
      sample: ['a3', 'Bxc3', 'bxc3'],
    },
    {
      name: 'Solve your last piece: …b6 & …Bb7',
      idea: 'The c8 bishop is your only passive piece. …b6 and …Bb7 develops it to the long diagonal, adding a third attacker against d4.',
      arrows: [
        { from: 'b7', to: 'b6', color: 'orange' },
        { from: 'c8', to: 'b7', color: 'green' },
      ],
      sample: ['O-O', 'b6'],
    },
  ],
};

export const caroKann: Opening = {
  id: 'caro-kann',
  name: 'Caro-Kann Defense',
  side: 'b',
  tagline: 'Rock-solid defense to 1.e4 — you play Black',
  variations: [advanceMain, advanceH4, exchange, classical, classicalTrap, panov, fantasy, twoKnights, accelPanov],
};
