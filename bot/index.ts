import { Bot, GrammyError, HttpError } from "grammy";
import { UserFromGetMe } from "grammy/out/types";
import { DataTypes } from "sequelize";
import { BotToken, SuperAdmin } from "./config";
import sequelize from "./database";
// import User from "./database/models/user.model";

const bot = new Bot(BotToken);


// Handle the /start command.
bot.command("start", async (ctx) => {
    await ctx.reply("Hello Rasoul! Up and running.")
    // await ctx.reply(JSON.stringify(jane))
    // try {
    //     const users = await User.findAll();
    //     await ctx.reply(JSON.stringify(users))
    // } catch (error) {
    //     console.log("err", error)
    // }
    sequelize.authenticate().then(() => {
        ctx.reply('Connection has been established successfully.');
    }).catch((error) => {
        ctx.reply('Unable to connect to the database: ' + error);
    });


    const Book = sequelize.define("books", {
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        author: {
            type: DataTypes.STRING,
            allowNull: false
        },
        release_date: {
            type: DataTypes.DATEONLY,
        },
        subject: {
            type: DataTypes.INTEGER,
        }
    });

    sequelize.sync().then(() => {
        ctx.reply('Book table created successfully!');
    }).catch((error) => {
        ctx.reply('Unable to create table : ', error);
    });
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