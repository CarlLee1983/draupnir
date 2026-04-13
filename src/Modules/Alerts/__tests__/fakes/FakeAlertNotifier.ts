import type { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import type {
  AlertPayload,
  DeliveryResult,
  IAlertNotifier,
} from '../../Domain/Services/IAlertNotifier'
import type { DeliveryChannel } from '../../Domain/ValueObjects/DeliveryStatus'

export class FakeAlertNotifier implements IAlertNotifier {
  readonly calls: AlertPayload[] = []
  private forcedResult?: DeliveryResult

  constructor(readonly channel: DeliveryChannel) {}

  async notify(payload: AlertPayload): Promise<DeliveryResult> {
    this.calls.push(payload)
    if (this.forcedResult) {
      return this.forcedResult
    }
    const successes = this.channel === 'email' ? payload.emails.length : 1
    return { channel: this.channel, successes, failures: 0 }
  }

  forceResult(r: DeliveryResult): void {
    this.forcedResult = r
  }

  forcePrimaryDelivery(d: AlertDelivery): void {
    this.forcedResult = { channel: this.channel, successes: 1, failures: 0, primaryDelivery: d }
  }

  reset(): void {
    this.calls.length = 0
    this.forcedResult = undefined
  }
}
