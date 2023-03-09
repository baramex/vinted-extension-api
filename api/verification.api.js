const { default: rateLimit } = require('express-rate-limit');
const { SessionMiddleware } = require('../models/session.model');
const { Verification, VERIFICATIONS_TYPE } = require('../models/verification.model');

const router = require('express').Router();

router.post("/verification/email/send", rateLimit({
    windowMs: 1000 * 30,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false
}), SessionMiddleware.requiresValidAuthExpress, async (req, res) => {
    try {
        if (req.user.confirmed) throw new Error({ message: "Votre adresse email est déjà vérifiée.", error: "AccountAlreadyConfirmed" });

        const email = req.user.email;
        const verif = await Verification.create(req.user._id, VERIFICATIONS_TYPE.EMAIL);
        const url = process.env.HOST + "/verification?code=" + verif.code;

        // TODO
        await mail.transporter.sendMail({
            from: "NAME <noreply@NAME.io>",
            to: email,
            subject: "[NAME] Veuillez vérifier votre adresse email",
            text: "⚠ Si vous n'êtes pas l'auteur de cette action, de rien faire.\n\nSinon, cliquez ici pour vérifier votre adrese email: " + url,
            html: header +
                `<p style="color: #f5760a;">⚠ Si vous n'êtes pas l'auteur de cette action, de rien faire.</p><br/>
                <a style="border-radius: 50px;background-color: #059669;border: none;outline: none;color: white;padding: 8px 15px;text-decoration: none;" href="${url}">Vérifier votre adresse email</a>`
                + footer
        });

        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(400).send(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});

router.post("/verification/verify", rateLimit({
    windowMs: 1000 * 30,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false
}), Middleware.requiresValidAuthExpress, async (req, res) => {
    try {
        if (req.user.confirmed) throw new Error({ message: "Votre adresse email est déjà vérifiée.", error: "AccountAlreadyConfirmed" });

        const code = req.body.code;
        if (typeof code != "string") throw new Error({ message: "Requête invalide.", error: "InvalidRequest" });

        const verif = await Verification.getValideCode(req.user._id, VERIFICATIONS_TYPE.EMAIL, code);
        if (!verif) throw new Error("Code invalide ou expiré.");

        req.user.confirmed = true;
        await req.user.save();

        await Verification.delete(code);

        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(400).send(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});

module.exports = router;