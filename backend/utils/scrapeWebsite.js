const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

async function cheerioScrape(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/110.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    const title = $("title").text().trim();
    const metaDescription = $('meta[name="description"]').attr("content")?.trim();
    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
    const ogDescription = $('meta[property="og:description"]').attr("content")?.trim();
    const ogImage = $('meta[property="og:image"]').attr("content")?.trim();
    const keywords = $('meta[name="keywords"]').attr("content")?.trim();

    const result = {
      shortDescription: metaDescription || ogDescription || "",
      longDescription: ogDescription || metaDescription || "",
      logoUrl: ogImage || "",
      title: ogTitle || title || "",
      keywords: keywords || "",
    };

    const isEmpty = Object.values(result).every((v) => !v || v.trim() === "");
    return isEmpty ? null : result;
  } catch (err) {
    console.warn("⚠️ Cheerio failed:", err.message);
    return null;
  }
}

async function puppeteerScrape(url) {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const result = await page.evaluate(() => {
      const getMeta = (selector, attr) =>
        document.querySelector(selector)?.getAttribute(attr)?.trim() || "";

      return {
        title: document.title || "",
        shortDescription:
          getMeta('meta[name="description"]', "content") ||
          getMeta('meta[property="og:description"]', "content") ||
          "",
        longDescription:
          getMeta('meta[property="og:description"]', "content") ||
          getMeta('meta[name="description"]', "content") ||
          "",
        logoUrl: getMeta('meta[property="og:image"]', "content") || "",
        keywords: getMeta('meta[name="keywords"]', "content") || "",
      };
    });

    return result;
  } catch (err) {
    console.error("❌ Puppeteer failed:", err.message);
    return {
      title: "",
      shortDescription: "",
      longDescription: "",
      logoUrl: "",
      keywords: "",
    };
  } finally {
    if (browser) await browser.close();
  }
}

async function scrapeWebsiteMetadata(url) {
  const cheerioData = await cheerioScrape(url);

  if (cheerioData) {
    console.log("✅ Scraped using Cheerio");
    return cheerioData;
  }

  console.log("⚠️ Falling back to Puppeteer...");
  const puppeteerData = await puppeteerScrape(url);

  return puppeteerData;
}

module.exports = scrapeWebsiteMetadata;
