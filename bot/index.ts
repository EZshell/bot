import { Bot, GrammyError, session, HttpError, Context, SessionFlavor } from "grammy";
import { UserFromGetMe } from "grammy/out/types";
import { DataTypes } from "sequelize";
import { BotToken, SuperAdmin } from "./config";
import sequelize from "./database";
import User from "./database/models/user.model";
import Authentication from "./middleware/authentication";
import MenuService from "./service/menu";
import ServersService from "./service/servers";
import EZssh from "./service/shell/ssh";
import { apiThrottler, bypassThrottler } from '@grammyjs/transformer-throttler';
import { run } from "@grammyjs/runner";
import SnippetsService from "./service/snippets";


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

// Outgoing Global Throttler
const globalConfig = {
    reservoir: 30, // number of new jobs that throttler will accept at start
    reservoirRefreshAmount: 30, // number of jobs that throttler will accept after refresh
    reservoirRefreshInterval: 1000, // interval in milliseconds where reservoir will refresh
};

// Outgoing Group Throttler
const groupConfig = {
    maxConcurrent: 1, // only 1 job at a time
    minTime: 1000, // wait this many milliseconds to be ready, after a job
    reservoir: 20, // number of new jobs that throttler will accept at start
    reservoirRefreshAmount: 20, // number of jobs that throttler will accept after refresh
    reservoirRefreshInterval: 60000, // interval in milliseconds where reservoir will refresh
};

// Outgoing Private Throttler
const outConfig = {
    maxConcurrent: 3, // only 1 job at a time
    minTime: 250, // wait this many milliseconds to be ready, after a job
};

// ###################################################

const bot = new Bot<MyContext>(BotToken);

const throttler = apiThrottler({ global: globalConfig, group: groupConfig, out: outConfig });
bot.api.config.use(throttler);


// Handle the /update command.
bot
    .filter(ctx => ctx.from?.id === SuperAdmin)
    .command("update", async (ctx) => {
        const info = ctx.me;
        let _text = `<b>${info.first_name}(@${info.username}):</b> Updated & lunched\n`
        try {
            await sequelize.authenticate()
            await sequelize.sync()
            _text += `<b>Database:</b> Connected & synced`
        } catch (error) {
            _text += `<b>Database:</b>\nUnable to connect (${error})`
        }
        bot.api.sendMessage(SuperAdmin, _text, { parse_mode: 'HTML' })
    });


bot.use(session({ initial }));
bot
    .filter((ctx) => ctx.message !== undefined || ctx.callbackQuery !== undefined)
    .use(Authentication);


// Handle the /start command.
bot.command("start", async (ctx) => {
    ctx.session.inputState = null
    ctx.session.ssh?.exitShell()
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
new SnippetsService(bot).run();



// Handle other messages.
bot.on("message", (ctx) => ctx.reply("🤫"));
bot.on("inline_query", (ctx) => ctx.answerInlineQuery([]));
bot.on("callback_query", (ctx) => ctx.answerCallbackQuery("Sorry :( " + ctx.callbackQuery.data));

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



run(bot);