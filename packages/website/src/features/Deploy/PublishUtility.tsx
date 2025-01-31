import { externalLinks } from '@/constants/externalLinks';
import { truncateAddress } from '@/helpers/ethereum';
import { IPFSBrowserLoader } from '@/helpers/ipfs';
import { sleep } from '@/helpers/misc';
import { useStore } from '@/helpers/store';
import { useCannonPackage } from '@/hooks/cannon';
import { useCannonPackagePublishers } from '@/hooks/registry';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  ExternalLinkIcon,
  InfoOutlineIcon,
  QuestionOutlineIcon,
} from '@chakra-ui/icons';
import {
  Alert,
  AlertIcon,
  Button,
  Image,
  Link,
  ListItem,
  Skeleton,
  Stack,
  Text,
  Tooltip,
  UnorderedList,
  useToast,
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import {
  CannonStorage,
  DEFAULT_REGISTRY_CONFIG,
  FallbackRegistry,
  InMemoryRegistry,
  OnChainRegistry,
  publishPackage,
} from '@usecannon/builder';
import * as viem from 'viem';
import { mainnet, optimism } from 'viem/chains';
import { useSwitchChain, useWalletClient } from 'wagmi';

export default function PublishUtility(props: {
  deployUrl: string;
  targetChainId: number;
}) {
  const settings = useStore((s) => s.settings);

  const wc = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const toast = useToast();

  // get the package referenced by this ipfs package
  const {
    resolvedName,
    resolvedVersion,
    resolvedPreset,
    ipfsQuery: ipfsPkgQuery,
  } = useCannonPackage(props.deployUrl);

  // then reverse check the package referenced by the
  const {
    pkgUrl: existingRegistryUrl,
    registryQuery,
    ipfsQuery: ipfsChkQuery,
  } = useCannonPackage(
    `${resolvedName}:${resolvedVersion}@${resolvedPreset}`,
    props.targetChainId
  );

  const packageUrl = `/packages/${resolvedName}/${
    resolvedVersion || 'latest'
  }/${props.targetChainId}-${resolvedPreset || 'main'}`;
  const packageDisplay = `${resolvedName}${
    resolvedVersion ? ':' + resolvedVersion : ''
  }${resolvedPreset ? '@' + resolvedPreset : ''}`;

  const publishers = useCannonPackagePublishers(resolvedName);

  const canPublish = publishers.some(
    ({ publisher }) =>
      wc.data?.account.address &&
      viem.isAddressEqual(publisher, wc.data?.account.address)
  );

  const { getChainById, customTransports, getExplorerUrl } = useCannonChains();

  const prepareAndPublishPackage = async (publishChainId: number) => {
    if (!wc.data) {
      throw new Error('Wallet not connected');
    }

    const [walletAddress] = await wc.data.getAddresses();

    const onChainRegistries = DEFAULT_REGISTRY_CONFIG.map((config) => {
      const rpcUrl = config.rpcUrl.find(
        (url) => url.startsWith('https://') || url.startsWith('wss://')
      );

      return new OnChainRegistry({
        signer: { address: walletAddress, wallet: wc.data as any },
        address: config.address,
        provider: viem.createPublicClient({
          chain: getChainById(config.chainId),
          transport: customTransports[config.chainId] || viem.http(rpcUrl),
        }),
      });
    });

    const targetRegistry = new FallbackRegistry(
      onChainRegistries,
      publishChainId === 10 ? 0 : 1
    );

    const fakeLocalRegistry = new InMemoryRegistry();

    // TODO: set meta url
    await fakeLocalRegistry.publish(
      [`${resolvedName}:${resolvedVersion}@${resolvedPreset}`],
      props.targetChainId,
      props.deployUrl,
      ''
    );

    const loader = new IPFSBrowserLoader(
      settings.ipfsApiUrl || externalLinks.IPFS_CANNON
    );

    const fromStorage = new CannonStorage(
      fakeLocalRegistry,
      { ipfs: loader },
      'ipfs'
    );
    const toStorage = new CannonStorage(
      targetRegistry,
      { ipfs: loader },
      'ipfs'
    );

    await publishPackage({
      packageRef: `${resolvedName}:${resolvedVersion}@${resolvedPreset}`,
      tags: ['latest'],
      chainId: props.targetChainId,
      fromStorage,
      toStorage,
      includeProvisioned: true,
    });
  };

  const publishMainnetMutation = useMutation({
    mutationFn: async () => {
      await prepareAndPublishPackage(mainnet.id);
    },
    onSuccess: async () => {
      await registryQuery.refetch();
    },
    onError(err) {
      // eslint-disable-next-line no-console
      console.error(err);
      if (err.message.includes('exceeds the balance of the account')) {
        toast({
          title: 'Error Publishing Package: Insufficient Funds',
          status: 'error',
          duration: 10000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error Publishing Package',
          status: 'error',
          duration: 10000,
          isClosable: true,
        });
      }
    },
  });

  const publishOptimismMutation = useMutation({
    mutationFn: async () => {
      await prepareAndPublishPackage(optimism.id);
    },
    onSuccess: async () => {
      await registryQuery.refetch();
    },
    onError(err) {
      // eslint-disable-next-line no-console
      console.error(err);

      if (err.message.includes('exceeds the balance of the account')) {
        toast({
          title: 'Error Publishing Package: Insufficient Funds',
          status: 'error',
          duration: 10000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error Publishing Package',
          status: 'error',
          duration: 10000,
          isClosable: true,
        });
      }
    },
  });

  if (ipfsPkgQuery.isFetching || ipfsChkQuery.isFetching) {
    return (
      <Stack>
        <Skeleton height="20px" />
        <Skeleton height="60px" />
        <Skeleton height="20px" />
      </Stack>
    );
  } else if (existingRegistryUrl !== props.deployUrl) {
    // Any difference means that this deployment is not technically published
    return (
      <>
        {props.deployUrl && (
          <Link
            href={`/ipfs?cid=${props.deployUrl.substring(7)}`}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            display="flex"
            alignItems="center"
            mb={4}
          >
            <Image
              display="inline-block"
              src="/images/ipfs.svg"
              alt="IPFS"
              height="14px"
              mr={1.5}
            />
            <Text
              fontSize="xs"
              display="inline"
              borderBottom="1px dotted"
              borderBottomColor="gray.300"
            >
              {`${props.deployUrl.substring(0, 13)}...${props.deployUrl.slice(
                -6
              )}`}
            </Text>
          </Link>
        )}

        {!!existingRegistryUrl && (
          <Alert mb={4} status="warning" bg="gray.700" fontSize="sm">
            <AlertIcon boxSize={4} mr={3} />
            <Text>
              A different package has already been published to {packageDisplay}
              . Publishing again will overwrite it.
            </Text>
          </Alert>
        )}

        {!canPublish && (
          <div>
            <Text fontSize="xs" fontWeight="medium" mb={2}>
              Connect{' '}
              {publishers.length > 1
                ? 'one of the following wallets'
                : 'the following wallet'}{' '}
              to Ethereum or OP Mainnet to publish this package:
            </Text>
            <UnorderedList mb={4}>
              {publishers.map(({ publisher, chainName, chainId }) => (
                <ListItem key={publisher + chainName} mb={1}>
                  <Text
                    display="inline"
                    fontFamily="mono"
                    fontWeight={200}
                    color="gray.200"
                    fontSize="xs"
                    key={`publisher-${publisher}`}
                  >
                    {`${truncateAddress(publisher)} (${chainName})`}
                    <Link
                      isExternal
                      styleConfig={{ 'text-decoration': 'none' }}
                      href={getExplorerUrl(chainId, publisher)}
                      ml={1}
                    >
                      <ExternalLinkIcon transform="translateY(-1px)" />
                    </Link>
                  </Text>
                </ListItem>
              ))}
            </UnorderedList>
            <Button
              variant="outline"
              colorScheme="white"
              size="sm"
              bg="teal.900"
              borderColor="teal.500"
              _hover={{ bg: 'teal.800' }}
              textTransform="uppercase"
              letterSpacing="1px"
              fontFamily="var(--font-miriam)"
              color="gray.200"
              fontWeight={500}
              isDisabled
              w="full"
            >
              Publish Package
            </Button>
          </div>
        )}

        {canPublish && (
          <>
            <Button
              variant="outline"
              colorScheme="white"
              size="sm"
              bg="teal.900"
              borderColor="teal.500"
              _hover={{ bg: 'teal.800' }}
              textTransform="uppercase"
              letterSpacing="1px"
              fontFamily="var(--font-miriam)"
              color="gray.200"
              fontWeight={500}
              isDisabled={
                publishOptimismMutation.isPending ||
                publishMainnetMutation.isPending
              }
              mb={2}
              w="full"
              onClick={async () => {
                await switchChainAsync({ chainId: optimism.id });
                await sleep(100);
                publishOptimismMutation.mutate();
              }}
              isLoading={publishOptimismMutation.isPending}
            >
              Publish to Optimism
            </Button>
            <Text fontSize="xs" textAlign="center">
              <Link
                onClick={async () => {
                  if (
                    publishOptimismMutation.isPending ||
                    publishMainnetMutation.isPending
                  ) {
                    return false;
                  }

                  await switchChainAsync({ chainId: mainnet.id });
                  await sleep(100);
                  publishMainnetMutation.mutate();
                }}
              >
                {publishMainnetMutation.isPending
                  ? 'Publishing...'
                  : 'Publish to Mainnet'}
              </Link>{' '}
              <Tooltip label="Cannon will detect packages published to Optimism or Mainnet.">
                <InfoOutlineIcon />
              </Tooltip>
            </Text>
          </>
        )}
      </>
    );
  } else {
    return (
      <>
        <Text mb={1} fontSize="sm">
          <strong>Name:</strong> {resolvedName}
        </Text>
        {resolvedVersion !== 'latest' && (
          <Text mb={1} fontSize="sm">
            <strong>Version:</strong> {resolvedVersion}
          </Text>
        )}
        {resolvedPreset !== 'main' && (
          <Text mb={1} fontSize="sm">
            <strong>Preset:</strong> {resolvedPreset}
            <Tooltip label="Presets are useful for distinguishing multiple deployments of the same protocol on the same chain.">
              <QuestionOutlineIcon ml={1.5} opacity={0.8} />
            </Tooltip>
          </Text>
        )}

        <Button
          mt={2}
          as={Link}
          href={packageUrl}
          variant="outline"
          colorScheme="white"
          size="sm"
          bg="teal.900"
          borderColor="teal.500"
          _hover={{ bg: 'teal.800', textDecoration: 'none' }}
          textTransform="uppercase"
          letterSpacing="1px"
          fontFamily="var(--font-miriam)"
          color="gray.200"
          fontWeight={500}
          textDecoration="none"
          isExternal
          rightIcon={<ExternalLinkIcon transform="translateY(-1px)" />}
        >
          View Package
        </Button>
      </>
    );
  }
}
