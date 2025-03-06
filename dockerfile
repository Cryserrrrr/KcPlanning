FROM node:16

# Mise à jour et installation des dépendances système pour Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
  libgobject-2.0-0 \
  libgtk-3-0 \
  libasound2 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  xdg-utils

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers package.json et package-lock.json (ou yarn.lock)
COPY package*.json ./

# Installation des dépendances Node.js
RUN npm install

# Copie du reste du code
COPY . .

# Commande de démarrage
CMD ["node", "votre_script.js"]