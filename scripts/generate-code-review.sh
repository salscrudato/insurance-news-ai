#!/bin/bash
# Generate a single file containing all frontend and backend code for AI code review
# Output: code-review.txt in the project root

OUTPUT_FILE="code-review.txt"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_ROOT"

# Clear/create output file
echo "# P&C Insurance News AI - Full Codebase for Review" > "$OUTPUT_FILE"
echo "# Generated: $(date)" >> "$OUTPUT_FILE"
echo "# =============================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Function to add a file to the output
add_file() {
    local filepath="$1"
    if [ -f "$filepath" ]; then
        echo "" >> "$OUTPUT_FILE"
        echo "=================================================================================" >> "$OUTPUT_FILE"
        echo "FILE: $filepath" >> "$OUTPUT_FILE"
        echo "=================================================================================" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$filepath" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
}

# Add project config files
echo "## PROJECT CONFIGURATION" >> "$OUTPUT_FILE"
add_file "package.json"
add_file "tsconfig.json"
add_file "vite.config.ts"
add_file "tailwind.config.js"
add_file "firebase.json"
add_file "firestore.rules"
add_file "firestore.indexes.json"

# Add frontend source files
echo "" >> "$OUTPUT_FILE"
echo "## FRONTEND SOURCE CODE" >> "$OUTPUT_FILE"

# Find all TypeScript/TSX files in src directory
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort | while read -r file; do
    add_file "$file"
done

# Add CSS files
find src -type f -name "*.css" | sort | while read -r file; do
    add_file "$file"
done

# Add index.html
add_file "index.html"

# Add backend/functions source files
echo "" >> "$OUTPUT_FILE"
echo "## BACKEND (CLOUD FUNCTIONS) SOURCE CODE" >> "$OUTPUT_FILE"

add_file "functions/package.json"
add_file "functions/tsconfig.json"

# Find all TypeScript files in functions/src directory
find functions/src -type f -name "*.ts" | sort | while read -r file; do
    add_file "$file"
done

# Summary
echo "" >> "$OUTPUT_FILE"
echo "=================================================================================" >> "$OUTPUT_FILE"
echo "END OF CODEBASE" >> "$OUTPUT_FILE"
echo "=================================================================================" >> "$OUTPUT_FILE"

# Count files and lines
FILE_COUNT=$(grep -c "^FILE:" "$OUTPUT_FILE")
LINE_COUNT=$(wc -l < "$OUTPUT_FILE")

echo "✅ Generated $OUTPUT_FILE"
echo "   - $FILE_COUNT files included"
echo "   - $LINE_COUNT total lines"

