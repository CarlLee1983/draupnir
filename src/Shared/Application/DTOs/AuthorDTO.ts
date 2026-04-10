/**
 * Author Information DTO (Cross-Domain Shared)
 *
 * Purpose:
 * - Author information may be required across multiple domains (Post, Review, Order, etc.)
 * - Unified definition of author data structure to avoid duplication
 *
 * Location: Shared Layer (not specific to any single domain)
 * Dependency Direction: Domain -> Shared (No reverse dependency)
 */
export interface AuthorDTO {
  id: string
  name: string
  email: string
}
