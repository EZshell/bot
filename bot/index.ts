import { Bot } from "grammy";
import { UserFromGetMe } from "grammy/out/types";
import { BotToken, SuperAdmin } from "./config";
import sequelize from "./database";
import User from "./database/models/user.model";

const bot = new Bot(BotToken);


// Handle the /start command.
bot.command("start", async (ctx) => {
    // const jane = await User.create({
    //     id: ctx.from?.id,
    //     first_name: ctx.from?.first_name,
    //     last_name: ctx.from?.last_name,
    //     username: ctx.from?.username,
    //     is_bot: ctx.from?.is_bot,
    //     is_premium: ctx.from?.is_premium,
    //     is_active: true,
    // });
    await ctx.reply("Hello Rasoul! Up and running.")
    // await ctx.reply(JSON.stringify(jane))
    // try {
    //     const users = await User.findAll();
    //     await ctx.reply(JSON.stringify(users))
    // } catch (error) {
    //     console.log("err", error)
    // }

});

// Handle other messages.
bot.on("message", (ctx) => ctx.reply("Got another message!"));



bot.start({
    onStart: async (info: UserFromGetMe) => {
        let _text = `<b>${info.first_name}(@${info.username})</b> is running well\n`
        try {
            await sequelize.authenticate();
            _text += `<b>Database:</b> Connected & running well`
        } catch (error) {
            _text += `<b>Database:</b> Unable to connect to the database (${error})`
        }
        bot.api.sendMessage(SuperAdmin, _text, { parse_mode: 'HTML' })
    }
});