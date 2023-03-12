const { ObjectId } = require("mongodb");
const { Schema, model } = require("mongoose");
const token = require("random-web-token");

const session = new Schema({
    refreshToken: String,
    token: String,
    user: { type: ObjectId, ref: "User", required: true, unique: true },
    ips: { type: [String], required: true },
    active: { type: Boolean, default: true, required: true },
    date: { type: Date, default: Date.now, required: true },
});

session.post("validate", async function (doc, next) {
    if (doc.isModified("active") || doc.isNew) {
        if (doc.active) {
            doc.token = token.genSync("extra", 30);
            doc.refreshToken = token.genSync("extra", 40);
            doc.date = new Date();

            doc.markModified("token");
            doc.markModified("refreshToken");
            doc.markModified("date");
        }
        else {
            doc.token = undefined;

            doc.markModified("token");
        }
    }
    next();
});

const SessionModel = model('Session', session, "sessions");

class Session {
    static expiresIn = 60 * 60 * 24 * 2;
    static expiresInRefresh = 60 * 60 * 24 * 7;
    static populate = {
        path: "user"
    };

    /**
     * 
     * @param {ObjectId} userId 
     * @param {String} ip 
     * @returns 
     */
    static async create(userId, ip) {
        return (await new SessionModel({ user: userId, ips: [ip] }).save()).populate(Session.populate);
    }

    static disable(session) {
        session.active = false;
        return session.save({ validateBeforeSave: true });
    }

    /**
     * 
     * @param {ObjectId} id 
     * @param {String} ip 
     */
    static addIp(id, ip) {
        return SessionModel.updateOne({ _id: id }, { $addToSet: { ips: ip } });
    }

    /**
     * 
     * @param {String} token 
     * @returns 
     */
    static getSessionByToken(token) {
        return SessionModel.findOne({ token, active: true }).populate(Session.populate);
    }

    /**
     * 
     * @param {String} refreshToken 
     * @returns 
     */
    static getSessionByRefreshToken(refreshToken) {
        return SessionModel.findOne({ refreshToken, active: true }).populate(Session.populate);
    }

    /**
     * 
     * @param {Date} date 
     */
    static checkExpired(date) {
        return new Date().getTime() - date.getTime() > Session.expiresIn * 1000;
    }

    /**
     * 
     * @param {ObjectId} userId 
     * @returns 
     */
    static getSessionByUserId(userId) {
        return SessionModel.findOne({ user: userId }).populate(Session.populate);
    }

    static update() {
        SessionModel.updateMany({ active: true, date: { $lt: new Date().getTime() - Session.expiresIn * 1000 } }, { $set: { active: false }, $unset: { token: true } }, { runValidators: true });
    }
}

class SessionMiddleware {
    static async checkValidAuth(cookies) {
        if (!cookies) throw new Error();

        const token = cookies.token;
        if (!token) throw new Error();

        const session = await Session.getSessionByToken(token);
        if (!session || !session.user || typeof session.user !== "object") throw new Error();
        if (!session.user.confirmed) throw new Error({ message: "Votre adresse email n'est pas vérifiée.", error: "AccountNotConfirmed" });
        if (Session.checkExpired(session.date)) throw new Error();

        return { user: session.user, session };
    }

    static async requiresValidAuthExpress(req, res, next) {
        try {
            const result = await SessionMiddleware.checkValidAuth(req.cookies);
            req.user = result.user;
            req.session = result.session;

            next();
        } catch (error) {
            console.error(error);
            res.clearCookie("token").status(401).json(error.message || { message: "Non authentifié.", error: "Unauthorized" });
        }
    }

    static async isValidAuthExpress(req, res, next) {
        try {
            await SessionMiddleware.checkValidAuth(req.cookies);
            req.isAuthed = true;
        } catch (error) {
            req.isAuthed = false;
        }
        next();
    }
}

setInterval(Session.update, 1000 * 60 * 30);
module.exports = { Session, SessionMiddleware };