# slot20
Simple tool to find storage slots for ERC20 contracts. Trys both (key, slot), and (slot, key)

[![asciicast](https://asciinema.org/a/Z91OEDoqFb6sVKfJkSxrjzb6r.svg)](https://asciinema.org/a/Z91OEDoqFb6sVKfJkSxrjzb6r)

# Usage

```bash
Usage: slot20 balanceOf [options] <token address> <token holder>

Find the slot that is responsible for the balance state of a ERC20 token

Arguments:
  token address         Address of the ERC20 token
  token holder          An address which holds a non-zero amount of the ERC20 token

Options:
  --rpc <url>           Node RPC URL (default: "http://127.0.0.1:8545")
  -l, --limit <number>  Checks until slot number (default: 100)
  -v, --verbose         Verbose output
  -h, --help            display help for command
```