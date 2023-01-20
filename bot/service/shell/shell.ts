import { Bot, InlineKeyboard, NextFunction, InputFile } from "grammy";
import { InlineQueryResult, ParseMode } from "grammy/out/types";
import { Op } from "sequelize";
import { MyContext } from "../..";
import Server from "../../database/models/server.model";
import Snippet from "../../database/models/snippets.model";
import User from "../../database/models/user.model";
import EZssh from "./ssh";
import { createReadStream, createWriteStream, unlinkSync, writeFileSync } from "fs";
import http from "http"
import { BotToken } from "../../config";


class ShellService {
    private bot;
    constructor(bot: Bot<MyContext>) {
        this.bot = bot;
    }

    run() {
        this.bot.callbackQuery(/^server:([0-9]+):sshCheck$/, this.sshCheck)
        this.bot.callbackQuery(/^server:([0-9]+):openShell$/, this.openShell)

        this.bot.callbackQuery(/^sendFile:cancel$/, this.sendFileCancel)
        this.bot.inlineQuery(/^sendFile:(.*)$/, this.sendFileInline)
        this.bot.hears(/sendFile:(.*)$/, this.sendFile)
        this.bot.on("message:document", this.uploadFile)

        this.bot.inlineQuery(/^getFile:(.*)$/, this.getFileInline)
        this.bot.hears(/getFile:(.*)$/, this.getFile)


        this.bot.on("message:text", this.writeCommand)

        this.bot.callbackQuery("shell:terminate", this.shellTerminate)

        this.bot.callbackQuery(/^shell:(.*)$/, this.shellCommands)

        this.bot.inlineQuery(/^snippets:run:(.*)$/, this.runSnippet)

        this.bot.on("message", async (ctx, _next) => {
            if (ctx.session.ssh && ctx.session.ssh.isConnected()) {
                await ctx.deleteMessage()
                return
            }
            return await _next()
        })

        this.bot.on("callback_query", async (ctx, _next) => {
            if (ctx.session.ssh && ctx.session.ssh.isConnected()) {
                await ctx.answerCallbackQuery("❌ Error: Shell is open")
                return
            }
            return await _next()
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
            .text("⬅️ Del", "shell:backspace")
            .row()

            .text(`${isCrtl ? "🟢" : "⚪️"} CRTL`, "shell:crtl")
            .text(`${isAlt ? "🟢" : "⚪️"} ALT`, "shell:alt")
            .text("📝 Tab3", "shell:tab")
            .text("🔑 Pass", "shell:password")

            // .row()
            // .text("◀️", "shell:left")
            // .text("🔼", "shell:up")
            // .text("🔽", "shell:bottom")
            // .text("▶️", "shell:right")

            .row()
            .switchInlineCurrent("📌 Snippets", "snippets:run: ")
            .switchInlineCurrent("📥 Receive", "getFile:path")
            .switchInlineCurrent("📤 Send", "sendFile:path")

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


    openShell = async (ctx: MyContext, _next: NextFunction) => {
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
                if (data === "Exit") {
                    const _keyboard = new InlineKeyboard().text("❌ Closed")
                    await ctx.api.editMessageReplyMarkup(
                        ctx.chat!.id,
                        ctx.session.inputState?.messageID!,
                        { reply_markup: _keyboard }
                    );
                    return
                }

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
        if (category !== 'shell') {
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
    sendFileInline = async (ctx: MyContext) => {
        const match = ctx.match!

        const filePath = match[1];
        const ff = filePath.split("/")
        const fileName = ff[ff.length - 1]

        const g: InlineQueryResult[] = []
        g.push({
            type: "article",
            id: "send_file" + filePath,
            title: "📤 " + fileName,
            input_message_content: {
                message_text: "sendFile:" + filePath,
            },
            description: "PATH: " + filePath
        })
        await ctx.answerInlineQuery(g, { cache_time: 0 });
    }

    sendFile = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;

        await ctx.deleteMessage()

        try {
            const t = ctx.session.inputState?.parameter.split("->")
            if (t.length === 3 && t[0] === 'upload') {
                await ctx.api.deleteMessage(ctx.chat?.id!, t[2])
            }
        } catch (error) { }


        try {
            const mch = ctx.match!
            const filePath = mch[1];

            const _keyboard = new InlineKeyboard()
                .text("❌ Cancel", "sendFile:cancel")
            const msg = (await ctx.reply(`Upload path: ${filePath || "."}\nNow send your file to upload`, { reply_markup: _keyboard })).message_id

            ctx.session.inputState!.parameter = `upload->${filePath}->${msg}`

        } catch (error) {
            const msg = (await ctx.reply("❌ File not found or path is invalid:\n" + error)).message_id
            setTimeout(async () => {
                await ctx.api.deleteMessage(ctx.chat?.id!, msg)
            }, 5000)
        }
    }


    sendFileCancel = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;

        try {
            const t = ctx.session.inputState?.parameter.split("->")
            if (t.length === 3 && t[0] === 'upload') {
                await ctx.api.deleteMessage(ctx.chat?.id!, t[2])
                ctx.session.inputState!.parameter = 'command'
            }
        } catch (error) {

        }
    }

    uploadFile = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;

        const t = ctx.session.inputState?.parameter.split("->")
        if (t.length !== 3 || t[0] !== 'upload') {
            return await _next()
        }

        await ctx.deleteMessage()

        try {

            const filePath = t[1]

            const file = await ctx.getFile()
            const path = await file.download()


            await ctx.session.ssh?.uploadFile(path, filePath)

            ctx.session.inputState!.parameter = 'command'

            const msg = (await ctx.reply("✅ File uploaded")).message_id

            setTimeout(async () => {
                await ctx.api.deleteMessage(ctx.chat?.id!, msg)
                await ctx.api.deleteMessage(ctx.chat?.id!, t[2])
            }, 5000)
        }
        catch (error) {
            const msg = await ctx.reply("❌ Error uploading or path is invalid:\n" + error)
            setTimeout(async () => {
                await ctx.api.deleteMessage(ctx.chat?.id!, msg.message_id)
            }, 5000)
        }
    }

    // @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

    getFileInline = async (ctx: MyContext) => {
        const match = ctx.match!

        const filePath = match[1];
        const ff = filePath.split("/")
        const fileName = ff[ff.length - 1]

        const g: InlineQueryResult[] = []
        g.push({
            type: "article",
            id: "get_file" + filePath,
            title: "📥 " + fileName,
            input_message_content: {
                message_text: "getFile:" + filePath,
            },
            description: "PATH: " + filePath
        })
        await ctx.answerInlineQuery(g, { cache_time: 0 });
    }


    getFile = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;

        await ctx.deleteMessage()

        try {
            const mch = ctx.match!
            const tempName = Date.now()

            const filePath = mch[1];
            const ffm = filePath.split("/");
            const fileName = ffm[ffm.length - 1]
            const saveTo = `temp/${tempName}@${ffm[ffm.length - 1]}`

            await ctx.session.ssh!.downloadFile(saveTo, filePath)


            const msg1 = await ctx.reply("📥 File received:")
            const msg2 = await ctx.replyWithDocument(new InputFile(createReadStream(saveTo), fileName))
            unlinkSync(saveTo)
            setTimeout(async () => {
                await ctx.api.deleteMessage(ctx.chat?.id!, msg1.message_id)
                // await ctx.api.deleteMessage(ctx.chat?.id!, msg2.message_id)
            }, 5000)
        } catch (error) {
            const msg = await ctx.reply("❌ File not found or path is invalid:\n" + error)
            setTimeout(async () => {
                await ctx.api.deleteMessage(ctx.chat?.id!, msg.message_id)
            }, 5000)
        }
    }


    // =================================> file


    // =================================> command
    specialCommands = (command: string, crtl = false, alt = false) => {
        // const withCrtl: { string: string } = {
        //     'Ahhh': "\x01"
        // }
        return command
    }
    writeCommand = async (ctx: MyContext, _next: NextFunction) => {
        const server = await this.checkShellStatus(ctx, _next)
        if (!server) return;

        const t = ctx.session.inputState?.parameter
        if (t !== 'command') {
            return await _next()
        }

        let command = ctx.message?.text!
        const _ssh = ctx.session.ssh!
        try {
            await ctx.deleteMessage()

            if (_ssh.getCrtlPressed() && _ssh.getAltPressed()) {
                command = this.specialCommands(command, true, true)
                _ssh.setCrtlPressed()
                _ssh.setAltPressed()
            }
            else if (_ssh.getCrtlPressed()) {
                command = this.specialCommands(command, true, false)
                _ssh.setCrtlPressed()
            }
            else if (_ssh.getAltPressed()) {
                command = this.specialCommands(command, false, true)
                _ssh.setAltPressed()
            }

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
                _ssh.writeCommand("\x00")
                break;

            case 'crtl':
                _ssh.setCrtlPressed()
                _ssh.writeCommand("\x00")
                break;

            case 'alt':
                _ssh.setAltPressed()
                _ssh.writeCommand("\x00")
                break;

            case 'backspace':
                _ssh.writeCommand("\x7F")
                _ssh.writeCommand("\x08")
                break;

            case 'tab':
                _ssh.writeCommand("\x09")
                break;

            case 'password':
                _ssh.writeCommand(server.password)
                break;

            // case 'left':
            //     _ssh.writeCommand("^[[D")
            //     break;
            // case 'up':
            //     _ssh.writeCommand("^[[A")
            //     break;
            // case 'bottom':
            //     _ssh.writeCommand("^[[B")
            //     break;
            // case 'right':
            //     _ssh.writeCommand("^[[C")
            //     break;
        }

        await ctx.answerCallbackQuery()
    }



}


export default ShellService
