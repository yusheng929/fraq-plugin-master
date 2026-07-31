import { Context } from '@fraqjs/fraq'

import ExamplePlugin from '../src'

const ctx = Context.fromUrl('http://127.0.0.1:7003', {
  accessToken: undefined,
  logHandler (message) {
    console.log(`[${message.level}] [${message.module}] ${message.message}`)
  }
})

ctx.install(ExamplePlugin)

ctx.start()

process.on('SIGINT', async () => {
  await ctx.stop()
  process.exit(0)
})
