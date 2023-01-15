import { Bot, NextFunction } from "grammy";
import { MyContext } from "../..";
import Snippets, { SnippetInputType } from "../../database/models/snippets.model";


class AddSnippetService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.inlineQuery(/^snippets:add:\n(.*)\n(.*)$/, this.response)
        this.bot.hears(/#new_snippet\n(.*)\n(.*)/, this.saveSnippet)
    }

    // ############################

    private snippet: SnippetInputType | undefined;

    private text = async (ctx: MyContext) => {
        const snippet = this.snippet!
        return `#new_snippet
<b>${snippet.label}</b>
<code>${snippet.script}</code>`
    }

    private response = async (ctx: MyContext) => {
        const match = ctx.match!

        this.snippet = {
            label: match[1],
            script: match[2],
        }

        await ctx.answerInlineQuery(
            [
                {
                    type: "article",
                    id: "new_snippet",
                    title: this.snippet.label,
                    input_message_content: {
                        message_text: await this.text(ctx),
                        parse_mode: "HTML",
                    },
                    description: this.snippet.script,
                },
            ],
            { cache_time: 0, },
        );

    }


    private async saveSnippet(ctx: MyContext, _next: NextFunction) {
        if (!ctx!.message!.via_bot) return await _next()
        else if (ctx.match?.length !== 3) {
            await ctx.reply("❌ Getting data error", { reply_to_message_id: ctx.message?.message_id })
        }
        else {
            const mch = ctx.match!
            const d = await Snippets.create({
                label: mch[1],
                script: mch[2]
            })
            const snippets = ctx.session.user!.snippets as number[]
            snippets.push(d.id)
            ctx.session.user!.update({ snippets })
            await ctx.reply("✅ Snippets added:\n/snippets", { reply_to_message_id: ctx.message?.message_id })
        }
    }


}


export default AddSnippetService