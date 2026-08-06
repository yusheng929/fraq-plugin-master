import path from 'node:path'
import pkg from '../package.json'

export const dir = {
  /** 插件名 */
  name: pkg.name,
  pkg: pkg,
  get ConfigPath () {
    return path.join(process.cwd(), 'config', this.name)
  }
}