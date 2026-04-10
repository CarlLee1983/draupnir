export interface CreateVirtualKeyResult {
  gatewayKeyId: string
  gatewayKeyValue: string
}

export interface IAppKeyBifrostSync {
  createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult>
  deactivateVirtualKey(gatewayKeyId: string): Promise<void>
  deleteVirtualKey(gatewayKeyId: string): Promise<void>
}
