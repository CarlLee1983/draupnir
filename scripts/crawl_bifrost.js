const axios = require('axios');
const cheerio = require('cheerio');
const TurndownService = require('turndown');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

const SITEMAP_URL = 'https://docs.getbifrost.ai/sitemap.xml';
const OUTPUT_DIR = path.join(__dirname, '../docs/Bifrost_API');

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// Mintlify 特定的內容選取器
// 根據觀察，Mintlify 的內容通常在 id 為 content-container 之後
const CONTENT_SELECTORS = [
  '#content-container',
  'main',
  'article',
  '.prose',
  '.prose-slate'
];

async function fetchSitemap() {
  console.log('正在取得 Sitemap...');
  const response = await axios.get(SITEMAP_URL);
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(response.data);
  
  return result.urlset.url
    .map(u => u.loc[0])
    .filter(url => url.includes('/api-reference/'));
}

async function crawlPage(url) {
  try {
    console.log(`正在抓取: ${url}`);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // 移除側邊導覽和頂部導覽，這些通常是全站共享的
    $('#navbar').remove();
    $('#sidebar').remove();
    $('.hidden.xl\\:flex').remove(); // 移除右側目錄或代碼區塊
    
    // 尋找主內容區域
    let contentHtml = '';
    
    // 如果是 API Reference，Mintlify 會有特殊的佈局
    // 嘗試抓取中心文件區域
    const mainColumn = $('div.flex.flex-row-reverse').find('div.prose');
    if (mainColumn.length > 0) {
      contentHtml = mainColumn.html();
    } else {
      for (const selector of CONTENT_SELECTORS) {
        const element = $(selector);
        if (element.length > 0) {
          contentHtml = element.html();
          break;
        }
      }
    }

    if (!contentHtml) {
      // 最後的手段：抓取 body 但移除顯然不需要的部分
      console.warn(`警告: 無法精確定位內容區域 ${url}，使用備選方案`);
      $('nav, header, footer, script, style').remove();
      contentHtml = $('body').html();
    }

    const markdown = turndownService.turndown(contentHtml);
    
    const urlObj = new URL(url);
    const relativePath = urlObj.pathname.replace(/^\/api-reference\//, '');
    const fullDirPath = path.join(OUTPUT_DIR, path.dirname(relativePath));
    const fileName = (path.basename(relativePath) || 'index') + '.md';
    const filePath = path.join(fullDirPath, fileName);

    if (!fs.existsSync(fullDirPath)) {
      fs.mkdirSync(fullDirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, `# ${url}\n\n${markdown}`);
    console.log(`成功儲存: ${filePath}`);
  } catch (error) {
    console.error(`抓取失敗 ${url}: ${error.message}`);
  }
}

async function runWithLimit(urls, limit) {
  const results = [];
  const executing = [];
  for (const url of urls) {
    const p = Promise.resolve().then(() => crawlPage(url));
    results.push(p);
    if (limit <= urls.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return Promise.all(results);
}

async function main() {
  try {
    const urls = await fetchSitemap();
    console.log(`找到 ${urls.length} 個 API Reference 頁面`);
    
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 先抓一個頁面測試
    console.log('--- 進行首頁測試 ---');
    await crawlPage(urls[0]);
    
    console.log('\n--- 開始批次抓取 ---');
    await runWithLimit(urls.slice(1), 5);
    
    console.log('\n--- 抓取完成 ---');
    console.log(`檔案已儲存至: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error(`主程式錯誤: ${error.message}`);
  }
}

main();
