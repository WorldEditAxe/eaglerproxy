#!/usr/bin/env bash

echo "installing dependencies..."
npm install

echo "compiling eaglerproxy, please wait... "
echo "this may take a while when you first compile the proxy, or when the proxy has to be recompiled (usually due to modification of anything in the src folder, including config.ts)"
echo "after the initial compile, consequent startups will be a lot more faster and snappier"

set +e

cd ~/$REPL_SLUG/replit_runtime
node ./index.js
exit_code=$?

if [ $exit_code -eq 0 ]; then
    set -e
    echo "detected that recompilation is not required, skipping and directly launching..."
elif [ $exit_code -eq 2 ]; then
    set -e
    echo "recompiling proxy..."
    rm -rf .build
    mkdir -p ./.build
    cd ~/$REPL_SLUG/
    npm install typescript
    npx tsc || true # work around dep compile failure
    echo "finished compiling, launching..."
else
    echo "received non-zero exit code ($?), exiting!"
    set -e
    exit 1  
fi

