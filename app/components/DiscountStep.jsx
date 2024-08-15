import React from "react";
import { 
  Card, 
  BlockStack,
  Text, 
  Select, 
  TextField,
  Checkbox
} from "@shopify/polaris";

export default function DiscountStep({ formData, handleChange, errors }) {
  const isDiscountOptional = formData.isDiscountOptional || false;

  const handleOptionalChange = (checked) => {
    handleChange("isDiscountOptional")(checked);
    if (checked) {
      handleChange("discountType")("");
      handleChange("discountValue")("");
    }
  };

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="heading2xl" as="h2">
          Set Discount
        </Text>
        
        <Select
          label="Discount Type"
          options={[
            { label: "Percentage", value: "percentage" },
            { label: "Fixed Amount", value: "fixed" },
          ]}
          value={formData.discountType}
          onChange={handleChange("discountType")}
          disabled={isDiscountOptional}
        />
        <TextField
          label="Discount Value"
          value={formData.discountValue}
          onChange={handleChange("discountValue")}
          error={errors.discountValue}
          type="number"
          suffix={formData.discountType === "percentage" ? "%" : "Fixed Amount"}
          disabled={isDiscountOptional}
        />
        <Checkbox
          label="Don't offer a discount"
          checked={isDiscountOptional}
          onChange={handleOptionalChange}
        />
      </BlockStack>
    </Card>
  );
}