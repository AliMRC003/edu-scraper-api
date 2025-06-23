# Dockerfile

# Node.js'in en son stabil sürümünü temel al
FROM node:20-slim

# Google Chrome'u kurmak için gerekli bağımlılıkları yükle
# Puppeteer'ın ihtiyaç duyduğu tüm kütüphaneler burada
RUN apt-get update && apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    --no-install-recommends

# Chrome'u indir ve kur
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get install -y ./google-chrome-stable_current_amd64.deb && \
    rm google-chrome-stable_current_amd64.deb

# Uygulama için bir çalışma dizini oluştur
WORKDIR /usr/src/app

# package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# npm install komutunu çalıştır
RUN npm install

# Projenin geri kalan tüm dosyalarını kopyala
COPY . .

# Uygulamanın çalışacağı portu belirt (scraper.js'de tanımladığımız port)
EXPOSE 10000

# Uygulamayı başlat
CMD [ "node", "scraper.js" ] 