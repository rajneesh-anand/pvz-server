const express = require("express");
const prisma = require("../lib/prisma");

const admin = require("firebase-admin");
const { getMessaging } = require("firebase-admin/messaging");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const messaging = getMessaging();

const router = express.Router();

router.get("/user-coins/:mobileId/:skip", async (req, res) => {
  const userMobile = req.params.mobileId;
  const skipNumber = req.params.skip;

  try {
    const result = await prisma.coin.findMany({
      skip: Number(skipNumber),
      where: { mobile: userMobile },
      orderBy: {
        id: "asc",
      },
    });
    console.log(result);

    return res.status(200).json({
      totalCount: result.length,
      results: result,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.post("/redeem", async (req, res) => {
  console.log(req.body);
  const { email, name, mobile, productValue, spentCoin, product } = req.body;
  const RedeemCode =
    Date.now().toString(36) + Math.random().toString(36).substring(13);
  try {
    await prisma.coin.create({
      data: {
        name: name,
        mobile: mobile,
        email: email,
        spentCoin: Number(spentCoin),
      },
    });

    await prisma.redeem.create({
      data: {
        name: name,
        mobile: mobile,
        email: email,
        product: product,
        productValue: productValue,
        redeemCode: RedeemCode,
        redeemStatus: "Created",
      },
    });
    return res.status(200).json({
      redeemId: RedeemCode.toUpperCase(),
      message: "success",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.get("/redeem-list", async (req, res) => {
  let page = req.query.page;
  let limit = req.query.limit;
  try {
    const results = await prisma.redeem.findMany({
      skip: page == 1 ? 0 : Number(page) * 50,
      take: Number(limit),
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      data: results,
      message: "success",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.get("/redeem/:code/:mobile", async (req, res) => {
  const code = req.params.code;
  const mobile = req.params.mobile;

  try {
    const result = await prisma.redeem.findFirst({
      where: {
        AND: [
          {
            redeemCode: code,
          },
          { mobile: mobile },
        ],
      },
    });

    // console.log(result);

    return res.status(200).json({
      data: result,
      message: "success",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.post("/order/status", async (req, res) => {
  const { code, mobile } = req.body;

  console.log(code);
  console.log(mobile);

  try {
    await prisma.redeem.update({
      where: {
        redeemCode: code,
      },
      data: {
        redeemStatus: "Received",
        receivedAt: new Date(),
      },
    });

    return res.status(200).json({
      message: "success",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.post("/earned", async (req, res) => {
  const { amount, mobile, orderNumber } = req.body;

  try {
    const userExits = await prisma.user.findUnique({
      where: {
        mobile: mobile,
      },
    });

    if (userExits != null) {
      const coinEarnedValue = (Number(amount) * 2) / 100;
      const earnedCoins = Math.round(coinEarnedValue);
      await prisma.coin.create({
        data: {
          name: userExits.name,
          mobile: userExits.mobile,
          email: userExits.email,
          orderNumber: orderNumber,
          earnedCoin: earnedCoins >= 100 ? 100 : earnedCoins,
        },
      });

      const message = {
        notification: {
          title: `Ура! вы выиграли ${earnedCoins} монет`,
          body: `Дорогой ${userExits.name}, Вы заработали ${earnedCoins} монет. продолжайте зарабатывать больше. С наилучшими пожеланиями !`,
        },
        token: userExits.fcmToken,
      };

      const response = await messaging.send(message);
      console.log(response);
      return res.status(200).json({
        message: "success",
      });
    } else {
      return res.status(403).json({
        message: "Mobile Number does not exist !",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.post("/post-message", async (req, res) => {
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

router.post("/user/message", async (req, res) => {
  const { title, mobile, description } = req.body;
  // console.log(title);
  // console.log(mobile);
  // console.log(description);

  try {
    const userExits = await prisma.user.findUnique({
      where: {
        mobile: mobile,
      },
    });

    if (userExits != null) {
      const message = {
        notification: {
          title: `${title}`,
          body: `${description}`,
        },
        token: userExits.fcmToken,
      };

      const response = await messaging.send(message);
      console.log(response);
      return res.status(200).json({
        message: "success",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

module.exports = router;
