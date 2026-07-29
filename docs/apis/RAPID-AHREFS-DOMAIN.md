# Ahrefs Domain Research

[ahrefs-domain-research](https://rapidapi.com/seodataset/api/ahrefs-domain-research)

## API

### request

```js
const fetch = require('node-fetch');

const url = 'https://ahrefs-domain-research.p.rapidapi.com/basic-metrics?url=mkdollar.com';
const options = {
  method: 'GET',
  headers: {
    'x-rapidapi-key': 'f1271dbc8fmshfed4f61265ca392p1ff22cjsnb13e972165c3',
    'x-rapidapi-host': 'ahrefs-domain-research.p.rapidapi.com'
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
  "success": true,
  "data": {
    "domainRating": 42,
    "ahRank": 800
  }
}
```
