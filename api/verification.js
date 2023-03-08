const { default: rateLimit } = require('express-rate-limit');
const { Middleware } = require('../models/session.model');
const { Verification, VERIFICATIONS_TYPE } = require('../models/verification.model');

const router = require('express').Router();

// TODO: CHANGE
router.post("/verification/email/send", rateLimit({
    windowMs: 1000 * 30,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false
}), Middleware.requiresValidAuthExpress, async (req, res) => {
    try {
        if (req.profile.email.isVerified) throw new Error("Adresse email déjà vérifiée.");

        const email = req.profile.email.address;
        const verif = await Verification.create(req.profile._id, VERIFICATIONS_TYPE.EMAIL);
        const url = process.env.HOST + "/verification/email?code=" + verif.code;

        await mail.transporter.sendMail({
            from: "ChatBlast <noreplay@chatblast.io>",
            to: email,
            subject: "[ChatBlast] Veuillez vérifier votre adresse email",
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

router.post("/verification/email/code", rateLimit({
    windowMs: 1000 * 30,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false
}), Middleware.requiresValidAuthExpress, async (req, res) => {
    try {
        if (req.profile.email.isVerified) throw new Error("Adresse email déjà vérifiée.");

        const code = req.body.code;
        if (typeof code != "string") throw new Error({ message: "Requête invalide.", error: "InvalidRequest" });

        const verif = await Verification.getValideCode(req.profile._id, VERIFICATIONS_TYPE.EMAIL, code);
        if (!verif) throw new Error("Code invalide ou expiré.");

        req.profile.email.isVerified = true;
        await req.profile.save();

        await Verification.delete(code);

        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.status(400).send(error.message || { message: "Une erreur est survenue.", error: "UnknownError" });
    }
});

module.exports = router;