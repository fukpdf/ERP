/**
 * Foundational Module Contract & Manifest Types.
 */

export type ModuleCategory =
  | 'core_platform'
  | 'finance'
  | 'supply_chain'
  | 'sales_crm'
  | 'hr_payroll'
  | 'manufacturing'
  | 'projects'
  | 'analytics'
  | 'industry_vertical';

export type ModuleLifecycleState =
  | 'UNINSTALLED'
  | 'INSTALLED'
  | 'MIGRATED'
  | 'ACTIVE'
  | 'DISABLED'
  | 'DEPRECATED';

export interface ModuleDependency {
  readonly moduleId: string;
  readonly minVersion: string;
  readonly isOptional?: boolean;
}

export interface PermissionDeclaration {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  readonly riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ModuleManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly category: ModuleCategory;
  readonly dependencies: readonly ModuleDependency[];
  readonly permissions: readonly PermissionDeclaration[];
  readonly publishedEvents?: readonly string[];
  readonly subscribedEvents?: readonly string[];
  readonly loadPriority?: number;
}

export interface IModuleService {
  readonly manifest: ModuleManifest;
  initialize?(): Promise<void>;
  shutdown?(): Promise<void>;
}
