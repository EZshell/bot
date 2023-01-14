import { Bot, InlineKeyboard } from "grammy";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Server from "../../database/models/server.model";
import AddServerService from "./addServer";


class ServersService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.command("servers", this.response)
        this.bot.callbackQuery("servers", this.response)
        // 
        new AddServerService(this.bot).run()
    }

    // ############################

    private query: { rows: Server[]; count: number; } | undefined;
    private keyboard = async (ctx: MyContext) => {
        const keyboard = new InlineKeyboard()
        this.query!.rows.forEach(({ name, id }) => {
            keyboard
                .text(name, "servers:" + id)
                .row()
        })

        keyboard
            .switchInlineCurrent("➕ Add New", "servers:add:\nMyServer\n338.564.25.172\nusername\npassword\nDescription")
            .row()
            .text("🔄", "servers")
            .text("🏠", "menu")
        return keyboard
    }

    private text = async (ctx: MyContext) => {
        return `🔻 Choose:\nCount: ${this.query!.count}`
    }

    private response = async (ctx: MyContext) => {
        const servers = ctx.session.user?.servers
        this.query = await Server.findAndCountAll({ where: { id: { [Op.in]: servers } } })

        if (ctx.callbackQuery) {
            await ctx.editMessageText(
                await this.text(ctx),
                { reply_markup: await this.keyboard(ctx), parse_mode: "HTML" }
            );
            await ctx.answerCallbackQuery();
            return
        }
        await ctx.reply(
            await this.text(ctx),
            { reply_markup: await this.keyboard(ctx), parse_mode: "HTML" }
        );
    }
}


export default ServersService