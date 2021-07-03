#!/usr/bin/env node

const { ethers } = require("ethers");
const { program } = require("commander");
const ora = require("ora");
const chalk = require("chalk");
const erc20Abi = require("./erc20.json");

const version = require("./package.json").version;
const { formatUnits } = require("@ethersproject/units");

const findSlot = async (
  tokenAddress,
  tokenHolderAddress,
  rpcUrl,
  maxSlot,
  verbose
) => {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const token = new ethers.Contract(tokenAddress, erc20Abi, provider);

  let tokenSymbol = tokenAddress;
  let tokenDecimals = 18;
  try {
    tokenDecimals = await token.decimals();
    tokenSymbol = await token.symbol();
  } catch (e) {
    // Its fine if we can't get token symbol
  }

  // Output only if verbose
  let balCheckSpinner;
  if (verbose) {
    balCheckSpinner = ora(
      `Checking ${tokenHolderAddress} ${tokenSymbol} balance....`
    ).start();
  }

  const holderBal = await token.balanceOf(tokenHolderAddress);
  if (holderBal.eq(ethers.constants.Zero)) {
    if (balCheckSpinner) {
      balCheckSpinner.fail(
        `Token holder ${tokenHolderAddress} does not hold any ${tokenSymbol}`
      );
      return;
    }
    console.log("-1");
    return;
  }

  if (balCheckSpinner) {
    balCheckSpinner.succeed(
      `Token holder ${tokenHolderAddress} holds ${formatUnits(
        holderBal,
        tokenDecimals
      )} ${tokenSymbol} tokens`
    );
  }

  // Solidity is key, slot
  // Vyper    is slot, key
  let solSpinner;
  if (verbose) {
    solSpinner = ora(
      `Checking ${tokenSymbol} slot 0 with solidity mapping format (key, slot)`
    );
  }

  for (let i = 0; i <= maxSlot; i++) {
    const d = await provider.getStorageAt(
      tokenAddress,
      ethers.utils.solidityKeccak256(
        ["uint256", "uint256"],
        [tokenHolderAddress, i] // key, slot (solidity)
      )
    );

    let n = ethers.constants.Zero;

    try {
      n = ethers.BigNumber.from(d);
    } catch (e) {
      /* */
    }

    if (n.eq(holderBal)) {
      if (verbose) {
        solSpinner.succeed(
          `Slot number ${i} corresponds to balanceOf for ${tokenSymbol} with solidity mapping format (key, slot)`
        );
      }
      console.log(i);
      return;
    } else {
      if (verbose) {
        solSpinner.text = `Checking ${tokenSymbol} slot ${i} with solidity mapping format (key, slot)`;
        solSpinner.render();
      }
    }
  }

  if (verbose) {
    solSpinner.fail(
      `No slot number corresponds to balanceOf for ${tokenSymbol} with solidity mapping format (key, slot)`
    );
  }

  // Vyper
  let vyperSpinner;
  if (verbose) {
    vyperSpinner = ora(
      `Checking ${tokenSymbol} slot 0 with vyper mapping format (slot, key)`
    );
  }

  for (let i = 0; i <= maxSlot; i++) {
    const d = await provider.getStorageAt(
      tokenAddress,
      ethers.utils.solidityKeccak256(
        ["uint256", "uint256"],
        [i, tokenHolderAddress] // slot, key (vyper)
      )
    );

    let n = ethers.constants.Zero;

    try {
      n = ethers.BigNumber.from(d);
    } catch (e) {
      /* */
    }

    if (n.eq(holderBal)) {
      if (verbose) {
        vyperSpinner.succeed(
          `Slot number ${i} corresponds to balanceOf for ${tokenSymbol} with vyper mapping format (slot, key)`
        );
      }
      console.log(i);
      return;
    } else {
      if (verbose) {
        vyperSpinner.text = `Checking ${tokenSymbol} slot ${i} with vyper mapping format (slot, key)`;
        vyperSpinner.render();
      }
    }
  }

  if (verbose) {
    vyperSpinner.fail(
      `No slot number corresponds to balanceOf for ${tokenSymbol} with vyper mapping format (slot, key)`
    );
  }

  if (verbose) {
    console.info(
      "Seems like max slots have been exhausted, try increasing the limit with --limit"
    );
  }
  console.log("-1");
  return;
};

const main = async () => {
  program
    .version(version)
    .name("slot20")
    .command("balanceOf")
    .description(
      "Find the slot that is responsible for the balance state of a ERC20 token"
    )
    .option("--rpc <url>", "Node RPC URL", "http://127.0.0.1:8545")
    .option("-l, --limit <number>", "Checks until slot number", 100)
    .option("-v, --verbose", "Verbose output")
    .argument("<token address>", "Address of the ERC20 token")
    .argument(
      "<token holder>",
      "An address which holds a non-zero amount of the ERC20 token"
    )
    .action(async (tokenAddress, tokenHolderAddress, options) => {
      try {
        tokenAddress = ethers.utils.getAddress(tokenAddress);
      } catch (e) {
        /* */
      }

      try {
        tokenHolderAddress = ethers.utils.getAddress(tokenHolderAddress);
      } catch (e) {
        /* */
      }

      let limit = options.limit;
      try {
        limit = parseInt(limit);
      } catch (e) {
        console.error(chalk.red(`Invalid "limiit" provided`));
        process.exit(1);
      }

      if (!ethers.utils.isAddress(tokenAddress)) {
        console.error(chalk.red("Invalid token address"));
        process.exit(1);
      }

      if (!ethers.utils.isAddress(tokenHolderAddress)) {
        console.error(chalk.red("Invalid token address"));
        process.exit(1);
      }

      await findSlot(
        tokenAddress,
        tokenHolderAddress,
        options.rpc,
        limit,
        !!options.verbose
      );
    });

  program.parseAsync();
};

main().catch((e) => console.error(chalk.red(e.toString())));
