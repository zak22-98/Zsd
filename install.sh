#!/usr/bin/env bash
# Installe les 3 outils : FFmpeg, HyperFrames, yt-dlp
set -euo pipefail

echo "==> FFmpeg (montage + mixage vidéo)"
if ! command -v ffmpeg >/dev/null; then
  if command -v brew >/dev/null; then brew install ffmpeg
  elif command -v apt-get >/dev/null; then sudo apt-get update && sudo apt-get install -y ffmpeg
  elif command -v winget >/dev/null; then winget install --id Gyan.FFmpeg -e
  else echo "Installe FFmpeg manuellement : https://ffmpeg.org/download.html"; exit 1; fi
fi

echo "==> yt-dlp (téléchargement des Reels / vidéos)"
if command -v brew >/dev/null; then brew install yt-dlp || brew upgrade yt-dlp
else python3 -m pip install -U yt-dlp; fi

echo "==> HyperFrames (sous-titres + graphismes, HTML -> MP4)"
command -v npm >/dev/null || { echo "Node.js >= 22 requis : https://nodejs.org"; exit 1; }
npm install -g hyperframes

echo
ffmpeg -version | head -1
echo "yt-dlp $(yt-dlp --version)"
echo "hyperframes $(hyperframes --version)"
echo "✅ Les 3 outils sont installés."
