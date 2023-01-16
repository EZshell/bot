import { Bot, InlineKeyboard, NextFunction } from "grammy";
import { InlineQueryResult } from "grammy/out/types";
import { Op } from "sequelize";
import { MyContext } from "../..";
import { SuperAdmin } from "../../config";
import sequelize from "../../database";
import Groups from "../../database/models/groups.model";
import Server from "../../database/models/server.model";
import ShellService from "../shell/shell";


class ManageServerService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.callbackQuery(/^server:([0-9]+):delete$/, this.deleteServer)
        this.bot.callbackQuery(/^server:([0-9]+):inactive$/, this.inactiveServer)
        this.bot.callbackQuery(/^server:([0-9]+):active$/, this.activeServer)

        this.bot.callbackQuery(/^server:([0-9]+):edit:(ip|username|password|port|desc)$/, this.editServer)
        this.bot.on("message", this.editServerFinal)

        this.bot.callbackQuery(
            [
                /^server:([0-9]+)$/,
                /^server:([0-9]+):inactive$/,
                /^server:([0-9]+):active$/,
                /^server:([0-9]+):delete$/
            ],
            this.response
        )

        this.bot.inlineQuery(/^server:([0-9]+):addToGroup:(.*)$/, this.addToGroup)
        this.bot.hears(/#add_to_group:\n([0-9]+):([0-9]+)/, this.addToGroupFinal)


        new ShellService(this.bot).run()
    }


    // ############################

    private keyboard = async (server: Server | null) => {
        if (!server) return new InlineKeyboard()
        const keyboard = new InlineKeyboard()
            .text("❌ Delete", "server:" + server.id + ":delete")

        if (server.is_active) {
            keyboard.text("💤 Inactive", "server:" + server.id + ":inactive")
        }
        else {
            keyboard.text("🖲 Active", "server:" + server.id + ":active")
        }

        keyboard
            .row()
            .text("🔌 Check Connect", "server:" + server.id + ":sshCheck")
            .text("📟 Open Shell", "server:" + server.id + ":openShell")
            .row()
            .text("✏️ IP", "server:" + server.id + ":edit:ip")
            .text("✏️ Username", "server:" + server.id + ":edit:username")
            .text("✏️ Password", "server:" + server.id + ":edit:password")
            .row()
            .text("✏️ Port", "server:" + server.id + ":edit:port")
            .text("✏️ Desc", "server:" + server.id + ":edit:desc")
            .row()
            .switchInlineCurrent("Add to group", "server:" + server.id + ":addToGroup:")
            .row()
            .text("↪️", "servers")
            .text("🏠", "menu")

        return keyboard
    }

    private text = async (server: Server | null) => {
        if (!server) return '<i>Server deleted or not found</i>'
        return `📟 <b>${server.name}</b>
<b>IP:</b> <code>${server.ip}</code>
<b>Username:</b> <code>${server.username}</code>
<b>Password:</b> <code>${server.password}</code>
<b>Port:</b> <code>${server.port}</code>

__ <pre>${server.description}</pre>`
    }


    private response = async (ctx: MyContext) => {
        const serverID = parseInt(ctx.match![1]);
        const server = await Server.findByPk(serverID)

        await ctx.editMessageText(
            await this.text(server),
            { reply_markup: await this.keyboard(server), parse_mode: "HTML" }
        );
        await ctx.answerCallbackQuery();
        return
    }

    // ########################
    private async deleteServer(ctx: MyContext, _next: NextFunction) {
        const match = ctx.match!
        const serverID = parseInt(match[1]);
        const server = await Server.findByPk(serverID)
        if (!server) return await ctx.answerCallbackQuery("Not Found")
        await server.destroy()
        await ctx.answerCallbackQuery(`Deleted`)
        await _next()
    }
    private async inactiveServer(ctx: MyContext, _next: NextFunction) {
        const match = ctx.match!
        const serverID = parseInt(match[1]);
        const server = await Server.findByPk(serverID)
        if (!server) return await ctx.answerCallbackQuery("Not Found")
        await server.update({ is_active: false })
        await ctx.answerCallbackQuery(`Inactivated`)
        await _next()
    }

    private async activeServer(ctx: MyContext, _next: NextFunction) {
        const match = ctx.match!
        const serverID = parseInt(match[1]);
        const server = await Server.findByPk(serverID)
        if (!server) return await ctx.answerCallbackQuery("Not Found")
        await server.update({ is_active: true })
        await ctx.answerCallbackQuery(`Activated`)
        await _next()
    }


    private async editServer(ctx: MyContext) {
        const match = ctx.match!
        const serverID = parseInt(match[1]);
        const param = match[2]

        const server = await Server.findByPk(serverID)
        if (!server) return await ctx.answerCallbackQuery("Not Found")
        await ctx.answerCallbackQuery()

        ctx.session.inputState = {
            category: 'server',
            subID: serverID!,
            parameter: param,
            messageID: ctx.callbackQuery?.message?.message_id!,
            data: null
        };
        await ctx.reply(`Send me <b>${param}</b> parameter for <b>${server.name}</b>:`, { parse_mode: 'HTML' })
    }
    private editServerFinal = async (ctx: MyContext, _next: NextFunction) => {
        if (!ctx.session.inputState) {
            await _next()
            return
        }
        const { category, subID, parameter, messageID } = ctx.session.inputState
        if (category !== 'server') {
            await _next()
            return
        }
        const serverID = subID;
        const server = await Server.findByPk(serverID)
        await server?.update({ [parameter]: ctx.message?.text })
        await ctx.reply(`Done`)
        // 
        const _server = (await Server.findByPk(serverID))

        await ctx.api.editMessageText(
            ctx.chat?.id!,
            messageID!,
            await this.text(_server),
            { reply_markup: await this.keyboard(_server), parse_mode: "HTML" }
        )
        ctx.session.inputState = null
    }



    private addToGroup = async (ctx: MyContext) => {
        const match = ctx.match!
        const serverID = parseInt(match[1]);
        const server = await Server.findByPk(serverID)

        const search = match[2]

        try {
            const myGroups = ctx.session.user?.groups as number[]
            const groups = await Groups.findAndCountAll({ where: { id: { [Op.in]: myGroups } } })
            ctx.api.sendMessage(SuperAdmin, JSON.stringify(groups))
        } catch (error) {
            ctx.api.sendMessage(SuperAdmin, JSON.stringify(error))
        }


        // const g: InlineQueryResult[] = []
        // groups.rows.forEach(({ id, name }) => {
        //     g.push({
        //         type: "article",
        //         id: "add_to_group_" + id,
        //         title: name,
        //         input_message_content: {
        //             message_text: `#add_to_group:\n${id}:${serverID}`,
        //             parse_mode: "HTML",
        //         },
        //         description: `Add ${server?.name} to ${name}`,
        //     })
        // })

        ctx.api.sendMessage(SuperAdmin, JSON.stringify("hjhjhj***111"))


        await ctx.answerInlineQuery([]);
    }

    private async addToGroupFinal(ctx: MyContext, _next: NextFunction) {
        if (!ctx!.message!.via_bot) return await _next()
        else if (ctx.match?.length !== 3) {
            await ctx.reply("❌ Getting data error", { reply_to_message_id: ctx.message?.message_id })
        }
        else {
            const mch = ctx.match!
            const gID = parseInt(mch[1])
            const sID = parseInt(mch[2])
            const group = await Groups.findByPk(gID)
            const server = await Server.findByPk(sID)
            if (!group || !server) {
                await ctx.reply("❌ Getting data error", { reply_to_message_id: ctx.message?.message_id })
                return
            }
            const servers = group.servers as number[]
            servers.push(sID)
            await group.save()
        }
    }



}


export default ManageServerService