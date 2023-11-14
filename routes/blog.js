const express = require("express");
const verifyAuth = require("../middleware/auth");
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

router.get("/blogs-list", async (req, res) => {
  try {
    const products = await prisma.blog.findMany({
      where: {
        status: "Published",
      },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        category: true,
        image: true,
        readingTime: true,
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

router.get("/list", verifyAuth, async (req, res) => {
  const curPage = req.query.page || 1;
  const perPage = req.query.limit || 25;

  const url = `/blog/list?limit=${perPage}`;

  const skipItems =
    curPage == 1 ? 0 : (parseInt(perPage) - 1) * parseInt(curPage);

  const totalItems = await prisma.blog.count();
  try {
    const results = await prisma.blog.findMany({
      skip: skipItems,
      take: parseInt(perPage),
      select: {
        id: true,
        title: true,
        description: true,
        image: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return res.status(200).json({
      msg: "success",
      blogs: results,
      ...paginate(totalItems, curPage, perPage, results.length, url),
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

router.post("/create", async (req, res) => {
  const data = await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

  const imageUrl =
    Object.keys(data.files).length > 0
      ? await uploadFileToCloudinary(data.files.image)
      : null;

  try {
    await prisma.blog.create({
      data: {
        title: data.fields.title,
        slug: data.fields.slug,
        description: data.fields.description,
        image: imageUrl
          ? imageUrl.secure_url
          : "https://res.cloudinary.com/dlywo5mxn/image/upload/v1693041477/no-image_b3mfoq.png",

        content: data.fields.content,
        category: data.fields.category,
        subCategory: data.fields.subCategory,
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

router.get("/edit/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await prisma.blog.findFirst({
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

router.post("/edit/:id", async (req, res) => {
  const id = req.params.id;
  const data = await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

  const imageUrl =
    Object.keys(data.files).length > 0
      ? await uploadFileToCloudinary(data.files.image)
      : null;

  try {
    if (Object.keys(data.files).length > 0) {
      await prisma.blog.update({
        where: {
          id: Number(id),
        },

        data: {
          title: data.fields.title,
          slug: data.fields.slug,
          description: data.fields.description,
          image: imageUrl.secure_url,
          content: data.fields.content,
          category: data.fields.category,
          subCategory: data.fields.subCategory,
        },
      });
    } else {
      await prisma.blog.update({
        where: {
          id: Number(id),
        },
        data: {
          title: data.fields.title,
          slug: data.fields.slug,
          description: data.fields.description,
          content: data.fields.content,
          category: data.fields.category,
          subCategory: data.fields.subCategory,
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

router.post("/status", async (req, res) => {
  const { id, status } = req.body;

  try {
    await prisma.blog.update({
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
