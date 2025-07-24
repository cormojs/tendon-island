import { readFileSync, existsSync, writeFileSync } from 'fs'

export interface ConfigData {
  [domain: string]: {
    [acct: string]: {
      clientId: string
      clientSecret: string
      secret: string
    }
  }
}

export function saveConfig(config: {
  domain: string
  acct: string
  clientId: string
  clientSecret: string
  secret: string
}): void {
  const existingConfig: ConfigData =
    existsSync('./config.json') ? JSON.parse(readFileSync('./config.json', { encoding: 'utf-8' })) : {}
  if (existingConfig[config.domain] === undefined) {
    existingConfig[config.domain] = {}
  }
  existingConfig[config.domain][config.acct] = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    secret: config.secret
  }
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
