# 1. Node.js resmi imajını kullan (Hafif sürüm: alpine)
FROM node:18-alpine

# 2. Çalışma klasörünü ayarla
WORKDIR /app

# 3. Paket listesini kopyala (önce bunu yapıyoruz ki cache kullansın)
COPY package*.json ./

# 4. Kütüphaneleri kur
RUN npm ci

# 5. Kalan tüm proje dosyalarını kopyala
COPY . .

# 6. Projeyi derle (Build)
RUN npm run build

# 7. Uygulamayı başlat
CMD ["npm", "run", "start:prod"]