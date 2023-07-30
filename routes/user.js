const express = require("express");
const prisma = require("../lib/prisma");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { hash, genSalt, compare } = require("bcrypt");
const { userSignInValidator } = require("../helper/user-validator");
const { IncomingForm } = require("formidable");
const fs = require("fs");
const path = require("path");
const DatauriParser = require("datauri/parser");
const cloudinary = require("cloudinary").v2;

const router = express.Router();

const parser = new DatauriParser();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryUpload = (file) => cloudinary.uploader.upload(file);

const generateToken = (_id, name, email) => {
  return jwt.sign({ _id, name, email }, process.env.TOKEN_SECRET, {
    expiresIn: "3d",
  });
};

router.post("/register", async (req, res) => {
  const { mobile, email, password, name } = req.body;

  try {
    const userExits = await prisma.user.count({
      where: {
        mobile: mobile,
      },
    });

    if (userExits > 0) {
      return res.status(403).json({
        message: "Mobile already in use !",
      });
    } else {
      const salt = await genSalt(10);
      const hashedPassword = await hash(password, salt);

      const result = await prisma.user.create({
        data: {
          email: email,
          name: name,
          password: hashedPassword,
          mobile: mobile,
          image:
            "https://res.cloudinary.com/dlywo5mxn/image/upload/v1689572976/afed80130a2682f1a428984ed8c84308_wscf7t.jpg",
          userType: "Customer",
          userStatus: "Active",
        },
      });
      // console.log(result);

      const token = generateToken(result.id, name, email);
      console.log(token);

      return res.status(200).json({
        user: {
          id: result.id,
          username: result.name,
          email: result.email,
          mobile: result.mobile,
          image: result.image,
        },
        token,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.post("/signin", userSignInValidator(), async (req, res) => {
  const { mobile, password } = req.body;
  console.log(mobile, password);

  try {
    const user = await prisma.user.findUnique({
      where: {
        mobile: mobile,
      },
    });

    if (user) {
      const passwordMatch = await compare(password, user.password);
      if (!passwordMatch) {
        return res.status(403).json({
          message: "Неверный пароль!",
        });
      } else {
        const token = generateToken(user.id, user.name, user.email);
        console.log(token);
        return res.status(200).json({
          user: {
            id: user.id,
            username: user.name,
            email: user.email,
            mobile: user.mobile,
            image: user.image,
          },
          token,
        });
      }
    } else {
      return res.status(403).json({
        message: "Мобильный номер не зарегистрирован!",
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

router.post("/password/update", async (req, res) => {
  const { mobile, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: {
        mobile: mobile,
      },
    });

    if (user) {
      const salt = await genSalt(10);
      const hashedPassword = await hash(password, salt);

      await prisma.user.update({
        where: {
          mobile: mobile,
        },
        data: {
          password: hashedPassword,
        },
      });
      return res.status(200).json({
        user: {
          id: "",
          username: "",
          email: "",
          mobile: "",
        },
        token: "",
      });
    } else {
      return res.status(403).json({
        message: "Мобильный номер не зарегистрирован!",
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.post("/profile/update", async (req, res) => {
  const data = await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

  console.log(data);
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

      await prisma.user.update({
        where: {
          mobile: data.fields.mobile,
        },
        data: {
          image: uploadResult.secure_url,
          name: data.fields.name,
        },
      });
      return res
        .status(200)
        .json({ image_url: uploadResult.secure_url, name: data.fields.name });
    } else {
      const image_url = await prisma.user.findFirst({
        where: {
          mobile: data.fields.mobile,
        },
        select: {
          image: true,
        },
      });
      console.log(image_url);
      await prisma.user.update({
        where: {
          mobile: data.fields.mobile,
        },
        data: {
          name: data.fields.name,
        },
      });
      return res
        .status(200)
        .json({ image_url: image_url, name: data.fields.name });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.get("/gifts/:mobile", async (req, res) => {
  const userMobile = req.params.mobile;

  try {
    const results = await prisma.redeem.findMany({
      where: {
        mobile: userMobile,
      },
      select: {
        id: true,
        product: true,
        productValue: true,
        redeemCode: true,
        redeemStatus: true,
        date: true,
      },
      orderBy: {
        date: "desc",
      },
    });
    return res.status(200).json({ results });
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
