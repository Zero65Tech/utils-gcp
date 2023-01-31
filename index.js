exports.init = async (config) => {


  if(config.firestore) {

    const firestore = require('@google-cloud/firestore');
    exports.Firestore = {
      FieldValue: firestore.FieldValue
    };

    let Firestore = new firestore.Firestore();
    for(let collection of config.firestore.collections)
      exports.Firestore[collection] = Firestore.collection(collection);

  }


  if(config.service) {

    let https = require('https');
    let httpsAgent = new https.Agent({ keepAlive: true, maxSockets: Infinity });

    let doGet = async (client, url, params, req, res) => {

      let options = {
        url: url,
        params: params,
        agent: httpsAgent,
        headers: {
          'User-Agent': process.env.ENV + '/' + (process.env.K_REVISION || process.env.USER || process.env.HOSTNAME)
        }
      };

      if(req && res) {
        if(req.headers['if-none-match'])
          options.headers['If-None-Match'] = req.headers['if-none-match'];
        options.responseType = 'stream';
        options.validateStatus = status => true;
        let response = await client.request(options);
        response.data.pipe(res.status(response.status).set(response.headers));  
      } else {
        let response = await client.request(options);
        return response.data;
      }
  
    }

    // https://www.npmjs.com/package/google-auth-library

    let session = undefined;
    let auth = undefined;

    if(process.env.ENV == 'test') { // Development / Testing

      let fs = require('fs');
      if(fs.existsSync(process.cwd() + '/.session'))
        session = JSON.parse(await fs.promises.readFile(process.cwd() + '/.session'));

    } else if(process.env.GOOGLE_SERVICE_ACCOUNT) { // Google Cloud Build

      let { GoogleAuth, Impersonated } = require('google-auth-library');
      auth = new Impersonated({
        sourceClient: await (new GoogleAuth()).getClient(),
        targetPrincipal: process.env.GOOGLE_SERVICE_ACCOUNT,
        targetScopes: [],
        lifetime: 3600, // 1hr
      });

    } else { // Google Cloud Run

      let { GoogleAuth } = require('google-auth-library');
      auth = new GoogleAuth();

    }

    // https://github.com/googleapis/gaxios/blob/main/README.md

    let gaxios = require('gaxios');

    exports.Service = {};

    for(let service in config.service) {

      let { baseURL, apis } = config.service[service];

      let client = undefined;
      if(process.env.ENV == 'test') // Development / Testing
        client = session ? new gaxios.Gaxios({
          headers: { 'Cookie': 'sessionId=' + session.id }
        }) : gaxios;
      else if(process.env.GOOGLE_SERVICE_ACCOUNT) // Google Cloud Build
        client = new gaxios.Gaxios({
          headers: { 'Authorization': 'Bearer ' + await auth.fetchIdToken(baseURL) }
        });
      else // Google Cloud Run
        client = await auth.getIdTokenClient(baseURL);

      exports.Service[service] = {};

      for(let api in apis) {
        let { method, path } = apis[api];
        if(method == 'GET')
          exports.Service[service][api] = async (params, req, res) => await doGet(client, baseURL + path, params, req, res);
      }

    }

  }


  delete exports.init;

}