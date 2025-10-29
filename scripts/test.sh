#!/bin/bash

# Selective Disclosure KYC - Testing Script
# This script runs tests for the smart contract

set -e

echo "🧪 Running Smart Contract Tests"
echo "==============================="

cd contracts/ring-sig-kyc

# Run contract tests
cargo test --release

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
else
    echo ""
    echo "❌ Some tests failed"
    exit 1
fi
