import { Bot, InlineKeyboard, NextFunction } from "grammy";
import { MyContext } from "../..";
import Snippet from "../../database/models/snippets.model";


class ManageSnippetService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.callbackQuery(/^snippet:([0-9]+):delete$/, this.deleteSnippet)

        this.bot.callbackQuery(/^snippet:([0-9]+):edit:(label|script)$/, this.editSnippet)
        this.bot.on("message", this.editSnippetFinal)

        this.bot.callbackQuery(
            [
                /^snippet:([0-9]+)$/,
                /^snippet:([0-9]+):delete$/
            ],
            this.response
        )
    }


    // ############################

    private keyboard = async (snippet: Snippet | null) => {
        if (!snippet) return new InlineKeyboard()
        const keyboard = new InlineKeyboard()
            .text("❌ Delete", "snippet:" + snippet.id + ":delete")
            .row()

        keyboard
            .text("✏️ Label", "snippet:" + snippet.id + ":edit:label")
            .text("✏️ Script", "snippet:" + snippet.id + ":edit:script")
            .row()
            .text("↪️", "snippets")
            .text("🏠", "menu")

        return keyboard
    }

    standardOutput = (data: string) => {
        return data.replace("<", "&lt;").replace(">", "&gt;").replace("&", "&amp;")
    }

    private text = async (snippet: Snippet | null) => {
        if (!snippet) return '<i>Snippet deleted or not found</i>'
        return `📌 <b>${snippet.label}</b>
<code>${this.standardOutput(snippet.script)}</code>`
    }


    private response = async (ctx: MyContext) => {
        const snippetID = parseInt(ctx.match![1]);
        const snippet = await Snippet.findByPk(snippetID)

        await ctx.editMessageText(
            await this.text(snippet),
            { reply_markup: await this.keyboard(snippet), parse_mode: "HTML" }
        );
        await ctx.answerCallbackQuery();
        return
    }

    // ########################
    private async deleteSnippet(ctx: MyContext, _next: NextFunction) {
        const match = ctx.match!
        const snippetID = parseInt(match[1]);
        const snippet = await Snippet.findByPk(snippetID)
        if (!snippet) return await ctx.answerCallbackQuery("Not Found")
        await snippet.destroy()
        await ctx.answerCallbackQuery(`Deleted`)
        await _next()
    }


    private async editSnippet(ctx: MyContext) {
        const match = ctx.match!
        const snippetID = parseInt(match[1]);
        const param = match[2]

        const snippet = await Snippet.findByPk(snippetID)
        if (!snippet) return await ctx.answerCallbackQuery("Not Found")
        await ctx.answerCallbackQuery()

        ctx.session.inputState = {
            category: 'snippet',
            subID: snippetID!,
            parameter: param,
            messageID: ctx.callbackQuery?.message?.message_id!,
            data: null
        };
        await ctx.reply(`Send me <b>${param}</b> parameter for <b>${snippet.label}</b>:`, { parse_mode: 'HTML' })
    }
    private editSnippetFinal = async (ctx: MyContext, _next: NextFunction) => {
        if (!ctx.session.inputState) {
            await _next()
            return
        }
        const { category, subID, parameter, messageID } = ctx.session.inputState
        if (category !== 'snippet') {
            await _next()
            return
        }
        const snippetID = subID;
        const snippet = await Snippet.findByPk(snippetID)
        await snippet?.update({ [parameter]: ctx.message?.text })
        await ctx.reply(`Done`)
        // 
        const _snippet = (await Snippet.findByPk(snippetID))

        await ctx.api.editMessageText(
            ctx.chat?.id!,
            messageID!,
            await this.text(_snippet),
            { reply_markup: await this.keyboard(_snippet), parse_mode: "HTML" }
        )
        ctx.session.inputState = null
    }



}


export default ManageSnippetService