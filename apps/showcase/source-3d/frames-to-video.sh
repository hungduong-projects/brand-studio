#!/bin/sh
# Turn a rendered frame sequence into a docs demo video on a dark studio backdrop.
# Run from the repository root after render-video.mjs: sh apps/showcase/source-3d/frames-to-video.sh <turn|macro>
# The scroll-driven turn makes every frame a keyframe (-g 1) so it can seek to any frame without stalling; the looping macro keeps normal compression.
set -eu
name="$1"
gop=48; [ "$name" = turn ] && gop=1
out="apps/docs/public/videos"
mkdir -p "$out"
ffmpeg -y -loglevel error -f lavfi -i "color=c=0x16161a:s=1280x720:r=24" -framerate 24 -i "apps/showcase/source-3d/stills/$name/%04d.png" \
  -filter_complex "[0][1]overlay=shortest=1,format=yuv420p" -c:v libx264 -preset slow -crf 27 -g "$gop" -movflags +faststart -an "$out/halden-$name.mp4"
ffmpeg -y -loglevel error -i "$out/halden-$name.mp4" -vframes 1 -q:v 3 "$out/halden-$name.jpg"
ls -la "$out/halden-$name.mp4" "$out/halden-$name.jpg"
