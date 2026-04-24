/**
 * Base DTO (Data Transfer Object)
 *
 * DTOs are used to transfer data between layers without containing business logic.
 * As an egress DTO for the application layer, it is consumed by the Presentation layer
 * and converted into API responses.
 *
 * DTOs inheriting from this class should maintain readonly properties to ensure
 * data consistency during transfer.
 */
export class BaseDTO {
  /**
   * Converts the DTO to a plain JSON object for API response serialization.
   *
   * The default implementation performs a shallow copy of all instance properties.
   * Subclasses can override this method for complex transformation logic (e.g.,
   * handling nested objects or date formatting).
   *
   * @returns {Record<string, any>} A plain object containing the DTO data.
   */
  
// biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
toJSON(): Record<string, any> {
    return { ...this }
  }
}
