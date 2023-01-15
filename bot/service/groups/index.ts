import { Bot, InlineKeyboard } from "grammy";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Groups from "../../database/models/groups.model";
import AddGroupService from "./add";
import ManageGroupService from "./manage";


class GroupsService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.command("groups", this.response)
        this.bot.callbackQuery("groups", this.response)
        // 
        new AddGroupService(this.bot).run()
        new ManageGroupService(this.bot).run()
    }

    // ############################
    private query: { rows: Groups[]; count: number; } | undefined;
    private keyboard = async (ctx: MyContext) => {
        const keyboard = new InlineKeyboard()
        this.query!.rows.forEach(({ name, id }) => {
            keyboard
                .text("🗂 " + name, "group:" + id)
                .row()
        })

        keyboard
            .switchInlineCurrent("➕ Add New", "groups:add:\nMyGroup")
            .row()
            .text("🔄", "groups")
            .text("🏠", "menu")
        return keyboard
    }

    private text = async (ctx: MyContext) => {
        return `🔻 List of your Groups:\nTotal: ${this.query!.count}`
    }

    private response = async (ctx: MyContext) => {
        const groups = ctx.session.user?.groups as number[]
        this.query = await Groups.findAndCountAll({ where: { id: { [Op.in]: groups } } })

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


export default GroupsService