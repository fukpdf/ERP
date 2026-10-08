/**
 * Foundational Capability Contract & Manifest Types.
 */

export type CapabilityCategory =
  | 'foundational_core'
  | 'standard_operational'
  | 'advanced_enterprise'
  | 'jurisdiction_localization'
  | 'industry_vertical'
  | 'integration_connector';

export type LicenseTier = 'standard' | 'professional' | 'enterprise';

export type LoadProfileTier = 'A' | 'B' | 'C' | 'D' | 'E';

export type CapabilityLifecycleState =
  | 'DRAFT'
  | 'EXPERIMENTAL'
  | 'ACTIVE'
  | 'DEPRECATED'
  | 'RETIRED';

export interface CapabilityManifest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly moduleId: string;
  readonly category: CapabilityCategory;
  readonly minLoadProfile: LoadProfileTier;
  readonly licensingTier: LicenseTier;
  readonly requiredCapabilities?: readonly string[];
  readonly conflictingCapabilities?: readonly string[];
  readonly requiredPermissions?: readonly string[];
  readonly lifecycleState?: CapabilityLifecycleState;
}
