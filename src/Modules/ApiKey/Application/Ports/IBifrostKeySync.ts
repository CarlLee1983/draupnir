import type { KeyScope } from '../../Domain/ValueObjects/KeyScope'

export interface CreateVirtualKeyResult {
  gatewayKeyId: string
  gatewayKeyValue: string
}

export interface IBifrostKeySync {
  createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult>
  syncPermissions(gatewayKeyId: string, scope: KeyScope): Promise<void>
  deactivateVirtualKey(gatewayKeyId: string): Promise<void>
  deleteVirtualKey(gatewayKeyId: string): Promise<void>
}
