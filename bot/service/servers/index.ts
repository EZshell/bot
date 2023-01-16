import { Bot, InlineKeyboard } from "grammy";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Groups from "../../database/models/groups.model";
import Server from "../../database/models/server.model";
import AddServerService from "./add";
import ManageServerService from "./manage";


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
        new ManageServerService(this.bot).run()
    }

    // ############################

    private query: { rows: Server[]; count: number; } | undefined;
    private keyboard = async (ctx: MyContext) => {
        const keyboard = new InlineKeyboard()
        this.query!.rows.forEach(({ name, id }) => {
            keyboard
                .text("📟 " + name, "server:" + id)
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
        return `🔻 List of your servers:\n<b>Total:</b> ${this.query!.count}`
    }

    private response = async (ctx: MyContext) => {

        const s = ctx.session.user?.servers as number[]
        const g = ctx.session.user?.groups as number[]

        const _groups = await Groups.findAndCountAll({ where: { id: { [Op.in]: g } } })
        for (let i = 0; i < _groups.rows.length; i++) {
            const __s = _groups.rows[i].servers as number[]
            __s.forEach((v) => s.push(v))
        }


        this.query = await Server.findAndCountAll({ where: { id: { [Op.in]: s } } })


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