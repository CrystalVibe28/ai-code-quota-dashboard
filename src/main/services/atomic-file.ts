import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'

type FileContents = string | Buffer

export function replaceFileAtomicallySync(filePath: string, contents: FileContents): void {
  const tempPath = `${filePath}.tmp`

  try {
    writeFileSync(tempPath, contents, { mode: 0o600, flush: true })
    renameSync(tempPath, filePath)
  } catch (error) {
    rmSync(tempPath, { force: true })
    throw error
  }
}

export function atomicWriteFileSync(filePath: string, contents: FileContents): void {
  if (existsSync(filePath)) {
    replaceFileAtomicallySync(`${filePath}.bak`, readFileSync(filePath))
  }

  replaceFileAtomicallySync(filePath, contents)
}

export function readFileWithBackupSync<T>(
  filePath: string,
  parse: (contents: string) => T,
  isRecoverable: (error: unknown) => boolean = () => true
): T {
  let primaryError: unknown

  try {
    return parse(readFileSync(filePath, 'utf-8'))
  } catch (error) {
    if (!isRecoverable(error)) throw error
    primaryError = error
  }

  const backupPath = `${filePath}.bak`
  if (!existsSync(backupPath)) {
    throw primaryError
  }

  try {
    const contents = readFileSync(backupPath, 'utf-8')
    const value = parse(contents)
    replaceFileAtomicallySync(filePath, contents)
    return value
  } catch (backupError) {
    if (!isRecoverable(backupError)) throw backupError
    throw new AggregateError(
      [primaryError, backupError],
      `Failed to read ${filePath} and its backup`
    )
  }
}
