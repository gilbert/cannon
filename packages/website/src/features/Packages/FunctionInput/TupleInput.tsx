import { Flex, FormControl, FormLabel, Text } from '@chakra-ui/react';
import { BigNumber } from '@ethersproject/bignumber';
import { useState } from 'react';
import { AbiParameter } from 'viem';
import { FunctionInput } from '../FunctionInput';

const TupleInput = ({
  input,
  handleUpdate,
  value,
}: {
  input: any;
  handleUpdate: (value: any) => void;
  value?: Record<string, any>;
}) => {
  const getDefaultValueForType = (component: AbiParameter) => {
    if (component.type.startsWith('bool')) return false;
    if (component.type.startsWith('int')) return '0';
    if (component.type.startsWith('uint')) return '0';
    return '';
  };

  // Initialize the tuple state as an object, with keys corresponding to tuple property names
  const [tupleState, setTupleState] = useState(() =>
    input.components.reduce((acc: any, component: any) => {
      // Use value prop if available, otherwise use default value
      acc[component.name] =
        value?.[component.name] ?? getDefaultValueForType(component);
      return acc;
    }, {})
  );

  const updateTupleValue = (name: string, value: any) => {
    const updatedTupleState = { ...tupleState, [name]: value };
    setTupleState(updatedTupleState);
    handleUpdate(updatedTupleState); // Pass the entire tuple object up
  };

  return (
    <Flex
      borderLeft="1px"
      borderColor="gray.600"
      pl="4"
      direction="column"
      w="100%"
    >
      {input.components.map((component: any, index: number) => (
        <FormControl mb="4" key={index}>
          <FormLabel fontSize="sm" mb={1}>
            {component.name && <Text display="inline">{component.name}</Text>}
            {component.type && (
              <Text fontSize="xs" color="whiteAlpha.700" display="inline">
                {' '}
                {component.type}
              </Text>
            )}
          </FormLabel>
          <FunctionInput
            input={component}
            handleUpdate={(value) => {
              // Since tuple components are represented as a JSON object,
              // We represent the bigint type as a string
              if (typeof value === 'bigint') {
                value = BigNumber.from(value).toString();
              }
              updateTupleValue(component.name, value);
            }}
            initialValue={tupleState[component.name]}
          />
        </FormControl>
      ))}
    </Flex>
  );
};

export default TupleInput;
