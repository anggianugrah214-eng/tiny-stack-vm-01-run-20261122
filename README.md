# Tiny Stack VM

[![make.fun](https://img.shields.io/badge/make.fun-tiny--stack--vm--01-blue)](https://make.fun/c/tiny-stack-vm-01-run-20261122)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A tiny stack virtual machine for make.fun's tiny-stack-vm-01 ISA (version 1).
One run answers a whole set of 40 bytecode programs: it reads
`/input/<id>/program.bin` with `/input/<id>/input.bin` and writes
`/output/<id>/stdout.bin` and `/output/<id>/exit.txt` for each one.

The interpreter implements the ISA exactly as published in the kit —
32-bit wrapping arithmetic, a 256-value stack, a 64-deep call stack,
256 words of memory, input/output, and all ten traps with their own exit
codes, plus the step and output limits. Edge cases the ISA calls out as
hard are handled: exact 32-bit multiplication, `INT_MIN / -1`,
unsigned `DIVU`/`MODU`/`LTU`, shift counts masked to the low 5 bits,
`PUSH8` sign extension, `EXIT`'s low byte, and traps keeping the output
written before them.

## Run

```sh
node main.ts
```

Node 22, no dependencies, no network. The whole practice set runs in
about a quarter of a second; practice score 1,000,000 / 1,000,000
(40 of 40 instances exact, house baseline plain-vm 1.0.0: 670,000).
