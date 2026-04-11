// src/Modules/Auth/Presentation/Requests/VerifyDeviceRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/**
 * Validates and parses the request body for device-verification submissions.
 */
export class VerifyDeviceRequest extends FormRequest {
  /**
   * Zod validation schema for the verify-device request.
   */
  schema = z.object({
    /** The user code displayed on the CLI device. */
    userCode: z.string().min(1, 'User code is required'),
  })
}

/** Type definition for the validated verify-device parameters. */
export type VerifyDeviceParams = z.infer<VerifyDeviceRequest['schema']>
