const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

router.get("/list", async (req, res) => {
  let page = req.query.page || 1;
  let limit = req.query.limit || 50;

  try {
    const result = await prisma.feedback.findMany({
      skip: page == 1 ? 0 : Number(page) * 50,
      take: Number(limit),
      include: {
        photo: {
          select: {
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return res.status(200).json({
      message: "success",
      data: result,
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

router.get("/detail/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await prisma.feedback.findFirst({
      where: {
        id: Number(id),
      },
    });

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

router.post("/status", async (req, res) => {
  const { id, mobile, status } = req.body;

  try {
    await prisma.feedback.update({
      where: {
        id: Number(id),
      },
      data: {
        status: status,
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

module.exports = router;
