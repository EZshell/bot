import { Bot, InlineKeyboard, NextFunction } from "grammy";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Group from "../../database/models/groups.model";
import Server from "../../database/models/server.model";
import User from "../../database/models/user.model";


class ManageGroupService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.callbackQuery(/^group:([0-9]+):delete$/, this.deleteGroup)

        this.bot.callbackQuery(/^group:([0-9]+):edit:(name)$/, this.editGroup)
        this.bot.on("message", this.editGroupFinal)

        this.bot.callbackQuery(
            [
                /^group:([0-9]+)$/,
                /^group:([0-9]+):delete$/
            ],
            this.response
        )

        this.bot.callbackQuery(/^group:([0-9]+):members$/, this.groupMembers)
        this.bot.callbackQuery(/^group:([0-9]+):servers$/, this.groupServers)
    }


    // ############################

    private keyboard = async (group: Group | null) => {
        if (!group) return new InlineKeyboard()
        const keyboard = new InlineKeyboard()
            .text("❌ Delete", "group:" + group.id + ":delete")
            .row()
            .text(`👥 Members(${group.members.length})`, "group:" + group.id + ":members")
            .text(`📟 Servers(${group.servers.length})`, "group:" + group.id + ":servers")

        keyboard
            .text("✏️ Name", "group:" + group.id + ":edit:name")
            .row()
            .text("↪️", "groups")
            .text("🏠", "menu")

        return keyboard
    }

    private text = async (group: Group | null) => {
        if (!group) return '<i>Group deleted or not found</i>'
        return `<b>${group.name}</b>`
    }


    private response = async (ctx: MyContext) => {
        const groupID = parseInt(ctx.match![1]);
        const group = await Group.findByPk(groupID)

        await ctx.editMessageText(
            await this.text(group),
            { reply_markup: await this.keyboard(group), parse_mode: "HTML" }
        );
        await ctx.answerCallbackQuery();
        return
    }

    // ########################
    private async deleteGroup(ctx: MyContext, _next: NextFunction) {
        const match = ctx.match!
        const groupID = parseInt(match[1]);
        const group = await Group.findByPk(groupID)
        if (!group) return await ctx.answerCallbackQuery("Not Found")
        await group.destroy()
        await ctx.answerCallbackQuery(`Deleted`)
        await _next()
    }


    private async editGroup(ctx: MyContext) {
        const match = ctx.match!
        const groupID = parseInt(match[1]);
        const param = match[2]

        const group = await Group.findByPk(groupID)
        if (!group) return await ctx.answerCallbackQuery("Not Found")
        await ctx.answerCallbackQuery()

        ctx.session.inputState = {
            category: 'group',
            subID: groupID!,
            parameter: param,
            messageID: ctx.callbackQuery?.message?.message_id!,
            data: null
        };
        await ctx.reply(`Send me <b>${param}</b> parameter for <b>${group.name}</b>:`, { parse_mode: 'HTML' })
    }
    private editGroupFinal = async (ctx: MyContext, _next: NextFunction) => {
        if (!ctx.session.inputState) {
            await _next()
            return
        }
        const { category, subID, parameter, messageID } = ctx.session.inputState
        if (category !== 'group') {
            await _next()
            return
        }
        const groupID = subID;
        const group = await Group.findByPk(groupID)
        await group?.update({ [parameter]: ctx.message?.text })
        await ctx.reply(`Done`)
        // 
        const _group = (await Group.findByPk(groupID))

        await ctx.api.editMessageText(
            ctx.chat?.id!,
            messageID!,
            await this.text(_group),
            { reply_markup: await this.keyboard(_group), parse_mode: "HTML" }
        )
        ctx.session.inputState = null
    }

    // #################################################


    private async groupMembers(ctx: MyContext) {
        const match = ctx.match!
        const groupID = parseInt(match[1]);

        const group = await Group.findByPk(groupID)
        if (!group) return await ctx.answerCallbackQuery("Not Found")
        await ctx.answerCallbackQuery()

        const text = `You can see all <b>👥 Members</b> of this group & manage them.

<i>For add people to this group, send bellow link for theme & ask to open it</i>
t.me/${ctx.me.username}?start=join_group_${group.id}
<i>After that you must confirm</i>
`

        const keyboard = new InlineKeyboard()
        const members = group.members as number[]
        const query = await User.findAndCountAll({ where: { id: { [Op.in]: members } } })
        query!.rows.forEach(({ first_name, id }) => {
            keyboard
                .text(first_name, "group:" + group.id + ":member:" + id)
                .row()
        })

        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
    }



    private async groupServers(ctx: MyContext) {
        const match = ctx.match!
        const groupID = parseInt(match[1]);

        const group = await Group.findByPk(groupID)
        if (!group) return await ctx.answerCallbackQuery("Not Found")
        await ctx.answerCallbackQuery()

        const text = `You can see all <b>📟 Servers</b> of this group & manage them.

<i>For add server to this group, go to server setting</i>`

        const keyboard = new InlineKeyboard()
        const servers = group.servers as number[]
        const query = await Server.findAndCountAll({ where: { id: { [Op.in]: servers } } })
        query!.rows.forEach(({ name, id }) => {
            keyboard
                .text(name, "group:" + group.id + ":server:" + id)
                .row()
        })

        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
    }
}


export default ManageGroupService