#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
    printf 'Usage: %s input.mermaid [output.png]\n' "$0" >&2
    exit 2
fi

input=$1
output=${2:-${input%.mermaid}.png}

if [[ $input != *.mermaid || ! -f $input || ! -r $input ]]; then
    printf 'Expected a readable .mermaid file: %s\n' "$input" >&2
    exit 2
fi

if [[ $output != *.png ]]; then
    printf 'Expected a .png output path: %s\n' "$output" >&2
    exit 2
fi

args=( "--input=$input" "--output=$output" --backgroundColor white --scale 2 )
if command -v mmdc >/dev/null 2>&1; then
    exec mmdc "${args[@]}"
fi

if command -v npx >/dev/null 2>&1; then
    exec npx --yes --package @mermaid-js/mermaid-cli -- mmdc "${args[@]}"
fi

printf 'Install Mermaid CLI (mmdc) or Node.js with npm (npx) to render the diagram.\n' >&2
exit 127
