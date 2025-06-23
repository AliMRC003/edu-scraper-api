# University Website Scraper

A Node.js-based web scraper that discovers and analyzes university website subdomains and relevant paths.

## Features

- Discovers and crawls university subdomains
- Extracts relevant internal paths
- Filters out irrelevant content (news, events, etc.)
- Identifies and stores key content selectors
- Respects robots.txt
- Configurable crawling parameters
- Comprehensive logging

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Configuration

The scraper can be configured through `config.js`:

- `relevantKeywords`: Keywords that indicate relevant content
- `excludedPaths`: Patterns for paths to exclude
- `crawler`: Crawling parameters (depth, delay, etc.)
- `selectors`: Common CSS selectors for content extraction

## Usage

1. Place your list of university URLs in `uniurl.txt` (one URL per line)
2. Run the scraper:
```bash
npm start
```

The scraper will:
1. Process each university URL
2. Discover and crawl subdomains
3. Extract relevant paths and their content selectors
4. Save results to `output.json`

## Output

The scraper generates `output.json` with the following structure:

```json
[
  {
    "domain": "example.edu",
    "subdomain": "subdomain.example.edu",
    "path": "/relevant/path",
    "selectors": {
      "title": "h1.page-title",
      "description": "div.content",
      "contact": ".contact-info"
    }
  }
]
```

## Logging

- `combined.log`: All logs
- `error.log`: Error logs only

## Notes

- The scraper respects robots.txt and implements polite crawling with delays
- Maximum crawl depth and pages per domain are configurable
- User agent is set to identify the scraper
- Timeouts are implemented to prevent hanging on slow pages

## License

MIT 