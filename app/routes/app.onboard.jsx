import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Page,
  Card,
  ProgressBar,
  InlineStack,
  Button,
  Text,
  Icon,
  Form,
  Banner,
} from "@shopify/polaris";
import { ChevronLeftIcon, ChevronRightIcon } from "@shopify/polaris-icons";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { createBundle } from "../create-bundle.server";
import { fetchShopInfo } from "../fetchShopInfo.server";

import WelcomeStep from "../components/WelcomeStep";
import ProductSelectionStep from "../components/ProductSelectionStep";
import DiscountStep from "../components/DiscountStep";
import DescriptionStep from "../components/DescriptionStep";
import MediaSelection from "../components/MediaSelection";

export const action = async ({ request }) => {
  const formData = await request.formData();

  try {
    const result = await createBundle(request, formData);
    console.log("Bundle operation result:", result);
    const productId = result.productId;
    const miniProductId = productId.split("/").pop();

    return json(
      { success: true, productId: miniProductId, result: result },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error creating bundle:", error);
    return json({ success: false, error: error.message }, { status: 400 });
  }
};

export const loader = async ({ request }) => {
  const shopInfo = await fetchShopInfo(request);
  return json({ shopInfo });
};

export default function CreateBundle() {
  const { shopInfo } = useLoaderData();

  const productTags = useMemo(
    () => shopInfo.data.shop.productTags.edges.map((edge) => edge.node),
    [shopInfo],
  );

  const productTypes = useMemo(
    () => shopInfo.data.shop.productTypes.edges.map((edge) => edge.node),
    [shopInfo],
  );

  const initialFormData = useMemo(
    () => ({
      bundleName: "",
      products: [],
      isDiscountOptional: false,
      discountType: "percentage",
      discountValue: "",
      description: "",
      collectionsToJoin: [],
      media: [],
      productType: "",
      productTags: [],
      status: "active",
    }),
    [],
  );

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [showErrors, setShowErrors] = useState(false);

  const app = useAppBridge();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionData = useActionData();
  const redirectAnchorRef = useRef(null);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setStep(1);
    setErrors({});
    setShowErrors(false);
  }, [initialFormData]);

  useEffect(() => {
    if (actionData) {
      console.log("Action data received:", actionData);
      if (actionData.success) {
        if (redirectAnchorRef.current) {
          redirectAnchorRef.current.href = `shopify://admin/products/${actionData.productId}`;
          redirectAnchorRef.current.click();
        }
        resetForm();
      } else {
        setErrors({ submit: actionData.error });
        setShowErrors(true);
      }
    }
  }, [actionData, resetForm]);

  const validateStep = useCallback(() => {
    const newErrors = {};
    switch (step) {
      case 1:
        if (!formData.bundleName.trim())
          newErrors.bundleName = "Bundle name is required";
        break;
      case 2:
        if (formData.products.length === 0)
          newErrors.products = "At least one product must be selected";
        break;
      case 3:
        if (!formData.isDiscountOptional) {
          if (!formData.discountValue.trim())
            newErrors.discountValue = "Discount value is required";
          else if (
            isNaN(formData.discountValue) ||
            Number(formData.discountValue) <= 0
          )
            newErrors.discountValue =
              "Discount value must be a positive number";
        }
        break;
      case 4:
        if (!formData.description.trim())
          newErrors.description = "Description is required";
        break;
    }
    setErrors((prevErrors) => ({ ...prevErrors, ...newErrors }));
    return Object.keys(newErrors).length === 0 && !errors.limits;
  }, [formData, step, errors.limits]);

  const handleNextStep = useCallback(() => {
    if (validateStep()) {
      setStep((prevStep) => prevStep + 1);
      setShowErrors(false);
    } else {
      setShowErrors(true);
    }
  }, [validateStep]);

  const handlePreviousStep = useCallback(() => {
    setStep((prevStep) => prevStep - 1);
    setShowErrors(false);
  }, []);

 

