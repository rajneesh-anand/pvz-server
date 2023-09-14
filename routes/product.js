const express = require("express");
const prisma = require("../lib/prisma");
const path = require("path");
const fs = require("fs/promises");
const { IncomingForm } = require("formidable");
const DatauriParser = require("datauri/parser");
const cloudinary = require("cloudinary").v2;
const parser = new DatauriParser();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileToCloudinary = async (file) => {
  const docContent = await fs
    .readFile(file.path)
    .catch((err) => console.error("Failed to read file", err));
  const doc64 = parser.format(path.extname(file.name).toString(), docContent);
  const uploadResult = await cloudinary.uploader.upload(doc64.content);
  return uploadResult;
};

const router = express.Router();

router.get("/all-products", async (req, res) => {
  try {
    const products = await fs.readFile(
      path.join(__dirname, "../upload/products.json"),
      "utf8",
      (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        return data;
      }
    );

    return res.status(200).json({
      results: JSON.parse(products),
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get("/products-list", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        image: true,
        coinValue: true,
        inStock: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      results: products,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ message: "Something went wrong !" });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.get("/single-product/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await prisma.product.findUnique({
      where: {
        id: Number(productId),
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        image: true,
        coinValue: true,
      },
    });

    // console.log(product);
    return res.status(200).json({
      product: product,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ message: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

// router.get("/single-product/:id", async (req, res) => {
//   const productId = req.params.id;

//   try {
//     const products = await fs.readFile(
//       path.join(__dirname, "../upload/products.json"),
//       "utf8",
//       (err, data) => {
//         if (err) {
//           console.error(err);
//           return;
//         }

//         return data;
//       }
//     );
//     const productList = JSON.parse(products);
//     const product = productList.find((itm) => itm.id == productId);

//     return res.status(200).json({
//       product: product,
//     });
//   } catch (error) {
//     return res.status(400).json({ message: error.message });
//   }
// });

router.get("/list", async (req, res) => {
  let page = req.query.page;
  let limit = 25;

  try {
    const result = await prisma.product.findMany({
      skip: page == 1 ? 0 : Number(page) * 50,
      take: Number(limit),
      orderBy: {
        id: "desc",
      },
    });
    // console.log(result);

    return res.status(200).json({
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

router.post("/create", async (req, res) => {
  const data = await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

  // console.log(data);

  const imageUrl =
    Object.keys(data.files).length > 0
      ? await uploadFileToCloudinary(data.files.image)
      : null;

  try {
    await prisma.product.create({
      data: {
        name: data.fields.name,
        slug: data.fields.slug,
        description: data.fields.description,
        image: imageUrl
          ? imageUrl.secure_url
          : "https://res.cloudinary.com/dlywo5mxn/image/upload/v1693041477/no-image_b3mfoq.png",

        coinValue: Number(data.fields.coinValue),
        status: data.fields.status,
        inStock: Number(data.fields.inStock),
        category: data.fields.category,
      },
    });

    return res.status(200).json({ message: "success" });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ message: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.post("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const data = await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

  // console.log(data);

  const imageUrl =
    Object.keys(data.files).length > 0
      ? await uploadFileToCloudinary(data.files.image)
      : null;

  try {
    if (Object.keys(data.files).length > 0) {
      await prisma.product.update({
        where: {
          id: Number(id),
        },
        data: {
          name: data.fields.name,
          slug: data.fields.slug,
          description: data.fields.description,
          image: imageUrl.secure_url,
          coinValue: Number(data.fields.coinValue),
          status: data.fields.status,
          inStock: Number(data.fields.inStock),
          category: data.fields.category,
        },
      });
    } else {
      await prisma.product.update({
        where: {
          id: Number(id),
        },
        data: {
          name: data.fields.name,
          slug: data.fields.slug,
          description: data.fields.description,
          coinValue: Number(data.fields.coinValue),
          status: data.fields.status,
          inStock: Number(data.fields.inStock),
          category: data.fields.category,
        },
      });
    }

    return res.status(200).json({ message: "success" });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ message: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.get("/edit/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await prisma.product.findUnique({
      where: {
        id: Number(id),
      },
    });
    // console.log(result);
    return res.status(200).json({ message: "success", data: result });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ message: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

module.exports = router;
