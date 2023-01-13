import { Context, NextFunction } from "grammy";
import User from "../database/models/user.model";

async function Authentication(ctx: Context, next: NextFunction) {
    const { user } = await ctx.getAuthor()
    const IUser = await User.findByPk(user.id)
    if (IUser) {
        await IUser.update({
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            last_online: Date.now()
        })
    } else {
        await User.create({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            is_bot: user.is_bot,
            is_premium: user.is_premium,
            last_online: Date.now()
        })
    }
    // ctx.user = User;
    await next();
}


export default Authentication