import { EngineError } from './errors';

export const CAPABILITIES = ['listObjects', 'listSubjects', 'filterQuery', 'explain'] as const;

/** Capability flag identifiers supported by acx engines. */
export type Capability = (typeof CAPABILITIES)[number];

/** A capability map indicating which optional features are supported. */
export type CapabilitySet = Partial<Record<Capability, true>>;

/** Returns true when a capability is available. */
export function hasCapability(
  capabilities: CapabilitySet | undefined,
  capability: Capability,
): boolean {
  return Boolean(capabilities && capabilities[capability]);
}

/** Throws when a required capability is not supported. */
export function assertCapability(
  capabilities: CapabilitySet | undefined,
  capability: Capability,
): void {
  if (!hasCapability(capabilities, capability)) {
    throw new EngineError(`Engine capability not supported: ${capability}`, { capability });
  }
}
