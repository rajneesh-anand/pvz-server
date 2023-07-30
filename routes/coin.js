const express = require("express");
const prisma = require("../lib/prisma");

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
        redeemCode: RedeemCode.toUpperCase(),
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

module.exports = router;
