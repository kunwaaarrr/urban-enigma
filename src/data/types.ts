export type ArrowColor = 'orange' | 'red' | 'green' | 'blue' | 'yellow';

export interface Arrow {
  from: string;
  to: string;
  color: ArrowColor;
}

export interface Highlight {
  square: string;
  color: ArrowColor;
}

export type Badge = 'book' | 'best' | 'great' | 'brilliant' | 'mistake' | 'idea';

export interface Step {
  /** SAN of the move played at this ply. */
  san: string;
  /**
   * Coach text. For user steps it is shown BEFORE the move in Learn mode
   * (with the arrows); for opponent steps it is shown after the move plays.
   */
  explain?: string;
  arrows?: Arrow[];
  highlights?: Highlight[];
  badge?: Badge;
  /** Alternative user moves (SAN) also accepted as correct. */
  also?: string[];
  /**
   * Opponent alternatives: the tree forks here. This step's own san plus the
   * remaining steps form the main branch; each entry replaces this step and
   * everything after it.
   */
  branches?: BranchAlt[];
}

export interface BranchAlt {
  /** Short label, e.g. "4.h4 — the pawn spike". */
  name: string;
  /** Drill random-pick weight (main branch has weight 2 by default). */
  weight?: number;
  line: Step[];
}

/** One typical middlegame plan shown after a line is complete. */
export interface MgPlan {
  /** Short label, e.g. "Minority attack" or "f5 break". */
  name: string;
  /** What the plan is and when to use it. */
  idea: string;
  /** Pawn breaks / piece routes drawn on the line's final position. */
  arrows?: Arrow[];
  highlights?: Highlight[];
  /** Optional SAN continuation FROM the line's final position, to play out. */
  sample?: string[];
}

/** "Where to go from here" guide attached to select variations. */
export interface MgGuide {
  intro?: string;
  plans: MgPlan[];
}

export interface Variation {
  id: string;
  name: string;
  eco: string;
  /** Side the USER plays. */
  side: 'w' | 'b';
  /** Intro banner shown before the first move. */
  preamble?: string;
  line: Step[];
  /** Optional middlegame guide shown on the complete screen (only some lines). */
  middlegame?: MgGuide;
}

export interface Opening {
  id: string;
  name: string;
  side: 'w' | 'b';
  tagline: string;
  variations: Variation[];
}

/** A fully resolved root-to-leaf path, ready to train. */
export interface ResolvedPly {
  san: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
  moveNumber: number;
  color: 'w' | 'b';
  explain?: string;
  arrows?: Arrow[];
  highlights?: Highlight[];
  badge?: Badge;
  also?: string[];
}

export interface PlayableLine {
  /** `<variationId>` or `<variationId>#<branch path>` */
  id: string;
  variationId: string;
  openingId: string;
  name: string;
  branchName?: string;
  eco: string;
  side: 'w' | 'b';
  preamble?: string;
  plies: ResolvedPly[];
  weight: number;
  /** Copied from the source variation; shown on the complete screen. */
  middlegame?: MgGuide;
}

/** A resolved sample-continuation move, for the middlegame step-through. */
export interface SamplePly {
  san: string;
  from: string;
  to: string;
  fenAfter: string;
}
