const { ObjectId } = require("mongodb");
const { Schema, model } = require("mongoose");
const { CustomError } = require("../utils/errors");
const { User } = require("./user.model");

const list = new Schema({
    name: { type: String, validate: { validator: /^[a-z0-9à-ÿ ]{1,64}$/i, message: "Le nom de la liste est invalide." }, required: true },
    user: { type: ObjectId, ref: "User", required: true },
    articles: {
        type: [{
            articleId: { type: ObjectId, unique: true, required: true },
            date: { type: Date, default: Date.now, required: true },
        }],
        required: true,
        default: []
    },
    date: { type: Date, default: Date.now, required: true },
});

const ListModel = model('List', list, "lists");

class List {
    static populate = "user";

    static async create(name, user, articles) {
        return (await new ListModel({ name, user, articles }).save()).populate(List.populate);
    }

    static getByUserId(userId) {
        return ListModel.find({ user: userId }).populate(List.populate);
    }

    static getById(id) {
        return ListModel.findById(id).populate(List.populate);
    }
}

class ListMiddleware {
    static parseParamsList(...permissions) {
        return async (req, res, next) => {
            try {
                const id = req.params.list_id;
                if (!id) throw new Error({ message: "Requête invalide.", error: "InvalidRequest" });

                const list = await List.getById(id);
                if (!list) throw new Error({ message: "Liste introuvable.", error: "ListNotFound" });
                if (!list.user._id.equals(req.user._id) && !User.hasPermission(req.user, ...permissions)) throw new CustomError({ message: "Non autorisé.", error: "Unauthorized" }, 403);
                req.list = list;

                next();
            } catch (error) {
                console.error(error);
                res.status(error.status || 400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
            }
        }
    }
}

module.exports = { List, ListMiddleware };