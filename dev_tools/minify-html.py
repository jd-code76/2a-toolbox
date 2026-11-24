#!/usr/bin/env python3
"""
HTML Minifier for 2A Toolbox Arsenal Management System
Removes comments and whitespace but preserves the license comment block at the top.
Usage: python3 minify-html.py [--no-minify]
"""

import os
import sys
import argparse
import re

# The header in index.html is an HTML comment whose body is written with JS-style
# "//" line prefixes and which closes with "-->".
COMMENT_CLOSE = '-->'

# Only the document preamble can hold the license block: the top of the file, or
# directly after an optional doctype (which must stay first for standards mode).
PREAMBLE_RE = re.compile(r'\s*(?:<!doctype[^>]*>\s*)?', re.IGNORECASE)

# A terminator with whitespace before the bracket, e.g. "-- >".
MALFORMED_CLOSE_RE = re.compile(r'--\s+>')

# Text that marks the block as the license header rather than a throwaway comment.
LICENSE_HINT_RE = re.compile(
    r'2A Toolbox|GNU\s+(?:Affero\s+)?General\s+Public\s+License|GPL',
    re.IGNORECASE,
)


def extract_license_header(html):
    """
    Split the license comment block out of the document preamble, verbatim.

    Returns (prefix, header, body), where `prefix` is the whitespace/doctype that
    came before the block and `header` is the block itself. `header` is None when
    no leading license comment is present. The block is returned exactly as
    written (indentation, "//" prefixes and the "-->" terminator included) so it
    survives minification byte-for-byte.
    """
    pre = PREAMBLE_RE.match(html)
    prefix = pre.group(0)
    rest = html[pre.end():]
    if not rest.startswith('<!--'):
        return None, None, html

    close_at = rest.find(COMMENT_CLOSE)
    space_close = MALFORMED_CLOSE_RE.search(rest)
    space_at = space_close.start() if space_close else -1

    # A spaced terminator arriving before any proper close means the header is
    # malformed. Refuse loudly: extracting nothing would quietly strip the notice,
    # and letting the search run on would swallow the rest of the page.
    if space_close and (close_at == -1 or space_at < close_at):
        candidate = rest[:space_at + len(space_close.group(0))]
        if LICENSE_HINT_RE.search(candidate):
            raise RuntimeError(
                "License header closes with '-- >' (space before '>'). "
                "Remove the space so it closes with '-->'."
            )

    if close_at == -1:
        return None, None, html

    block = rest[:close_at + len(COMMENT_CLOSE)]
    if not LICENSE_HINT_RE.search(block):
        # A leading comment, but not the license header: leave it in the body so
        # the normal comment removal can deal with it.
        return None, None, html

    return prefix, block, rest[close_at + len(COMMENT_CLOSE):]


def remove_html_comments(html):
    # Remove standard comments, but not IE conditional comments. The license
    # header is extracted before this runs, so it is never a candidate.
    return re.sub(r'<!--(?!\[if).*?-->', '', html, flags=re.DOTALL)


def minify_whitespace(html):
    html = re.sub(r'[\r\n]+', ' ', html)
    html = re.sub(r'\s+', ' ', html)
    return html.strip()


def minify_html_keep_license(original):
    prefix, header, body = extract_license_header(original)
    body = remove_html_comments(body)
    body = minify_whitespace(body)

    if not header:
        return body

    minified = prefix + header + "\n" + body

    # Safety net: a license notice that was found but then lost would be a legal
    # problem, not a cosmetic one, so fail loudly instead of writing the file.
    if header not in minified:
        raise RuntimeError(
            'License header was extracted but is missing from the minified output'
        )

    return minified


def get_file_size_stats(original, minified, file_name):
    orig = len(original.encode('utf-8'))
    new = len(minified.encode('utf-8'))
    pct = round((1 - new / orig) * 100, 1) if orig else 0
    return {
        'original_size': orig,
        'minified_size': new,
        'savings_percent': pct,
        'file_name': file_name
    }


def main():
    parser = argparse.ArgumentParser(description='Minify HTML preserving the license header')
    parser.add_argument('--no-minify', action='store_true', help='Skip minification')
    args = parser.parse_args()

    source_file = "../src/index.html"
    output_base = "../www"
    files_to_process = ["index.html"]
    source_dir = os.path.dirname(source_file)

    print("\033[33mChecking source files...\033[0m")
    missing = []
    for f in files_to_process:
        if not os.path.isfile(os.path.join(source_dir, f)):
            missing.append(f)
    if missing:
        print("\033[31mMissing files:\033[0m")
        for f in missing:
            print(f"  - {f}")
        sys.exit(1)
    print("\033[32mAll source files found\033[0m")

    os.makedirs(output_base, exist_ok=True)

    total_orig = 0
    total_new = 0

    print("\n\033[33mProcessing HTML files...\033[0m")
    for f in files_to_process:
        src = os.path.join(source_dir, f)
        dest = os.path.join(output_base, f)

        print(f"\n  \033[36mProcessing: {f}\033[0m")

        with open(src, 'r', encoding='utf-8') as fh:
            original = fh.read()

        if args.no_minify:
            processed = original
        else:
            try:
                processed = minify_html_keep_license(original)
            except RuntimeError as err:
                print(f"\033[31mError: {err}\033[0m")
                sys.exit(1)

        stats = get_file_size_stats(original, processed, f)
        total_orig += stats['original_size']
        total_new += stats['minified_size']

        if not args.no_minify:
            _, header, _ = extract_license_header(original)
            print(f"    \033[90mLicense header: {'preserved' if header else 'not found'}\033[0m")
            print(f"    \033[90mOriginal: {round(stats['original_size']/1024,1)} KB\033[0m")
            print(f"    \033[32mMinified: {round(stats['minified_size']/1024,1)} KB\033[0m")
            print(f"    \033[32mSaved: {stats['savings_percent']}% ({round((stats['original_size']-stats['minified_size'])/1024,1)} KB)\033[0m")
        else:
            print(f"    \033[90mSize: {round(stats['original_size']/1024,1)} KB (no minification)\033[0m")

        with open(dest, 'w', encoding='utf-8') as fh:
            fh.write(processed)
        print(f"    \033[36mWritten to: {dest}\033[0m")

    # Rest of stats display (unchanged)
    if total_orig:
        savings = round((1 - total_new / total_orig) * 100, 1)
    else:
        savings = 0
    print("\n" + "=" * 64)
    print("\033[32mProcessing complete!\033[0m")
    print("=" * 64)
    print(f"\n\033[33mOverall Statistics:\033[0m")
    print(f"  \033[36mFiles processed: {len(files_to_process)}\033[0m")
    print(f"  \033[90mOriginal total:  {round(total_orig/1024,1)} KB\033[0m")
    print(f"  \033[32mFinal total:     {round(total_new/1024,1)} KB\033[0m")
    if not args.no_minify:
        print(f"  \033[32mSpace saved:     {savings}% ({round((total_orig - total_new)/1024,1)} KB)\033[0m")
    method = "Minify (preserves license header)" if not args.no_minify else "Copy without minification"
    print(f"  \033[90mMethod:          {method}\033[0m")

if __name__ == "__main__":
    main()