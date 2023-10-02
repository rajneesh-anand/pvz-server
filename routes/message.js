const express = require("express");
const prisma = require("../lib/prisma");
const { messaging } = require("../lib/firebase");

const router = express.Router();

router.post("/topic", async (req, res) => {
  const { title, message } = req.body;

  const topic = "yandexpvz";
  const fcm_message = {
    notification: {
      title: title,
      body: message,
    },
    topic: topic,
  };
  try {
    const response = await messaging.send(fcm_message);
    console.log(response);
    return res.status(200).json({ message: "success" });
  } catch (error) {
    console.log("Error sending message:", error.message);
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;
