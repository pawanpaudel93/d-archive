import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  Button,
  Input,
  Container,
  Center,
  Progress,
} from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import isURL from "validator/lib/isURL";
import { Formik, Form, Field, FormikValues, FormikState } from "formik";
import { NETWORK_ID } from "@/config";
import { useAccount, useContractWrite } from "wagmi";
import contracts from "@/contracts/hardhat_contracts.json";
import { useState } from "react";

interface MyFormValues {
  url: string;
}

export const Save = () => {
  const toast = useToast();
  const initialValues: MyFormValues = { url: "" };
  const chainId = Number(NETWORK_ID);
  const { isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  const allContracts = contracts as any;
  const dArchiveAddress = allContracts[chainId][0].contracts.DArchive.address;
  const dArchiveABI = allContracts[chainId][0].contracts.DArchive.abi;

  const { writeAsync } = useContractWrite({
    mode: "recklesslyUnprepared",
    addressOrName: dArchiveAddress,
    contractInterface: dArchiveABI,
    functionName: "addArchive",
    args: ["", "", ""],
  });

  function validateURL(value: string) {
    return isURL(value) ? undefined : "Invalid URL";
  }

  const handleSubmit = async (
    values: FormikValues,
    actions: {
      setSubmitting: (isSubmitting: boolean) => void;
    }
  ) => {
    setIsLoading(true);
    try {
      const { url } = values;
      const response = await fetch("/api/html", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const { contentID, title } = await response.json();
      console.log("contentID: ", contentID);
      if (contentID) {
        const tx = await writeAsync({
          recklesslySetUnpreparedArgs: [contentID, url, title],
        });
        await tx?.wait();
        toast({
          title: "Saved successfully",
          status: "success",
          position: "top-right",
          isClosable: true,
        });
      }
    } catch (error: any) {
      console.log(error);
      toast({
        title: error?.message || "Something went wrong",
        status: "error",
        position: "top-right",
        isClosable: true,
      });
    }
    actions.setSubmitting(false);
    setIsLoading(false);
  };

  return (
    <Container>
      <Formik initialValues={initialValues} onSubmit={handleSubmit}>
        {(props) => (
          <Form>
            <Field name="url" validate={validateURL}>
              {({
                field,
                form,
              }: {
                field: { name: string; value: string };
                form: FormikState<MyFormValues>;
              }) => (
                <FormControl
                  isInvalid={!!form.errors.url && !!form.touched.url}
                >
                  <FormLabel>Archive URL content</FormLabel>
                  <Input {...field} placeholder="URL to archive" />
                  <FormErrorMessage>{form.errors.url}</FormErrorMessage>
                </FormControl>
              )}
            </Field>
            {isLoading && <Progress size="xs" isIndeterminate />}
            <Center>
              <Button
                mt={4}
                colorScheme="blue"
                isLoading={props.isSubmitting}
                type="submit"
                isDisabled={!isConnected}
              >
                Save
              </Button>
            </Center>
          </Form>
        )}
      </Formik>
    </Container>
  );
};
