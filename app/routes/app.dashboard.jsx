import React from "react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Thumbnail,
  Badge,
  InlineStack,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";
import { useLoaderData } from "@remix-run/react";
import { fetchBundle } from "../fetch-bundle.server";

export async function loader({ request }) {
  const data = await fetchBundle(request);
  return data;
}

export default function Dashboard() {

  const data = useLoaderData();

  if (!data || !data.data || !data.data.products) {
    return (
      <Page narrowWidth>
        <Text variant="heading2xl" as="h1">
          Products
        </Text>
        <Card>
          <Text variant="bodyMd">No product data available.</Text>
        </Card>
      </Page>
    );
  }

  const products = data.data.products.edges || [];

  if (products.length === 0) {
    return (
      <Page narrowWidth>
        <Text variant="heading2xl" as="h1">
          Products
        </Text>
        <Card>
          <Text variant="bodyMd">No products found.</Text>
        </Card>
      </Page>
    );
  }

  const resourceName = {
    singular: "product",
    plural: "products",
  };

  const rowMarkup = products.map(({ node: product }, index) => (
    <IndexTable.Row
      id={product.id}
      key={product.id}
      position={index}
      onClick={() => {
        window.open(`shopify://admin/products/${product.id.split('/').pop()}`, '_self');
      }}
    >
      <IndexTable.Cell>
        <InlineStack blockAlign="center" align="start" gap='500'>
          <Thumbnail
            source={product.featuredImage?.url || ImageIcon}
            alt={product.title}
            size="small"
          />
          <Text variant="bodyMd" fontWeight="bold">
            {product.title}
          </Text>
        </InlineStack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text alignment="start" variant="bodyMd">
          {product.priceRangeV2.minVariantPrice.currencyCode}{" "}
          {parseFloat(product.priceRangeV2.minVariantPrice.amount).toFixed(2)}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text alignment="start" variant="bodyMd">
          {product.totalInventory}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={product.status === 'ACTIVE' ? 'success' : 'info'}>
          {product.status}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Text variant="bodyMd">{product.vendor}</Text>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Text variant="heading2xl" as="h1">
            Your Products
          </Text>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={resourceName}
              itemCount={products.length}
              headings={[
                { title: "Product" },
                { title: "Price", alignment: "start" },
                { title: "Inventory", alignment: "start" },
                { title: "Status", alignment: "start" },
                { title: "Vendor", alignment: "start" },
              ]}
              selectable={false}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};
