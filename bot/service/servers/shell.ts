import { Bot, InlineKeyboard, NextFunction } from "grammy";
import { MyContext } from "../..";
import Server from "../../database/models/server.model";
import EZssh from "./ssh";


class ShellService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    run() {
        this.bot.callbackQuery(/^server:([0-9]+):sshCheck$/, this.sshCheck)
        this.bot.callbackQuery(/^server:([0-9]+):openShell$/, this.openShell)

        this.bot.on("message:text", this.writeCommand)
        this.bot.callbackQuery("shell:exit", this.shellExit)
        this.bot.callbackQuery("shell:reload", this.shellReload)
        this.bot.callbackQuery("shell:cancel", this.shellCancel)
    }

    // ############################

    // ############# sshCheck
    sshCheck = async (ctx: MyContext) => {
        const match = ctx.match!
        const serverID = parseInt(match[1]);
        const server = await Server.findByPk(serverID)
        if (!server) return await ctx.answerCallbackQuery("Not Found")
        const ssh = new EZssh({
            host: server.ip,
            port: server.port,
            username: server.username,
            password: server.password,
        })
        try {
            await ssh.connect()
            const canConnect = ssh.isConnected()
            if (canConnect) ctx.answerCallbackQuery("Connected! ✅");
        } catch (error) {
            ctx.answerCallbackQuery("Can not connect ❌");
            ctx.reply("❌ ConnectionError: " + error)
        }
    }

    // ############ shell command
    shellKeyboard = (ctx: MyContext) => {
        const _keyboard = new InlineKeyboard()
        if (!ctx.session.ssh) {
            _keyboard
                .text("CONNECTING...")
            return _keyboard
        }
        // if (!ctx.session.ssh.isWritable()) {
        _keyboard
            .text("WAIT UNTIL COMPLETED (⛔️|🔚)" + ctx.session.ssh.isWritable() + "*")
            .row()
        // }

        _keyboard
            .text("📂", "shell:sftp")
            .text("🔄", "shell:reload")
            .text("⛔️", "shell:cancel")
            .text("🕹", "shell:exit")
            .row()
            .switchInlineCurrent("TAB", "shell:press:tab tex")

        return _keyboard
    }

    shellResponseOptions = (ctx: MyContext) => {
        return {
            // parse_mode: 'HTML',
            reply_markup: this.shellKeyboard(ctx),
            disable_web_page_preview: true
        }
    }

    openShellSession = (ctx: MyContext, ssh: EZssh, serverID: number, messageID: number) => {
        ctx.session.inputState = {
            category: 'shell',
            subID: serverID,
            parameter: 'command',
            messageID: messageID,
            data: ''
        }
        ctx.session.ssh = ssh
    }
    exitCurrentShell = async (ctx: MyContext) => {
        ctx.session.ssh?.exitShell()
        ctx.session.ssh = null
        ctx.session.inputState = null
    }

    standardOutput = (data: string) => {
        return data.replace("<", "&lt;").replace(">", "&gt;").replace("&", "&amp;")
    }

    sleep = async (func: () => {}, time = 3000) => {
        return new Promise((resolve, reject) => {
            setTimeout(func, time)
        })
    }


    openShell = async (ctx: MyContext) => {
        try {
            await this.exitCurrentShell(ctx)
        } catch (error) {
            console.log("@@@", error)
        }



        const match = ctx.match!
        const serverID = parseInt(match[1]);
        const server = await Server.findByPk(serverID)
        if (!server) return await ctx.answerCallbackQuery("Not Found")

        // create EZ server
        const ssh = new EZssh({
            host: server.ip,
            port: server.port,
            username: server.username,
            password: server.password,
        })
        try {

            await ssh.connect()
            const canConnect = ssh.isConnected()
            if (canConnect) ctx.answerCallbackQuery("Now shell is open! ✅");
            // 
            const connectingText = `<b>${server.name}</b> 📟\n\n<i>Connecting...</i>`
            const messageID = (await ctx.reply(connectingText, this.shellResponseOptions(ctx))).message_id
            this.openShellSession(ctx, ssh, serverID, messageID)

            await ssh.openShell(async (data) => {
                try {
                    const _data = this.standardOutput(data)
                    if (!ctx.session.inputState || !ctx.session.ssh) return
                    ctx.session.inputState.data += _data

                    const text = `<b>${server.name}</b> 📟\n\n<i>Response:</i>\n<code>${ctx.session.inputState.data}</code>`
                    if (text.length > 4000) {
                        await ctx.api.editMessageReplyMarkup(
                            ctx.chat?.id!,
                            ctx.session.inputState?.messageID!,
                            { reply_markup: new InlineKeyboard() }
                        )
                        ctx.session.inputState.data = _data
                        const text = `<b>${server.name}</b> 📟\n\n<i>Response:</i>\n<code>${ctx.session.inputState.data}</code>`
                        const messageID = (await ctx.reply(text, this.shellResponseOptions(ctx))).message_id
                        this.openShellSession(ctx, ssh, serverID, messageID)
                    }
                    else {
                        await ctx.api.editMessageText(
                            ctx.chat!.id,
                            ctx.session.inputState?.messageID!,
                            text,
                            this.shellResponseOptions(ctx)
                        );
                    }
                } catch (error) {
                    console.log("openShell:", error)
                }
            })
        } catch (error) {
            ctx.answerCallbackQuery("Can not connect ❌");
            ctx.reply("❌ ConnectionError: " + error)
        }
    }




    checkShellStatus = async (ctx: MyContext, _next: NextFunction) => {
        if (!ctx.session.inputState) {
            await _next()
            return
        }
        const { category, subID, parameter, messageID } = ctx.session.inputState
        if (category !== 'shell' && parameter !== 'parameter') {
            await _next()
            return
        }
        const serverID = subID;
        const server = await Server.findByPk(serverID)

        if (!server) {
            await ctx.reply(`<i>Server not found</i>`, { parse_mode: 'HTML' })
            return
        }
        if (!ctx.session.ssh) {
            await ctx.reply(`<i>Shell not found</i>`, { parse_mode: 'HTML' })
            return
        }
        return server
    }
    writeCommand = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;

        try {
            if (!ctx.session.ssh!.isWritable()) {
                await ctx.deleteMessage()
            }
            const text = `<b>${server.name}</b> 📟\n\n<i>Response:</i>\n`
            await ctx.api.editMessageReplyMarkup(
                ctx.chat?.id!,
                ctx.session.inputState?.messageID!,
                { reply_markup: new InlineKeyboard() }
            )
            const messageID = (await ctx.reply(text, this.shellResponseOptions(ctx))).message_id
            this.openShellSession(ctx, ctx.session.ssh!, server.id, messageID)
            // 
            const canWrite = ctx.session.ssh!.writeCommand(ctx.message?.text! + "\n")
            if (!canWrite) await ctx.deleteMessage()
        } catch (error) {
            console.log("writeCommand", error)
        }
    }

    shellExit = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;
        try {
            await this.exitCurrentShell(ctx)
            const _keyboard = new InlineKeyboard().text("❌ Closed")
            await ctx.editMessageReplyMarkup({ reply_markup: _keyboard })
        } catch (error) {
            console.log("shellExit", error)
        }
    }


    shellCancel = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;
        try {
            ctx.session.ssh!.writeCommand("\x03")
        } catch (error) {
            console.log("shellCancel", error)
        }
    }

    shellReload = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;
        try {
            ctx.session.ssh!.writeCommand("\n")
        } catch (error) {
            console.log("shellReload", error)
        }
    }
}


export default ShellService