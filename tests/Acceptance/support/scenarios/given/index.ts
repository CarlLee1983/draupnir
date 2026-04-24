import type { ScenarioRunner } from '../runner'
import { type ActiveApiKeyOptions, activeApiKeyStep } from './activeApiKey'
import { type AdminOptions, adminStep } from './admin'
import { coreAppModulesProvisionedStep } from './coreAppModulesProvisioned'
import { type CreditAccountOptions, creditAccountStep } from './creditAccount'
import { type MemberOptions, memberStep } from './member'
import { type OrganizationOptions, organizationStep } from './organization'
import { type SuspendedApiKeyOptions, suspendedApiKeyStep } from './suspendedApiKey'
import { type UsageRecordsOptions, usageRecordsStep } from './usageRecords'

export interface GivenNamespace {
  organization(id: string, opts?: OrganizationOptions): ScenarioRunner
  admin(opts: AdminOptions): ScenarioRunner
  member(opts: MemberOptions): ScenarioRunner
  creditAccount(opts: CreditAccountOptions): ScenarioRunner
  activeApiKey(opts: ActiveApiKeyOptions): ScenarioRunner
  suspendedApiKey(opts: SuspendedApiKeyOptions): ScenarioRunner
  coreAppModulesProvisioned(orgId: string): ScenarioRunner
  usageRecords(opts: UsageRecordsOptions): ScenarioRunner
}

export function defineGiven(builder: ScenarioRunner): GivenNamespace {
  return {
    organization: (id, opts) => organizationStep(builder, id, opts),
    admin: (opts) => adminStep(builder, opts),
    member: (opts) => memberStep(builder, opts),
    creditAccount: (opts) => creditAccountStep(builder, opts),
    activeApiKey: (opts) => activeApiKeyStep(builder, opts),
    suspendedApiKey: (opts) => suspendedApiKeyStep(builder, opts),
    coreAppModulesProvisioned: (orgId) => coreAppModulesProvisionedStep(builder, orgId),
    usageRecords: (opts) => usageRecordsStep(builder, opts),
  }
}
