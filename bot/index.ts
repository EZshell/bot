import { Bot } from "grammy";
import { UserFromGetMe } from "grammy/out/types";
import { BotToken, SuperAdmin } from "./config";
import sequelize from "./database";
import User from "./database/models/user.model";

const bot = new Bot(BotToken);


// Handle the /start command.
bot.command("start", async (ctx) => {
    ctx.reply("Hello Jigar! Up and running.")

});

// Handle other messages.
bot.on("message", (ctx) => ctx.reply("Got another message!"));



bot.start({
    onStart: async (info: UserFromGetMe) => {
        let _text = `<b>${info.first_name} ${info.last_name}</b> is running ...\n`
        try {
            await sequelize.authenticate();
            _text = `<b>Database:</b> is connected & running well`
        } catch (error) {
            _text = `<b>Database:</b> Unable to connect to the database (${error})`
        }
        bot.api.sendMessage(SuperAdmin, _text, { parse_mode: 'HTML' })
    }
});