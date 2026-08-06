import crypto from 'crypto'
import { definePlugin, Parameter, type Context, type Session } from '@fraqjs/fraq'
import { Master } from './config'
import { dir } from './dir'

const CAPTCHA = new Map<number, string>()

/**
 * 解析目标用户参数：优先匹配 @提及消息段，其次匹配纯数字文本
 */
function mentionOrNum (): Parameter<number> {
  return new Parameter<number>({
    typeInstruction: { type: 'number' },
    capture (tokenizer) {
      const token = tokenizer.peek()
      if (typeof token === 'object' && token !== null && token.type === 'mention') {
        tokenizer.next()
        return token.data.user_id
      }
      if (typeof token === 'string') {
        const parsed = Number(token)
        if (!Number.isNaN(parsed)) {
          tokenizer.next()
          return parsed
        }
      }
    }
  })
}

/**
 * 等待同一会话中同一发送者的下一条文本消息
 * @returns 消息文本，超时返回 null
 */
function waitNextMessage (ctx: Context, session: Session, timeoutMs = 60_000): Promise<string | null> {
  const { sender_id, message_scene, peer_id } = session.raw
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      off()
      resolve(null)
    }, timeoutMs)
    // ctx.on 返回取消订阅函数，匹配到消息或超时后必须调用它移除监听器
    const off = ctx.on('message_receive', (event) => {
      const msg = event.data
      if (msg.sender_id !== sender_id || msg.message_scene !== message_scene || msg.peer_id !== peer_id) return
      clearTimeout(timer)
      off()
      const text = msg.segments
        .filter((s) => s.type === 'text')
        .map((s) => s.data.text)
        .join('')
        .trim()
      resolve(text)
    })
  })
}

const MasterList = definePlugin({
  name: dir.name,
  provides: [Master],
  apply (ctx) {
    const master = new Master()
    ctx.provide(Master, master)
    const router = ctx.router.filter((session) => master.isMaster(session.raw.sender_id))
    router
      .command('#主人列表')
      .execute((session) => {
        session.reply(`主人列表:\n${master.masters.map(v => `- ${v}`).join('\n')}`, { withQuote: true })
      })
    router
      .command('#新增主人')
      .arg('userId', mentionOrNum())
      .execute((session, { userId }) => {
        if (master.isMaster(userId)) {
          session.reply(`[${userId}] 已经是主人了哦`, { withQuote: true })
          return
        }
        master.add(userId)
        session.reply(`已添加 [${userId}] 为主人`, { withQuote: true })
      })
    router
      .command('#删除主人')
      .arg('userId', mentionOrNum())
      .execute((session, { userId }) => {
        if (!master.isMaster(userId)) {
          session.reply(`[${userId}] 不再主人列表~`, { withQuote: true })
          return
        }
        master.remove(userId)
        session.reply(`已删除主人列表 [${userId}]`, { withQuote: true })
      })
    ctx.router
      .command('#设置主人')
      .execute(async (session) => {
        const userId = session.raw.sender_id
        if (master.isMaster(userId)) {
          await session.reply(`[${userId}] 已经是主人`, { withMention: true })
          return
        }
        if (CAPTCHA.has(userId)) return
        const sign = crypto.randomUUID()
        ctx.logger.info(`设置主人验证码：\x1b[32m${sign}\x1b[0m`)
        CAPTCHA.set(userId, sign)
        try {
          await session.reply('请输入控制台验证码', { withMention: true })
          const text = await waitNextMessage(ctx, session)

          if (text === null) {
            await session.reply('等待超时，已取消', { withMention: true })
            return
          }

          if (text !== sign) {
            await session.reply('验证码错误', { withMention: true })
            return
          }

          master.add(userId)

          await session.reply('设置主人成功', { withMention: true })
          return
        } finally { CAPTCHA.delete(userId) }
      })
  }
})

export default MasterList
export { Master }
