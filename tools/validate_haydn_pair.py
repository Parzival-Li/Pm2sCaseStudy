"""Validate the replacement comparison's public measurements and media."""
from collections import Counter
import json
import math
from pathlib import Path
import re

from validate_site import Page, PRIVATE_REFERENCE


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'docs'


def main():
    summary = json.loads((SITE / 'Haydn_pair_summary.json').read_text())
    assert summary['performances'] == ['Song05M', 'Zagalskaia02']
    assert len(summary['examples']) == 12
    assert len({v['kind'] for v in summary['examples'].values()}) == 12
    hashes = summary['source_sha256']
    assert hashes['Song05M']['GT.musicxml'] == hashes['Zagalskaia02']['GT.musicxml']
    assert hashes['Song05M']['performance.mid'] != hashes['Zagalskaia02']['performance.mid']
    assert not PRIVATE_REFERENCE.search(json.dumps(summary))

    ss_keys = ['NoteDeletion', 'NoteInsertion', 'NoteSpelling', 'NoteDuration', 'StaffAssignment']
    for data in summary['measurements'].values():
        for value in data['muster'].values():
            assert value['equal'] and abs(value['rerun'] - value['original']) < 1e-6
        raw = data['ss_rerun']
        for key in ss_keys:
            assert abs(raw[key] / raw['n_Note'] - data['ss_original'][key]) < 1e-12
    unit = summary['uniform_unit_diagnostic']['H_high']['GT39']
    assert unit['scale'] == '3/2' and unit['matched_pairs'] == 36
    assert unit['onset_residuals'] == unit['duration_residuals'] == {'0': 36}
    assert summary['new_audio_validation']['all_non_silent']

    audio, frame_ids_checked, tracks = set(), 0, 0
    for spec in summary['examples'].values():
        file = SITE / 'players' / (spec['id'] + '.html')
        page = Page()
        page.feed(file.read_text())
        data = page.data
        assert data['id'] == spec['id']
        assert len(data['tracks']) == 5
        assert Counter(t['kind'] for t in data['tracks']) == {'score': 3, 'performance': 2}
        assert len({t['label'] for t in data['tracks']}) == 5
        for track in data['tracks']:
            tracks += 1
            assert track['nominalDuration'] > 0
            assert 0 <= track['focusStart'] <= track['focusEnd']
            assert all(math.isfinite(f['t']) for f in track['frames'])
            ids = set(re.findall(r'\bid="([^"]+)"', track['svg']))
            for frame in track['frames']:
                for note_id in frame.get('ids', []):
                    assert note_id in ids, (spec['id'], track['label'], note_id)
                    frame_ids_checked += 1
            for key in ['audio', 'audioFallback']:
                path = file.parent / track[key]
                assert path.is_file() and path.stat().st_size > 1000, path
                audio.add(path.name)
            if track['kind'] == 'score':
                core, context = track['coreIndices'], track['contextIndices']
                assert context == [max(0, core[0]-1), core[1]+1]
                assert track['sourceNotesVerified'] > 0
            else:
                assert track['sourceEnd'] > track['sourceStart']
                assert track['approximateCursor'] is True
        assert (SITE / 'figures' / (spec['id'] + '.webp')).is_file()

    for file in SITE.glob('*.html'):
        text = file.read_text()
        nav = re.search(r'<nav>.*?</nav>', text, re.S).group()
        assert 'Haydn_pair.html' in nav and 'Ravel_pair.html' not in nav
    assert 'archived-pair-notice' in (SITE / 'Ravel_pair.html').read_text()
    assert 'new-haydn-pair' in (SITE / 'index.html').read_text()
    report = dict(
        views=12, source_tracks=tracks, audio_files=len(audio),
        synchronized_frame_note_ids_checked=frame_ids_checked,
        source_hashes_and_reruns_verified=True,
        GT39_uniform_rescaling_verified=True,
        all_excerpt_audio_non_silent=True,
        navigation_uses_Haydn=True,
        internal_source_paths_published=False,
    )
    (ROOT / 'tools' / 'haydn_checks_local.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
