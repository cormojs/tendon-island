import { readFileSync, existsSync, writeFileSync } from 'fs'

export interface ConfigData {
  [domain: string]: {
    secret: string
  }
}

export function saveConfig(config: { domain: string, secret: string }): void {
  const existingConfig: ConfigData =
    existsSync('./config.json') ? JSON.parse(readFileSync('./config.json', { encoding: 'utf-8' })) : {}
  existingConfig[config.domain] = { secret: config.secret }
  writeFileSync('./config.json', JSON.stringify(existingConfig))
}

export function loadConfig(): ConfigData | null {
  if (existsSync('./config.json')) {
    const file = readFileSync('./config.json', {
      encoding: 'utf-8'
    })
    return JSON.parse(file) as ConfigData
  }
  return null
}
