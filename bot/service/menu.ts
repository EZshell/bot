import { Bot, InlineKeyboard } from "grammy";
import { Op } from "sequelize";
import { MyContext } from "..";
import Groups from "../database/models/groups.model";
import Server from "../database/models/server.model";


class MenuService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.command("menu", this.response)
        this.bot.callbackQuery("menu", this.response)
    }

    // ############################

    private keyboard = async (ctx: MyContext) => {
        const keyboard = new InlineKeyboard()

        const s = ctx.session.user?.servers as number[]
        const g = ctx.session.user?.groups as number[]

        const _groups = await Groups.findAndCountAll({ where: { id: { [Op.in]: g } } })
        for (let i = 0; i < _groups.rows.length; i++) {
            const element = _groups.rows[i];
            const serverCount = await Server.count({ where: { id: { [Op.in]: element.servers as number[] } } })
            keyboard
                .text(`🗂 ${element.name} (${serverCount})`, "group:" + element.id + ":openGroup")
                .row()

            const __s = element.servers as number[]
            __s.forEach((v) => s.push(v))
        }


        const _servers = await Server.findAndCountAll({ where: { id: { [Op.in]: s } } })
        for (let i = 0; i < _servers.rows.length; i++) {
            const element = _servers.rows[i];
            keyboard
                .text(`📟 ${element.name}`, "server:" + element.id + ":openShell")
                .row()
        }



        keyboard
            .text(`🖥 Manage Servers`, "servers")
            .row()
            .text(`🗂 Manage Groups`, "groups")
            .text("📌 Manage Snippets", "snippets")
            .row()
            .url("💬 Support", "EZshellAdmin.t.me")
        return keyboard
    }

    private text = async (ctx: MyContext) => {
        return `🔻 Main menu:`
    }

    private response = async (ctx: MyContext) => {
        if (ctx.callbackQuery) {
            await ctx.editMessageText(
                await this.text(ctx),
                { reply_markup: await this.keyboard(ctx) }
            );
            await ctx.answerCallbackQuery();
            return
        }
        await ctx.reply(
            await this.text(ctx),
            { reply_markup: await this.keyboard(ctx) }
        );
    }

}


export default MenuService