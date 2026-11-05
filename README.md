# Les 3 outils pour monter des vidéos avec Claude

| Outil | Rôle | Site |
|---|---|---|
| **FFmpeg** | Coupe et mixe la vidéo | https://ffmpeg.org |
| **HyperFrames** | Sous-titres et graphismes (HTML → MP4) | https://github.com/heygen-com/hyperframes |
| **yt-dlp** | Télécharge les Reels / vidéos | https://github.com/yt-dlp/yt-dlp |

## Installation

```bash
./install.sh
```

Ou à la main :

```bash
# FFmpeg
brew install ffmpeg            # macOS
sudo apt install ffmpeg        # Linux
winget install Gyan.FFmpeg     # Windows

# yt-dlp
pip install -U yt-dlp          # ou: brew install yt-dlp

# HyperFrames (Node.js >= 22)
npm install -g hyperframes
```

## Exemples rapides

```bash
# Télécharger une vidéo (seulement du contenu dont vous avez les droits)
yt-dlp -o "source.%(ext)s" "<URL>"

# Couper de 0:05 à 0:20
ffmpeg -i source.mp4 -ss 00:00:05 -to 00:00:20 -c copy extrait.mp4

# Créer un projet HyperFrames, prévisualiser puis rendre en MP4
hyperframes init mon-projet
cd mon-projet && hyperframes preview
hyperframes render
```
