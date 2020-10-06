const express = require("express");

require("dotenv").config();

const app = express();

app.get("/", (req, res) => {
  res.send("index");
});


app.listen({ port: process.env.PORT }, () => console.log("running"));