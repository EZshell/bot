import { Bot, InlineKeyboard } from "grammy";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Server from "../../database/models/server.model";
import AddServerService from "./addServer";


class ManageServerService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.callbackQuery(/^server:([0-9]+)$/, this.response)
    }

    // ############################

    private serverID: number | undefined;
    private server: Server | null = null;
    private keyboard = async (ctx: MyContext) => {
        const keyboard = new InlineKeyboard()
            .text("❌ Delete", "server:" + this.serverID + ":delete")
            .text("💤 Inactive", "server:" + this.serverID + ":inactive")
            .row()
            .text("🕹 Check Connect", "server:" + this.serverID + ":ssh:check")
            .text("🕹 Open Shell", "server:" + this.serverID + ":ssh:shell")
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
        const server = this.server!
        return ` <b>${server.name}</b>
<b>IP:</b> <code>${server.ip}</code>
<b>Username:</b> <code>${server.username}</code>
<b>Password:</b> <code>${server.password}</code>
<b>Port:</b> <code>${server.port}</code>

__ <pre>${server.description}</pre>`
    }

    private response = async (ctx: MyContext) => {
        this.serverID = parseInt(ctx.match![1]);
        this.server = await Server.findByPk(this.serverID)

        await ctx.editMessageText(
            await this.text(ctx),
            { reply_markup: await this.keyboard(ctx), parse_mode: "HTML" }
        );
        await ctx.answerCallbackQuery();
        return
    }
}


export default ManageServerService