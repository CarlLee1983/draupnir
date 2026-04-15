import { randomBytes, scryptSync } from 'node:crypto'

function hash(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(plainPassword, salt, 64)
  return `${salt}:${derivedKey.toString('hex')}`
}

const password = 'Admin123456'
console.log(hash(password))
