const express = require("express");
const path = require("path");
const app = express();

app.use(express.static(path.resolve(__dirname, "./AssetBundles")));

const port = process.env.PORT || 8001;
app.listen(port);