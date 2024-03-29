const puppeteer = require("puppeteer");
const fs = require("fs");
const express = require("express");

const app = express();
const port = 7272;

let browserInstance = null;

app.get("/", (req, res) => {
 let picturesCount = fs.readdirSync(__dirname).filter(file => file.endsWith('.png')).length;
    res.send(`Hello from Saas app! There are ${picturesCount} pictures generated.`);
});

app.get("/:url(*)", async (req, res) => {
  let url = req.params.url;
  const base64url = Buffer.from(url).toString("base64");
  const imagePath = __dirname + "/" + base64url + ".png";

  if (fs.existsSync(imagePath)) {
    res.setHeader("Content-Type", "image/png");
    res.sendFile(imagePath);
    return;
  }

  try {
    const browser = browserInstance || (await puppeteer.launch({ headless: true }));
    browserInstance = browser;

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
      const resourceType = interceptedRequest.resourceType();
      if (resourceType === 'font' || resourceType === 'script') {
        interceptedRequest.abort();
      } else {
        interceptedRequest.continue();
      }
    });

    await page.setViewport({ width: 1920, height: 1080 });

    if (!url.startsWith("http")) {
      url = `https://${url}`;
    }

    await page.goto(url, { waitUntil: "domcontentloaded" });

    await page.screenshot({ path: imagePath, fullPage: false });

    res.setHeader("Content-Type", "image/png");
    res.sendFile(imagePath);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`Saas app listening on port ${port}`);
});
