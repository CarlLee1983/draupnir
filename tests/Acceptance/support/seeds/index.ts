import type { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import {
  type SeedAppModuleInput,
  type SeedAppModuleResult,
  seedAllCoreAppModules,
  seedAppModule,
} from './appModule'
import { type SeedApiKeyInput, type SeedApiKeyResult, seedApiKey } from './apiKey'
import {
  type SeedCreditAccountInput,
  type SeedCreditAccountResult,
  seedCreditAccount,
} from './creditAccount'
import { type SeedContractInput, type SeedContractResult, seedContract } from './contract'
import {
  type SeedModuleSubscriptionInput,
  type SeedModuleSubscriptionResult,
  seedModuleSubscription,
} from './moduleSubscription'
import { type SeedOrgMemberInput, type SeedOrgMemberResult, seedOrgMember } from './orgMember'
import {
  type SeedOrganizationInput,
  type SeedOrganizationResult,
  seedOrganization,
} from './organization'
import {
  type SeedUsageRecordInput,
  type SeedUsageRecordResult,
  seedUsageRecord,
} from './usageRecord'
import { type SeedUserInput, type SeedUserResult, seedUser } from './user'

export class TestSeed {
  constructor(
    private readonly getDb: () => IDatabaseAccess,
    private readonly gateway: MockGatewayClient,
  ) {}

  user(input: SeedUserInput): Promise<SeedUserResult> {
    return seedUser(this.getDb(), input)
  }

  organization(input: SeedOrganizationInput): Promise<SeedOrganizationResult> {
    return seedOrganization(this.getDb(), input)
  }

  orgMember(input: SeedOrgMemberInput): Promise<SeedOrgMemberResult> {
    return seedOrgMember(this.getDb(), input)
  }

  creditAccount(input: SeedCreditAccountInput): Promise<SeedCreditAccountResult> {
    return seedCreditAccount(this.getDb(), input)
  }

  contract(input: SeedContractInput): Promise<SeedContractResult> {
    return seedContract(this.getDb(), input)
  }

  apiKey(input: SeedApiKeyInput): Promise<SeedApiKeyResult> {
    return seedApiKey(this.getDb(), this.gateway, input)
  }

  appModule(input: SeedAppModuleInput): Promise<SeedAppModuleResult> {
    return seedAppModule(this.getDb(), input)
  }

  allCoreAppModules(): Promise<readonly SeedAppModuleResult[]> {
    return seedAllCoreAppModules(this.getDb())
  }

  moduleSubscription(input: SeedModuleSubscriptionInput): Promise<SeedModuleSubscriptionResult> {
    return seedModuleSubscription(this.getDb(), input)
  }

  usageRecord(input: SeedUsageRecordInput): Promise<SeedUsageRecordResult> {
    return seedUsageRecord(this.getDb(), input)
  }
}
