/* config */
require("dotenv").config();

/* database */
const mongoose = require("mongoose");
mongoose.connect(process.env.DB, { dbName: process.env.DB_NAME });

/* constantes */
const PORT = 8300;

/* express */
const express = require("express");
const app = express();

/* middleware */
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

/* server */
app.listen(PORT, () => {
    console.log("Serveur lancé sur le port: " + PORT);
});

/* routes */
app.use("/",
    require("./api/user.api"),
    require("./api/authentification.api")
);

module.exports = { app };