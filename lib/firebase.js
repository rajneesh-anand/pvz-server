const admin = require("firebase-admin");
const { getMessaging } = require("firebase-admin/messaging");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const messaging = getMessaging();

module.exports = { admin, messaging };
