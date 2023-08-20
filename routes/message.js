const express = require("express");
const firebaseApp = require("../lib/firebase");
const { getMessaging } = require("firebase-admin/messaging");
const messaging = getMessaging();

// const admin = require("firebase-admin");
// const { getMessaging } = require("firebase-admin/messaging");
// const serviceAccount = require("../serviceAccountKey.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });
// const messaging = getMessaging();

const router = express.Router();

router.get("/test", (req, res) => {
  return res.status(200).json({ message: "hello testing" });
});

module.exports = router;
