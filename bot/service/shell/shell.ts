import { Bot, InlineKeyboard, NextFunction } from "grammy";
import { InlineQueryResult, ParseMode } from "grammy/out/types";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Server from "../../database/models/server.model";
import Snippet from "../../database/models/snippets.model";
import User from "../../database/models/user.model";
import EZssh from "./ssh";


class ShellService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    run() {
        this.bot.callbackQuery(/^server:([0-9]+):sshCheck$/, this.sshCheck)
        this.bot.callbackQuery(/^server:([0-9]+):openShell$/, this.openShell)


        this.bot.hears(/getFile:(.*)>(.*)$/, this.getFile)
        this.bot.on("message:text", this.writeCommand)

        this.bot.callbackQuery("shell:terminate", this.shellTerminate)

        this.bot.callbackQuery(/^shell:([0-9]+)$/, this.shellCommands)

        this.bot.inlineQuery(/^snippets:run:(.*)$/, this.runSnippet)

        this.bot
            .on(["message", "callback_query"], async (ctx, _next) => {
                if (ctx.session.ssh && ctx.session.ssh.isConnected()) {
                    if (ctx.answerCallbackQuery) await ctx?.answerCallbackQuery("❌ Error")
                    else await ctx.reply("❌ Error", { reply_to_message_id: ctx.message?.message_id })
                }
                else return await _next()
            })
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

        const isAuto = ctx.session.ssh.getAutoEnter()
        const isCrtl = ctx.session.ssh.getCrtlPressed()
        const isAlt = ctx.session.ssh.getAltPressed()


        _keyboard
            .text("🕹 Terminate", "shell:terminate")
            .row()
            .text(`${isAuto ? "🟢" : "⚪️"} Auto Enter`, "shell:autoEnter")
            .text("⏩ Enter", "shell:enter")
            .row()

            .text(`${isCrtl ? "🟢" : "⚪️"} CRTL`, "shell:crtl")
            .text(`${isAlt ? "🟢" : "⚪️"} ALT`, "shell:alt")
            .text("🔜 Tab", "shell:tab")
            .text("🔑 Pass", "shell:password")

            .row()

            .text("◀️", "shell:left")
            .text("🔼", "shell:up")
            .text("🔽", "shell:bottom")
            .text("▶️", "shell:right")

            .row()
            .switchInlineCurrent("📌 Snippets", "snippets:run: ")

        return _keyboard
    }


    shellResponseOptions = (ctx: MyContext) => {
        return {
            parse_mode: "HTML" as ParseMode,
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

    runSnippet = async (ctx: MyContext) => {
        const match = ctx.match!
        const search = parseInt(match[1]);

        const me = await User.findByPk(ctx.from!.id)
        const mySnippets = me!.snippets as number[]
        const tyu = [
            { id: { [Op.in]: mySnippets } },
            // { label: { [Op.like]: `%${search}%` } },
        ]

        const snips = await Snippet.findAll({
            where: { [Op.and]: tyu }
        })

        const g: InlineQueryResult[] = []
        snips.forEach(({ id, label, script }) => {
            g.push({
                type: "article",
                id: "run_snippet" + id,
                title: label,
                input_message_content: {
                    message_text: script,
                },
            })
        })

        await ctx.answerInlineQuery(g, { cache_time: 0 });
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


    // =================================> file
    getFile = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;

        const mch = ctx.match!
        const local = mch[1]
        const remote = mch[2]


        try {
            await ctx.api.editMessageReplyMarkup(
                ctx.chat?.id!,
                ctx.session.inputState?.messageID!,
                { reply_markup: new InlineKeyboard() }
            )
            await ctx.reply("Hello66")
            const ff = await ctx.session.ssh!.downloadFile(local, remote)

            await ctx.reply(JSON.stringify(ff))

            // const text = `<b>${server.name}</b> 📟\n\n<i>Response:</i>\n`


            // const messageID = (await ctx.reply(text, this.shellResponseOptions(ctx))).message_id
            // this.openShellSession(ctx, ctx.session.ssh!, server.id, messageID)
            // 
            // ctx.session.ssh!.writeCommand(command + "\n")
            // if (!canWrite) await ctx.deleteMessage()
        } catch (error) {
            await ctx.reply(JSON.stringify(error))
        }
    }

    uploadFile = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;
        try {
            ctx.session.ssh!.writeCommand("\n")
        } catch (error) {
            console.log("shellReload", error)
        }
    }
    // =================================> file


    // =================================> command
    writeCommand = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;

        let command = ctx.message?.text!
        const _ssh = ctx.session.ssh!

        try {
            await ctx.deleteMessage()
            // const text = `<b>${server.name}</b> 📟\n\n<i>Response:</i>\n`
            // await ctx.api.editMessageReplyMarkup(
            //     ctx.chat?.id!,
            //     ctx.session.inputState?.messageID!,
            //     { reply_markup: new InlineKeyboard() }
            // )

            // const messageID = (await ctx.reply(text, this.shellResponseOptions(ctx))).message_id
            // this.openShellSession(ctx, _ssh, server.id, messageID)
            if (_ssh.getAutoEnter()) command += "\n"

            _ssh.writeCommand(command)

        } catch (error) {
            console.log("writeCommand", error)
        }
    }



    shellTerminate = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;
        try {
            await this.exitCurrentShell(ctx)
            const _keyboard = new InlineKeyboard().text("❌ Closed")
            await ctx.editMessageReplyMarkup({ reply_markup: _keyboard })
        } catch (error) {
            console.log("shellTerminate", error)
        }
    }


    // ####


    shellCommands = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;

        const command = ctx.match![1]
        const _ssh = ctx.session.ssh!

        switch (command) {
            case 'enter':
                _ssh.writeCommand("\n")
                break;

            case 'autoEnter':
                _ssh.setAutoEnter()
                _ssh.writeCommand("\n")
                break;

            case 'crtl':
                _ssh.setCrtlPressed()
                _ssh.writeCommand("\n")
                break;

            case 'alt':
                _ssh.setAltPressed()
                _ssh.writeCommand("\n")
                break;

            case 'tab':
                _ssh.writeCommand("\n")
                break;

            case 'password':
                _ssh.writeCommand(server.password)
                break;

            case 'left':
                _ssh.writeCommand("\n")
                break;
            case 'up':
                _ssh.writeCommand("\n")
                break;
            case 'bottom':
                _ssh.writeCommand("\n")
                break;
            case 'right':
                _ssh.writeCommand("\n")
                break;
        }

        await ctx.answerCallbackQuery()
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



}


export default ShellService