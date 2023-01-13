// import { Bot } from "grammy";
import { Bot } from "https://deno.land/x/grammy@v1.13.0/mod.ts";

const bot = new Bot("5663656105:AAGutWXLmJmKETpCNfh6K92XKvFpMnyELOY"); // <-- put your authentication token between the ""


// Handle the /start command.
bot.command("start", (ctx) => ctx.reply("Hello! Up and running."));
// Handle other messages.
bot.on("message", (ctx) => ctx.reply("Got another message!"));


bot.start();