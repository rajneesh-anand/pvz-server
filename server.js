const express = require("express");
const cors = require("cors");
const path = require("path");
const user = require("./routes/user");
const coin = require("./routes/coin");
const product = require("./routes/product");
const message = require("./routes/message");

require("dotenv").config();

const app = express();
// const port = process.env.PORT || 8800;
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(
  express.urlencoded({ parameterLimit: 100000, limit: "50mb", extended: true })
);
app.set("view engine", "ejs");
app.set("views", "views");

let allowedDomains = [
  "http://localhost:8800",
  "http://194.67.90.60:8800",
  "http://194.67.90.60",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedDomains.indexOf(origin) === -1) {
        var msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`;
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

app.get("/", (req, res) => {
  res.render("index", { message: null });
});
app.use("/api/user", user);
app.use("/api/coin", coin);
app.use("/api/product", product);
app.use("/api/message", message);

var server = app.listen(8800, () => {
  console.log(`Server is running on port 8800`);
});

server.setTimeout(1000 * 60 * 5);
