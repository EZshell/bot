import { Bot, GrammyError, session, HttpError, Context, SessionFlavor } from "grammy";
import { UserFromGetMe } from "grammy/out/types";
import { DataTypes } from "sequelize";
import { BotToken, SuperAdmin } from "./config";
import sequelize from "./database";
import User from "./database/models/user.model";
import Authentication from "./middleware/authentication";




// Define the shape of our session.
interface SessionData {
    pizzaCount: number;
}
// Flavor the context type to include sessions.
type MyContext = Context & SessionFlavor<SessionData>;

const bot = new Bot<MyContext>(BotToken);

// Install session middleware, and define the initial session value.
function initial(): SessionData {
    return { pizzaCount: 0 };
}
bot.use(session({ initial }));
bot.use(Authentication);


// Handle the /start command.
bot.command("start", async (ctx) => {
    let _text = ''
    await ctx.reply(_text, { parse_mode: "HTML" })
});


bot.command("hunger", async (ctx) => {
    const count = ctx.session.pizzaCount;
    await ctx.reply(`Your hunger level is ${count}!`);
});

bot.hears(/.*🍕.*/, (ctx) => ctx.session.pizzaCount++);

// Handle other messages.
bot.on("message", (ctx) => ctx.reply("🤫"));


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