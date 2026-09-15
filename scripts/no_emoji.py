"""Exits 1 if any given file contains an emoji or pictograph code point."""
import re
import sys

EMOJI = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27BF\U0001F900-\U0001F9FF]')
bad = 0
for path in sys.argv[1:]:
    for i, line in enumerate(open(path, encoding='utf-8'), 1):
        if EMOJI.search(line):
            print(f'{path}:{i}: emoji')
            bad += 1
sys.exit(1 if bad else 0)
