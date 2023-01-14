import { Bot, InlineKeyboard, NextFunction } from "grammy";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Server, { ServerInfoType } from "../../database/models/server.model";


class AddServerService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        // this.bot.inlineQuery(/^servers:add:\n(.*)\n(.*)\n(.*)\n(.*)\n(.*)$/, this.response)
        this.bot.on("message:text", this.saveServer)
    }

    // ############################

    private server: ServerInfoType | undefined;

    private text = async (ctx: MyContext) => {
        const server = this.server!
        return `<b>${server.name}</b>
<code>${server.username}@${server.ip} -p ${server.port}</code>
<b>Password:</b> <span class="tg-spoiler">${server.password}</span>
<pre>${server.description || ""}</pre>`
    }

    private response = async (ctx: MyContext) => {
        // const match = ctx.match!

        console.log("#######", ctx)

        ctx.api.sendMessage(ctx.chat!.id!, "Hello")



        // this.server = {
        //     name: match[1],
        //     description: match[5],
        //     ip: match[2],
        //     username: match[3],
        //     password: match[4],
        //     port: 22,
        // }

        // ctx.session.addServer = this.server

        // await ctx.answerInlineQuery(
        //     [
        //         {
        //             type: "article",
        //             id: "new_server",
        //             title: this.server.name,
        //             input_message_content: {
        //                 message_text: await this.text(ctx),
        //                 parse_mode: "HTML",
        //             },
        //             description: `${this.server.username}@${this.server.ip} -p ${this.server.port} \n` + ` ${this.server.description || ""}`,
        //         },
        //     ],
        //     { cache_time: 0, },
        // );
    }


    private async saveServer(ctx: MyContext, _next: NextFunction) {
        if (!ctx!.message!.via_bot) return await _next()
        else if (!ctx.session.addServer) return await _next()
        else {
            const server = ctx.session.addServer;
            const d = await Server.create({
                name: server.name,
                ip: server.ip,
                username: server.username,
                password: server.password,
                port: server.port,
                description: server.description,
                country: "Unknown",
                created_by: ctx.session.user!.id!,
            })
            ctx.session.user?.servers.push(d.id)
            await ctx.session.user?.save()
            ctx.session.addServer = null
            await ctx.reply("Server added successfully", { reply_to_message_id: ctx.message?.message_id })
        }
    }


}


export default AddServerService