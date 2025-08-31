#!/usr/bin/env bash
# Simple CSP header test for /api/health

API_URL=${API_URL:-"http://localhost:5000/api/health"}

echo "🔍 Testing CSP header on $API_URL ..."
echo

# Perform the request and capture headers only
headers=$(curl -s -D - -o /dev/null "$API_URL")

# Look for "content-security-policy" header
echo "$headers" | grep -i "content-security-policy" >/dev/null

if [ $? -eq 0 ]; then
  echo "✅ CSP header present"
  echo
  echo "Header:"
  echo "$headers" | grep -i "content-security-policy"
  exit 0
else
  echo "❌ CSP header missing!"
  echo "$headers"
  exit 1
fi
