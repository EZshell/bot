import { Bot, GrammyError, session, HttpError, Context, SessionFlavor } from "grammy";
import { UserFromGetMe } from "grammy/out/types";
import { DataTypes } from "sequelize";
import { BotToken, SuperAdmin } from "./config";
import sequelize from "./database";
import User from "./database/models/user.model";
import Authentication from "./middleware/authentication";
import MenuService from "./service/menu";
import ServersService from "./service/servers/servers";
import EZssh from "./service/servers/ssh";
import { apiThrottler, bypassThrottler } from '@grammyjs/transformer-throttler';
import { run } from "@grammyjs/runner";


interface InputState {
    category: string;
    subID: number,
    parameter: string;
    messageID: number | null;
    data: string | null;
}

// Define the shape of our session.
interface SessionData {
    user: User | null;
    isNew: boolean;
    inputState: InputState | null;
    ssh: EZssh | null;
    delay: number
}
export type MyContext = Context & SessionFlavor<SessionData>;



// Install session middleware, and define the initial session value.
function initial(): SessionData {
    return {
        user: null,
        isNew: true,
        inputState: null,
        ssh: null,
        delay: 0
    };
}


// ###################################################

const bot = new Bot<MyContext>(BotToken);

const throttler = apiThrottler();
bot.api.config.use(throttler);

bot.use(session({ initial }));
bot
    .filter((ctx) => ctx.message !== undefined || ctx.callbackQuery !== undefined)
    .use(Authentication);


// Handle the /start command.
bot.command("start", async (ctx) => {
    ctx.session.inputState = null
    await ctx.session.ssh?.exitShell()
    ctx.session.ssh = null

    // 
    const { user, isNew } = ctx.session
    let _text = ``
    if (isNew) {
        _text = `Hello Dear <b>${user?.first_name}</b>!`
        _text += `\nWelcome, Hope to have a good experience`
    } else {
        _text = `Dear <b>${user?.first_name}</b>!`
        _text += `\nWelcome back ;)`
    }

    _text += `\n\nPress /menu`
    await ctx.reply(_text, { parse_mode: "HTML" })
});

// services
new MenuService(bot).run();
new ServersService(bot).run();




// Handle other messages.
bot.on("message", (ctx) => ctx.reply("🤫"));
bot.on("inline_query", (ctx) => ctx.answerInlineQuery([]));
bot.on("callback_query", (ctx) => ctx.answerCallbackQuery("Sorry :("));

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

// bot.start({
//     onStart: async (info: UserFromGetMe) => {
//         let _text = `<b>${info.first_name}(@${info.username}):</b> Updated & lunched\n`
//         try {
//             await sequelize.authenticate();
//             await sequelize.sync()
//             _text += `<b>Database:</b> Connected & synced`
//         } catch (error) {
//             _text += `<b>Database:</b>\nUnable to connect (${error})`
//         }
//         bot.api.sendMessage(SuperAdmin, _text, { parse_mode: 'HTML' })
//     }
// });

run(bot);