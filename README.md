# Performance MIDI-to-Score Case Studies

**Read and share:** https://parzival-li.github.io/Pm2sCaseStudy/

An English-language report on performance-MIDI-to-MusicXML conversion, comparing M2ST with GT and, for Masycheva01, with a **new model**.

The site includes a 12-metric pattern overview, four distinct best/worst pieces, two Haydn Sonata 31-1 performances (Song05M and Zagalskaia02), the Masycheva01 comparison, and 74 interactive score excerpts, including the archived Ravel appendix. Players offer GT/prediction/performance-MIDI audio, score cursors, seeking, and pitch-preserving slow playback. Each excerpt includes one measure of context on either side where available.

## Listening

Expand an example, select its source and press **Play**. MP3 audio and AAC fallbacks are served publicly from the same site. No account, SSH connection, local server, soundfont download or external synthesis service is required. Gold indicates playback position; red/blue retain the original metric annotations. The performance-MIDI cursor's alignment to GT is approximate.

## Scope of the public edition

This publication contains the report, rendered score excerpts and synthesized excerpt audio. Complete original XML/MIDI files, detailed raw research logs and internal server paths are retained privately. Numerical findings and their stated limitations remain in the report.

## Hosting

The complete static site is in `docs/`, served by GitHub Pages from `main` / `docs`. No continuously running server or site build is required. The `.nojekyll` file preserves asset filenames.

Local preview:

```sh
python3 -m http.server 8000 --directory docs
```

Open http://localhost:8000/. Run `python3 tools/validate_site.py` to check the site's links and English presentation.

## Updated same-piece study (29 October 2026)

[Haydn: two performances](https://parzival-li.github.io/Pm2sCaseStudy/Haydn_pair.html) is the main comparison, chosen for readable notation and a 3.28218-point MeanER gap. All 12 metrics are discussed separately, with independently rerun measurements, 12 metric views, and GT / two prediction / two performance-MIDI listening sources. The study distinguishes uniform changes of notational time unit from changes to relative rhythm. The original Ravel comparison is retained as an explicitly archived appendix.
