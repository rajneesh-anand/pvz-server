const express = require("express");
const prisma = require("../lib/prisma");
const { IncomingForm } = require("formidable");
const fs = require("fs");
const path = require("path");
const DatauriParser = require("datauri/parser");
const cloudinary = require("cloudinary").v2;

const parser = new DatauriParser();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryUpload = (file) => cloudinary.uploader.upload(file);

const router = express.Router();

router.post("/create", async (req, res) => {
  const data = await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

  try {
    if (Object.keys(data.files).length > 0) {
      const docContent = await fs.promises
        .readFile(data.files.image.path)
        .catch((err) => console.error("Failed to read file", err));

      let doc64 = parser.format(
        path.extname(data.files.image.name).toString(),
        docContent
      );
      const uploadResult = await cloudinaryUpload(doc64.content);

      await prisma.feedback.create({
        data: {
          name: data.fields.userName,
          mobile: data.fields.userMobile,
          message: data.fields.message,
          category: data.fields.category,
          status: "Created",
          messagePhoto: uploadResult.secure_url,
        },
      });
      return res.status(200).json({
        message: "feedback saved",
      });
    } else {
      await prisma.feedback.create({
        data: {
          name: data.fields.userName,
          mobile: data.fields.userMobile,
          message: data.fields.message,
          category: data.fields.category,
          status: "Created",
        },
      });
      return res.status(200).json({ message: "feedback saved" });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

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

router.get("/published-list", async (req, res) => {
  try {
    const result = await prisma.feedback.findMany({
      take: 5,
      where: {
        status: "Published",
      },
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
