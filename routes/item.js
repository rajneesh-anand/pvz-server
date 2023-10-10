const express = require("express");
const prisma = require("../lib/prisma");

const router = express.Router();

const APP_URL = "http://localhost:8800/api";
// const APP_URL = "https://api.geenia.in/api";

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
    first_page_url: `${APP_URL}${url}&page=1`,
    last_page_url: `${APP_URL}${url}&page=${totalPages}`,
    next_page_url:
      totalPages > currentPage
        ? `${APP_URL}${url}&page=${Number(currentPage) + 1}`
        : null,
    prev_page_url:
      totalPages > currentPage ? `${APP_URL}${url}&page=${currentPage}` : null,
  };
}

router.get("/product-list", async (req, res) => {
  const curPage = req.query.page || 1;
  const perPage = req.query.limit || 25;

  const url = `/product-list?limit=${perPage}`;

  const skipItems =
    curPage == 1 ? 0 : (parseInt(perPage) - 1) * parseInt(curPage);

  const totalItems = await prisma.product.count();

  try {
    const results = await prisma.product.findMany({
      skip: skipItems,
      take: parseInt(perPage),
      where: {
        status: `{"label":"Active","value":"Active"}`,
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        category: true,
        image: true,
        coinValue: true,
        inStock: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    // console.log(results);
    return res.status(200).json({
      msg: "success",
      products: results,
      ...paginate(totalItems, curPage, perPage, results.length, url),
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send({ message: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

router.get("/product/:slug", async (req, res) => {
  const slug = req.params.slug;

  try {
    const product = await prisma.product.findFirst({
      where: {
        slug: slug,
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

    console.log(product);
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

module.exports = router;
