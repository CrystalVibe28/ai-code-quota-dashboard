import { createHash, randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs'
import {
  atomicWriteFileSync,
  readFileWithBackupSync,
  replaceFileAtomicallySync
} from './atomic-file'

const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16
const KEY_LENGTH = 32
const ITERATIONS = 100000

interface PasswordData {
  salt: string
  hash: string
  skipped?: boolean
}

interface PasswordChangeBackup {
  version: 1
  auth: string | null
  credentials: string | null
}

export class CryptoService {
  private dataPath: string
  private passwordFilePath: string
  private credentialsFilePath: string
  private passwordChangePath: string

  constructor() {
    this.dataPath = join(app.getPath('userData'), 'data')
    this.passwordFilePath = join(this.dataPath, 'auth.json')
    this.credentialsFilePath = join(this.dataPath, 'credentials.enc')
    this.passwordChangePath = join(this.dataPath, 'password-change.json')
    this.ensureDataDir()
    this.recoverInterruptedPasswordChange()
  }

  private ensureDataDir(): void {
    if (!existsSync(this.dataPath)) {
      mkdirSync(this.dataPath, { recursive: true })
    }
  }

  hasPassword(): boolean {
    return existsSync(this.passwordFilePath) || existsSync(`${this.passwordFilePath}.bak`)
  }

  isPasswordSkipped(): boolean {
    if (!this.hasPassword()) return false
    try {
      const data = this.readPasswordData()
      return data.skipped === true
    } catch (error) {
      console.error('[Crypto] Failed to read password file:', error)
      return false
    }
  }

  async skipPassword(): Promise<void> {
    // Use a fixed internal key when password is skipped
    // This still provides some level of obfuscation for stored data
    const internalKey = 'no-password-mode-internal-key'
    const salt = randomBytes(SALT_LENGTH).toString('hex')
    const hash = this.hashPassword(internalKey, salt)
    const data = { salt, hash, skipped: true }
    atomicWriteFileSync(this.passwordFilePath, JSON.stringify(data))
  }

  getSkippedPasswordKey(): string {
    return 'no-password-mode-internal-key'
  }

  async setPassword(password: string): Promise<void> {
    const salt = randomBytes(SALT_LENGTH).toString('hex')
    const hash = this.hashPassword(password, salt)
    const data: PasswordData = { salt, hash }
    atomicWriteFileSync(this.passwordFilePath, JSON.stringify(data))
  }

  async verifyPassword(password: string): Promise<boolean> {
    if (!this.hasPassword()) return false
    
    try {
      const data = this.readPasswordData()
      const hash = this.hashPassword(password, data.salt)
      return hash === data.hash
    } catch (error) {
      console.error('[Crypto] Failed to verify password:', error)
      return false
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const isValid = await this.verifyPassword(oldPassword)
    if (!isValid) throw new Error('Invalid old password')
    await this.setPassword(newPassword)
  }

  beginPasswordChange(): void {
    if (existsSync(this.passwordChangePath)) {
      throw new Error('Password change already in progress')
    }

    const backup: PasswordChangeBackup = {
      version: 1,
      auth: this.readOptionalFile(this.passwordFilePath),
      credentials: this.readOptionalFile(this.credentialsFilePath)
    }

    replaceFileAtomicallySync(this.passwordChangePath, JSON.stringify(backup))
  }

  commitPasswordChange(): void {
    if (!existsSync(this.passwordChangePath)) {
      throw new Error('No password change in progress')
    }

    this.syncBackup(this.credentialsFilePath)
    this.syncBackup(this.passwordFilePath)
    rmSync(this.passwordChangePath, { force: true })
  }

  rollbackPasswordChange(): void {
    if (!existsSync(this.passwordChangePath)) return

    const backup = this.readPasswordChangeBackup()
    this.restoreFile(this.credentialsFilePath, backup.credentials)
    this.restoreFile(this.passwordFilePath, backup.auth)
    rmSync(this.passwordChangePath, { force: true })
  }

  private readPasswordData(): PasswordData {
    return readFileWithBackupSync(this.passwordFilePath, (contents) => {
      const data = JSON.parse(contents) as PasswordData
      if (!data || typeof data.salt !== 'string' || typeof data.hash !== 'string') {
        throw new Error('Invalid password data')
      }
      return data
    })
  }

  private readPasswordChangeBackup(): PasswordChangeBackup {
    const data = JSON.parse(readFileSync(this.passwordChangePath, 'utf-8')) as PasswordChangeBackup
    if (
      data?.version !== 1 ||
      (typeof data.auth !== 'string' && data.auth !== null) ||
      (typeof data.credentials !== 'string' && data.credentials !== null)
    ) {
      throw new Error('Invalid password change backup')
    }
    return data
  }

  private readOptionalFile(filePath: string): string | null {
    return existsSync(filePath) ? readFileSync(filePath, 'utf-8') : null
  }

  private syncBackup(filePath: string): void {
    const contents = this.readOptionalFile(filePath)
    if (contents === null) {
      rmSync(`${filePath}.bak`, { force: true })
      return
    }
    replaceFileAtomicallySync(`${filePath}.bak`, contents)
  }

  private restoreFile(filePath: string, contents: string | null): void {
    if (contents === null) {
      rmSync(filePath, { force: true })
      rmSync(`${filePath}.bak`, { force: true })
      rmSync(`${filePath}.tmp`, { force: true })
      return
    }

    replaceFileAtomicallySync(filePath, contents)
    replaceFileAtomicallySync(`${filePath}.bak`, contents)
  }

  private recoverInterruptedPasswordChange(): void {
    if (!existsSync(this.passwordChangePath)) return

    console.warn('[Crypto] Recovering interrupted password change')
    this.rollbackPasswordChange()
  }

  private hashPassword(password: string, salt: string): string {
    return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512').toString('hex')
  }

  deriveKey(password: string, salt: Buffer): Buffer {
    return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512')
  }

  encrypt(data: string, password: string): string {
    const salt = randomBytes(SALT_LENGTH)
    const key = this.deriveKey(password, salt)
    const iv = randomBytes(IV_LENGTH)
    
    const cipher = createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag()

    return [
      salt.toString('hex'),
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted
    ].join(':')
  }

  decrypt(encryptedData: string, password: string): string {
    const parts = encryptedData.split(':')
    if (parts.length !== 4) throw new Error('Invalid encrypted data format')

    const [saltHex, ivHex, tagHex, encrypted] = parts
    const salt = Buffer.from(saltHex, 'hex')
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const key = this.deriveKey(password, salt)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}
