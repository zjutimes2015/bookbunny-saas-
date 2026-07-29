# Similarweb Insights

[similarweb-insights](https://rapidapi.com/dataloom/api/similarweb-insights)

## API

### request

```js
const fetch = require('node-fetch');

const url = 'https://similarweb-insights.p.rapidapi.com/all-insights?domain=mksaas.com';
const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-key': 'f1271dbc8fmshfed4f61265ca392p1ff22cjsnb13e972165c3',
    'x-rapidapi-host': 'similarweb-insights.p.rapidapi.com'
  }
};

try {
	const response = await fetch(url, options);
	const result = await response.text();
	console.log(result);
} catch (error) {
	console.error(error);
}
```

### response

```json
{
  "SEOInsights": {
    "TopKeywords": [
      {
        "CPC": null,
        "Volume": 7600,
        "Name": "mksaas",
        "EstimatedValue": 5030
      },
      {
        "CPC": null,
        "Volume": 100,
        "Name": "mksaas-outfit",
        "EstimatedValue": 100
      },
      {
        "CPC": null,
        "Volume": 40,
        "Name": "nksaas",
        "EstimatedValue": 40
      },
      {
        "CPC": null,
        "Volume": 40,
        "Name": "mksaas的模板",
        "EstimatedValue": 30
      },
      {
        "CPC": null,
        "Volume": 30,
        "Name": "doc mksaas",
        "EstimatedValue": 30
      }
    ]
  },
  "SnapshotDate": "2025-10-01T00:00:00+00:00",
  "Traffic": {
    "Visits": {
      "2025-10-01": 26106,
      "2025-08-01": 12343,
      "2025-09-01": 19099
    },
    "TopCountryShares": {
      "HK": 0.15,
      "CN": 0.42,
      "SG": 0.06,
      "VN": 0.05,
      "US": 0.24
    },
    "Sources": {
      "Paid Referrals": 0.01,
      "Referrals": 0.09,
      "Social": 0.23,
      "Direct": 0.48,
      "Search": 0.18,
      "Mail": 0
    },
    "IsDataFromGa": false,
    "Engagement": {
      "TimeOnSite": 134.49,
      "BounceRate": 0.46,
      "PagesPerVisit": 3.45
    }
  },
  "WebsiteDetails": {
    "Domain": "mksaas.com",
    "Category": "",
    "Description": "The complete Next.js boilerplate for building profitable SaaS, packed with AI, auth, payments, i18n, newsletter, dashboard, blog, docs, blocks, themes, SEO and more.",
    "Images": {
      "Favicon": "https://site-images.similarcdn.com/image?url=mksaas.com&t=2&s=1&h=597742a990cd4971b2729db180a666116af546e0d76cc43fe6d0e11c2c4f98ec",
      "Smartphone": "https://site-images.similarcdn.com/image?url=mksaas.com&t=4&s=1&h=597742a990cd4971b2729db180a666116af546e0d76cc43fe6d0e11c2c4f98ec",
      "Desktop": "https://site-images.similarcdn.com/image?url=mksaas.com&t=1&s=1&h=597742a990cd4971b2729db180a666116af546e0d76cc43fe6d0e11c2c4f98ec"
    },
    "Title": "MkSaaS - Make Your AI SaaS Product in a Weekend"
  },
  "Rank": {
    "CountryRank": {
      "Country": "CN",
      "Rank": 62142
    },
    "CategoryRank": {
      "Rank": null,
      "Category": null
    },
    "GlobalRank": 872639
  }
}
```
