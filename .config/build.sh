#!/usr/bin/env bash

set -e

rm -rf .build
mkdir -p ./.build

cd ~/$REPL_SLUG/
npm install typescript
npm install
npx tsc
