import type { MgGuide } from '../data/types';

interface Props {
  guide: MgGuide;
  /** Index of the open plan, or null for the summary view. */
  activePlan: number | null;
  onSelectPlan: (i: number | null) => void;
  /** Length of the active plan's resolved sample (0 = none). */
  sampleLength: number;
  /** Current step into the sample (0 = the line's final position). */
  step: number;
  onStepBack: () => void;
  onStepForward: () => void;
}

/**
 * "Plans from here" panel shown on the complete screen: tappable plan chips,
 * plus a step-through for the selected plan's sample continuation.
 */
export function MiddlegameControls({
  guide,
  activePlan,
  onSelectPlan,
  sampleLength,
  step,
  onStepBack,
  onStepForward,
}: Props) {
  return (
    <div class="mg">
      <div class="mg-head">Plans from here</div>
      <div class="mg-plans">
        {guide.plans.map((p, i) => (
          <button
            key={i}
            class={`mg-chip ${activePlan === i ? 'active' : ''}`}
            onClick={() => onSelectPlan(activePlan === i ? null : i)}
          >
            {p.name}
          </button>
        ))}
      </div>
      {activePlan !== null && sampleLength > 0 && (
        <div class="mg-steps">
          <button class="chev" onClick={onStepBack} disabled={step === 0} aria-label="Previous sample move">
            ‹
          </button>
          <span class="mg-stepinfo">
            {step === 0 ? 'Final position — step through a sample ›' : `Sample move ${step} / ${sampleLength}`}
          </span>
          <button class="chev" onClick={onStepForward} disabled={step >= sampleLength} aria-label="Next sample move">
            ›
          </button>
        </div>
      )}
    </div>
  );
}
