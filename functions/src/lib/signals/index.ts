/**
 * Signals module — Industry Pulse
 */

// Legacy signal computation (kept for backward compatibility with getPulseSignals)
export {
  computeSignals,
  canonicalize,
  dateRange,
  type SignalItem,
  type SignalsResult,
  type BriefTopicsInput,
} from "./compute-signals.js";

// Topic normalization
export {
  canonicalTopicKey,
  pickDisplayName,
} from "./topic-normalization.js";

// Topic classification
export {
  classifyTopic,
  type TopicType,
} from "./topic-classification.js";

// Deterministic pulse snapshot computation
export {
  computePulseSnapshot,
  type BriefInput,
  type PulseTopic,
  type PulseSnapshot,
} from "./compute-pulse.js";
