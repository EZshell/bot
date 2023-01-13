import { Bot, InlineKeyboard } from "grammy";
import { MyContext } from "..";


class MenuService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    public run() {
        this.bot.command("menu", this.response)
        this.bot.callbackQuery("menu", this.response)
    }

    // ############################3

    private keyboard = async (ctx: MyContext) => {
        const keyboard = new InlineKeyboard()
            .text("🖥 My Servers", "servers")
            .row()
            .url("💬 Support", "EZshellAdmin.t.me")
        return keyboard
    }

    private text = async (ctx: MyContext) => {
        return `🔻 Choose:`
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