/**
 * Port interface for key hashing operations.
 * Infrastructure provides the actual hashing implementation.
 */
export interface IKeyHashingService {
  hash(rawKey: string): Promise<string>
}
