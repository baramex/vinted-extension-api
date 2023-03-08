const { Schema, model } = require("mongoose");
const { default: isEmail } = require("validator/lib/isEmail");
const { ObjectId } = require("mongodb");
const { hash, compare } = require("bcrypt");
const { ROLE_VALUES } = require("../utils/roles");
const { CustomError } = require("../utils/errors");

const PASSWORD_REGEX = /^(((?=.*[a-z])(?=.*[A-Z]))|((?=.*[a-z])(?=.*[0-9]))|((?=.*[A-Z])(?=.*[0-9])))(?=.{6,32}$)/;

const userSchema = new Schema({
    email: { type: String, trim: true, lowercase: true, required: true, validate: { validator: isEmail, message: "L'adresse email est invalide." } },
    confirmed: { type: Boolean, default: false },
    role: { type: Number, min: 0, max: Object.keys(ROLE_VALUES).length - 1, required: true },
    password: { type: String, trim: true },
    date: { type: Date, default: Date.now, required: true }
});

userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        if (!PASSWORD_REGEX.test(this.password)) throw new Error({ message: "Le mot de passe est invalide.", error: "InvalidPassword" });
        this.password = await hash(this.password, 10);
    }
    next();
});
userSchema.get("role", function () {
    return ROLE_VALUES[this.role];
});

const UserModel = model("User", userSchema, "users");

class User {
    static populate = "role";

    static async create(password, email, role) {
        return (await new UserModel({ password, email, role }).save()).populate(User.populate);
    }

    static hasPermission(user, ...permissions) {
        if (!permissions || permissions.length == 0) return true;
        if (!user) return false;
        return permissions.every(p => user.role.permissions?.includes(p)) || user.role.permissions?.includes(PERMISSIONS.ALL);
    }

    static getUserById(id) {
        return UserModel.findById(id).populate(User.populate);
    }

    static getAll() {
        return UserModel.find().populate(User.populate);
    }

    static async getMailList(...permissions) {
        const users = await UserModel.find({}, { email: 1, role: 1 }).populate(User.populate);
        return users.filter(p => User.hasPermission(p, ...permissions)).map(a => a.email);
    }

    static async check(email, password) {
        if (!email || !password) return false;
        const user = await UserModel.findOne({ email }).populate(User.populate);
        if (!user) return false;
        if (!user.password) return false;
        if (await compare(password, user.password)) return user;
        return false;
    }

    static getUserFields(user) {
        return { _id: user._id, email: user.email, role: user.role, date: user.date };
    }
}

class UserMiddleware {
    static parseParamsUser(...permissions) {
        return async (req, res, next) => {
            try {
                const id = req.params.id;
                if (!id || (id == "@me" ? false : !ObjectId.isValid(id))) throw new Error({ message: "Requête invalide.", error: "InvalidRequest" });

                if ((id == "@me" || req.user._id.equals(id)) ? false : !User.hasPermission(req.user, ...permissions)) throw new CustomError({ message: "Non autorisé.", error: "Unauthorized" }, 403);

                if (id == "@me" || req.user._id.equals(id)) req.paramsUser = req.user;
                else {
                    const user = await User.getUserById(id);
                    if (!user) throw new Error({ message: "Utilisateur introuvable.", error: "UserNotFound" });
                    req.paramsUser = user;
                }

                next();
            } catch (error) {
                console.error(error);
                res.status(error.status || 400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
            }
        }
    }

    static requiresPermissions(...permissions) {
        return (req, res, next) => {
            try {
                if (!req.user || !User.hasPermission(req.user, ...permissions)) throw new CustomError({ message: "Non autorisé.", error: "Unauthorized" }, 403);
                next();
            } catch (error) {
                console.error(error);
                res.status(error.status || 400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
            }
        }
    }
}

module.exports = { User, UserMiddleware };