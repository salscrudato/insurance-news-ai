#!/bin/bash

# Script to export all frontend and backend code into a single file for AI code review
# Output file in root directory

OUTPUT_FILE="code-review-export.txt"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

# Clear/create the output file
> "$OUTPUT_FILE"

echo "Exporting code for AI review..."
echo "Output file: $OUTPUT_FILE"

# Function to add a file to the output
add_file() {
    local file="$1"
    if [ -f "$file" ]; then
        echo "" >> "$OUTPUT_FILE"
        echo "=================================================================================" >> "$OUTPUT_FILE"
        echo "FILE: $file" >> "$OUTPUT_FILE"
        echo "=================================================================================" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

# Add config files
echo "Adding configuration files..."
add_file "package.json"
add_file "tsconfig.json"
add_file "tsconfig.app.json"
add_file "tsconfig.node.json"
add_file "vite.config.ts"
add_file "capacitor.config.ts"
add_file "eslint.config.js"
add_file "firebase.json"
add_file "firestore.rules"
add_file "firestore.indexes.json"
add_file "index.html"

# Add frontend source files
echo "Adding frontend source files (src/)..."
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) | sort | while read -r file; do
    add_file "$file"
done

# Add public files
echo "Adding public files..."
add_file "public/manifest.json"
add_file "public/firebase-messaging-sw.js"

# Add frontend scripts
echo "Adding frontend scripts..."
find scripts -type f \( -name "*.ts" -o -name "*.mjs" -o -name "*.js" \) ! -name "export-code-for-review.sh" | sort | while read -r file; do
    add_file "$file"
done

# Add backend (functions) config files
echo "Adding backend configuration files..."
add_file "functions/package.json"
add_file "functions/tsconfig.json"
add_file "functions/eslint.config.mjs"

# Add backend source files
echo "Adding backend source files (functions/src/)..."
find functions/src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read -r file; do
    add_file "$file"
done

# Count files and lines
FILE_COUNT=$(grep -c "^FILE:" "$OUTPUT_FILE" || echo "0")
LINE_COUNT=$(wc -l < "$OUTPUT_FILE" | tr -d ' ')

echo ""
echo "✅ Export complete!"
echo "   Files exported: $FILE_COUNT"
echo "   Total lines: $LINE_COUNT"
echo "   Output: $ROOT_DIR/$OUTPUT_FILE"

