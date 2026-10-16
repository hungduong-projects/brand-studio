# Narration that teaches

Write the voice-over after the silent cut, against its beats. Each rule below names the evidence behind it.

## What the research says

Mayer (2021) reviews evidence-based principles for instructional video. The ones a narrated visual can apply:

| Principle | In Mayer's words | In a narrated film |
|---|---|---|
| Coherence | avoid extraneous material in slides and script | Cut every line that does not help the viewer understand. No music bed under speech. |
| Signaling | highlight key material | The page lights one layer at a time; the line names that part in the words on screen. |
| Redundancy | do not add captions that repeat the spoken words | Captions go in an SRT the viewer can turn on, not burned into the picture. |
| Spatial contiguity | place printed text next to corresponding part of graphic | Labels sit beside their layer; keep them short. |
| Temporal contiguity | present corresponding visual and verbal material at the same time | Each line starts on its beat; the page holds the beat until the line ends. |
| Segmenting | break a complex slide into progressively presented parts | One idea per beat. Leave zoom and home beats silent, as a breath between parts. |
| Pre-training | provide pre-training in the names and characteristics of key concepts | The first pass names the top layers before the film dives into one. |
| Modality | present words as spoken text | Explain in speech; keep on-screen text to titles and short readouts. |
| Personalization | use conversational language | Say "you" and "your"; contractions are fine. |
| Voice | use appealing human voice | Pick a natural voice; no robotic or novelty voices. |
| Generative activity | add prompts for generative learning activity | End with something to do: try it, take one apart, spot the part. |

Brame (2016) adds, from a review of video research:

- Keep each video brief and targeted on learning goals. In Guo et al. (2014), across 6.9 million video sessions in four edX courses, median engagement was close to 100% for videos under 6 minutes, about 50% at 9 to 12 minutes and about 20% at 12 to 40 minutes; 6 minutes was the most anyone watched of a video of any length.
- Use a conversational, enthusiastic style. Engagement rose with speaking rate in Guo et al., whose narrators spoke at 185 to 254 words per minute. Do not slow the voice down to sound clear.
- Use guiding questions: tell viewers what to look for before they watch.

## Write the script

1. **Open with the question the film answers**, in ten words or fewer: "Ever wondered what's inside your phone? Let's take it apart." It is the guiding question and the hook.
2. **One line per beat**, about 4 to 16 words, on the beats that carry an idea. The screen already shows the part's name and a readout, so the line says what the part does or why it matters.
3. **Talk; don't read.** Write each line the way you would explain the part to a friend looking at the screen with you: say "you", use contractions, ask the odd question ("See the biggest chip?"), react ("Fun fact:"), and reach for everyday comparisons ("smaller than your fingernail", "like tiny highways"). Never list what the screen lists, and never read a readout aloud. If a line sounds like a label when you say it, rewrite it.

   | Reads the screen | Talks |
   |---|---|
   | "Under it, the display. Each pixel makes its own light." | "Right under it, the screen. Its pixels glow on their own, so black looks really deep." |
   | "Inside: the logic board, the battery and the cameras." | "And this is where the real work happens. See how much room the battery takes up?" |
   | "Its biggest chip is the processor." | "See the biggest chip? That's the processor, running the show." |

4. **Keep facts as careful as the readouts.** Hedge where products differ ("on most sensors"), and add no number the source does not give.
5. **End with a prompt to act**, then the address, spelled for the ear in `text` and written in `caption`: `"brand studio dot J S dot org"` / `"brandstudio.js.org"`.
6. **Read it aloud** at speaking speed. A social cut runs 30 to 90 seconds; a lesson stays under 6 minutes.

## Pick the voice

Choose an upbeat, conversational voice over a calm documentary one: enthusiasm and a brisk pace are what kept viewers watching in the research above. List candidates with `voice-over.mjs --voices --search cheerful` (or `friendly`, `energetic`), skip voices cloned from real people, and make the same two or three lines in a few voices before the full run. Aim for about 180 to 200 words a minute: the script's JSON line prints `wpm`, and `--speed` (0.5 to 2) adjusts it. It warns when a line is spoken faster than 260 words a minute, because a clip that short has likely dropped words.

Keep one voice from the first line to the last. Fish Audio makes each line in its own request, and some voices change register from one request to the next, so a line can sound like another speaker. The JSON line prints `drift`, the spread of the lines' pitch in semitones, and warns about any line more than 5 semitones from the rest. On the same six lines, four steady voices measured 0.4 to 1.6 semitones; an expressive voice measured 1.8 to 6.7, with single lines up to 9 semitones off, and lowering Fish Audio's `temperature` to 0.2 did not steady it. When the sample lines drift, pick another voice.

Fish Audio's S2 models (`s2.1-pro`, `s2.1-pro-free`) take emotion cues in square brackets, best at the start of a sentence: `[excited]`, `[happy]`, `[delighted]`, `[confident]`, or a short description such as `[warm and happy]`. Use one where the mood lifts (the opening, a fun fact, the call to act) rather than on every line; captions drop them.

## Captions

`post-video.mjs` writes SubRip captions beside the video as `<name>.en_US.srt`. Facebook reads the language from the name, `filename.[language code]_[country code].srt`, with the language lower case and the country upper case. Each line becomes cues of at most two lines of 42 characters, split at sentence ends and timed by their share of the line; a sentence too long for one cue splits into the fewest even cues, breaking after punctuation, so no cue holds a lone word. This follows Netflix's English style guide: 42 characters per line, two lines at most, up to 20 characters per second for adult programmes, and 5/6 of a second to 7 seconds per subtitle. Each subtitle stays up at least half a second past its speech, subtitles keep two frames apart, and a gap under half a second closes to two frames, as Netflix's timing guide asks. A line whose captions read faster than 20 characters per second, counted over the time they are on screen, needs fewer words.

## Sources

- Mayer, R. E. (2021). Evidence-based principles for how to design effective instructional videos. *Journal of Applied Research in Memory and Cognition*, 10(2), 229–240. https://doi.org/10.1016/j.jarmac.2021.03.007
- Brame, C. J. (2016). Effective educational videos: Principles and guidelines for maximizing student learning from video content. *CBE—Life Sciences Education*, 15(4), es6. https://pmc.ncbi.nlm.nih.gov/articles/PMC5132380/
- Guo, P. J., Kim, J., & Rubin, R. (2014). How video production affects student engagement: An empirical study of MOOC videos. *Proceedings of the First ACM Conference on Learning @ Scale*, 41–50. Cited through Brame (2016).
- Facebook Help Center: What is the naming convention for SubRip (.srt) files? https://www.facebook.com/help/1528795707381162
- Netflix: English (USA) Timed Text Style Guide, https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977; Timed Text Style Guide: General Requirements, https://partnerhelp.netflixstudios.com/hc/en-us/articles/215758617
- Netflix: Timed Text Style Guide: Subtitle Timing Guidelines, https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394
- Fish Audio API documentation and agent skills: https://docs.fish.audio; emotion cues: https://docs.fish.audio/developer-guide/core-features/emotions
