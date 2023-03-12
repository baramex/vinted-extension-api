const { rateLimit } = require('express-rate-limit');
const { List, ListMiddleware } = require('../models/list.model');
const { Republication } = require('../models/republication.model');
const { SessionMiddleware } = require('../models/session.model');
const { UserMiddleware } = require('../models/user.model');
const { PERMISSIONS } = require('../utils/roles');

const router = require('express').Router();

router.post("/list", SessionMiddleware.requiresValidAuthExpress, UserMiddleware.requiresPermissions(PERMISSIONS.CREATE_LIST), async (req, res) => {
    try {
        if (!req.body) throw new Error({ message: "Requête invalide.", error: "InvalidRequest" });

        const { name, articles } = req.body;
        if (typeof name != "string" || !Array.isArray(articles)) throw new Error({ message: "Requête invalide.", error: "InvalidRequest" });

        const list = await List.create(name, req.user, articles);
        res.status(201).json(list);
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});

router.delete("/list/:id", SessionMiddleware.requiresValidAuthExpress, ListMiddleware.parseParamsList(PERMISSIONS.VIEW_LISTS, PERMISSIONS.MANAGE_LISTS), async (req, res) => {
    try {
        await req.list.delete();
        res.sendStatus(204);
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});

router.get("/list/:id", SessionMiddleware.requiresValidAuthExpress, ListMiddleware.parseParamsList(PERMISSIONS.VIEW_LISTS), async (req, res) => {
    try {
        res.status(200).json(req.list);
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});

router.patch("/list/:id", SessionMiddleware.requiresValidAuthExpress, ListMiddleware.parseParamsList(PERMISSIONS.VIEW_LISTS, PERMISSIONS.MANAGE_LISTS), async (req, res) => {
    try {
        if (!req.body) throw new Error({ message: "Requête invalide.", error: "InvalidRequest" });

        const { name, articles } = req.body;

        if (typeof name === "string") {
            req.list.name = name;
        }
        if (Array.isArray(articles)) {
            req.list.articles = articles;
        }

        await req.list.save();

        res.status(200).json(req.list);
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});

router.post("/list/:id/republish", rateLimit({
    windowMs: 1000 * 60 * 5,
    max: 2,
    standardHeaders: true,
    legacyHeaders: false
}), SessionMiddleware.requiresValidAuthExpress, ListMiddleware.parseParamsList(PERMISSIONS.VIEW_LISTS, PERMISSIONS.CREATE_REPUBLICATION), async (req, res) => {
    try {
        const n = await Republication.getTodayRepublications(req.user._id);
        if (n + req.list.articles.length > 100) throw new Error({ message: "Vous avez atteint la limite de republications journalières (100).", error: "LimitReached" });

        const republication = await Republication.create(req.user, req.list, typeof req.body?.type === "number" ? req.body.type : undefined);
        res.status(201).json(republication);
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});

module.exports = router;