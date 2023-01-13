import { Bot, GrammyError, HttpError } from "grammy";
import { UserFromGetMe } from "grammy/out/types";
import { DataTypes } from "sequelize";
import { BotToken, SuperAdmin } from "./config";
import sequelize from "./database";
import Book from "./database/models/book.model";
// import User from "./database/models/user.model";

const bot = new Bot(BotToken);


// Handle the /start command.
bot.command("start", async (ctx) => {
    await ctx.reply("Hi Rasoul! Up and running.")
    // await ctx.reply(JSON.stringify(jane))
    // try {
    //     const users = await User.findAll();
    //     await ctx.reply(JSON.stringify(users))
    // } catch (error) {
    //     console.log("err", error)
    // }





    // sequelize.sync().then(() => {
    // ctx.reply('Book table created successfully!');
    Book.create({
        title: "YESSSS Code",
        author: "Robert Cecil Martin",
        release_date: "2021-12-14",
        subject: 3
    }).then(res => {
        ctx.reply(JSON.stringify(res))
    }).catch((error) => {
        ctx.reply('Failed to create a new record : ' + error);
    });
    // }).catch((error) => {
    //     ctx.reply('Unable to create table : ', error);
    // });


});

// Handle other messages.
bot.on("message", (ctx) => ctx.reply("Got another message!"));


bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
        console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
        console.error("Could not contact Telegram:", e);
    } else {
        console.error("Unknown error:", e);
    }
});

bot.start({
    onStart: async (info: UserFromGetMe) => {
        let _text = `<b>${info.first_name}(@${info.username}):</b> Updated & lunched\n`
        try {
            await sequelize.authenticate();
            await sequelize.sync()
            _text += `<b>Database:</b> Connected & synced`
        } catch (error) {
            _text += `<b>Database:</b>\nUnable to connect (${error})`
        }
        bot.api.sendMessage(SuperAdmin, _text, { parse_mode: 'HTML' })
    }
});