const express = require('express');
const puppeteer = require('puppeteer');
const URL = require('url-parse');
const winston = require('winston');
const config = require('./config'); // config.js dosyanızın var olduğunu varsayıyoruz

// --- Express Sunucusunu Ayarla ---
const app = express();
app.use(express.json()); // Gelen JSON isteklerini anlamak için
const PORT = process.env.PORT || 10000; // Render.com gibi platformlar için PORT ayarı

// Logger
const logger = winston.createLogger({
    level: 'info',
    transports: [ new winston.transports.Console({ format: winston.format.simple() }) ]
});


// --- Sizin Scraper Sınıfınız ve Mantığınız (Değişiklik Yok) ---
// Buradaki kod, bir önceki cevaptakiyle neredeyse aynı,
// sadece bir API isteği içinde çalışacak şekilde düzenlendi.

function withTimeout(promise, ms, info) {
    if (!ms) return promise;
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms in ${info}`)), ms))
    ]);
}

function cleanUrl(url) {
    try {
        const u = new (require('url').URL)(url.toString());
        [...u.searchParams.keys()].forEach(key => {
            if (key.startsWith('utm_')) u.searchParams.delete(key);
        });
        u.hash = '';
        return u.toString();
    } catch {
        return url.toString();
    }
}

class UniScraper {
    constructor() {
        this.browser = null;
        this.results = [];
        this.activePages = 0;
        this.currentlyProcessing = new Set();
        this.attemptMap = new Map();
    }

    async initialize() {
        // Render.com gibi ortamlarda sorunsuz çalışması için ek argümanlar
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process',
                // Chrome'u başsız modda ve yetkisiz çalıştırmak için ek bayraklar
                '--disable-gpu',
                '--window-size=1920,1080'
            ],
            // executablePath satırını siliyoruz veya yorum yapıyoruz
            // executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        });
    }
    
    async close() { if (this.browser) await this.browser.close(); }
    
    isRelevantContent(title, path, content = '') {
        const textToCheck = `${title} ${path} ${content}`.toLowerCase();
        return config.relevantKeywords.some(keyword => textToCheck.includes(keyword));
    }

    calculateRelevanceScore(title, path, content) {
        let score = 0;
        const text = `${title} ${path} ${content}`.toLowerCase();
        config.highPriorityKeywords.forEach(kw => { if (text.includes(kw)) score += 5; });
        config.relevantKeywords.forEach(kw => { if (text.includes(kw)) score += 1; });
        if (path.includes('/admission')) score += 10;
        if (path.includes('/program')) score += 10;
        return score;
    }

    _calculateFinalScore(url, depth) {
        const urlText = url.toLowerCase();
        let score = 0;
        const path = new URL(url).pathname.toLowerCase();

        if (path.includes('admission') || path.includes('apply')) score += 100;
        if (path.includes('program') || path.includes('degree') || path.includes('major')) score += 90;
        if (path.includes('academic') || path.includes('academics')) score += 80;
        if (path.includes('department') || path.includes('school') || path.includes('college')) score += 75;
        if (path.includes('faculty')) score += 70;
        if (path.includes('international')) score += 65;
        if (path.includes('tuition') || path.includes('fees') || path.includes('scholarship')) score += 60;
        if (path.includes('research')) score += 50;
        if (path.includes('undergraduate')) score += 20;
        if (path.includes('graduate')) score += 20;

        config.relevantKeywords.forEach(keyword => {
            if (urlText.includes(keyword)) score += 2;
        });

        const depthPenalty = 1 - (depth / (config.crawler.maxDepth + 1));
        score *= depthPenalty;

        return Math.round(score);
    }
    
    async crawlPage(url, depth, domain, score) {
        const maxAttempts = config.crawler.retryAttempts || 3;
        const key = `${url}|${depth}`;
        const attempts = (this.attemptMap.get(key) || 0) + 1;
        this.attemptMap.set(key, attempts);

        if (attempts > maxAttempts) {
            logger.warn(`Max retry attempts reached for ${url}, skipping.`);
            return null;
        }
        
        let page = null;
        this.activePages++;
        this.currentlyProcessing.add(url);
        logger.info(`[D:${depth}|S:${score}] Scraping: ${url}`);
        
        try {
            page = await this.browser.newPage();
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            const response = await withTimeout(
                page.goto(url, { waitUntil: 'domcontentloaded' }),
                config.crawler.timeout,
                `page.goto(${url})`
            );

            const status = response.status();
            if (status >= 300 && status < 400 && status !== 304) {
                const location = response.headers()['location'];
                if (location) {
                    const newUrl = new URL(location, url).toString();
                    logger.info(`[D:${depth}] Redirected from ${url} -> ${newUrl}.`);
                    return { redirectedTo: newUrl };
                }
            }

            if (!response.ok() && status !== 304) {
                throw new Error(`Failed to load page with status: ${status}`);
            }

            let contentData = null;
            let foundMethod = 'none';
            const selectorStrategies = [
                { type: 'selector', values: ['main', 'article', '.main-content', '#content', 'div.content'] },
                { type: 'selector', values: ['.container', 'div.page-content', '#main-container'] },
                { type: 'selector', values: ['body'] }
            ];

            for (const strategy of selectorStrategies) {
                for (const selector of strategy.values) {
                    try {
                        const textContent = await page.$eval(selector, el => el.innerText);
                        if (textContent && textContent.trim().length > 250) {
                            contentData = textContent;
                            foundMethod = `selector:${selector}`;
                                break;
                        }
                    } catch (e) { /* try next selector */ }
                }
                if (contentData) break;
            }

            if (!contentData) {
                logger.warn(`No usable content found for ${url}.`);
                return null;
            }

            const pageTitle = await page.title();
            const finalUrl = page.url();
            const finalParsedUrl = new URL(finalUrl);
            
            if (this.isRelevantContent(pageTitle, finalParsedUrl.pathname, contentData)) {
                    this.results.push({
                        domain: finalParsedUrl.hostname,
                        url: cleanUrl(finalUrl),
                        title: pageTitle,
                        content: contentData.substring(0, 2000), // Limit content size
                        timestamp: new Date().toISOString(),
                        relevanceScore: this.calculateRelevanceScore(pageTitle, finalParsedUrl.pathname, contentData),
                        depth: depth,
                        extractionMethod: foundMethod
                });
                logger.info(`✓ Relevant content saved for ${finalUrl}`);
            }

            const links = await page.$$eval('a[href]', as => as.map(a => a.href));
            return links
                .map(link => { try { return new URL(link, url).toString(); } catch { return null; } })
                .filter(link => link && new URL(link).hostname === domain);

        } catch (error) {
            logger.error(`Error crawling ${url}: ${error.message}`);
            return null;
        } finally {
            if (page) await page.close();
            this.activePages--;
            this.currentlyProcessing.delete(url);
        }
    }

    async processSingleUniversity(domain, seedUrlsForDomain) {
        await this.initialize();
        
        const queue = [];
        const visited = new Set();
        this.results = [];
        this.attemptMap.clear();

        seedUrlsForDomain.forEach(url => {
            const cleaned = cleanUrl(url);
            if (!visited.has(cleaned)) {
                queue.push({ url: cleaned, depth: 0, score: 1000 });
                visited.add(cleaned);
            }
        });

        let processedCount = 0;
        logger.info(`Processing domain: ${domain} with ${seedUrlsForDomain.length} seed URLs.`);

        const allPromises = [];

        const processQueue = async () => {
             while (queue.length > 0 || this.activePages > 0) {
                if (this.activePages >= config.crawler.concurrentPages || queue.length === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    continue;
                }
                if (processedCount >= config.crawler.maxPagesPerDomain) {
                    logger.info(`Max pages (${config.crawler.maxPagesPerDomain}) reached for ${domain}.`);
                    break;
                };
                
                queue.sort((a, b) => b.score - a.score);
                const { url, depth, score } = queue.shift();
                
                if (depth >= config.crawler.maxDepth) continue;

                const promise = this.crawlPage(url, depth, domain, score).then(result => {
                    if (result === null) return;
                    
                    processedCount++;

                    if (result.redirectedTo) {
                        const newUrl = cleanUrl(result.redirectedTo);
                        if (!visited.has(newUrl)) {
                            visited.add(newUrl);
                            queue.push({ url: newUrl, depth: depth, score: score + 50 });
                        }
                    } 
                    else if (Array.isArray(result)) {
                        const minScoreThreshold = 15;
                        result.forEach(link => {
                            const cleanedLink = cleanUrl(link);
                            if (!visited.has(cleanedLink)) {
                                visited.add(cleanedLink);
                                 try {
                                    const parsedLink = new URL(cleanedLink);
                                    if (!config.shouldExcludePath(parsedLink.pathname, parsedLink.search)) {
                                        const newScore = this._calculateFinalScore(cleanedLink, depth + 1);
                                        if (newScore >= minScoreThreshold) {
                                            queue.push({ url: cleanedLink, depth: depth + 1, score: newScore });
                                        }
                                    }
                                 } catch(e) {
                                     logger.warn(`Skipping invalid link: ${cleanedLink}`);
                                 }
                            }
                        });
                    }
                });
                allPromises.push(promise);
             }
        }
        
        await processQueue();
        await Promise.allSettled(allPromises);
        
        await this.close();
        logger.info(`✅ Scraping complete for ${domain}. Total results: ${this.results.length}`);
        return this.results;
    }
}


// --- API Uç Noktası (Endpoint) ---
app.post('/scrape', async (req, res) => {
    const { domain, seedUrls } = req.body;

    if (!domain || !seedUrls || !Array.isArray(seedUrls)) {
        return res.status(400).json({ error: 'Missing or invalid parameters. "domain" (string) and "seedUrls" (array) are required.' });
    }

    logger.info(`Received API request to scrape domain: ${domain}`);
    
    try {
        const scraper = new UniScraper();
        const scrapedData = await scraper.processSingleUniversity(domain, seedUrls);
        res.status(200).json(scrapedData);
    } catch (error) {
        logger.error(`Scraping failed for ${domain}: ${error.message}`);
        res.status(500).json({ error: 'An internal server error occurred during scraping.', details: error.message });
    }
});


// YENİ EKLENECEK KOD BURADA
// --- Health Check Uç Noktası ---
// Render.com bu adrese GET isteği atarak servisin canlı olup olmadığını kontrol eder.
app.get('/', (req, res) => {
    res.status(200).send('Scraper API is up and running!');
});


// Sunucuyu Başlat
app.listen(PORT, () => {
    logger.info(`Scraper API listening on port ${PORT}`);
});