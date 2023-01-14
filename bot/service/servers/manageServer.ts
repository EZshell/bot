import { Bot, InlineKeyboard, NextFunction } from "grammy";
import { MyContext } from "../..";
import Server from "../../database/models/server.model";


class ManageServerService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.callbackQuery(/^server:([0-9]+):delete$/, this.deleteServer)
        this.bot.callbackQuery(/^server:([0-9]+):inactive$/, this.inactiveServer)
        this.bot.callbackQuery(/^server:([0-9]+):active$/, this.activeServer)
        this.bot.callbackQuery(/^server:([0-9]+):sshCheck$/, this.sshCheck)
        this.bot.callbackQuery(/^server:([0-9]+):openShell$/, this.openShell)

        this.bot.callbackQuery(/^server:([0-9]+):edit:(ip|username|password|port|desc)$/, this.editServer)
        this.bot.on("message", this.editServerFinal)

        this.bot.callbackQuery(
            [
                /^server:([0-9]+)$/,
                // /^server:([0-9]+):inactive$/,
                // /^server:([0-9]+):active$/,
                // /^server:([0-9]+):delete$/
            ],
            this.response
        )
    }


    // ############################

    private serverID: number | undefined;
    private server: Server | null = null;
    private keyboard = async (ctx: MyContext) => {
        const server = this.server
        if (!server) return new InlineKeyboard()
        const keyboard = new InlineKeyboard()
            .text("❌ Delete", "server:" + this.serverID + ":delete")

        if (server.is_active) {
            keyboard.text("💤 Inactive", "server:" + this.serverID + ":inactive")
        }
        else {
            keyboard.text("🖲 Active", "server:" + this.serverID + ":active")
        }
        keyboard
            .row()
            .text("🕹 Check Connect", "server:" + this.serverID + ":sshCheck")
            .text("🕹 Open Shell", "server:" + this.serverID + ":openShell")
            .row()
            .text("✏️ IP", "server:" + this.serverID + ":edit:ip")
            .text("✏️ Username", "server:" + this.serverID + ":edit:username")
            .text("✏️ Password", "server:" + this.serverID + ":edit:password")
            .row()
            .text("✏️ Port", "server:" + this.serverID + ":edit:port")
            .text("✏️ Desc", "server:" + this.serverID + ":edit:desc")
            .row()
            .text("↪️", "servers")
            .text("🏠", "menu")

        return keyboard
    }

    private text = async (ctx: MyContext) => {
        const server = this.server
        if (!server) return '<i>Server deleted or not found</i>'
        return ` <b>${server.name}</b>
<b>IP:</b> <code>${server.ip}</code>
<b>Username:</b> <code>${server.username}</code>
<b>Password:</b> <code>${server.password}</code>
<b>Port:</b> <code>${server.port}</code>

__ <pre>${server.description}</pre>`
    }

    private async setServer(ctx: MyContext) {
        this.server = await Server.findByPk(this.serverID)
    }

    private response = async (ctx: MyContext) => {
        this.serverID = parseInt(ctx.match![1]);
        await this.setServer(ctx)

        await ctx.editMessageText(
            await this.text(ctx),
            { reply_markup: await this.keyboard(ctx), parse_mode: "HTML" }
        );
        await ctx.answerCallbackQuery();
        return
    }

    // ########################
    private async deleteServer(ctx: MyContext, _next: NextFunction) {
        this.serverID = parseInt(ctx.match![1]);
        await this.setServer(ctx)
        await this.server?.destroy()
        await this.setServer(ctx)
        await ctx.answerCallbackQuery(`Deleted`)
        // await _next()
    }
    private async inactiveServer(ctx: MyContext, _next: NextFunction) {
        console.log(ctx.match)
        this.serverID = parseInt(ctx.match![1]);
        await this.setServer(ctx)
        await this.server?.update({ is_active: false })
        await this.setServer(ctx)
        await ctx.answerCallbackQuery(`Inactivated`)
        // await _next()
    }

    private async activeServer(ctx: MyContext, _next: NextFunction) {
        this.serverID = parseInt(ctx.match![1]);
        await this.setServer(ctx)
        await this.server?.update({ is_active: true })
        await this.setServer(ctx)
        await ctx.answerCallbackQuery(`Activated`)
        // await _next()
    }

    private async sshCheck(ctx: MyContext) {
        await ctx.answerCallbackQuery()
    }
    private async openShell(ctx: MyContext) {
        await ctx.answerCallbackQuery()
    }
    private async editServer(ctx: MyContext) {
        const match = ctx.match!
        const serverID = parseInt(match[1]);
        const param = match[2]
        await this.setServer(ctx)
        await ctx.answerCallbackQuery()

        // ctx.session.inputState = {
        //     category: 'server',
        //     subID: this.serverID!,
        //     parameter: param,
        //     messageID: ctx.message?.message_id!
        // };
        await ctx.reply(`Send me <b>${param}</b> parameter for <b></b>:`, { parse_mode: 'HTML' })
    }
    private async editServerFinal(ctx: MyContext, _next: NextFunction) {
        if (!ctx.session.inputState) {
            await _next()
            return
        }
        const { category, subID, parameter, messageID } = ctx.session.inputState
        if (category !== 'server') {
            await _next()
            return
        }
        this.serverID = subID;
        await this.setServer(ctx)
        await this.server?.update({ [parameter]: ctx.message?.text })
        await ctx.reply(`Done`)
        // 
        await this.setServer(ctx)
        await ctx.api.editMessageText(ctx.chat?.id!, messageID!, await this.text(ctx), { reply_markup: await this.keyboard(ctx) })
    }
}


export default ManageServerService