#!/usr/bin/env python3
"""
HTML Minifier for 2A Toolbox Arsenal Management System
Removes comments and whitespace but preserves the GPL license comment at the top.
Usage: python3 minify-html.py [--no-minify]
"""

import os
import sys
import argparse
import re

def extract_gpl_license(html):
    """Extract the GPL license comment block at the very beginning, if present."""
    # Looks for <!-- ... --> containing "2A Toolbox" and "GNU General Public License"
    pattern = r'^(<!--\s*.*?2A Toolbox.*?GNU General Public License.*?-->\s*)'
    m = re.match(pattern, html, re.DOTALL | re.IGNORECASE)
    return (m.group(1).rstrip(), html[m.end():]) if m else (None, html)

def remove_html_comments(html):
    # Remove standard comments, but not IE conditional comments
    return re.sub(r'<!--(?!\[if).*?-->', '', html, flags=re.DOTALL)

def minify_whitespace(html):
    html = re.sub(r'[\r\n]+', ' ', html)
    html = re.sub(r'\s+', ' ', html)
    return html.strip()

def minify_html_keep_license(original):
    gpl_block, body = extract_gpl_license(original)
    body = remove_html_comments(body)
    body = minify_whitespace(body)
    if gpl_block:
        return gpl_block + "\n" + body
    return body

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
    parser = argparse.ArgumentParser(description='Minify HTML preserving GPL license header')
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
            processed = minify_html_keep_license(original)

        stats = get_file_size_stats(original, processed, f)
        total_orig += stats['original_size']
        total_new += stats['minified_size']

        if not args.no_minify:
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
    method = "Minify (preserves GPL license header)" if not args.no_minify else "Copy without minification"
    print(f"  \033[90mMethod:          {method}\033[0m")

if __name__ == "__main__":
    main()
