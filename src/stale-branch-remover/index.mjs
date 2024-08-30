import path from "path";
import fs from "fs";
import simpleGit from "simple-git";
import chalk from "chalk";
import readline from "readline";

// Main function that contains the logic
export async function removeStaleBranches(
  directory = process.cwd(),
  gitInstance = null,
  skipRepoCheck = false
) {
  // Ensure the directory exists and is a Git repository
  if (
    !skipRepoCheck &&
    (!fs.existsSync(directory) || !fs.existsSync(path.join(directory, ".git")))
  ) {
    console.error(
      chalk.red("Error: The specified directory is not a Git repository.")
    );
    process.exit(1);
  }

  // Initialize the Git client if not provided
  const git = gitInstance || simpleGit(directory);

  // Get the list of local and remote branches
  const localBranches = await git.branchLocal();
  const remoteBranches = await git.branch(["-r"]);
  const currentBranch = await git.status();

  console.log(`Current branch: ${currentBranch.current}`);
  const filteredBranches = [];
  for (const branch of localBranches.all) {
    if (branch === currentBranch.current) {
      console.log(`Skipping current branch: ${branch}`);
      continue;
    }

    await git.checkout(branch);
    const status = await git.status();
    if (!status.isClean()) {
      console.log(`Skipping branch with pending changes: ${branch}`);
      continue;
    }

    filteredBranches.push(branch);
  }

  const staleBranches = filteredBranches.filter(
    (branch) =>
      !remoteBranches.all
        .map((b) => b.replace(/^origin\//, ""))
        .includes(branch)
  );

  if (staleBranches.length === 0) {
    console.log(chalk.yellow("No stale branches found."));
  } else {
    console.log(
      chalk.blue("The following branches are stale and will be deleted:")
    );
    console.log(chalk.cyan(staleBranches.join("\n")));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      chalk.magenta("Do you want to delete these branches? (y/n): "),
      async (answer) => {
        if (answer.toLowerCase() === "y") {
          for (const branch of staleBranches) {
            await git.deleteLocalBranch(branch);
            console.log(chalk.green(`Deleted branch: ${branch}`));
          }
        } else {
          console.log(chalk.red("Operation aborted."));
        }
        rl.close();

        // Checkout back to the original branch
        await git.checkout(currentBranch.current);
      }
    );
  }
}
