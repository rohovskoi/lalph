#!/bin/bash

git fetch origin
git checkout origin/master
direnv allow
pnpm install
git submodule update --init --recursive
