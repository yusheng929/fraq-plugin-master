import chokidar, { FSWatcher } from 'chokidar'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import path from 'path'
import { dir } from './dir'
import { serviceToken } from '@fraqjs/fraq'


interface ConfigTypes {
  /** 主人列表 */
  masters: number[]
}

export class Master {
  static readonly token = serviceToken<Master>('master/Master')
  #isinit = false
  #defCfg = {
    masters: []
  }
  /** 作为缓存 */
  #cache: ConfigTypes | null = null
  #watcher: FSWatcher | null = null
  #ConfigFile: string

  constructor () {
    this.#ConfigFile = path.join(dir.ConfigPath, 'config.json')
    this.#init()
  }

  #init () {
    if (this.#isinit) return true
    this.#isinit = true
    if (!existsSync(this.#ConfigFile)) {
      mkdirSync(dir.ConfigPath, { recursive: true })
      writeFileSync(this.#ConfigFile, JSON.stringify(this.#defCfg))
    }
    this.#watch()
  }

  /** 主人列表 */
  get masters () {
    return this.get.masters
  }
  /** 获取配置 */
  get get (): ConfigTypes {
    if (this.#cache) return this.#cache
    const master = JSON.parse(readFileSync(this.#ConfigFile, 'utf8')) ?? []
    this.#cache = master
    return this.#cache as ConfigTypes
  }

  /**
   * 新增主人
   * @param userId
   */
  add (userId: number) {
    if (this.isMaster(userId)) return false
    const data = this.get
    data.masters.push(userId)
    this.#save(data)
  }
  /**
   * 删除主人
   */
  remove (userId: number) {
    if (!this.isMaster(userId)) return false
    const data = this.get
    data.masters = data.masters.filter(i => i !== userId)
    this.#save(data)
  }

  /** 判断某用户是否为主人 */
  isMaster (Id: number) {
    return this.masters.includes(Id)
  }

  /** 保存配置 */
  #save (data: ConfigTypes) {
    if (!existsSync(this.#ConfigFile)) {
      mkdirSync(dir.ConfigPath, { recursive: true })
    }
    writeFileSync(this.#ConfigFile, JSON.stringify(data, null, 2), 'utf8')
  }

  #watch () {
    this.#watcher = chokidar.watch(this.#ConfigFile, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    })
    this.#watcher.on('change', () => {
      this.#cache = null
    })
  }
}