import { json, useActionData, useLoaderData, useSubmit } from '@remix-run/react';
import React, { useCallback, useState, useEffect } from "react";
import { updateBundle } from '../update-bundle.server';
import { getBundle } from '../get-bundle.server';

import { useAppBridge } from '@shopify/app-bridge-react';
import { 
  Card, 
  BlockStack, 
  Text, 
  Button, 
  ResourceList, 
  Avatar, 
  ResourceItem, 
  TextField, 
  InlineStack, 
  EmptyState, 
  InlineError, 
  Tag, 
  Banner,
  Select,
  Page,

} from "@shopify/polaris";
import { DeleteIcon } from '@shopify/polaris-icons';



export const action = async ({ request }) => {
  const formData = await request.formData();
  try {
    const result = await updateBundle(request, formData);
    return json({ success: result.success }, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("Error creating bundle:", error);
    return json({ success: false, error: error.message }, { status: 400 });
  }
};



const BUNDLE_LIMITS = {
  products: 30,
  options: 3,
  variants: 100
};

export async function loader({ params, request }) {
  try {
    const result = await getBundle(request, params.bundleId);
    console.log(result);
    return json({ success: true, bundleData: result }, { status: 200 });
  } catch (error) {
    console.error("Error updating bundle:", error);
    return json({ success: false, error: error.message }, { status: 400 });
  }
}

const BundleProduct = () => {
  const bundleData = useLoaderData();
  const app = useAppBridge();
  const submit = useSubmit();
  const [formData, setFormData] = useState({ 
    products: [],
    discountType: 'percentage',
    discountValue: ''
  });
  const [errors, setErrors] = useState({});
  const [localErrors, setLocalErrors] = useState({});
  const [bundleLimits, setBundleLimits] = useState({
    products: 0,
    options: 0,
    variants: 0
  });

  const actionData = useActionData();

  useEffect(() => {
    console.log("Action data:", actionData);
    if (actionData) {
      shopify.toast.show('Bundle Updated Successfully');
    }
  }, [actionData, app]);


  useEffect(() => {
    if (bundleData.bundleData.data.product.bundleComponents) {
      const products = bundleData.bundleData.data.product.bundleComponents.edges.map(edge => ({
        id: edge.node.componentProduct.id,
        title: edge.node.componentProduct.title,
        vendor: edge.node.componentProduct.vendor || '',
        images: edge.node.componentProduct.featuredImage ? [edge.node.componentProduct.featuredImage] : [],
        quantity: edge.node.quantity,
        options: edge.node.optionSelections.map(selection => ({
          id: selection.componentOption.id,
          name: selection.componentOption.name,
          values: selection.values.map(v => ({
            value: v.value,
            selected: v.selectionStatus === 'SELECTED'
          }))
        }))
      }));
      setFormData(prev => ({ ...prev, products }));
    }
  }, [bundleData,actionData]);

  const validateProducts = useCallback((products) => {
    const productErrors = {};
    products.forEach(product => {
      product.options.forEach(option => {
        if (!option.values.some(v => v.selected)) {
          if (!productErrors[product.id]) {
            productErrors[product.id] = {};
          }
          productErrors[product.id][option.id] = `At least one ${option.name} must be selected`;
        }
      });
    });
    return productErrors;
  }, []);

  const calculateBundleLimits = useCallback((products) => {
    const limits = {
      products: products.length,
      options: 0,
      variants: 1
    };

    products.forEach(product => {
      const nonDefaultOptions = product.options.filter(option => option.name !== 'Title');
      limits.options += nonDefaultOptions.length;
      
      let productVariants = 1;
      nonDefaultOptions.forEach(option => {
        const selectedValues = option.values.filter(v => v.selected).length;
        productVariants *= selectedValues > 0 ? selectedValues : 1;
      });
      limits.variants *= productVariants;
    });

    return limits;
  }, []);

  useEffect(() => {
    const newErrors = validateProducts(formData.products);
    const newLimits = calculateBundleLimits(formData.products);

    setLocalErrors(newErrors);
    setBundleLimits(newLimits);

    const hasLimitErrors = Object.entries(newLimits).some(([key, value]) => value > BUNDLE_LIMITS[key]);

    setErrors(prevErrors => ({
      ...prevErrors,
      products: Object.keys(newErrors).length > 0 ? "Please ensure all products have at least one option selected" : null,
      limits: hasLimitErrors ? "Bundle exceeds Shopify's limits" : null
    }));
  }, [formData.products, validateProducts, calculateBundleLimits]);

  const handleProductSelection = useCallback(async () => {
    try {
      const selection = await app.resourcePicker({
        type: "product",
        action: "select",
        filter: { variants: false, draft: false, archived: false },
        multiple: true,
        selectionIds: formData.products.map(product => ({ id: product.id }))
      });

      if (selection && selection.length > 0) {
        const newProducts = selection.map(product => {
          const existingProduct = formData.products.find(p => p.id === product.id);
          if (existingProduct) {
            return existingProduct;
          } else {
            return {
              id: product.id,
              title: product.title,
              vendor: product.vendor,
              images: product.images,
              quantity: 1,
              options: product.options.map(option => ({
                id: option.id,
                name: option.name,
                values: option.values.map(value => ({
                  value,
                  selected: true
                }))
              }))
            };
          }
        });

        setFormData(prev => ({
          ...prev,
          products: newProducts
        }));
      }
    } catch (error) {
      console.error("Error selecting products:", error);
    }
  }, [app, formData.products]);

  const handleQuantityChange = useCallback((id, quantity) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map(product =>
        product.id === id ? { ...product, quantity: parseInt(quantity, 10) || 1 } : product
      ),
    }));
  }, []);

  const handleOptionValueToggle = useCallback((productId, optionId, value) => {
    setFormData((prev) => {
      const updatedProducts = prev.products.map(product =>
        product.id === productId
          ? {
              ...product,
              options: product.options.map(option =>
                option.id === optionId
                  ? {
                      ...option,
                      values: option.values.map(v =>
                        v.value === value ? { ...v, selected: !v.selected } : v
                      )
                    }
                  : option
              )
            }
          : product
      );

      return { ...prev, products: updatedProducts };
    });
  }, []);

  const handleDeleteProduct = useCallback((productId) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter(product => product.id !== productId)
    }));
  }, []);

  const handleChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.discountValue) {
      newErrors.discountValue = 'Discount value is required';
    } else if (formData.discountType === 'percentage' && (formData.discountValue < 0 || formData.discountValue > 100)) {
      newErrors.discountValue = 'Percentage must be between 0 and 100';
    } else if (formData.discountType === 'fixed' && formData.discountValue < 0) {
      newErrors.discountValue = 'Fixed amount must be 0 or greater';
    }

    const productErrors = validateProducts(formData.products);
    if (Object.keys(productErrors).length > 0) {
      newErrors.products = "Please ensure all products have at least one option selected";
    }

    const newLimits = calculateBundleLimits(formData.products);
    const hasLimitErrors = Object.entries(newLimits).some(([key, value]) => value > BUNDLE_LIMITS[key]);
    if (hasLimitErrors) {
      newErrors.limits = "Bundle exceeds Shopify's limits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateProducts, calculateBundleLimits]);

  const handleUpdate = useCallback(() => {
    if (validateForm()) {
      const cleanedFormData = {
        ...bundleData.bundleData.data.product,
        ...formData,
        products: formData.products.map((product) => ({
          ...product,
          options: product.options.map((option) => ({
            ...option,
            values: option.values.filter((v) => v.selected).map((v) => v.value),
          })),
        })),
      };
      console.log("Updating bundle with form data:", cleanedFormData);
      submit({ formData: JSON.stringify(cleanedFormData) }, { method: 'post'});
    } else {
      console.log("Form validation failed");
    }
  }, [formData, validateForm, submit]);

  const renderBundleLimits = () => {
    if (formData.products.length === 0) return null;

    return (
      <Banner status="info">
        <BlockStack gap="200">
          <Text variant="headingSm">Bundle Limits:</Text>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {Object.entries(bundleLimits).map(([key, value]) => (
              <li key={key} style={{ color: value > BUNDLE_LIMITS[key] ? 'red' : 'inherit' }}>
                {value}/{BUNDLE_LIMITS[key]} {key}
              </li>
            ))}
          </ul>
        </BlockStack>
      </Banner>
    );
  };

  return (
    <Page narrowWidth>

    <BlockStack gap="500">
      <Card>
        <BlockStack gap="500">
          <InlineStack align="space-between">
            <Text variant="heading2xl" as="h2">
              Select Products
            </Text>
            {formData.products.length > 0 && (
              <Button onClick={handleProductSelection} plain>
                Add product
              </Button>
            )}
          </InlineStack>
          {errors.products && <InlineError message={errors.products} />}
          {errors.limits && <InlineError message={errors.limits} />}
          {renderBundleLimits()}
          {formData.products.length > 0 ? (
            <ResourceList
              resourceName={{ singular: "product", plural: "products" }}
              items={formData.products}
              renderItem={(item) => {
                const { id, title, vendor, images, quantity, options } = item;
                const media = (
                  <Avatar
                    customer
                    size="md"
                    name={title}
                    source={images[0]?.originalSrc }
                  />
                );
                return (
                  <ResourceItem
                    id={id}
                    media={media}
                    accessibilityLabel={`View details for ${title}`}
                  >
                    <BlockStack gap="300">
                      <InlineStack gap="500" align="space-between" wrap={false}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Text variant="bodyMd" fontWeight="bold" as="h3" truncate>
                            {title}
                          </Text>
                          <Text variant="bodySm" color="subdued">
                            {vendor}
                          </Text>
                        </div>
                        <InlineStack gap="300" align="center">
                          <TextField
                            label="Quantity"
                            type="number"
                            value={quantity.toString()}
                            onChange={(value) => handleQuantityChange(id, value)}
                            min={1}
                            labelHidden
                          />
                          <Button 
                            onClick={() => handleDeleteProduct(id)} 
                            tone="critical"
                            icon={DeleteIcon}
                            accessibilityLabel={`Delete ${title}`}
                          />
                        </InlineStack>
                      </InlineStack>
                      {options.map((option) => (
                        <BlockStack key={option.id} gap="200">
                          <Text variant="bodyMd" fontWeight="semibold">
                            {option.name}
                          </Text>
                          <InlineStack gap="200" wrap>
                            {option.values.map((valueObj) => (
                              <div
                                key={valueObj.value}
                                style={{ opacity: valueObj.selected ? 1 : 0.5 }}
                              >
                                <Tag
                                  onClick={() => handleOptionValueToggle(id, option.id, valueObj.value)}
                                >
                                  {valueObj.value}
                                </Tag>
                              </div>
                            ))}
                          </InlineStack>
                          {localErrors[id] && localErrors[id][option.id] && (
                            <InlineError message={localErrors[id][option.id]} />
                          )}
                        </BlockStack>
                      ))}
                    </BlockStack>
                  </ResourceItem>
                );
              }}
            />
          ) : (
            <EmptyState
              heading="No products selected"
              action={{
                content: "Select products",
                onAction: handleProductSelection,
              }}
            >
              <p>Select products to include them in your bundle.</p>
            </EmptyState>
          )}
          {Object.keys(localErrors).length > 0 && (
            <Banner status="critical">
              Please ensure at least one option is selected for each product.
            </Banner>
          )}
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="500">
          <Text variant="heading2xl" as="h2">
            Update Discount
          </Text>
          <Select
            label="Discount Type"
            options={[
              { label: "Percentage", value: "percentage" },
              { label: "Fixed Amount", value: "fixed" },
            ]}
            value={formData.discountType}
            onChange={handleChange("discountType")}
          />
          <TextField
            label="Discount Value"
            value={formData.discountValue}
            onChange={handleChange("discountValue")}
            error={errors.discountValue}
            type="number"
            suffix={formData.discountType === "percentage" ? "%" : "$"}
          />
        </BlockStack>
      </Card>

      <Button onClick={handleUpdate} primary>
        Update Bundle
      </Button>
      </BlockStack>
      </Page>
  );
};

export default BundleProduct;