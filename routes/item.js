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

function paginate(totalItems, currentPage, pageSize, count, url) {
  const totalPages = Math.ceil(totalItems / pageSize);

  // ensure current page isn't out of range
  if (currentPage < 1) {
    currentPage = 1;
  } else if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  // calculate start and end item indexes
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

  // return object with all pager properties required by the view
  return {
    total: totalItems,
    currentPage: +currentPage,
    count,
    lastPage: totalPages,
    firstItem: startIndex,
    lastItem: endIndex,
    perPage: pageSize,
    first_page_url: `${process.env.API_URL}${url}&page=1`,
    last_page_url: `${process.env.API_URL}${url}&page=${totalPages}`,
    next_page_url:
      totalPages > currentPage
        ? `${process.env.API_URL}${url}&page=${Number(currentPage) + 1}`
        : null,
    prev_page_url:
      totalPages > currentPage
        ? `${process.env.API_URL}${url}&page=${currentPage}`
        : null,
  };
}

// router.get("/list", async (req, res) => {
//   const curPage = req.query.page || 1;
//   const perPage = req.query.limit || 25;

//   const url = `/item/list?limit=${perPage}`;

//   const skipItems =
//     curPage == 1 ? 0 : (parseInt(perPage) - 1) * parseInt(curPage);

//   const totalItems = await prisma.blog.count();
//   try {
//     const results = await prisma.blog.findMany({
//       skip: skipItems,
//       take: parseInt(perPage),
//       select: {
//         id: true,
//         title: true,
//         description: true,
//         image: true,
//         status: true,
//       },
//       orderBy: {
//         createdAt: "desc",
//       },
//     });
//     return res.status(200).json({
//       msg: "success",
//       blogs: results,
//       ...paginate(totalItems, curPage, perPage, results.length, url),
//     });
//   } catch (error) {
//     console.log(error.message);
//     return res.status(400).json({ message: error.message });
//   } finally {
//     async () => {
//       await prisma.$disconnect();
//     };
//   }
// });

router.get("/list", async (req, res) => {
  let page = req.query.page;
  let limit = 25;

  try {
    const items = await prisma.item.findMany({
      skip: page == 1 ? 0 : Number(page) * 50,
      take: Number(limit),
      orderBy: {
        id: "desc",
      },
    });

    return res.status(200).json({
      data: items,
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

router.get("/items-list", async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: {
        status: "Active",
      },
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        discount: true,
        image: true,
        marketPlace: true,
        inStock: true,
        link: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return res.status(200).json({ items });
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

  const discount =
    ((Number(data.fields.price) - Number(data.fields.salePrice)) /
      Number(data.fields.price)) *
    100;
  console.log(discount);

  try {
    await prisma.item.create({
      data: {
        name: data.fields.name,
        link: data.fields.link,
        description: data.fields.description,
        image: imageUrl
          ? imageUrl.secure_url
          : "https://res.cloudinary.com/dlywo5mxn/image/upload/v1693041477/no-image_b3mfoq.png",

        price: Number(data.fields.price),
        salePrice: Number(data.fields.salePrice),
        discount: discount,
        inStock: Number(data.fields.inStock),
        category: data.fields.category,
        status: data.fields.status,
        marketPlace: data.fields.marketPlace,
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

  const discount =
    ((Number(data.fields.price) - Number(data.fields.salePrice)) /
      Number(data.fields.price)) *
    100;
  console.log(discount);

  try {
    if (Object.keys(data.files).length > 0) {
      await prisma.item.update({
        where: {
          id: Number(id),
        },
        data: {
          name: data.fields.name,
          link: data.fields.link,
          description: data.fields.description,
          image: imageUrl.secure_url,
          price: Number(data.fields.price),
          salePrice: Number(data.fields.salePrice),
          discount: discount,
          inStock: Number(data.fields.inStock),
          category: data.fields.category,
          status: data.fields.status,
          marketPlace: data.fields.marketPlace,
        },
      });
    } else {
      await prisma.item.update({
        where: {
          id: Number(id),
        },
        data: {
          name: data.fields.name,
          link: data.fields.link,
          description: data.fields.description,
          price: Number(data.fields.price),
          salePrice: Number(data.fields.salePrice),
          discount: discount,
          inStock: Number(data.fields.inStock),
          category: data.fields.category,
          status: data.fields.status,
          marketPlace: data.fields.marketPlace,
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
    const result = await prisma.item.findUnique({
      where: {
        id: Number(id),
      },
    });

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
