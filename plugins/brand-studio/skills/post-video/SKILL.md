---
name: post-video
description: Record a web page, interactive visual or animation as a narrated MP4 sized for Facebook, Instagram, Reels, Stories or YouTube, with a voice-over from Fish Audio and a captions file, and write narration that teaches. Use when the user wants a demo, explainer or tutorial video to post, a video in feed, reel, story, square or 16:9 size, a voice-over, narration or text to speech for a video, captions or subtitles, or asks to turn a page or visual into a video to download.
---

# Post video

Turn a page that animates into a video people can post, and narrate it so it teaches. Two scripts do the work:

- `scripts/post-video.mjs` records the page at a platform's size, adds the voice and writes captions.
- `scripts/voice-over.mjs` turns a narration script into one Fish Audio clip per line.

Both need `ffmpeg`; recording needs `playwright-core` and a Chromium (Playwright's own, or Chrome, Brave or Edge).

## Sizes

| `--format` | Size | Where |
|---|---|---|
| `feed` | 1440x1800 (4:5) | Facebook Feed |
| `reel` | 1440x2560 (9:16) | Reels; keep text and key visuals out of the top 14%, the bottom 35% and 6% at each side |
| `story` | 1440x2560 (9:16) | Stories; keep text out of the top 14% and the bottom 20% |
| `square` | 1080x1080 | Square posts |
| `wide` | 1920x1080 (16:9) | YouTube, a page, a slide |

The feed, reel and story sizes and margins are Meta's Ads Guide video specs, checked 2026-10-16; the video meets their encoding asks (H.264, fixed frame rate, stereo AAC at 128 kb/s or more, no edit lists). Make one feed version first. A reel needs the page's own tall layout, not a crop; the script warns when text sits under the platform's buttons.

## Workflow

1. **Silent cut first.** `node scripts/post-video.mjs 'page.html?film' --format feed --out film.mp4`. A page that defines `window.filmStart()` and sets `window.filmDone` (a take-apart page with `?film` does) records from start to end; any other page records `--seconds`. Read the JSON line and open `film-sheet.png`, not the video: the sheet shows the whole film in one image. `held` above 0.2 means frames repeat; run again with a lower `--slow`.
2. **Write the narration** against the beats: `take-apart.mjs model.js --beats` lists them for a take-apart page. Follow `references/narration.md`: one line per beat, said the way you would explain it to a friend, adding to what the screen shows instead of reading it out. Save it as `script.json`, `{ voice, lines: [{ id, text, caption? }] }`; `caption` is for text spelled for the ear, such as "brand studio dot J S dot org".
3. **Make the voice.** `node --env-file-if-exists=.env scripts/voice-over.mjs script.json --out voice`. It reads `FISH_API_KEY` and never prints it. Run `--credit` before a long job and `--voices --search cheerful` to pick an upbeat, conversational voice; put its id in `voice`. Aim for about 180 to 200 words a minute: the JSON line prints `wpm`, `--speed` adjusts it, and `warnings` names a clip spoken so fast it has likely dropped words or a line pitched so far from the rest that it sounds like another speaker. Keep a voice whose sample lines print a `drift` under about 2 semitones. Changing one line regenerates only that line. `s2.1-pro-free` costs nothing and suits drafts; a paid model that runs out of API credit falls back to it.
4. **Narrated cut.** `node scripts/post-video.mjs 'page.html?film' --format feed --voice voice/voice.json --out film.mp4`. Each beat now holds until its line ends. The mix is evened to -16 LUFS and the captions land beside the video as `film.en_US.srt`, the name Facebook reads the language from. Warnings name lines with no beat and lines that run into the next.
5. **Hand it over.** The script places each line on its beat and checks for lines with no beat, lines that overlap and captions that read too fast, so its JSON line is the check. Fix what it warns about, look at the sheet once more, and report the file, its length and size, and the captions file. Rebuilding those checks by hand costs minutes and finds nothing new.

Upload the SRT with the video rather than burning captions into the picture: people watching with the sound off turn captions on, and people listening are not made to read the same words twice.

## Fish Audio

Fish Audio's own skills cover the API in depth: `npx skills add https://docs.fish.audio`. What this skill relies on: `POST /v1/tts` with a `model` header (`s2.1-pro`, or `s2.1-pro-free`), the voice as `reference_id`, emotion as free-form `[bracket]` tags in the text (`[warm, curious]`), and `prosody.speed` from 0.5 to 2. The API bills the text's UTF-8 bytes. A Fish Audio app plan's monthly credits are not documented as API credit, so check `--credit` rather than assuming.
