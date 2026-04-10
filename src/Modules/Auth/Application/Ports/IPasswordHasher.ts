export interface IPasswordHasher {
  hash(plainPassword: string): Promise<string>
  verify(hashedPassword: string, plainPassword: string): Promise<boolean>
}
