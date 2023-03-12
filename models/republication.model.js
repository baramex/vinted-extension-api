const { ObjectId } = require("mongodb");
const { Schema, model } = require("mongoose");
const { CustomError } = require("../utils/errors");
const { User } = require("./user.model");

const REPUBLICATION_STATES = {
    PENDING: 0,
    CANCELED: 1,
    COMPLETED: 2,
};

const REPUPLICATION_TYPES = {
    NORMAL: 0,
    ONE_BY_ONE: 1,
}

const republication = new Schema({
    user: { type: ObjectId, ref: "User", required: true },
    state: { type: Number, min: 0, max: Object.values(REPUBLICATION_STATES).length - 1, required: true, default: REPUBLICATION_STATES.PENDING },
    type: { type: Number, min: 0, max: Object.values(REPUPLICATION_TYPES).length - 1, required: true, default: REPUPLICATION_TYPES.NORMAL },
    remainingArticles: {
        type: [{
            articleId: { type: ObjectId, unique: true, required: true },
            date: { type: Date, default: Date.now, required: true },
        }],
        required: true
    },
    processedArticles: {
        type: [{
            oldArticleId: { type: ObjectId, unique: true, required: true },
            articleId: { type: ObjectId, unique: true, required: true },
            date: { type: Date, default: Date.now, required: true },
        }],
        required: true,
        default: []
    },
    initialList: { type: ObjectId, ref: "List", required: true },
    date: { type: Date, default: Date.now, required: true },
});

const RepublicationModel = model('Republication', republication, "republications");

class Republication {
    static populate = "user";

    static async create(user, list, type) {
        return (await new RepublicationModel({ user, initialList: list._id, remainingArticles: list.articles, type }).save()).populate(Republication.populate);
    }

    static getByUserId(userId) {
        return RepublicationModel.find({ user: userId }).populate(Republication.populate);
    }

    static getById(id) {
        return RepublicationModel.findById(id).populate(Republication.populate);
    }

    static async getTodayRepublications(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const republications = await RepublicationModel.find({ user: userId, date: { $gte: today } }, { remainingArticles: true, processedArticles: true });

        return republications.map(r => r.remainingArticles.length + r.processedArticles.length).reduce((a, b) => a + b, 0) || 0;
    }
}

class RepublicationMiddleware {
    static parseParamsRepublication(...permissions) {
        return async (req, res, next) => {
            try {
                const id = req.params.republication_id;
                if (!id) throw new Error({ message: "Requête invalide.", error: "InvalidRequest" });

                const republication = await Republication.getById(id);
                if (!republication) throw new Error({ message: "Republication introuvable.", error: "RepublicationNotFound" });
                if (!republication.user._id.equals(req.user._id) && !User.hasPermission(req.user, ...permissions)) throw new CustomError({ message: "Non autorisé.", error: "Unauthorized" }, 403);
                req.republication = republication;

                next();
            } catch (error) {
                console.error(error);
                res.status(error.status || 400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
            }
        }
    }
}

module.exports = { Republication, RepublicationMiddleware };