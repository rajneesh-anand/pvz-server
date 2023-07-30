const express = require("express");
const admin = require("firebase-admin");
const { getMessaging } = require("firebase-admin/messaging");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const router = express.Router();
const messaging = getMessaging();

router.get("/fcm-message", async (req, res) => {
  const topic = "weather";

  const message = {
    notification: {
      title: "FooCorp up 1.43% on the day",
      body: "FooCorp gained 11.80 points to close at 835.67, up 1.43% on the day.",
    },
    topic: topic,
  };

  try {
    const response = await messaging.send(message);
    console.log(response);
    return res.status(200).json({ response });
  } catch (error) {
    console.log("Error sending message:", error);
    return res.status(400).json({ message: error.message });
  }
});

router.post("/post-message", (req, res) => {
  const { fname, lname } = req.body;
  console.log(fname);
  console.log(lname);
  res.render("index", { id: fname });
});
router.get("/testing", (req, res) => {
  return res.status(200).json({ message: "hello" });
});

module.exports = router;
