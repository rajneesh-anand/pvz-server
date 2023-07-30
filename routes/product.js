const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const router = express.Router();
router.get("/all-products", (req, res) => {
  res.statusCode = 200;
  res.header("Content-Type", "application/json");
  res.sendFile(path.join(__dirname, "../upload/products.json"));
});

router.get("/single-product/:id", async (req, res) => {
  const productId = req.params.id;
  console.log(productId);
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
    const productList = JSON.parse(products);
    const product = productList.find((itm) => itm.id == productId);

    return res.status(200).json({
      product: product,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  } finally {
    async () => {
      await prisma.$disconnect();
    };
  }
});

module.exports = router;
