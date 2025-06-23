// Fonksiyonel excludedPaths
function shouldExcludePath(path, search) {
    // Defansif kontrol: search parametresi yoksa boş bir string olarak kabul et
    const safeSearch = search || '';

    // Dosya uzantılarını dışla
    const fileExtensions = /\.(pdf|xlsx|docx|zip|jpg|png|gif|svg)$/i;
    if (fileExtensions.test(path)) return true;

    // News, events, calendar: yıl/ay/gün path'leri
    const newsEventsCalendar = [
        /\/news\/\d{4}(\/\d{2})?(\/\d{2})?\//,
        /\/events\/\d{4}(\/\d{2})?(\/\d{2})?\//,
        /\/calendar\/\d{4}(\/\d{2})?(\/\d{2})?\//
    ];
    if (newsEventsCalendar.some(re => re.test(path))) return true;

    // Blog, category, tag, author, feed, rss, sitemap, wp-*
    const genericExcludes = [
        /\/blog\//,
        /\/tag\//,
        /\/category\//,
        /\/author\//,
        /\/feed\//,
        /\/rss\//,
        /\/sitemap\//,
        /\/wp-/,
        /\/wp-content\//,
        /\/wp-admin\//,
        /\/wp-includes\//,
        /\/wp-json\//
    ];
    if (genericExcludes.some(re => re.test(path))) return true;

    // Sadece yukarıdaki özet/list sayfalarında ?page=, ?p=, ?search= parametrelerini dışla
    if ((/\/blog\//.test(path) || /\/news\//.test(path) || /\/events\//.test(path) || /\/category\//.test(path) || /\/tag\//.test(path)) && (safeSearch.includes('page=') || safeSearch.includes('p=') || safeSearch.includes('search='))) {
        return true;
    }
    return false;
}

module.exports = {
    excludedDomains: [
        'www.nyu.edu' // Known to use advanced bot protection (CloudFront + CAPTCHA)
    ],

    // Keywords that indicate relevant content
    relevantKeywords: [
        'undergraduate',
        'graduate',
        'program',
        'programs',
        'department',
        'departments',
        'school',
        'college',
        'admission',
        'admissions',
        'apply',
        'applications',
        'academic',
        'academics',
        'faculty',
        'faculties',
        'course',
        'courses',
        'curriculum',
        'curricula',
        'degree',
        'degrees',
        'major',
        'minor',
        'engineering',
        'computer',
        'science',
        'medicine',
        'business',
        'law',
        'education'
    ],

    // Yüksek öncelikli keywords - bu kelimeler varsa extra puan alır
    highPriorityKeywords: [
        'program',
        'programs',
        'department',
        'departments',
        'admission',
        'admissions',
        'academics',
        'academic',
        'faculty',
        'degree',
        'undergraduate',
        'graduate'
    ],

    // Paths to exclude
    excludedPaths: [
        /\/news\/\d{4}\//,
        /\/events\/\d{4}\//,
        /\/calendar\/\d{4}\//,
        /\/blog\//,
        /\?search=/,
        /\?page=/,
        /\?p=/,
        /\/tag\//,
        /\/category\//,
        /\/author\//,
        /\/feed\//,
        /\/rss\//,
        /\/sitemap\//,
        /\/wp-/,
        /\/wp-content\//,
        /\/wp-admin\//,
        /\/wp-includes\//,
        /\/wp-json\//
    ],

    // Crawler settings - Improved configuration for better success rates
    crawler: {
        maxDepth: 4,
        maxPagesPerDomain: 300,
        maxLinksToFollowPerPage: 25,
        requestDelay: 1000, // Increased to 1s to be more respectful
        timeout: 45000, // Increased to 45s for better success rate
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        retryAttempts: 5, // Increased from 3 to 5 attempts
        retryDelay: 3000, // Increased delay between retries
        concurrentPages: 3, // Reduced from 5 to 3 for better stability
        // Enhanced retry strategy
        progressiveRetryDelay: true, // Enable progressive delay (3s, 6s, 9s, 12s)
        adaptiveTimeout: true, // Enable adaptive timeout increases
        maxRetryTimeout: 60000, // Maximum timeout for final retry attempt
        ignoreRobotsErrors: true,
        linkTimeout: 45000 // Increased to match main timeout
    },

    // Common selectors for content
    selectors: {
        title: ['h1', '.page-title', '.entry-title', '#main-title', 'title'],
        description: [
            'article', 
            '.content', 
            '.main-content', 
            '#content',
            'main',
            'section',
            '.section',
            '#main',
            '.main',
            'div.content',
            'div.main-content'
        ],
        contact: [
            '.contact-info', 
            '#contact', 
            '.contact-details',
            '.contact',
            '#contact-info',
            '.contact-section',
            '.contact-area'
        ],
        navigation: [
            'nav', 
            '.menu', 
            '#navigation', 
            '.main-menu',
            'header',
            '.header',
            '#header',
            '.navigation',
            '#nav'
        ],
        body: [
            'body',
            'div.body',
            '.body-content',
            '#body',
            'main',
            '#main',
            '.main-content'
        ],
        head: [
            'head',
            'header',
            '.header',
            '#header',
            '.site-header',
            '#site-header'
        ],
        div: [
            'div.container',
            'div.wrapper',
            'div.content',
            'div.main',
            'div.section',
            'div.article',
            'div.page',
            'div.post'
        ]
    },

    shouldExcludePath,

    // YENİ: Agresif dışlama yolları
    agressiveExcludes: [
        '/research/',
        '/course-catalog/', // Genellikle çok detaylı ve gürültülü
        '/directory/',      // Personel dizinleri
        '/people/',
        '/gallery/',
        '/events/',
        '/calendar/',
        '/news/',
        '/blog/',
        '/about/history',   // Çok spesifik tarih sayfaları
        '/archive/',
        '/alumni/'       // Mezun sayfaları
    ],
};