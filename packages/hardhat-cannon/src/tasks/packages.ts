import { task } from 'hardhat/config';
import { TASK_PACKAGES } from '../task-names';
import { packages } from '@usecannon/cli';
import { DEFAULT_CANNON_DIRECTORY } from '@usecannon/cli';

task(TASK_PACKAGES, 'List all packages in the local Cannon directory')
  .addOptionalParam('directory', 'Path to a custom package directory', DEFAULT_CANNON_DIRECTORY)
  .setAction(async ({ directory }, hre) => {
    if (directory === DEFAULT_CANNON_DIRECTORY && hre.config.paths.cannon) {
      directory = hre.config.paths.cannon;
    }
    await packages(directory);
  });
