// import { Bot } from "grammy";

// import sequelize from "./database";
// import User from "./database/models/user.model";


import { Bot } from "https://deno.land/x/grammy@v1.13.0/mod.ts";


const bot = new Bot("5663656105:AAGutWXLmJmKETpCNfh6K92XKvFpMnyELOY"); // <-- put your authentication token between the ""


// Handle the /start command.
bot.command("start", async (ctx) => {
    ctx.reply("Hello Rasoul! Up and running.")
    // try {
    //     await sequelize.authenticate();
    //     ctx.reply('Connection has been established successfully.');
    // } catch (error) {
    //     ctx.reply('Unable to connect to the database:' + error);
    // }
});
// Handle other messages.
bot.on("message", (ctx) => ctx.reply("Got another message!"));


bot.start();