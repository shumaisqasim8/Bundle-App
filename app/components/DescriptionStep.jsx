import React, { useCallback, useState, useEffect, useMemo } from "react";
import { 
  Card, 
  BlockStack, 
  Text, 
  TextField, 
  Button, 
  InlineStack, 
  Banner,
  Tag,
  Select,
  Autocomplete,
  EmptyState,
  Thumbnail,
  Icon
} from "@shopify/polaris";
import { SearchIcon, PlusCircleIcon } from '@shopify/polaris-icons';

export default function DescriptionStep({ formData, setFormData, errors, setErrors, app, productTags, productTypes }) {
  const [selectedTags, setSelectedTags] = useState(formData.productTags || []);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allTags, setAllTags] = useState(productTags);

  // Set a default product type if not already set
  useEffect(() => {
    if (!formData.productType && productTypes.length > 0) {
      setFormData(prev => ({ ...prev, productType: productTypes[0] }));
    }
  }, [formData.productType, productTypes, setFormData]);

  // Update options whenever allTags changes
  useEffect(() => {
    setOptions(allTags.map(tag => ({ value: tag, label: tag })));
  }, [allTags]);

  useEffect(() => {
    console.log("Effect: Updating formData with selectedTags:", selectedTags);
    setFormData(prev => ({ ...prev, productTags: selectedTags }));
  }, [selectedTags, setFormData]);

  const handleCollectionSelection = useCallback(async () => {
    try {
      const selection = await app.resourcePicker({
        type: "collection",
        action: "select",
        multiple: true,
        selectionIds: formData.collectionsToJoin.map(collection => ({ id: collection.id }))
      });

      console.log("Collection selection:", selection);

      if (selection && selection.length > 0) {
        const newCollections = selection.map(collection => ({
          id: collection.id,
          title: collection.title,
          image: collection.image?.originalSrc
        }));

        console.log("New collections:", newCollections);

        setFormData(prev => ({
          ...prev,
          collectionsToJoin: newCollections
        }));

        setErrors(prev => ({
          ...prev,
          collectionsToJoin: null
        }));
      }
    } catch (error) {
      console.error("Error selecting collections:", error);
    }
  }, [app, formData.collectionsToJoin, setFormData, setErrors]);

  const handleChange = useCallback((field) => (value) => {
    console.log(`Handling change for ${field}:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  }, [setFormData, errors, setErrors]);

  const removeCollection = useCallback((collectionId) => {
    console.log("Removing collection:", collectionId);
    setFormData(prev => ({
      ...prev,
      collectionsToJoin: prev.collectionsToJoin.filter(c => c.id !== collectionId)
    }));
  }, [setFormData]);

  const updateText = useCallback(
    (value) => {
      setInputValue(value);
      setLoading(true);

      setTimeout(() => {
        if (value === '') {
          setOptions(allTags.map(tag => ({ value: tag, label: tag })));
          setLoading(false);
          return;
        }

        const filterRegex = new RegExp(value, 'i');
        const resultOptions = allTags
          .filter((tag) => tag.match(filterRegex))
          .map(tag => ({ value: tag, label: tag }));
        setOptions(resultOptions);
        setLoading(false);
      }, 300);
    },
    [allTags]
  );

  const handleTagSelection = useCallback(
    (selected) => {
      setSelectedTags(selected);
      setInputValue('');
    },
    []
  );

  const removeTag = useCallback(
    (tag) => {
      const newSelectedTags = selectedTags.filter((selectedTag) => selectedTag !== tag);
      setSelectedTags(newSelectedTags);
    },
    [selectedTags]
  );

  const handleAddNewTag = useCallback(() => {
    if (inputValue && !allTags.includes(inputValue)) {
      const newTag = inputValue.trim();
      setSelectedTags(prev => [...prev, newTag]);
      setAllTags(prev => [...prev, newTag]);
      setInputValue('');
    }
  }, [inputValue, allTags]);

  const tagsMarkup = selectedTags.length > 0 ? (
    <InlineStack gap="200">
      {selectedTags.map((tag) => (
        <Tag key={`tag-${tag}`} onRemove={() => removeTag(tag)}>
          {tag}
        </Tag>
      ))}
    </InlineStack>
  ) : null;

  const textField = (
    <Autocomplete.TextField
      onChange={updateText}
      label="Product Tags"
      value={inputValue}
      placeholder="Search tags or enter a new one"
      verticalContent={tagsMarkup}
      prefix={<Icon source={SearchIcon} />}
      autoComplete="off"
    />
  );

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
  ];

  return (
    <Card>
      <BlockStack gap="500">
        <Text variant="heading2xl" as="h2">
          Describe Your Bundle
        </Text>
        <TextField
          label="Description"
          value={formData.description}
          onChange={handleChange("description")}
          error={errors.description}
          multiline={4}
        />
        
        <Text variant="heading2xl" as="h2">
          Product Operations
        </Text>
        <Select
          label="Product Type"
          options={productTypes.map(type => ({ label: type, value: type }))}
          onChange={handleChange("productType")}
          value={formData.productType || ''}
          error={errors.productType}
        />
        <Autocomplete
          allowMultiple
          options={options}
          selected={selectedTags}
          onSelect={handleTagSelection}
          textField={textField}
          loading={loading}
          listTitle="Suggested Tags"
          actionBefore={{
            accessibilityLabel: 'Add new tag',
            content: 'Add new tag',
            icon: PlusCircleIcon,
            onAction: handleAddNewTag,
          }}
        />
        <Select
          label="Status"
          options={statusOptions}
          onChange={handleChange("status")}
          value={formData.status}
          error={errors.status}
        />
        
        <BlockStack gap="200">
          <Text variant="headingMd" as="h3">Collections</Text>
          <Button onClick={handleCollectionSelection}>Select Collections</Button>
          {errors.collectionsToJoin && <Banner status="critical">{errors.collectionsToJoin}</Banner>}
          {formData.collectionsToJoin.length === 0 ? (
            <EmptyState
              heading="No collections selected"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <p>Select collections to add this bundle to.</p>
            </EmptyState>
          ) : (
            <InlineStack gap="200" wrap={true}>
              {formData.collectionsToJoin.map((collection) => (
                <Card key={collection.id}>
                  <BlockStack gap="200">
                    {collection.image && (
                      <Thumbnail
                        source={collection.image}
                        alt={collection.title}
                        size="small"
                      />
                    )}
                    <Text variant="bodyMd" as="p">{collection.title}</Text>
                    <Button plain onClick={() => removeCollection(collection.id)}>Remove</Button>
                  </BlockStack>
                </Card>
              ))}
            </InlineStack>
          )}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}