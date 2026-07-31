# fraq-plugin-master

基于 Fraq 编写的通用主人列表插件，提供主人（机器人管理者）的维护与判断能力。

## 功能

- 主人列表的增删查，支持 `@提及` 和 QQ 号两种参数形式
- 首个主人通过控制台验证码自助设置（`#设置主人`）
- 配置持久化到本地 JSON 文件，支持手动编辑并热重载
- 向其他插件提供 `Master` 服务，可用于权限判断

## 安装与配置

将插件添加到 `fraq.yml` 的 `plugins` 字段下：

```yaml
plugins:
  master:
```

本插件没有 fraq.yml 配置项。主人列表保存在 `config/fraq-plugin-master/config.json`（相对于机器人工作目录），首次启动自动创建：

```json
{
  "masters": []
}
```

可以直接手动编辑该文件，插件通过文件监听自动重载，无需重启。

## 指令

| 指令 | 说明 | 权限 |
| --- | --- | --- |
| `#主人列表` | 查看当前主人列表 | 所有人 |
| `#新增主人 @xxx` / `#新增主人 123456` | 新增主人，优先解析 @提及，其次解析 QQ 号 | 仅主人 |
| `#删除主人 @xxx` / `#删除主人 123456` | 删除主人，参数形式同上 | 仅主人 |
| `#设置主人` | 通过控制台验证码将自己设为主人（用于初始化首个主人） | 所有人 |

`#设置主人` 的流程：发送指令后，控制台会输出一个验证码（日志中绿色高亮），在 60 秒内将验证码发送给机器人即可完成设置。重复触发不会生成新验证码，验证超时或成功后状态自动清理。

## 在其他插件中使用 `Master` 服务

如果你是插件开发者，请将本插件添加到项目的 `peerDependencies` 中，并在自己的插件中声明依赖：

```typescript
import { definePlugin } from "@fraqjs/fraq";
import { Master } from "fraq-plugin-master";

definePlugin({
  name: "my-plugin",
  inject: {
    master: Master,
  },
  apply(ctx) {
    // ctx.master: Master
    ctx.router
      .filter((session) => ctx.master.isMaster(session.raw.sender_id))
      .command("#管理指令")
      .execute((session) => {
        // 只有主人能触发
      });
  },
});
```

`Master` 提供的 API：

- `master.masters: number[]`：当前主人列表
- `master.isMaster(userId): boolean`：判断某用户是否为主人
- `master.add(userId)` / `master.remove(userId)`：增删主人（自动持久化）
- `master.get: ConfigTypes`：获取完整配置（带缓存，文件变更后自动失效）

## 开发

```bash
# 安装依赖
pnpm install

# 运行冒烟测试（需要先配置 test/smoke.ts 中的协议端地址）
pnpm dev

# 构建
pnpm build
```

## License

MIT
