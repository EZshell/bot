import { Bot, NextFunction } from "grammy";
import { MyContext } from "../..";
import Server, { ServerInputType } from "../../database/models/server.model";


class AddServerService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.inlineQuery(/^servers:add:\n(.*)\n(.*)\n(.*)\n(.*)\n(.*)$/, this.response)
        this.bot.hears(/(.*)\n(.*)@(.*) -p (.*)\nPassword: (.*)\n(.*)/, this.saveServer)
    }

    // ############################

    private server: ServerInputType | undefined;

    private text = async (ctx: MyContext) => {
        const server = this.server!
        return `<b>${server.name}</b>
<code>${server.username}@${server.ip} -p ${server.port}</code>
<b>Password:</b> <span class="tg-spoiler">${server.password}</span>
<pre>${server.description || ""}</pre>`
    }

    private response = async (ctx: MyContext) => {
        const match = ctx.match!

        this.server = {
            name: match[1],
            description: match[5],
            ip: match[2],
            username: match[3],
            password: match[4],
            port: 22,
        }

        await ctx.answerInlineQuery(
            [
                {
                    type: "article",
                    id: "new_server",
                    title: this.server.name,
                    input_message_content: {
                        message_text: await this.text(ctx),
                        parse_mode: "HTML",
                    },
                    description: `${this.server.username}@${this.server.ip} -p ${this.server.port} \n` + `${this.server.description || ""}`,
                },
            ],
            { cache_time: 0, },
        );

    }


    private async saveServer(ctx: MyContext, _next: NextFunction) {
        if (!ctx!.message!.via_bot) return await _next()
        else if (ctx.match?.length !== 7) {
            await ctx.reply("❌ Getting data error", { reply_to_message_id: ctx.message?.message_id })
        }
        else {
            const mch = ctx.match!
            const d = await Server.create({
                name: mch[1],
                ip: mch[3],
                username: mch[2],
                password: mch[5],
                port: parseInt(mch[4]),
                description: mch[6],
                owner: ctx.session.user!.id!,
                is_active: true
            })
            const servers = [...ctx.session.user!.servers as number[], d.id]
            await ctx.session.user!.update({ servers })
            await ctx.reply("✅ Server added:\n/servers", { reply_to_message_id: ctx.message?.message_id })
        }
    }


}


export default AddServerService