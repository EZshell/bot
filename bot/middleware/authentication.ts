import { NextFunction } from "grammy";
import { MyContext } from "..";
import User from "../database/models/user.model";

async function Authentication(ctx: MyContext, next: NextFunction) {
    console.log("@@@@@@@@@@")
    const { user } = await ctx.getAuthor()

    console.log(user)
    let _user = await User.findByPk(user.id)
    if (_user) {
        await _user.update({
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
        })
        ctx.session.isNew = false
    } else {
        _user = await User.create({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            is_bot: user.is_bot,
            is_premium: user.is_premium || false,
            is_active: true,
            servers: []
        })
        ctx.session.isNew = true
    }

    ctx.session.user = _user;
    await next();
}


export default Authentication