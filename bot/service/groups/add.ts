import { Bot, NextFunction } from "grammy";
import { MyContext } from "../..";
import Groups, { GroupInputType } from "../../database/models/groups.model";


class AddGroupService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.inlineQuery(/^groups:add:\n(.*)$/, this.response)
        this.bot.hears(/#new_group\n(.*)/, this.saveGroup)
    }

    // ############################

    private group: GroupInputType | undefined;

    private text = async (ctx: MyContext) => {
        const group = this.group!
        return `#new_group
<b>${group.name}</b>`
    }

    private response = async (ctx: MyContext) => {
        const match = ctx.match!

        this.group = {
            name: match[1],
        }

        await ctx.answerInlineQuery(
            [
                {
                    type: "article",
                    id: "new_group",
                    title: this.group?.name,
                    input_message_content: {
                        message_text: await this.text(ctx),
                        parse_mode: "HTML",
                    }
                },
            ],
            { cache_time: 0, },
        );

    }


    private async saveGroup(ctx: MyContext, _next: NextFunction) {
        if (!ctx!.message!.via_bot) return await _next()
        else if (ctx.match?.length !== 2) {
            await ctx.reply("❌ Getting data error", { reply_to_message_id: ctx.message?.message_id })
        }
        else {
            const mch = ctx.match!
            const d = await Groups.create({
                name: mch[1],
                servers: [],
                owner: ctx.session.user!.id!,
            })
            // const groups = ctx.session.user!.groups as number[]
            // groups.push(d.id)
            // await ctx.reply(JSON.stringify(groups))
            const u = ctx.session.user!.update({ groups: [1, 5, 6] })
            await ctx.reply(";mmmm;")
            await ctx.reply(JSON.stringify(u))
            await ctx.reply("✅ Group added:\n/groups", { reply_to_message_id: ctx.message?.message_id })
        }
    }


}


export default AddGroupService