const handleSubmit = useCallback(() => {
  if (validateStep()) {
    console.log("Validation passed, preparing form data...");
    const formDataToSend = new FormData();
    
    const cleanedFormData = {
      ...formData,
      products: formData.products.map((product) => ({
        ...product,
        options: product.options.map((option) => ({
          ...option,  
          values: option.values.filter((v) => v.selected).map((v) => v.value),
        })),
      })),
      // Remove file object from media array in the JSON
      media: formData.media.map(({ file, ...rest }) => rest),
    };

    console.log("Cleaned form data:", cleanedFormData);

    formDataToSend.append('formData', JSON.stringify(cleanedFormData));
    console.log("Added formData to FormData object");

    // Append each media file separately
    formData.media.forEach((media, index) => {
      if (media.file) {
        console.log(`Appending file: ${media.name}`);
        formDataToSend.append(`media_${index}`, media.file, media.name);
      } else {
        console.log(`No file found for media: ${media.name}`);
      }
    });

    // Log the contents of formDataToSend
    for (let [key, value] of formDataToSend.entries()) {
      console.log(key, value);
    }

    console.log("Submitting form data...");
    submit(formDataToSend, { method: "post", encType: "multipart/form-data" });
  } else {
    console.log("Validation failed");
    setShowErrors(true);
  }
}, [formData, validateStep, submit]);

  const renderStep = useCallback(() => {
    switch (step) {
      case 1:
        return (
          <WelcomeStep
            heading="Welcome to Bundler"
            description="Let's create your first bundle"
            formData={formData}
            handleChange={(field) => (value) =>
              setFormData((prev) => ({ ...prev, [field]: value }))
            }
            errors={showErrors ? errors : {}}
          />
        );
      case 2:
        return (
          <ProductSelectionStep
            formData={formData}
            setFormData={setFormData}
            errors={showErrors ? errors : {}}
            setErrors={setErrors}
            app={app}
          />
        );
      case 3:
        return (
          <>
            <MediaSelection
  onChange={(media) => {
    console.log("MediaSelection onChange called with:", media);
    setFormData((prev) => {
      const updatedFormData = { ...prev, media };
      console.log("Updated form data:", updatedFormData);
      return updatedFormData;
    });
  }}
  initialFiles={formData.media}
/>
            <DiscountStep
              formData={formData}
              handleChange={(field) => (value) =>
                setFormData((prev) => ({ ...prev, [field]: value }))
              }
              errors={showErrors ? errors : {}}
            />
          </>
        );
      case 4:
        return (
          <DescriptionStep
            formData={formData}
            setFormData={setFormData}
            errors={showErrors ? errors : {}}
            setErrors={setErrors}
            app={app}
            productTags={productTags}
            productTypes={productTypes}
          />
        );
      default:
        return null;
    }
  }, [
    step,
    formData,
    showErrors,
    errors,
    setFormData,
    app,
    productTags,
    productTypes,
  ]);

  return (
    <Page narrowWidth>
      <Form method="post">
        <Card>
          <ProgressBar
            progress={(step / 4) * 100}
            size="small"
            tone="primary"
          />
        </Card>
        {renderStep()}
        {showErrors && Object.keys(errors).length > 0 && (
          <Banner status="critical">
            {errors.submit || "Please correct the errors before proceeding."}
          </Banner>
        )}
        <Card>
          <InlineStack align="space-between">
            <div>
              {step > 1 && (
                <Button onClick={handlePreviousStep}>
                  <InlineStack gap="200">
                    <Icon source={ChevronLeftIcon} />
                    <Text>Previous</Text>
                  </InlineStack>
                </Button>
              )}
            </div>
            <div>
              {step < 4 ? (
                <Button onClick={handleNextStep} primary>
                  <InlineStack gap="200">
                    <Text>Next</Text>
                    <Icon source={ChevronRightIcon} />
                  </InlineStack>
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  primary
                  loading={navigation.state === "submitting"}
                >
                  Create Bundle
                </Button>
              )}
            </div>
          </InlineStack>
        </Card>
      </Form>
      <a 
        ref={redirectAnchorRef} 
        style={{ display: 'none' }} 
        target="_top"
      >Redirect</a>
    </Page>
  );
}