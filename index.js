const fs = require('fs');
const httpFollowRedirects = require('follow-redirects').http;

const server = httpFollowRedirects.createServer((req, res) => {
const proxiedUrl = req.url.slice(1);

const dataChunks = [];

req.on('data', chunk => {
  dataChunks.push(chunk);
});

req.on('end', () => {
  if (req.method === 'OPTIONS') {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    };

    res.writeHead(204, headers);
    res.end();
    return;
  }

  const data = Buffer.concat(dataChunks);

  const splitUrl = proxiedUrl.split('/');

  let port;
  let hostname = splitUrl[2];
  const path = splitUrl.slice(3).join('/');

  if (hostname.includes(':')) {
    const hostnameAndPort = hostname.split(':');
    hostname = hostnameAndPort[0];
    port = hostnameAndPort[1];
  }

  const options = {
    hostname: `${hostname}`,
    port: port,
    path: `/${path}`,
    method: req.method,
    body: data.toString(),
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  };

  console.log('proxiedReq options', options);

  const proxiedReq = httpFollowRedirects.request(options, proxiedRes => {
    console.log(`proxiedRes statusCode: ${proxiedRes.statusCode}`)

    const proxiedReqDataChunks = [];

    let proxiedResData;

    proxiedRes.on('data', chunk => {
      proxiedReqDataChunks.push(chunk);
    });

    proxiedRes.on('end', () => {
      proxiedResData = Buffer.concat(proxiedReqDataChunks).toString();

      console.log(`proxiedRes data: ${proxiedResData.slice(0, 100)}`)

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', proxiedRes.headers['Content-Type'] || 'application/json');
      res.writeHead(proxiedRes.statusCode);
      res.write(proxiedResData);
      res.end();
    });
  });

  proxiedReq.on('error', error => {
    console.error('proxiedReq ', error)
  })

  proxiedReq.write(data)
    proxiedReq.end();
  });
});

server.listen(8000, () => {
  console.log('Running CORS Proxy Server on localhost port ' + 8000);
});