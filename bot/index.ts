import { Bot } from "grammy";

const bot = new Bot("5663656105:AAGutWXLmJmKETpCNfh6K92XKvFpMnyELOY"); // <-- put your authentication token between the ""


// Handle the /start command.
bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));
// Handle other messages.
bot.on("message", (ctx) => ctx.reply("Got another message!"));


bot.start();