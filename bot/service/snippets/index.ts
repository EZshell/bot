import { Bot, InlineKeyboard } from "grammy";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Snippets from "../../database/models/snippets.model";
import AddSnippetService from "./add";
import ManageSnippetService from "./manage";


class SnippetsService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.command("snippets", this.response)
        this.bot.callbackQuery("snippets", this.response)
        // 
        new AddSnippetService(this.bot).run()
        new ManageSnippetService(this.bot).run()
    }

    // ############################
    private query: { rows: Snippets[]; count: number; } | undefined;
    private keyboard = async (ctx: MyContext) => {
        const keyboard = new InlineKeyboard()
        this.query!.rows.forEach(({ label, id }) => {
            keyboard
                .text(label, "snippet:" + id)
                .row()
        })

        keyboard
            .switchInlineCurrent("➕ Add New", "snippets:add:\nMySnip\nrun me")
            .row()
            .text("🔄", "snippets")
            .text("🏠", "menu")
        return keyboard
    }

    private text = async (ctx: MyContext) => {
        return `🔻 List of your snippets:\nTotal: ${this.query!.count}`
    }

    private response = async (ctx: MyContext) => {
        const snippets = ctx.session.user?.snippets as number[]
        this.query = await Snippets.findAndCountAll({ where: { id: { [Op.in]: snippets } } })

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


export default SnippetsService