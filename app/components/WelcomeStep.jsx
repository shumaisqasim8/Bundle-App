import React from "react";
import { Card, BlockStack, Text, TextField } from "@shopify/polaris";

export default function WelcomeStep({ 
  formData, 
  handleChange, 
  errors, 
  heading, 
  description 
}) {
  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="heading2xl" as="h2">
          {heading}
        </Text>
        <Text>{description}</Text>
        <TextField
          label="Bundle Name"
          value={formData.bundleName}
          onChange={handleChange("bundleName")}
          error={errors.bundleName}
          autoComplete="off"
        />
      </BlockStack>
    </Card>
  );
}