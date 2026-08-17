#!/usr/bin/env node
// Standalone mount used by scripts/verify-terminal-restoration.sh to observe
// real terminal restoration (raw mode, alt screen, cursor) under SIGINT,
// SIGTERM, an uncaught exception, and an unhandled rejection. Kept out of
// src/ so no fault-injection path ever ships in the `hush` executable.
import { render } from '@termuijs/jsx';
import { HushApp } from '../../src/app.js';

const fault = process.env.HUSH_HARNESS_FAULT;

render(<HushApp />, { title: 'Hush harness', fullscreen: true, exitKey: 'q' })
  .then((code) => {
    process.exitCode = code;
  })
  .catch(() => {
    process.exitCode = 1;
  });

if (fault === 'uncaught') {
  setTimeout(() => {
    throw new Error('harness: forced uncaught exception');
  }, 300);
} else if (fault === 'rejection') {
  setTimeout(() => {
    void Promise.reject(new Error('harness: forced unhandled rejection'));
  }, 300);
}
