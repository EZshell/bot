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
        })
    } else {
        await User.create({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            is_bot: user.is_bot ? 1 : 0,
            is_premium: user.is_premium ? 1 : 0,
            is_active: 1,
            servers: "[]"
        })
    }
    // ctx.user = User;
    await next();
}


export default Authentication