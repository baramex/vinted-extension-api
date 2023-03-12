const { RepublicationMiddleware } = require('../models/republication.model');
const { SessionMiddleware } = require('../models/session.model');
const { PERMISSIONS } = require('../utils/roles');

const router = require('express').Router();

router.get("/republication/:id", SessionMiddleware.requiresValidAuthExpress, RepublicationMiddleware.parseParamsRepublication(PERMISSIONS.VIEW_REPUBLICATIONS), async (req, res) => {
    try {
        res.status(200).json(req.republication);
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});

router.patch("/republication/:id", SessionMiddleware.requiresValidAuthExpress, RepublicationMiddleware.parseParamsRepublication(PERMISSIONS.VIEW_REPUBLICATIONS, PERMISSIONS.MANAGE_REPUBLICATIONS), async (req, res) => {
    try {
        if (!req.body) throw new Error({ message: "Requête invalide.", error: "InvalidRequest" });

        const { state, remainingArticles, processedArticles } = req.body;

        if (typeof state === "number") {
            req.republication.state = state;
        }
        if (Array.isArray(remainingArticles)) {
            req.republication.remainingArticles = remainingArticles;
        }
        if (Array.isArray(processedArticles)) {
            req.republication.processedArticles = processedArticles;
        }

        await req.republication.save();

        res.status(200).json(req.republication);
    }
    catch (error) {
        console.error(error);
        res.status(400).json(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});