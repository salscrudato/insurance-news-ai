#!/bin/bash

# Export all frontend and backend code to a single file for AI code review
# This script collects all source code files with their full paths and contents

OUTPUT_FILE="code-review-export.txt"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_ROOT"

echo "Exporting code for AI review..."
echo ""

# Clear/create output file
> "$OUTPUT_FILE"

# Add header
echo "================================================================================" >> "$OUTPUT_FILE"
echo "INSURANCE NEWS AI - FULL CODEBASE EXPORT FOR AI CODE REVIEW" >> "$OUTPUT_FILE"
echo "Generated: $(date)" >> "$OUTPUT_FILE"
echo "================================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add a file to the output
add_file() {
    local filepath="$1"
    if [ -f "$filepath" ]; then
        echo "Adding: $filepath"
        echo "================================================================================" >> "$OUTPUT_FILE"
        echo "FILE: $filepath" >> "$OUTPUT_FILE"
        echo "================================================================================" >> "$OUTPUT_FILE"
        cat "$filepath" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

# ===== CONFIGURATION FILES =====
echo "" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "# CONFIGURATION FILES" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

for file in package.json tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts \
            capacitor.config.ts eslint.config.js firebase.json firestore.rules firestore.indexes.json \
            index.html; do
    add_file "$file"
done

# ===== FRONTEND SOURCE CODE =====
echo "" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "# FRONTEND SOURCE CODE (src/)" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Find all .ts, .tsx, .css files in src/
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) | sort | while read -r file; do
    add_file "$file"
done

# ===== PUBLIC FILES =====
echo "" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "# PUBLIC FILES" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

for file in public/manifest.json public/firebase-messaging-sw.js; do
    add_file "$file"
done

# ===== BACKEND/FUNCTIONS SOURCE CODE =====
echo "" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "# BACKEND FIREBASE FUNCTIONS (functions/src/)" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

add_file "functions/package.json"
add_file "functions/tsconfig.json"

# Find all .ts files in functions/src/
find functions/src -type f -name "*.ts" | sort | while read -r file; do
    add_file "$file"
done

# ===== SCRIPTS =====
echo "" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "# UTILITY SCRIPTS (scripts/)" >> "$OUTPUT_FILE"
echo "################################################################################" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

find scripts -type f \( -name "*.sh" -o -name "*.mjs" -o -name "*.js" \) ! -name "export-for-review.sh" | sort | while read -r file; do
    add_file "$file"
done

# Summary
echo ""
echo "====================================="
echo "Export complete!"
echo "Output file: $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo "Total lines: $(wc -l < "$OUTPUT_FILE" | tr -d ' ')"
echo "====================================="

