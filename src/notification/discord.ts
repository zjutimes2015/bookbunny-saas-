import { websiteConfig } from '@/config/website';
import { defaultMessages } from '@/i18n/messages';
import { getBaseUrl, getExternalUrl } from '@/lib/urls/urls';

/**
 * Send a message to Discord when a user makes a purchase
 * @param sessionId The Stripe checkout session ID
 * @param customerId The Stripe customer ID
 * @param userName The username of the customer
 * @param amount The purchase amount in the currency's main unit (e.g., dollars, not cents)
 */
export async function sendMessageToDiscord(
  sessionId: string,
  customerId: string,
  userName: string,
  amount: number
): Promise<void> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn(
        'DISCORD_WEBHOOK_URL is not set, skipping Discord notification'
      );
      return;
    }

    // Format the message
    const message = {
      // You can customize these values later
      username: `${defaultMessages.Metadata.name} Bot`,
      avatar_url: `${getBaseUrl()}${websiteConfig.metadata?.images?.logoLight}`,
      embeds: [
        {
          title: '🎉 New Purchase',
          color: 0x4caf50, // Green color
          fields: [
            {
              name: 'Username',
              value: userName,
              inline: true,
            },
            {
              name: 'Amount',
              value: `$${amount.toFixed(2)}`,
              inline: true,
            },
            {
              name: 'Customer ID',
              value: `\`${customerId}\``,
              inline: false,
            },
            {
              name: 'Session ID',
              value: `\`${sessionId}\``,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send the webhook request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(
        `<< Failed to send Discord notification for user ${userName}:`,
        response
      );
    }

    console.log(
      `<< Successfully sent Discord notification for user ${userName}`
    );
  } catch (error) {
    console.error('<< Failed to send Discord notification:', error);
    // Don't rethrow the error to avoid interrupting the payment flow
  }
}

/**
 * Send a message to Discord when a user applies to convert product to directory
 * @param directoryId The directory ID
 * @param productName The product name
 * @param productUrl The product URL
 * @param userName The username of the applicant
 * @param userId The user ID of the applicant
 */
export async function sendDirectoryApplicationNotification({
  directoryId,
  productName,
  productUrl,
  userName,
  userId,
}: {
  directoryId: string;
  productName: string;
  productUrl: string;
  userName: string;
  userId: string;
}): Promise<void> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn(
        'DISCORD_WEBHOOK_URL is not set, skipping Discord notification'
      );
      return;
    }

    // Format the message
    const message = {
      username: `${defaultMessages.Metadata.name} Bot`,
      avatar_url: `${getBaseUrl()}${websiteConfig.metadata?.images?.logoLight}`,
      embeds: [
        {
          title: '📋 New Directory Application',
          color: 0xffa500, // Orange color
          fields: [
            {
              name: 'Product Name',
              value: productName,
              inline: true,
            },
            {
              name: 'Product URL',
              value: getExternalUrl(productUrl),
              inline: false,
            },
            {
              name: 'Applicant',
              value: userName,
              inline: false,
            },
            {
              name: 'Directory ID',
              value: `\`${directoryId}\``,
              inline: false,
            },
            {
              name: 'User ID',
              value: `\`${userId}\``,
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send the webhook request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(
        `<< Failed to send Discord notification for directory application ${directoryId}:`,
        response
      );
    }

    console.log(
      `<< Successfully sent Discord notification for directory application ${directoryId}`
    );
  } catch (error) {
    console.error('<< Failed to send Discord notification:', error);
    // Don't rethrow the error to avoid interrupting the application flow
  }
}

/**
 * Send a message to Discord when a user creates a new product deal
 * @param productName The product name
 * @param productUrl The product URL
 * @param dealEventName The deal event name
 * @param price The deal price in cents
 * @param userName The username of the creator
 * @param userId The user ID of the creator
 */
export async function sendProductDealNotification({
  productName,
  productUrl,
  dealEventName,
  price,
  userName,
  userId,
}: {
  productName: string;
  productUrl: string;
  dealEventName: string;
  price: number;
  userName: string;
  userId: string;
}): Promise<void> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn(
        'DISCORD_WEBHOOK_URL is not set, skipping Discord notification'
      );
      return;
    }

    // Format price from cents to dollars
    const priceFormatted = `$${(price / 100).toFixed(2)}`;

    // Build fields array
    const fields = [
      {
        name: 'Product Name',
        value: productName,
        inline: false,
      },
      {
        name: 'Deal Event',
        value: dealEventName,
        inline: false,
      },
      {
        name: 'Price',
        value: priceFormatted,
        inline: false,
      },
      {
        name: 'Product URL',
        value: getExternalUrl(productUrl),
        inline: false,
      },
      {
        name: 'Creator',
        value: userName,
        inline: false,
      },
      {
        name: 'User ID',
        value: `\`${userId}\``,
        inline: false,
      },
    ];

    // Format the message
    const message = {
      username: `${defaultMessages.Metadata.name} Bot`,
      avatar_url: `${getBaseUrl()}${websiteConfig.metadata?.images?.logoLight}`,
      embeds: [
        {
          title: '🎁 New Product Deal',
          color: 0x00bcd4, // Cyan color
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Send the webhook request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error(
        `<< Failed to send Discord notification for product deal ${productName}:`,
        response
      );
    }

    console.log(
      `<< Successfully sent Discord notification for product deal ${productName}`
    );
  } catch (error) {
    console.error('<< Failed to send Discord notification:', error);
    // Don't rethrow the error to avoid interrupting the deal creation flow
  }
}
