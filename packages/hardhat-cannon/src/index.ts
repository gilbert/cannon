import path from 'path';
import '@nomiclabs/hardhat-ethers';

import './tasks/build';
import './tasks/deploy';
import './tasks/export';
import './tasks/import';
import './tasks/inspect';
import './tasks/packages';
import './tasks/publish';
import './tasks/run';
import './tasks/verify';
import './subtasks/load-deploy';
import './subtasks/rpc';
import './subtasks/write-deployments';
import './type-extensions';

import { getSavedPackagesDir } from '@usecannon/builder';

import { HardhatConfig, HardhatUserConfig } from 'hardhat/types';
import { extendConfig } from 'hardhat/config';

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  config.paths.deployments = userConfig.paths?.deployments
    ? path.resolve(config.paths.root, userConfig.paths.deployments)
    : path.join(config.paths.root, 'deployments');

  config.paths.cannon = userConfig.paths?.cannon
    ? path.resolve(config.paths.root, userConfig.paths.cannon)
    : getSavedPackagesDir();

  config.cannon = {
    registryEndpoint: userConfig.cannon?.registryEndpoint || 'https://cloudflare-eth.com/v1/mainnet',

    registryAddress: userConfig.cannon?.registryAddress || '0xA98BE35415Dd28458DA4c1C034056766cbcaf642',

    ipfsEndpoint: userConfig.cannon?.ipfsEndpoint || 'https://usecannon.infura-ipfs.io',
  };
});
