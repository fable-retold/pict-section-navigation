const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8236;
const DIST = path.join(__dirname, 'dist');

const MIME =
{
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.map': 'application/json'
};

http.createServer(function (pRequest, pResponse)
{
	let tmpUrl = pRequest.url === '/' ? '/index.html' : pRequest.url;
	let tmpFilePath = path.join(DIST, tmpUrl);

	fs.readFile(tmpFilePath, function (pError, pData)
	{
		if (pError)
		{
			pResponse.writeHead(404);
			pResponse.end('Not found');
			return;
		}
		let tmpExt = path.extname(tmpFilePath);
		pResponse.writeHead(200, { 'Content-Type': MIME[tmpExt] || 'text/plain' });
		pResponse.end(pData);
	});
}).listen(PORT, function ()
{
	console.log('Serving bookstore navigation example on http://localhost:' + PORT);
});
