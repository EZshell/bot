import { Bot, InlineKeyboard, NextFunction } from "grammy";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Groups from "../../database/models/groups.model";
import Server from "../../database/models/server.model";
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
        this.bot.callbackQuery("groups:join", this.join)
        this.bot.on("message", this.joinFinal)
        // 
        new AddGroupService(this.bot).run()
        new ManageGroupService(this.bot).run()
    }

    // ############################
    private query: { rows: Groups[]; count: number; } | undefined;
    private keyboard = async (ctx: MyContext) => {
        const keyboard = new InlineKeyboard()
        for (let i = 0; i < this.query!.rows.length; i++) {
            const element = this.query!.rows[i];
            const serverCount = await Server.count({ where: { id: { [Op.in]: element.servers as number[] } } })
            keyboard
                .text(`🗂 ${element.name} (${serverCount})`, "group:" + element.id)
                .row()
        }

        keyboard
            .switchInlineCurrent("➕ Add New", "groups:add:\nMyGroup")
            .text("📲 Join group", "groups:join")
            .row()
            .text("🔄", "groups")
            .text("🏠", "menu")
        return keyboard
    }

    private text = async (ctx: MyContext) => {
        return `🔻 List of your groups:\n<b>Total:</b> ${this.query!.count}`
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

    // #######

    private join = async (ctx: MyContext) => {
        ctx.session.inputState = {
            category: 'group',
            parameter: 'join',
            messageID: null,
            subID: 0,
            data: null
        }
        await ctx.reply(`Send group code to join:`, { parse_mode: 'HTML' })
    }


    private joinFinal = async (ctx: MyContext, _next: NextFunction) => {
        if (!ctx.session.inputState) {
            await _next()
            return
        }
        const { category, subID, parameter, messageID } = ctx.session.inputState
        if (category !== 'group' || parameter !== 'join') {
            await _next()
            return
        }

        const d = await Groups.findOne({ where: { name: ctx.message?.text! } })
        if (!d) await ctx.reply("Group not found")
        else {
            const groups = [...ctx.session.user!.groups as number[], d.id]
            await ctx.session.user!.update({ groups })
            await ctx.reply(`Now you have access to this group\n/groups`)
        }
    }
}


export default GroupsService